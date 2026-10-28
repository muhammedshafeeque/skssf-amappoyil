import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import type { RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

let env: RulesTestEnvironment;
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

const as = (uid: string, claims: Record<string, unknown>) => env.authenticatedContext(uid, claims).firestore();
const superAdmin = () => as('sa', { role: 'super_admin' });
const admin = () => as('ad', { role: 'admin' });
const coord = () => as('co', { role: 'sahajari_coordinator' });
const memberA = () => as('ma', { role: 'member', memberId: 'SKAMP001' });
const noRole = () => as('nr', {});
const anon = () => env.unauthenticatedContext().firestore();
const results: string[] = [];
const check = async (label: string, p: Promise<unknown>, allowed: boolean) => {
  await (allowed ? assertSucceeds(p) : assertFails(p));
  results.push(`${allowed ? 'ALLOW' : 'DENY '}  ${label}`);
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-skamp-rules',
    firestore: { host, port: Number(port), rules: readFileSync('../firebase/firestore.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'members/SKAMP001'), { name: 'A', phone: '+919000000001', status: 'active' });
    await setDoc(doc(db, 'members/SKAMP002'), { name: 'B', phone: '+919000000002', status: 'active' });
    await setDoc(doc(db, 'bloodDonors/SKAMP001'), { source: 'member', active: true, bloodGroup: 'O+', name: 'A' });
    await setDoc(doc(db, 'bloodDonors/SKAMP009'), { source: 'member', active: false, bloodGroup: 'O+', name: 'Inactive' });
    await setDoc(doc(db, 'patients/p1'), { name: 'P', phone: '+919800000000', status: 'active' });
    await setDoc(doc(db, 'patientsPublic/p1'), { name: 'P', need: 'Dialysis', status: 'active' });
    await setDoc(doc(db, 'equipment/e1'), { code: 'WC-01', status: 'assigned', currentAssignment: { patientId: 'p1' } });
    await setDoc(doc(db, 'equipment/e2'), { code: 'WC-02', status: 'available', currentAssignment: null });
    await setDoc(doc(db, 'posts/pub'), { title: 'Hi', status: 'published' });
    await setDoc(doc(db, 'posts/draft'), { title: 'Draft', status: 'draft' });
    await setDoc(doc(db, 'requests/r1'), { type: 'patient_add', status: 'pending', requestedBy: { uid: 'ma' } });
    await setDoc(doc(db, 'requests/r2'), { type: 'patient_add', status: 'pending', requestedBy: { uid: 'other' } });
    await setDoc(doc(db, 'auditLogs/a1'), { action: 'create' });
    await setDoc(doc(db, 'phoneIndex/+919000000001'), { memberId: 'SKAMP001' });
  });
});

afterAll(async () => {
  if (process.env.EVIDENCE) console.log(`\n### Firestore rules matrix\n${results.join('\n')}`);
  await env.cleanup();
});

