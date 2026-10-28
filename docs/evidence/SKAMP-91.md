# SKAMP-91 — Set up GitHub Actions CI and EAS build profiles

Branch: `feature/SKAMP-91-ci-eas`

## What was added
- `.github/workflows/ci.yml` — on push (main, feature/**) and pull requests: pnpm install
  (frozen lockfile), build, lint, typecheck, test, then emulator tests (Java 21 + firebase-tools 15).
- `.github/workflows/deploy.yml` — after CI succeeds on main, deploys Firestore/Storage rules,
  functions and the admin web to the `dev` project. Skips with a message until the repository
  secret `FIREBASE_SERVICE_ACCOUNT` is added (and Blaze is enabled — see SKAMP-87).
- `apps/mobile/eas.json` — `development` (dev client, internal APK), `preview` (internal APK),
  `production` (Play app bundle, remote auto-increment); `submit.production` → Play internal track.
- Root `pnpm test:emulators` (grows as rules/function tests are added).

## Evidence — GitHub Actions run on commit 5249047
Run: https://github.com/muhammedshafeeque/skssf-amappoyil/actions/runs/40704013626

`GET /repos/muhammedshafeeque/skssf-amappoyil/actions/runs/40704013626/jobs`
```
Lint, typecheck, test success https://github.com/muhammedshafeeque/skssf-amappoyil/actions/runs/40704013626/job/122871123075
   1 Set up job -> success
   2 Run actions/checkout@v4 -> success
   3 Run pnpm/action-setup@v4 -> success
   4 Run actions/setup-node@v4 -> success
   5 Run actions/setup-java@v4 -> success
   6 Run pnpm install --frozen-lockfile -> success
   7 Run pnpm build -> success
   8 Run pnpm lint -> success
   9 Run pnpm typecheck -> success
   10 Run pnpm test -> success
   11 Emulator tests -> success
   19 Post Run actions/setup-java@v4 -> success
   20 Post Run actions/setup-node@v4 -> success
   21 Post Run pnpm/action-setup@v4 -> success
   22 Post Run actions/checkout@v4 -> success
   23 Complete job -> success
```

## Owner follow-up
- Add `FIREBASE_SERVICE_ACCOUNT` secret to enable deploys.
- Run `npx eas-cli@latest init` once with the unit's Expo account to link `projectId` in app.json;
  EAS builds then use these profiles.
