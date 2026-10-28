import { logger } from 'firebase-functions/v2';
import { COL } from '../shared';
import type { Role } from '../shared';
import { db, messaging } from './firebase';

export interface PushMessage {
  title: string;
  body: string;
  /** Deep link data, e.g. { screen: 'post', id: '...' } */
  data?: Record<string, string>;
}

const STALE = new Set(['messaging/registration-token-not-registered', 'messaging/invalid-registration-token']);

async function send(tokens: string[], msg: PushMessage): Promise<number> {
  let sent = 0;
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const res = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title: msg.title, body: msg.body },
      data: msg.data,
      android: { priority: 'high', notification: { channelId: 'default' } },
    });
    sent += res.successCount;
    const stale = res.responses
      .map((r, idx) => (r.error && STALE.has(r.error.code) ? batch[idx] : null))
      .filter((t): t is string => Boolean(t));
    await Promise.all(stale.map((t) => db.collection(COL.pushTokens).doc(t).delete()));
  }
  return sent;
}

async function tokens(field: 'role' | 'uid', values: string[]): Promise<string[]> {
  if (values.length === 0) return [];
  const snap = await db.collection(COL.pushTokens).where(field, 'in', values).get();
  return snap.docs.map((d) => d.id);
}

export async function pushToRoles(roles: Role[], msg: PushMessage): Promise<number> {
  const list = await tokens('role', roles);
  if (list.length === 0) return 0;
  try {
    return await send(list, msg);
  } catch (err) {
    logger.error('push to roles failed', err);
    return 0;
  }
}

export async function pushToUser(uid: string, msg: PushMessage): Promise<number> {
  const list = await tokens('uid', [uid]);
  if (list.length === 0) return 0;
  try {
    return await send(list, msg);
  } catch (err) {
    logger.error('push to user failed', err);
    return 0;
  }
}
