import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { COL } from '../shared';
import { db } from './firebase';

/**
 * Fixed-window rate limit stored in Firestore (rateLimits/{key}). Throws resource-exhausted
 * once `limit` calls happened within `windowSeconds`.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<void> {
  const id = createHash('sha256').update(key).digest('hex').slice(0, 40);
  const ref = db.collection(COL.rateLimits).doc(id);
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const data = snap.data() as { count: number; windowStart: Timestamp } | undefined;
    if (!data || now - data.windowStart.toMillis() > windowSeconds * 1000) {
      tx.set(ref, { count: 1, windowStart: Timestamp.fromMillis(now), expiresAt: Timestamp.fromMillis(now + windowSeconds * 1000) });
      return true;
    }
    if (data.count >= limit) return false;
    tx.update(ref, { count: data.count + 1 });
    return true;
  });
  if (!allowed) throw new HttpsError('resource-exhausted', 'Too many attempts. Please try again later.');
}