describe('firestore.rules', () => {
  it('requires a role claim for everything', async () => {
    await check('anonymous reads committee', getDoc(doc(anon(), 'committee/x')), false);
    await check('signed in without role reads posts/pub', getDoc(doc(noRole(), 'posts/pub')), false);
  });

  it('members', async () => {
    await check('member reads own members/SKAMP001', getDoc(doc(memberA(), 'members/SKAMP001')), true);
    await check('member reads other members/SKAMP002', getDoc(doc(memberA(), 'members/SKAMP002')), false);
    await check('coordinator reads members/SKAMP002', getDoc(doc(coord(), 'members/SKAMP002')), true);
    await check('admin writes members directly', setDoc(doc(admin(), 'members/SKAMP003'), { name: 'x' }), false);
    await check('admin reads phoneIndex', getDoc(doc(admin(), 'phoneIndex/+919000000001')), false);
  });

  it('blood donors', async () => {
    await check('member reads active donor', getDoc(doc(memberA(), 'bloodDonors/SKAMP001')), true);
    await check('member reads inactive donor', getDoc(doc(memberA(), 'bloodDonors/SKAMP009')), false);
    await check('member lists donors where active==true', getDocs(query(collection(memberA(), 'bloodDonors'), where('active', '==', true))), true);
    const donor = { source: 'non_member', memberId: null, name: 'N', consent: { given: true }, updatedBy: 'ad', updatedAt: serverTimestamp() };
    await check('admin adds non-member donor with consent', setDoc(doc(admin(), 'bloodDonors/n1'), donor), true);
    await check('admin adds non-member donor without consent', setDoc(doc(admin(), 'bloodDonors/n2'), { ...donor, consent: { given: false } }), false);
    await check('coordinator adds donor', setDoc(doc(coord(), 'bloodDonors/n3'), { ...donor, updatedBy: 'co' }), false);
    await check('admin edits member donor location', updateDoc(doc(admin(), 'bloodDonors/SKAMP001'), { location: { place: 'Dubai' }, updatedBy: 'ad', updatedAt: serverTimestamp() }), true);
    await check('admin edits member donor bloodGroup (synced field)', updateDoc(doc(admin(), 'bloodDonors/SKAMP001'), { bloodGroup: 'A+', updatedBy: 'ad', updatedAt: serverTimestamp() }), false);
    await check('admin write without updatedBy stamp', updateDoc(doc(admin(), 'bloodDonors/n1'), { name: 'Q' }), false);
  });

  it('patients are staff-only; members get the public view', async () => {
    await check('member reads patients/p1', getDoc(doc(memberA(), 'patients/p1')), false);
    await check('member reads patientsPublic/p1', getDoc(doc(memberA(), 'patientsPublic/p1')), true);
    await check('coordinator reads patients/p1', getDoc(doc(coord(), 'patients/p1')), true);
    await check('member writes patientsPublic', setDoc(doc(memberA(), 'patientsPublic/p2'), { name: 'x' }), false);
  });

  it('equipment status only changes through functions', async () => {
    const st = { updatedBy: 'co', updatedAt: serverTimestamp() };
    await check('member reads equipment', getDoc(doc(memberA(), 'equipment/e1')), true);
    await check('coordinator edits name of assigned item', updateDoc(doc(coord(), 'equipment/e1'), { name: 'Chair', ...st }), true);
    await check('coordinator sets assigned item available', updateDoc(doc(coord(), 'equipment/e1'), { status: 'available', ...st }), false);
    await check('coordinator sets available item to maintenance', updateDoc(doc(coord(), 'equipment/e2'), { status: 'maintenance', ...st }), true);
    await check('coordinator sets currentAssignment', updateDoc(doc(coord(), 'equipment/e2'), { currentAssignment: { patientId: 'p1' }, ...st }), false);
    await check('member reads assignment history', getDoc(doc(memberA(), 'equipment/e1/assignments/x')), false);
  });

  it('posts, requests, audit, settings', async () => {
    await check('member reads published post', getDoc(doc(memberA(), 'posts/pub')), true);
    await check('member reads draft post', getDoc(doc(memberA(), 'posts/draft')), false);
    await check('coordinator creates post', setDoc(doc(coord(), 'posts/x'), { title: 'x', updatedBy: 'co', updatedAt: serverTimestamp() }), false);
    await check('admin creates post', setDoc(doc(admin(), 'posts/x'), { title: 'x', status: 'draft', updatedBy: 'ad', updatedAt: serverTimestamp() }), true);
    await check('member reads own request', getDoc(doc(memberA(), 'requests/r1')), true);
    await check("member reads someone else's request", getDoc(doc(memberA(), 'requests/r2')), false);
    await check('member creates request directly', setDoc(doc(memberA(), 'requests/r3'), { type: 'patient_add' }), false);
    await check('coordinator reads patient_add request', getDoc(doc(coord(), 'requests/r2')), true);
    await check('admin reads auditLogs', getDoc(doc(admin(), 'auditLogs/a1')), true);
    await check('coordinator reads auditLogs', getDoc(doc(coord(), 'auditLogs/a1')), false);
    await check('super admin writes auditLogs', setDoc(doc(superAdmin(), 'auditLogs/a2'), { x: 1 }), false);
    await check('admin updates settings/app', setDoc(doc(admin(), 'settings/app'), { eligibilityGapDays: 120, updatedBy: 'ad', updatedAt: serverTimestamp() }), true);
    await check('member updates settings/app', setDoc(doc(memberA(), 'settings/app'), { eligibilityGapDays: 1, updatedBy: 'ma', updatedAt: serverTimestamp() }), false);
    expect(results.length).toBeGreaterThan(30);
  });
});
