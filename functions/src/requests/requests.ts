import { FieldValue } from 'firebase-admin/firestore';
import type { Transaction } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import {
  ADMIN_ROLES,
  COL,
  SAHAJARI_REQUEST_TYPES,
  STAFF_ROLES,
  reviewRequestSchema,
  submitRequestSchema,
} from '../shared';
import type { Member, PatientAddPayload, RequestDoc, RequestType } from '../shared';
import { db } from '../lib/firebase';
import { parse, requireRole } from '../lib/guards';
import { created } from '../lib/stamp';

const MAX_PENDING = 10;

/** Per-type approval handlers. Each creates the real record and returns its path. */
const handlers: Record<RequestType, (tx: Transaction, req: RequestDoc, reqId: string, reviewer: string) => string> = {
  patient_add(tx, req, reqId, reviewer) {
    const p = req.payload as PatientAddPayload;
    const ref = db.collection(COL.patients).doc();
    tx.set(ref, {
      name: p.name,
      age: p.age,
      gender: p.gender,
      phone: p.phone,
      address: p.address,
      condition: p.condition,
      need: p.need,
      category: p.category,
      supportTypes: p.supportTypes,
      status: 'approved',
      notes: [p.relation ? `Requested by ${req.requestedBy.name} (${req.requestedBy.memberId}), relation: ${p.relation}` : `Requested by ${req.requestedBy.name} (${req.requestedBy.memberId})`, p.note]
        .filter(Boolean)
        .join('\n'),
      source: 'request',
      requestId: reqId,
      totals: { received: 0, given: 0 },
      ...created(reviewer),
    });
    return ref.path;
  },
};

export const submitRequest = onCall(async (request) => {
  const caller = requireRole(request, ['member']);
  if (!caller.memberId) throw new HttpsError('failed-precondition', 'No member linked to this login.');
  const input = parse(submitRequestSchema, request.data);

  const pending = await db
    .collection(COL.requests)
    .where('requestedBy.uid', '==', caller.uid)
    .where('status', '==', 'pending')
    .count()
    .get();
  if (pending.data().count >= MAX_PENDING) {
    throw new HttpsError('resource-exhausted', `You already have ${MAX_PENDING} pending requests.`);
  }

  const member = (await db.collection(COL.members).doc(caller.memberId).get()).data() as Member | undefined;
  const ref = db.collection(COL.requests).doc();
  await ref.set({
    type: input.type,
    status: 'pending',
    payload: input.payload,
    requestedBy: { uid: caller.uid, memberId: caller.memberId, name: member?.name ?? caller.memberId },
    review: null,
    resultRef: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: caller.uid,
  });
  return { requestId: ref.id, status: 'pending' };
});

export const cancelRequest = onCall(async (request) => {
  const caller = requireRole(request, ['member']);
  const requestId = String((request.data as { requestId?: string })?.requestId ?? '');
  if (!requestId) throw new HttpsError('invalid-argument', 'requestId: Required');
  const ref = db.collection(COL.requests).doc(requestId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const req = snap.data() as RequestDoc | undefined;
    if (!req || req.requestedBy.uid !== caller.uid) throw new HttpsError('not-found', 'Request not found.');
    if (req.status !== 'pending') throw new HttpsError('failed-precondition', `Request is already ${req.status}.`);
    tx.update(ref, { status: 'cancelled', updatedAt: FieldValue.serverTimestamp(), updatedBy: caller.uid });
  });
  return { requestId, status: 'cancelled' };
});

/** Approve or reject. Admins review everything; Sahajari coordinators only Sahajari types. */
export const reviewRequest = onCall(async (request) => {
  const caller = requireRole(request, STAFF_ROLES);
  const { requestId, decision, note } = parse(reviewRequestSchema, request.data);
  const ref = db.collection(COL.requests).doc(requestId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'Request not found.');
    const req = snap.data() as RequestDoc;
    const isAdmin = (ADMIN_ROLES as readonly string[]).includes(caller.role);
    if (!isAdmin && !SAHAJARI_REQUEST_TYPES.includes(req.type)) {
      throw new HttpsError('permission-denied', 'You can only review Sahajari requests.');
    }
    if (req.status !== 'pending') throw new HttpsError('failed-precondition', `Request is already ${req.status}.`);
    if (decision === 'reject' && !note) throw new HttpsError('invalid-argument', 'note: Give a reason for rejecting.');

    const resultRef = decision === 'approve' ? handlers[req.type](tx, req, requestId, caller.uid) : null;
    tx.update(ref, {
      status: decision === 'approve' ? 'approved' : 'rejected',
      review: { by: caller.uid, at: FieldValue.serverTimestamp(), note },
      resultRef,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller.uid,
    });
    return { requestId, status: decision === 'approve' ? 'approved' : 'rejected', resultRef };
  });
});
