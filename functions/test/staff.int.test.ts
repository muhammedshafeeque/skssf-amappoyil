import { beforeAll, describe, expect, it } from 'vitest';
import { adminAuth, adminDb, call, clearEmulators, evidence, staffToken } from './helpers';

let superAdmin: { uid: string; idToken: string };
let admin: { uid: string; idToken: string };

beforeAll(async () => {
  await clearEmulators();
  superAdmin = await staffToken('super@skamp.test', { role: 'super_admin' });
  admin = await staffToken('admin@skamp.test', { role: 'admin' });
});

describe('setStaffRole', () => {
  it('rejects unauthenticated and non-super-admin callers', async () => {
    const anon = await call('setStaffRole', { email: 'x@skamp.test', role: 'admin' });
    const asAdmin = await call('setStaffRole', { email: 'x@skamp.test', role: 'admin' }, admin.idToken);
    evidence('setStaffRole without sign-in / as admin', { anon, asAdmin });
    expect(anon.error?.status).toBe('UNAUTHENTICATED');
    expect(asAdmin.error?.status).toBe('PERMISSION_DENIED');
  });

  it('grants a role by email, creating the account', async () => {
    const res = await call(
      'setStaffRole',
      { email: 'Coordinator@SKAMP.test', displayName: 'Sahajari Coordinator', role: 'sahajari_coordinator' },
      superAdmin.idToken,
    );
    evidence('setStaffRole grant sahajari_coordinator', res);
    expect(res.status).toBe(200);
    const user = await adminAuth.getUser(res.result.uid);
    expect(user.customClaims).toEqual({ role: 'sahajari_coordinator' });
    expect((await adminDb.doc(`staff/${user.uid}`).get()).get('role')).toBe('sahajari_coordinator');
  });

  it('revokes a role and refuses changing your own', async () => {
    const target = await staffToken('old-admin@skamp.test', { role: 'admin' });
    const revoke = await call('setStaffRole', { uid: target.uid, role: null }, superAdmin.idToken);
    const self = await call('setStaffRole', { uid: superAdmin.uid, role: 'admin' }, superAdmin.idToken);
    evidence('setStaffRole revoke / self', { revoke, self });
    expect(revoke.result.claims).toEqual({});
    expect(self.error?.status).toBe('FAILED_PRECONDITION');
  });
});
