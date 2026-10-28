import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { COL, SAHAJARI_REQUEST_TYPES, registerPushTokenSchema } from '../shared';
import type { Post, RequestDoc, SkampClaims } from '../shared';
import { db } from '../lib/firebase';
import { parse } from '../lib/guards';
import { pushToRoles, pushToUser } from '../lib/push';

/** Stores (or removes on logout) the caller's FCM token. */
export const registerPushToken = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const claims = request.auth.token as SkampClaims;
  const input = parse(registerPushTokenSchema, request.data);
  const ref = db.collection(COL.pushTokens).doc(input.token);
  if (input.remove) {
    await ref.delete();
    return { removed: true };
  }
  await ref.set({
    uid: request.auth.uid,
    memberId: claims.memberId ?? null,
    role: claims.role ?? null,
    platform: input.platform,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { registered: true };
});

/** Sends a push to members once when a post is published with "notify". */
export const onPostWritten = onDocumentWritten(`${COL.posts}/{postId}`, async (event) => {
  const after = event.data?.after.exists ? (event.data.after.data() as Post) : null;
  if (!after || after.status !== 'published' || !after.notify || after.notifiedAt) return;
  const sent = await pushToRoles(['member'], {
    title: after.title,
    body: after.body.replace(/\s+/g, ' ').slice(0, 140),
    data: { screen: 'post', id: event.params.postId },
  });
  await event.data!.after.ref.update({ notifiedAt: FieldValue.serverTimestamp(), notifiedCount: sent });
});

/** New request → staff; decision → the member who asked. */
export const onRequestWritten = onDocumentWritten(`${COL.requests}/{requestId}`, async (event) => {
  const before = event.data?.before.exists ? (event.data.before.data() as RequestDoc) : null;
  const after = event.data?.after.exists ? (event.data.after.data() as RequestDoc) : null;
  if (!after) return;
  const id = event.params.requestId;

  if (!before && after.status === 'pending') {
    const roles: ('super_admin' | 'admin' | 'sahajari_coordinator')[] = ['super_admin', 'admin'];
    if (SAHAJARI_REQUEST_TYPES.includes(after.type)) roles.push('sahajari_coordinator');
    await pushToRoles(roles, {
      title: 'New member request',
      body: `${after.requestedBy.name}: add patient ${after.payload.name}`,
      data: { screen: 'request', id },
    });
    return;
  }

  if (before?.status === 'pending' && (after.status === 'approved' || after.status === 'rejected')) {
    await pushToUser(after.requestedBy.uid, {
      title: after.status === 'approved' ? 'Request approved' : 'Request not approved',
      body: `${after.payload.name}${after.review?.note ? ` — ${after.review.note}` : ''}`,
      data: { screen: 'request', id },
    });
  }
});
