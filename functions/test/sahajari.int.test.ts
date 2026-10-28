import { beforeAll, describe, expect, it } from 'vitest';
import { adminDb, call, clearEmulators, evidence, member, memberToken, staffToken, waitFor } from './helpers';

let admin: { uid: string; idToken: string };
let coordinator: { uid: string; idToken: string };
let m: { uid: string; idToken: string };

const patient = {
  name: 'Kunhalavi',
  age: 64,
  gender: 'male',
  phone: '+919812345678',
  address: 'Thazhe Amappoyil',
  condition: 'Kidney failure',
  need: 'Dialysis twice a week',
  category: 'dialysis',
  supportTypes: ['medical', 'financial'],
};

beforeAll(async () => {
  await clearEmulators();
  admin = await staffToken('admin@skamp.test', { role: 'admin' });
  coordinator = await staffToken('coord@skamp.test', { role: 'sahajari_coordinator' });
  await call('createMember', member(31), admin.idToken);
  m = await memberToken('+919000000031');
});

describe('patient add requests', () => {
  let requestId: string;

  it('member submits; payload is validated', async () => {
    const bad = await call('submitRequest', { type: 'patient_add', payload: { ...patient, supportTypes: [] } }, m.idToken);
    const ok = await call('submitRequest', { type: 'patient_add', payload: { ...patient, relation: 'Neighbour' } }, m.idToken);
    evidence('submitRequest (invalid, valid)', { bad: bad.error?.message, ok });
    expect(bad.error?.status).toBe('INVALID_ARGUMENT');
    expect(ok.result.status).toBe('pending');
    requestId = ok.result.requestId;
    const doc = (await adminDb.doc(`requests/${requestId}`).get()).data()!;
    expect(doc.requestedBy).toEqual({ uid: m.uid, memberId: 'SKAMP001', name: 'Test Member 31' });
  });

  it('coordinator approves → patient created and public view written', async () => {
    const asMember = await call('reviewRequest', { requestId, decision: 'approve' }, m.idToken);
    const res = await call('reviewRequest', { requestId, decision: 'approve', note: 'Verified by visit' }, coordinator.idToken);
    const again = await call('reviewRequest', { requestId, decision: 'reject', note: 'x' }, coordinator.idToken);
    evidence('reviewRequest (member, coordinator approve, second review)', { asMember: asMember.error, res, again: again.error });
    expect(asMember.error?.status).toBe('PERMISSION_DENIED');
    expect(res.result.status).toBe('approved');
    expect(again.error?.status).toBe('FAILED_PRECONDITION');

    const patientId = (res.result.resultRef as string).split('/')[1]!;
    const p = (await adminDb.doc(`patients/${patientId}`).get()).data()!;
    expect(p).toMatchObject({ status: 'approved', source: 'request', requestId, phone: '+919812345678' });
    const pub = await waitFor(async () => (await adminDb.doc(`patientsPublic/${patientId}`).get()).data());
    evidence('patientsPublic doc (what members can read)', { ...pub, updatedAt: '<ts>' });
    expect(Object.keys(pub).sort()).toEqual(['category', 'name', 'need', 'status', 'updatedAt']);
  });

  it('rejections need a note; members can cancel pending requests', async () => {
    const r2 = await call('submitRequest', { type: 'patient_add', payload: patient }, m.idToken);
    const noNote = await call('reviewRequest', { requestId: r2.result.requestId, decision: 'reject' }, admin.idToken);
    const cancel = await call('cancelRequest', { requestId: r2.result.requestId }, m.idToken);
    evidence('reject without note / cancel', { noNote: noNote.error, cancel });
    expect(noNote.error?.status).toBe('INVALID_ARGUMENT');
    expect(cancel.result.status).toBe('cancelled');
  });
});

describe('equipment issue and return', () => {
  it('issues once, blocks double issue, returns with history', async () => {
    const p = await adminDb.collection('patients').add({ name: 'Ayisha', status: 'active' });
    const eq = await adminDb.collection('equipment').add({ code: 'WC-01', type: 'wheelchair', name: 'Wheelchair (foldable)', condition: 'good', status: 'available', currentAssignment: null });
    const issue = { equipmentId: eq.id, patientId: p.id, issuedTo: 'Ayisha (daughter Safa)', phone: '+919800000001', issuedAt: '2026-10-28', expectedReturn: '2026-12-28', deposit: 500 };
    const first = await call('issueEquipment', issue, coordinator.idToken);
    const second = await call('issueEquipment', issue, coordinator.idToken);
    const item = (await eq.get()).data()!;
    evidence('issueEquipment (first, second)', { first, second: second.error, item: { status: item.status, currentAssignment: item.currentAssignment } });
    expect(first.result.status).toBe('assigned');
    expect(second.error?.status).toBe('FAILED_PRECONDITION');
    expect(item.currentAssignment).toMatchObject({ patientId: p.id, patientName: 'Ayisha' });

    const ret = await call('returnEquipment', { equipmentId: eq.id, returnedAt: '2026-11-20', condition: 'needs_repair', notes: 'Brake loose' }, coordinator.idToken);
    const history = (await eq.collection('assignments').get()).docs.map((d) => d.data());
    evidence('returnEquipment needs_repair → maintenance, history', { ret, history: history.map((h) => ({ patientName: h.patientName, issuedAt: h.issuedAt, returnedAt: h.returnedAt, returnCondition: h.returnCondition })) });
    expect(ret.result.status).toBe('maintenance');
    expect(history).toHaveLength(1);
    expect((await eq.get()).get('currentAssignment')).toBeNull();
  });
});

describe('donation totals', () => {
  it('recomputes received/given on the linked patient', async () => {
    const p = await adminDb.collection('patients').add({ name: 'Moideen', status: 'active', totals: { received: 0, given: 0 } });
    await adminDb.collection('donations').add({ direction: 'in', amount: 5000, patientId: p.id, date: '2026-10-01', mode: 'upi' });
    await adminDb.collection('donations').add({ direction: 'in', amount: 2500, patientId: p.id, date: '2026-10-02', mode: 'cash' });
    await adminDb.collection('donations').add({ direction: 'out', amount: 4000, patientId: p.id, date: '2026-10-03', mode: 'bank' });
    const totals = await waitFor(async () => {
      const t = (await p.get()).get('totals');
      return t?.received === 7500 && t?.given === 4000 ? t : null;
    });
    evidence('patients/{id}.totals after 3 donations', totals);
    expect(totals).toEqual({ received: 7500, given: 4000 });
  });
});

describe('audit trail', () => {
  it('logs staff writes with actor and changed fields', async () => {
    const logs = await waitFor(async () => {
      const s = await adminDb.collection('auditLogs').where('collection', '==', 'members').get();
      return s.size > 0 ? s.docs.map((d) => d.data()) : null;
    });
    const create = logs.find((l) => l.action === 'create')!;
    evidence('auditLogs entry for createMember', { collection: create.collection, docId: create.docId, action: create.action, actor: create.actor, changed: create.changed });
    expect(create.actor).toBe(admin.uid);
  });
});
