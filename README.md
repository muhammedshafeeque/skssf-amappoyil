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
