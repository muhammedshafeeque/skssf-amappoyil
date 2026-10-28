import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { COL, setStaffRoleSchema } from '../shared';
import type { SkampClaims } from '../shared';
import { auth, db } from '../lib/firebase';
import { parse, requireRole } from '../lib/guards';

/**
 * Grant or revoke a web-admin role (super admin only). A new email creates the account without
 * a password; the person sets one with "Forgot password". Revoking also revokes refresh tokens.
 * A super admin cannot change their own role, so the unit can't lock itself out.
 */
export const setStaffRole = onCall(async (request) => {
  const caller = requireRole(request, ['super_admin']);
  const input = parse(setStaffRoleSchema, request.data);

  const user = input.uid
    ? await auth.getUser(input.uid).catch(() => {
        throw new HttpsError('not-found', 'No user with that uid.');
      })
    : await auth.getUserByEmail(input.email!).catch(async (err: { code?: string }) => {
        if (err.code !== 'auth/user-not-found') throw err;
        if (input.role === null) throw new HttpsError('not-found', 'No user with that email.');
        return auth.createUser({ email: input.email, displayName: input.displayName });
      });

  if (user.uid === caller.uid) throw new HttpsError('failed-precondition', 'You cannot change your own role.');

  const claims: SkampClaims = { ...(user.customClaims as SkampClaims | undefined) };
  if (input.role) claims.role = input.role;
  else if (claims.memberId) claims.role = 'member';
  else delete claims.role;
  await auth.setCustomUserClaims(user.uid, claims);
  if (input.role === null) await auth.revokeRefreshTokens(user.uid);
  if (input.displayName && input.displayName !== user.displayName) {
    await auth.updateUser(user.uid, { displayName: input.displayName });
  }

  await db.collection(COL.staff).doc(user.uid).set(
    {
      email: user.email ?? null,
      displayName: input.displayName ?? user.displayName ?? null,
      role: input.role,
      updatedBy: caller.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { uid: user.uid, email: user.email ?? null, role: input.role, claims };
});
