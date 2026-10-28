// Integration-test helpers. Run under `firebase emulators:exec` (npm run test:emulators), which
// sets GCLOUD_PROJECT, FIREBASE_AUTH_EMULATOR_HOST and FIRESTORE_EMULATOR_HOST.
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { SkampClaims } from '../src/shared';

export const PROJECT = process.env.GCLOUD_PROJECT ?? 'demo-skamp';
const AUTH = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`;
const FIRESTORE = `http://${process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'}`;
const FUNCTIONS = 'http://127.0.0.1:5001';

if (getApps().length === 0) initializeApp({ projectId: PROJECT });
export const adminAuth = getAuth();
export const adminDb = getFirestore();

export interface CallResult<T = any> {
  status: number;
  result?: T;
  error?: { status: string; message: string; details?: unknown };
}

/** Calls a callable over HTTP exactly like the client SDKs do. */
export async function call<T = any>(name: string, data: unknown, idToken?: string): Promise<CallResult<T>> {
  const res = await fetch(`${FUNCTIONS}/${PROJECT}/asia-south1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ data }),
  });
  const body = (await res.json()) as { result?: T; error?: CallResult['error'] };
  return { status: res.status, ...body };
}

async function identity<T = any>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/${path}?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

export async function refresh(refreshToken: string): Promise<string> {
  const res = await fetch(`${AUTH}/securetoken.googleapis.com/v1/token?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  const body = (await res.json()) as { id_token: string };
  return body.id_token;
}

/** Email user with the given claims; returns a fresh ID token. */
export async function staffToken(email: string, claims: SkampClaims | null) {
  const password = 'Passw0rd!';
  const user = await adminAuth.getUserByEmail(email).catch(() => adminAuth.createUser({ email, password }));
  await adminAuth.setCustomUserClaims(user.uid, claims);
  const body = await identity<{ idToken: string; localId: string }>('accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });
  return { uid: body.localId, idToken: body.idToken };
}

/** Phone OTP sign-in against the Auth emulator (any number works; the code is read back). */
export async function phoneSignIn(phoneNumber: string) {
  const sent = await identity<{ sessionInfo: string }>('accounts:sendVerificationCode', {
    phoneNumber,
    recaptchaToken: 'emulator',
  });
  const codes = (await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/verificationCodes`).then((r) => r.json())) as {
    verificationCodes: { sessionInfo: string; code: string }[];
  };
  const code = codes.verificationCodes.findLast((c) => c.sessionInfo === sent.sessionInfo)!.code;
  const body = await identity<{ idToken: string; refreshToken: string; localId: string }>(
    'accounts:signInWithPhoneNumber',
    { sessionInfo: sent.sessionInfo, code },
  );
  return { uid: body.localId, idToken: body.idToken, refreshToken: body.refreshToken, code };
}

/** Full member login: phone OTP → completeMemberLogin → refreshed token with claims. */
export async function memberToken(phone: string) {
  const s = await phoneSignIn(phone);
  const res = await call('completeMemberLogin', {}, s.idToken);
  if (res.status !== 200) throw new Error(`completeMemberLogin failed: ${JSON.stringify(res)}`);
  return { uid: s.uid, idToken: await refresh(s.refreshToken) };
}

export async function clearEmulators() {
  await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
  await fetch(`${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
}

/** Polls until `fn` returns a truthy value (for Firestore triggers). */
export async function waitFor<T>(fn: () => Promise<T | null | undefined | false>, timeoutMs = 15_000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 250));
  }
}

export const member = (n: number, extra: Record<string, unknown> = {}) => ({
  name: `Test Member ${n}`,
  phone: `+9190000${String(n).padStart(5, '0')}`,
  bloodGroup: 'O+',
  fatherName: 'Father',
  houseName: 'House',
  address: 'Amappoyil',
  dob: '1995-05-05',
  ...extra,
});

/** Prints labelled API exchanges when EVIDENCE=1 so the test log doubles as evidence. */
export function evidence(label: string, value: unknown) {
  if (process.env.EVIDENCE) console.log(`\n### ${label}\n${JSON.stringify(value, null, 2)}`);
}
