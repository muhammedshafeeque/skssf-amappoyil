import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  ADMIN_ROLES,
  COL,
  UNIT_CODE,
  createMemberSchema,
  formatMemberId,
  setMemberStatusSchema,
  updateMemberSchema,
} from '../shared';
import type { Member } from '../shared';
import { auth, db } from '../lib/firebase';
import { parse, requireRole } from '../lib/guards';
import { created, updated } from '../lib/stamp';

const skssfKey = (id: string) => id.trim().toUpperCase();

/** Signs a member's app login out: clears claims and revokes refresh tokens. */
async function revokeLogin(uid: string | null | undefined) {
  if (!uid) return;
  await auth.setCustomUserClaims(uid, null).catch(() => undefined);
  await auth.revokeRefreshTokens(uid).catch(() => undefined);
}

/**
 * Creates a member with the next SKAMP ID. One transaction reads the counter and the phone /
 * SKSSF indexes, so concurrent creates can never share an ID or a phone number.
 */
export const createMember = onCall(async (request) => {
  const caller = requireRole(request, ADMIN_ROLES);
  const input = parse(createMemberSchema, request.data);

  const memberId = await db.runTransaction(async (tx) => {
    const counterRef = db.collection(COL.counters).doc('members');
    const phoneRef = db.collection(COL.phoneIndex).doc(input.phone);
    const skssfRef = input.skssfId ? db.collection(COL.skssfIndex).doc(skssfKey(input.skssfId)) : null;
    const [counter, phoneDoc, skssfDoc] = await Promise.all([
      tx.get(counterRef),
      tx.get(phoneRef),
      skssfRef ? tx.get(skssfRef) : Promise.resolve(null),
    ]);
    if (phoneDoc.exists) {
      throw new HttpsError('already-exists', `This phone number belongs to ${phoneDoc.get('memberId')}.`, {
        field: 'phone',
        memberId: phoneDoc.get('memberId'),
      });
    }
    if (skssfDoc?.exists) {
      throw new HttpsError('already-exists', `This SKSSF ID belongs to ${skssfDoc.get('memberId')}.`, {
        field: 'skssfId',
        memberId: skssfDoc.get('memberId'),
      });
    }
    const next = ((counter.get('lastNumber') as number | undefined) ?? 0) + 1;
    const id = formatMemberId(next);
    const member: Omit<Member, 'createdAt' | 'updatedAt'> = {
      memberId: id,
      ...input,
      skssfId: input.skssfId ? skssfKey(input.skssfId) : null,
      nameLower: input.name.toLowerCase(),
      status: 'active',
      statusReason: null,
      photoUrl: null,
      authUid: null,
      unitCode: UNIT_CODE,
    };
    tx.set(counterRef, { lastNumber: next }, { merge: true });
    tx.set(db.collection(COL.members).doc(id), { ...member, ...created(caller.uid) });
    tx.set(phoneRef, { memberId: id });
    if (skssfRef) tx.set(skssfRef, { memberId: id });
    return id;
  });

  return { memberId };
});

/**
 * Edits a member. Phone and SKSSF ID changes move their index docs in the same transaction;
 * a phone change also clears the linked login so the member signs in again with the new number.
 */
export const updateMember = onCall(async (request) => {
  const caller = requireRole(request, ADMIN_ROLES);
  const { memberId, changes } = parse(updateMemberSchema, request.data);

  const oldAuthUid = await db.runTransaction(async (tx) => {
    const ref = db.collection(COL.members).doc(memberId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', `No member ${memberId}.`);
    const current = snap.data() as Member;
    const patch: Record<string, unknown> = { ...changes, ...updated(caller.uid) };
    let unlink: string | null = null;

    const phoneChanged = changes.phone !== undefined && changes.phone !== current.phone;
    const newSkssf = changes.skssfId === undefined ? undefined : changes.skssfId ? skssfKey(changes.skssfId) : null;
    const skssfChanged = newSkssf !== undefined && newSkssf !== current.skssfId;

    const newPhoneRef = phoneChanged ? db.collection(COL.phoneIndex).doc(changes.phone!) : null;
    const newSkssfRef = skssfChanged && newSkssf ? db.collection(COL.skssfIndex).doc(newSkssf) : null;
    const [phoneDoc, skssfDoc] = await Promise.all([
      newPhoneRef ? tx.get(newPhoneRef) : Promise.resolve(null),
      newSkssfRef ? tx.get(newSkssfRef) : Promise.resolve(null),
    ]);
    if (phoneDoc?.exists) {
      throw new HttpsError('already-exists', `This phone number belongs to ${phoneDoc.get('memberId')}.`, { field: 'phone' });
    }
    if (skssfDoc?.exists) {
      throw new HttpsError('already-exists', `This SKSSF ID belongs to ${skssfDoc.get('memberId')}.`, { field: 'skssfId' });
    }

    if (phoneChanged) {
      tx.delete(db.collection(COL.phoneIndex).doc(current.phone));
      tx.set(newPhoneRef!, { memberId });
      patch.authUid = null;
      unlink = current.authUid;
    }
    if (skssfChanged) {
      if (current.skssfId) tx.delete(db.collection(COL.skssfIndex).doc(current.skssfId));
      if (newSkssfRef) tx.set(newSkssfRef, { memberId });
      patch.skssfId = newSkssf;
    }
    if (changes.name) patch.nameLower = changes.name.toLowerCase();
    tx.update(ref, patch);
    return unlink;
  });

  await revokeLogin(oldAuthUid);
  return { memberId, loginReset: Boolean(oldAuthUid) };
});

/** Activate, deactivate or block. Anything but active signs the member out of the app. */
export const setMemberStatus = onCall(async (request) => {
  const caller = requireRole(request, ADMIN_ROLES);
  const { memberId, status, reason } = parse(setMemberStatusSchema, request.data);
  const ref = db.collection(COL.members).doc(memberId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', `No member ${memberId}.`);
  if (status !== 'active' && !reason) {
    throw new HttpsError('invalid-argument', 'reason: Give a reason when deactivating or blocking.');
  }
  await ref.update({ status, statusReason: status === 'active' ? null : reason, ...updated(caller.uid) });
  if (status !== 'active') await revokeLogin(snap.get('authUid'));
  return { memberId, status };
});

export const deleteMember = onCall(async (request) => {
  const caller = requireRole(request, ['super_admin']);
  const memberId = String((request.data as { memberId?: string })?.memberId ?? '');
  const ref = db.collection(COL.members).doc(memberId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError('not-found', `No member ${memberId}.`);
  const m = snap.data() as Member;
  const batch = db.batch();
  batch.delete(ref);
  batch.delete(db.collection(COL.phoneIndex).doc(m.phone));
  if (m.skssfId) batch.delete(db.collection(COL.skssfIndex).doc(m.skssfId));
  // Leave a tombstone actor for the audit trail.
  batch.set(db.collection(COL.auditLogs).doc(), {
    collection: COL.members,
    docId: memberId,
    action: 'delete',
    actor: caller.uid,
    changed: [],
    before: m,
    after: null,
    at: FieldValue.serverTimestamp(),
  });
  await batch.commit();
  await revokeLogin(m.authUid);
  return { memberId, deleted: true };
});
