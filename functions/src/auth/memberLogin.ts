import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { COL, isMemberId, lookupMemberSchema, maskPhone, normalizePhone } from '../shared';
import type { Member, SkampClaims } from '../shared';
import { auth, db } from '../lib/firebase';
import { parse } from '../lib/guards';
import { rateLimit } from '../lib/rateLimit';
import { updated } from '../lib/stamp';

const NOT_FOUND = "We couldn't find an active member with that ID. Please check it or contact the unit.";
const enforceAppCheck = process.env.ENFORCE_APP_CHECK === 'true';

async function findMember(id: string): Promise<Member | null> {
  const upper = id.trim().toUpperCase();
  let memberId: string | undefined;
  if (isMemberId(upper)) memberId = upper;
  else {
    const idx = await db.collection(COL.skssfIndex).doc(id.trim().toUpperCase()).get();
    memberId = idx.get('memberId');
  }
  if (!memberId) return null;
  const snap = await db.collection(COL.members).doc(memberId).get();
  return snap.exists ? (snap.data() as Member) : null;
}

/**
 * Login step 1 (no sign-in needed).
 * - `{ id }` → `{ memberId, maskedPhone }` — never the full number.
 * - `{ id, phone }` → `{ match: true, phone }` when the typed number is the registered one.
 * Unknown, inactive and blocked IDs get the same error. Rate limited per IP and per ID.
 */
export const lookupMember = onCall({ enforceAppCheck }, async (request) => {
  const input = parse(lookupMemberSchema, request.data);
  const ip = request.rawRequest?.ip ?? 'unknown';
  await rateLimit(`lookup:ip:${ip}`, 30, 3600);

  const member = await findMember(input.id);
  if (!member || member.status !== 'active') throw new HttpsError('not-found', NOT_FOUND);

  if (!input.phone) return { memberId: member.memberId, maskedPhone: maskPhone(member.phone) };

  await rateLimit(`lookup:phone:${member.memberId}`, 5, 3600);
  const typed = normalizePhone(input.phone);
  if (typed !== member.phone) {
    throw new HttpsError('invalid-argument', "That number doesn't match the one registered with the unit.");
  }
  return { memberId: member.memberId, match: true, phone: member.phone };
});

/**
 * Login step 2, after Firebase phone OTP. Links the auth user to the member whose registered
 * phone matches the verified phone_number and sets claims { role: 'member', memberId }.
 */
export const completeMemberLogin = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const phone = request.auth.token.phone_number as string | undefined;
  if (!phone) throw new HttpsError('failed-precondition', 'Sign in with your phone number.');

  const idx = await db.collection(COL.phoneIndex).doc(phone).get();
  const memberId = idx.get('memberId') as string | undefined;
  if (!memberId) throw new HttpsError('not-found', 'This number is not registered with the unit.');

  const ref = db.collection(COL.members).doc(memberId);
  const member = (await ref.get()).data() as Member | undefined;
  if (!member || member.phone !== phone) throw new HttpsError('not-found', 'This number is not registered with the unit.');
  if (member.status !== 'active') {
    throw new HttpsError('permission-denied', 'Your app access is paused. Please contact the unit.');
  }

  const user = await auth.getUser(request.auth.uid);
  const claims: SkampClaims = { ...(user.customClaims as SkampClaims | undefined), role: 'member', memberId };
  await auth.setCustomUserClaims(request.auth.uid, claims);
  if (member.authUid !== request.auth.uid) {
    await ref.update({ authUid: request.auth.uid, ...updated('system') });
  }
  return { memberId, name: member.name };
});
