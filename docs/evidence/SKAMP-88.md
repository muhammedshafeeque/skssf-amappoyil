# SKAMP-88 — Configure emulator suite and Phone Auth test numbers

Branch: `feature/SKAMP-88-emulators`

## What was added
- `firebase.json` `emulators`: auth 9099, functions 5001, firestore 8080, storage 9199,
  hosting 5000, UI 4000, `singleProjectMode`. Local project id `demo-skamp`.
- Root scripts `pnpm emulators` and `pnpm emulators:smoke`.
- `scripts/emu.mjs` — helpers for callables, phone/email sign-in and claims against the emulators
  (reused by later tasks' evidence).
- `scripts/smoke-emulators.mjs` — calls `ping` and runs a full phone OTP sign-in.
- `apps/admin/src/lib/firebase.ts` — Firebase app/auth/firestore/functions(`asia-south1`)/storage;
  connects to emulators when `VITE_USE_EMULATORS=true` (`.env.emulator`, `pnpm dev:emulator`).
- Phone Auth test numbers on dev project `skssf-158ed` (set via Identity Toolkit admin API).
- README: emulator usage, Java 21 requirement, test numbers.

## Evidence

Identity Toolkit `PATCH /admin/v2/projects/skssf-158ed/config?updateMask=signIn.phoneNumber.testPhoneNumbers` → `200`
```json
"phoneNumber": {
  "enabled": true,
  "testPhoneNumbers": {
    "+919999900001": "111111",
    "+919999900002": "222222",
    "+919999900003": "333333"
  }
}
```

`pnpm emulators:smoke`
```
✔  functions[asia-south1-ping]: http function initialized (http://127.0.0.1:5001/demo-skamp/asia-south1/ping).

### POST ping (callable)
{ "status": 200, "body": { "result": { "ok": true, "region": "asia-south1", "at": "2026-10-28T13:43:54.501Z" } } }

i  To verify the phone number +919999900001, use the code 056546.

### POST accounts:sendVerificationCode
{ "status": 200, "sessionInfo": "xzSHIGnXkz-e…" }

### GET emulator verificationCodes (OTP received)
{ "code": "056546" }

### POST accounts:signInWithPhoneNumber
{ "status": 200, "phoneNumber": "+919999900001", "localId": "KpzDR3vFRUaxOpiAfaBsD4dEF2dx", "isNewUser": true, "idToken": "<jwt>" }

✔  Script exited successfully (code 0)
```
