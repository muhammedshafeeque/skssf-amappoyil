# SKSSF Amappoyil Unit App (SKAMP)

Firebase backend, Expo member app and React web admin for the SKSSF Amappoyil unit.
Work is tracked in Atrium project **SKAMP**; design notes live in the **SKAMPDOC** space.

## Layout

| Path | What |
|---|---|
| `apps/mobile` | Member app — React Native + Expo (TypeScript) |
| `apps/admin` | Web admin — React + Vite + MUI |
| `functions` | Cloud Functions 2nd gen (Node 22, TypeScript, bundled with esbuild) |
| `packages/shared` | Types, Zod schemas and helpers shared by all three |
| `docs/evidence` | Per-task evidence (test output, API responses) |

## Getting started

```bash
pnpm install        # Node >= 22, pnpm 10
pnpm build          # turbo: shared -> functions/admin
pnpm test
pnpm typecheck
```

`node-linker=hoisted` (see `.npmrc`) keeps a flat `node_modules`, which Metro needs.
`functions` does not depend on `@skamp/shared` through package.json: the esbuild bundle
inlines it, so the deployed package only lists npm dependencies.

## Firebase

| Alias | Project | Notes |
|---|---|---|
| `dev` (default) | `skssf-158ed` | Dev project. Prod project still to be created (SKAMP-87). |
| emulators | `demo-skamp` | Local only — `demo-` projects never touch real resources. |

### Emulators

Requires **Java 21+** (firebase-tools 15).

```bash
pnpm emulators            # auth 9099, firestore 8080, functions 5001, storage 9199, UI 4000
pnpm emulators:smoke      # ping callable + phone OTP sign-in, prints the API responses
pnpm --filter @skamp/admin dev:emulator   # admin web against the emulators
```

In the emulator any phone number works; the OTP is printed in the emulator log and is
available at `GET http://127.0.0.1:9099/emulator/v1/projects/demo-skamp/verificationCodes`.

Phone Auth test numbers on the dev project (no SMS is sent):

| Number | Code |
|---|---|
| +91 99999 00001 | 111111 |
| +91 99999 00002 | 222222 |
| +91 99999 00003 | 333333 |
