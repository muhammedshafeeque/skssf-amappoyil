# SKSSF Amappoyil Unit App (SKAMP)

Firebase backend, Expo member app and React web admin for the SKSSF Amappoyil unit.

| Path | What | Run |
|---|---|---|
| `functions/` | Cloud Functions (TypeScript, Node 22) + emulator tests | `cd functions && npm i && npm test` |
| `admin/` | Web admin — Vite + React + MUI | `cd admin && npm i && npm run dev` |
| `mobile/` | Member app — Expo + React Native Firebase | `cd mobile && npm i && npx expo start` |
| `firebase/` | Firestore / Storage rules and indexes | |
| `docs/` | Plan (01–09) and per-task evidence | |

Each project is standalone (own `package.json` and lockfile). Shared types and Zod schemas live in
`functions/src/shared/` and are copied to `admin/src/shared/` and `mobile/src/shared/` with
`node scripts/sync-shared.mjs`.

## Plan
1. [Overview](docs/01-overview.md) · 2. [Architecture](docs/02-architecture.md) ·
3. [Data model](docs/03-data-model.md) · 4. [Security rules](docs/04-security-rules.md) ·
5. [Cloud Functions](docs/05-cloud-functions.md) · 6. [Screens](docs/06-screens.md) ·
7. [Auth flow](docs/07-auth-flow.md) · 8. [Roadmap](docs/08-roadmap.md) · 9. [Risks](docs/09-risks.md)

## Firebase
| Alias | Project | Notes |
|---|---|---|
| `dev` (default) | `skssf-158ed` | Dev project |
| emulators | `demo-skamp` | Local only — never touches real resources |

Emulators need **Java 21+**: `firebase emulators:start --project demo-skamp`.

Phone Auth test numbers on the dev project (no SMS sent): +91 99999 00001 → 111111,
+91 99999 00002 → 222222, +91 99999 00003 → 333333.
