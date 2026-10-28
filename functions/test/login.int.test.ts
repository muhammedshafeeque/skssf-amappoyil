import { beforeAll, describe, expect, it } from 'vitest';
import { adminAuth, adminDb, call, clearEmulators, evidence, member, phoneSignIn, refresh, staffToken } from './helpers';

beforeAll(async () => {
  await clearEmulators();
  const admin = await staffToken('admin@skamp.test', { role: 'admin' });
  await call('createMember', member(21, { skssfId: 'SK-2021' }), admin.idToken); // SKAMP001
  await call('createMember', member(22), admin.idToken); // SKAMP002
  await call('setMemberStatus', { memberId: 'SKAMP002', status: 'blocked', reason: 'Test' }, admin.idToken);
});

describe('lookupMember', () => {
  it('returns only the masked phone for a Unit Member ID or SKSSF ID', async () => {
    const byUnitId = await call('lookupMember', { id: 'skamp001' });
    const bySkssf = await call('lookupMember', { id: 'sk-2021' });
    evidence('lookupMember by SKAMP ID / SKSSF ID', { byUnitId, bySkssf });
    expect(byUnitId.result).toEqual({ memberId: 'SKAMP001', maskedPhone: '******0021' });
    expect(bySkssf.result).toEqual({ memberId: 'SKAMP001', maskedPhone: '******0021' });
    expect(JSON.stringify(byUnitId)).not.toContain('9000000021');
  });

  it('gives the same error for unknown and blocked IDs', async () => {
    const unknown = await call('lookupMember', { id: 'SKAMP999' });
    const blocked = await call('lookupMember', { id: 'SKAMP002' });
    evidence('lookupMember unknown / blocked', { unknown, blocked });
    expect(unknown.error?.status).toBe('NOT_FOUND');
    expect(blocked.error).toEqual(unknown.error);
  });

  it('confirms the typed number in any common format', async () => {
    const wrong = await call('lookupMember', { id: 'SKAMP001', phone: '9999999999' });
    const right = await call('lookupMember', { id: 'SKAMP001', phone: '90000 00021' });
    evidence('lookupMember confirm number (wrong / right)', { wrong, right });
    expect(wrong.error?.status).toBe('INVALID_ARGUMENT');
    expect(right.result).toEqual({ memberId: 'SKAMP001', match: true, phone: '+919000000021' });
  });

  it('rate limits number guesses per member ID', async () => {
    let last;
    for (let i = 0; i < 6; i++) last = await call('lookupMember', { id: 'SKAMP001', phone: `98765432${10 + i}` });
    evidence('lookupMember 7th number attempt within an hour', last);
    expect(last!.error?.status).toBe('RESOURCE_EXHAUSTED');
  });
});

describe('completeMemberLogin', () => {
  it('links the OTP login to the member and sets claims', async () => {
    const s = await phoneSignIn('+919000000021');
    const res = await call('completeMemberLogin', {}, s.idToken);
    evidence('completeMemberLogin after OTP', res);
    expect(res.result).toEqual({ memberId: 'SKAMP001', name: 'Test Member 21' });
    const token = await refresh(s.refreshToken);
    const claims = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString());
    evidence('ID token claims after refresh', { role: claims.role, memberId: claims.memberId, phone_number: claims.phone_number });
    expect(claims).toMatchObject({ role: 'member', memberId: 'SKAMP001' });
    expect((await adminDb.doc('members/SKAMP001').get()).get('authUid')).toBe(s.uid);
  });

  it('refuses blocked members and unknown numbers', async () => {
    const blocked = await call('completeMemberLogin', {}, (await phoneSignIn('+919000000022')).idToken);
    const unknown = await call('completeMemberLogin', {}, (await phoneSignIn('+919888888888')).idToken);
    evidence('completeMemberLogin blocked / unknown number', { blocked, unknown });
    expect(blocked.error?.status).toBe('PERMISSION_DENIED');
    expect(unknown.error?.status).toBe('NOT_FOUND');
    const user = await adminAuth.getUserByPhoneNumber('+919000000022');
    expect(user.customClaims ?? {}).toEqual({});
  });
});
