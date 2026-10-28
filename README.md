# SKSSF Amappoyil Unit App

| Folder | What | Stack |
|---|---|---|
| `functions/` | Backend: Cloud Functions + emulator tests | Firebase Functions v2, Node 22, TypeScript |
| `admin/` | Web admin for office-bearers | React + Vite + MUI |
| `skssf-amp/` | Member mobile app | React Native + Expo + React Native Firebase |
| `firebase/` | Firestore / Storage security rules and indexes | |

Each folder is a standalone npm project. Shared types and Zod schemas live in
`functions/src/shared/`; after editing them run `node scripts/sync-shared.mjs` to copy them into
`admin/src/shared/` and `skssf-amp/src/shared/`.

## Run locally (emulators)

Requires Node 22+, Java 21+ and firebase-tools.

```bash
cd functions && npm install && npm run emulators   # terminal 1 (auth, firestore, functions, storage, UI :4000)
cd functions && npm run seed                      # terminal 2: demo data + logins
cd admin && npm install && npm run dev:emulator   # admin at http://localhost:5173
```

Seeded logins: `admin@skamp.test` / `Passw0rd!` (super admin), `sahajari@skamp.test` / `Passw0rd!`
(coordinator). Members log in with `SKAMP001`…`SKAMP008` (phones `+91 90000 00001`…); the
emulator prints the OTP in its log.

## Tests

```bash
cd functions && npm test                 # unit tests (schemas, helpers)
cd functions && npm run test:emulators   # integration + security-rules tests against emulators
cd admin && npm run build
cd skssf-amp && npm run typecheck && npx expo-doctor
```

## Deploy (dev project `skssf-158ed`)

Needs the Blaze plan (Cloud Functions, phone SMS, backups).

```bash
cd functions && npm run bootstrap-super-admin -- --project skssf-158ed --email you@example.com
firebase deploy --only firestore,storage,functions,hosting
```

Mobile builds: `cd skssf-amp && npx eas-cli build --profile preview` (Android APK for testing).

Phone Auth test numbers on the dev project (no SMS): +91 99999 00001 → 111111,
+91 99999 00002 → 222222, +91 99999 00003 → 333333.
