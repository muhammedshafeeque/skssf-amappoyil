import { beforeAll, describe, expect, it } from 'vitest';
import { adminAuth, adminDb, call, clearEmulators, evidence, member, memberToken, staffToken, waitFor } from './helpers';

let admin: { uid: string; idToken: string };

beforeAll(async () => {
  await clearEmulators();
  admin = await staffToken('admin@skamp.test', { role: 'admin' });
});

describe('createMember', () => {
  it('creates SKAMP001 and only admins may call it', async () => {
    const coordinator = await staffToken('coord@skamp.test', { role: 'sahajari_coordinator' });
    const denied = await call('createMember', member(1), coordinator.idToken);
    const res = await call('createMember', member(1, { skssfId: 'sk-1001' }), admin.idToken);
    evidence('createMember (coordinator, then admin)', { denied, res });
    expect(denied.error?.status).toBe('PERMISSION_DENIED');
    expect(res.result).toEqual({ memberId: 'SKAMP001' });
    const doc = (await adminDb.doc('members/SKAMP001').get()).data()!;
    expect(doc).toMatchObject({ status: 'active', skssfId: 'SK-1001', nameLower: 'test member 1', createdBy: admin.uid });
    expect((await adminDb.doc('phoneIndex/+919000000001').get()).get('memberId')).toBe('SKAMP001');
  });

  it('assigns unique sequential IDs under concurrent creates', async () => {
    const results = await Promise.all([2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => call('createMember', member(n), admin.idToken)));
    const ids = results.map((r) => r.result?.memberId).sort();
    evidence('10 concurrent createMember calls → IDs', ids);
    expect(new Set(ids).size).toBe(10);
    expect(ids).toEqual(['SKAMP002', 'SKAMP003', 'SKAMP004', 'SKAMP005', 'SKAMP006', 'SKAMP007', 'SKAMP008', 'SKAMP009', 'SKAMP010', 'SKAMP011']);
    expect((await adminDb.doc('counters/members').get()).get('lastNumber')).toBe(11);
  });

  it('rejects duplicate phone and SKSSF ID, and invalid input', async () => {
    const dupPhone = await call('createMember', member(99, { phone: '+919000000001' }), admin.idToken);
    const dupSkssf = await call('createMember', member(98, { skssfId: 'SK-1001' }), admin.idToken);
    const bad = await call('createMember', member(97, { bloodGroup: 'Z', dob: '05/05/1995' }), admin.idToken);
    evidence('createMember duplicates / invalid', { dupPhone, dupSkssf, bad: { status: bad.status, error: { status: bad.error?.status, message: bad.error?.message } } });
    expect(dupPhone.error?.status).toBe('ALREADY_EXISTS');
    expect(dupPhone.error?.message).toContain('SKAMP001');
    expect(dupSkssf.error?.status).toBe('ALREADY_EXISTS');
    expect(bad.error?.status).toBe('INVALID_ARGUMENT');
  });
});

describe('blood donor sync', () => {
  it('creates bloodDonors/{memberId} with default location and keeps it in sync', async () => {
    const donor = await waitFor(async () => (await adminDb.doc('bloodDonors/SKAMP001').get()).data());
    evidence('bloodDonors/SKAMP001 after createMember', { ...donor, createdAt: '<ts>', updatedAt: '<ts>', consent: { ...donor.consent, at: '<ts>' } });
    expect(donor).toMatchObject({
      source: 'member',
      memberId: 'SKAMP001',
      bloodGroup: 'O+',
      active: true,
      location: { place: 'Amappoyil', state: 'Kerala', country: 'India' },
      isLocal: true,
      lastDonated: null,
    });

    await adminDb.doc('bloodDonors/SKAMP001').update({ lastDonated: '2026-09-01', location: { place: 'Dubai', state: 'Dubai', country: 'UAE' } });
    await call('updateMember', { memberId: 'SKAMP001', changes: { bloodGroup: 'B+', name: 'Renamed Member' } }, admin.idToken);
    const synced = await waitFor(async () => {
      const d = (await adminDb.doc('bloodDonors/SKAMP001').get()).data();
      return d?.bloodGroup === 'B+' ? d : null;
    });
    expect(synced).toMatchObject({ name: 'Renamed Member', bloodGroup: 'B+', lastDonated: '2026-09-01', location: { place: 'Dubai' } });

    await call('setMemberStatus', { memberId: 'SKAMP001', status: 'inactive', reason: 'Moved away' }, admin.idToken);
    const inactive = await waitFor(async () => {
      const d = (await adminDb.doc('bloodDonors/SKAMP001').get()).data();
      return d?.active === false ? d : null;
    });
    evidence('bloodDonors/SKAMP001 after edit + deactivate', { name: inactive.name, bloodGroup: inactive.bloodGroup, active: inactive.active, lastDonated: inactive.lastDonated, location: inactive.location });
    await call('setMemberStatus', { memberId: 'SKAMP001', status: 'active' }, admin.idToken);
  });
});

describe('updateMember phone change and status', () => {
  it('moves the phone index and signs out the old login', async () => {
    // IDs from the concurrent test are in arbitrary order, so resolve the ID from the phone.
    const id = (await adminDb.doc('phoneIndex/+919000000002').get()).get('memberId') as string;
    const login = await memberToken('+919000000002');
    expect((await adminAuth.getUser(login.uid)).customClaims).toEqual({ role: 'member', memberId: id });

    const res = await call('updateMember', { memberId: id, changes: { phone: '+919111111112' } }, admin.idToken);
    evidence('updateMember phone change', res);
    expect(res.result).toEqual({ memberId: id, loginReset: true });
    expect((await adminDb.doc('phoneIndex/+919000000002').get()).exists).toBe(false);
    expect((await adminDb.doc('phoneIndex/+919111111112').get()).get('memberId')).toBe(id);
    expect((await adminDb.doc(`members/${id}`).get()).get('authUid')).toBeNull();
    expect((await adminAuth.getUser(login.uid)).customClaims ?? {}).toEqual({});
  });

  it('blocking requires a reason and revokes the login', async () => {
    const id = (await adminDb.doc('phoneIndex/+919000000003').get()).get('memberId') as string;
    const login = await memberToken('+919000000003');
    const noReason = await call('setMemberStatus', { memberId: id, status: 'blocked' }, admin.idToken);
    const res = await call('setMemberStatus', { memberId: id, status: 'blocked', reason: 'Misuse' }, admin.idToken);
    evidence('setMemberStatus blocked', { noReason: noReason.error, res });
    expect(noReason.error?.status).toBe('INVALID_ARGUMENT');
    expect(res.result).toEqual({ memberId: id, status: 'blocked' });
    const user = await adminAuth.getUser(login.uid);
    expect(user.customClaims ?? {}).toEqual({});
    expect(new Date(user.tokensValidAfterTime!).getTime()).toBeGreaterThan(Date.now() - 60_000);
  });
});
