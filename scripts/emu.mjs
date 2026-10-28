// Small helpers for talking to the local emulator suite from scripts and evidence runs.
export const PROJECT = process.env.EMU_PROJECT ?? 'demo-skamp';
export const REGION = 'asia-south1';
const AUTH = 'http://127.0.0.1:9099';
const FUNCTIONS = 'http://127.0.0.1:5001';

/** POST to a callable function using the callable wire protocol ({ data } in, { result } out). */
export async function callable(name, data = {}, idToken) {
  const res = await fetch(`${FUNCTIONS}/${PROJECT}/${REGION}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data }),
  });
  return { status: res.status, body: await res.json() };
}

async function identity(path, body) {
  const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/${path}?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

/** Full phone OTP sign-in against the Auth emulator; returns the sign-in response. */
export async function phoneSignIn(phoneNumber) {
  const sent = await identity('accounts:sendVerificationCode', { phoneNumber, recaptchaToken: 'emulator' });
  const codes = await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/verificationCodes`).then((r) => r.json());
  const code = codes.verificationCodes.findLast((c) => c.sessionInfo === sent.body.sessionInfo).code;
  const signedIn = await identity('accounts:signInWithPhoneNumber', { sessionInfo: sent.body.sessionInfo, code });
  return { sent, code, signedIn };
}

/** Email/password sign-up (creates the user) or sign-in against the Auth emulator. */
export async function emailSignIn(email, password, create = false) {
  return identity(create ? 'accounts:signUp' : 'accounts:signInWithPassword', {
    email,
    password,
    returnSecureToken: true,
  });
}

/** Re-fetch an ID token so new custom claims are included. */
export async function refreshIdToken(refreshToken) {
  const res = await fetch(`${AUTH}/securetoken.googleapis.com/v1/token?key=demo-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });
  return res.json();
}

export function decodeClaims(idToken) {
  return JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());
}

export function show(label, value) {
  console.log(`\n### ${label}\n${JSON.stringify(value, null, 2)}`);
}
