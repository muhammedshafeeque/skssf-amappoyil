# SKAMP-87 — Create Firebase dev and prod projects on Blaze in asia-south1

Branch: `feature/SKAMP-87-firebase-projects` · Status: **partially done** (see "Still needed")

## What was done
New projects could not be created: both Google accounts available to the CLI hit the GCP
project quota (`The project cannot be created because you have exceeded your allotted project quota.`).
As agreed, the existing project **`skssf-158ed`** is used as the dev project.

- `.firebaserc` — `default` and `dev` aliases → `skssf-158ed`.
- `firebase.json` — Firestore rules/indexes, Storage rules, Functions (`nodejs22`, esbuild predeploy),
  Hosting for `apps/admin/dist` with SPA rewrite.
- `firebase/firestore.rules`, `firebase/storage.rules` — deny-all until SKAMP-95/96.
- Registered apps in Firebase (CLI `apps:create`) and saved their SDK configs:
  - Android `org.skssf.amappoyil` → `apps/mobile/google-services.json`
  - iOS `org.skssf.amappoyil` → `apps/mobile/GoogleService-Info.plist`
  - Web "SKAMP Admin" → `apps/admin/.env.development` / `.env.production`

## Evidence

`firebase apps:create` (CLI output)
```
App ID: 1:570323624371:android:1647d8287e13b21fffebc6  Package name: org.skssf.amappoyil
App ID: 1:570323624371:ios:2fb2844ba28f82a2ffebc6      Bundle ID: org.skssf.amappoyil
App ID: 1:570323624371:web:1dc6f716846573a4ffebc6      Display name: SKAMP Admin
```

Identity Toolkit `GET /admin/v2/projects/skssf-158ed/config` → `200`
```json
"signIn": { "email": { "enabled": true }, "phoneNumber": { "enabled": true } }
```

Firestore `GET /v1/projects/skssf-158ed/databases/(default)` → `200`
```json
{ "locationId": "nam5", "type": "FIRESTORE_NATIVE", "databaseEdition": "STANDARD" }
```

Storage `GET /v1beta/projects/skssf-158ed/buckets` → `200`
```json
{ "buckets": [ { "name": "projects/skssf-158ed/buckets/skssf-158ed.appspot.com" } ] }
```

`firebase deploy --only firestore:rules,storage --dry-run`
```
✔  cloud.firestore: rules file firebase/firestore.rules compiled successfully
✔  Dry run complete!
```

Existing data check: `members` holds 2 test documents from 2022 (auto IDs, fields `id`, `mobile`);
they don't collide with SKAMP IDs and were left untouched. The live Firestore rules expired in 2022
(deny-all already).

## Still needed (owner action)
1. **Blaze plan** — link a billing account in the Firebase console (Cloud Functions API and Cloud
   Billing API are disabled; functions can't deploy until this is done) and set a budget alert.
2. **Region** — `skssf-158ed` is in `us-central` / Firestore `nam5`, which can't be changed.
   Functions will still run in `asia-south1` (set in code). A new prod project in `asia-south1`
   is recommended once project quota is available.
3. **Prod project** — add a `prod` alias to `.firebaserc` and replace `apps/admin/.env.production`.
4. **Deploy rules** — `firebase deploy --only firestore:rules,firestore:indexes,storage` (not run from
   automation).
