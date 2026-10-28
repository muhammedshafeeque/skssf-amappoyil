# SKAMP-89 — Scaffold pnpm/Turborepo monorepo (mobile, admin, functions, shared)

Branch: `feature/SKAMP-89-monorepo-scaffold`

## What was added
- Root: `package.json` (pnpm 10.33.0, turbo scripts), `pnpm-workspace.yaml`, `turbo.json`
  (`build`, `lint`, `typecheck`, `test` with `^build` dependency), `tsconfig.base.json`, `.npmrc`
  (`node-linker=hoisted` for Metro), `.gitignore`.
- `packages/shared` — `@skamp/shared`, ESM, built with `tsc` to `dist/`; exports `REGION`
  (`asia-south1`) and `MEMBER_ID_PREFIX` (`SKAMP`).
- `functions` — `@skamp/functions`, Node 22, firebase-functions 6 / firebase-admin 13,
  bundled with esbuild (`build.mjs`) which inlines `@skamp/shared`; `ping` callable as a health check.
- `apps/admin` — `@skamp/admin`, React 19 + Vite 7 + MUI 7, Vitest + Testing Library.
- `apps/mobile` — `@skamp/mobile`, Expo SDK 58 (blank TypeScript template), package
  `org.skssf.amappoyil`, scheme `skamp`, imports `@skamp/shared`.

## Evidence

`pnpm build`
```
@skamp/admin:build: vite v7.3.7 building client environment for production...
@skamp/admin:build: ✓ 924 modules transformed.
@skamp/admin:build: dist/assets/index-DCTG2Ycl.js  306.76 kB │ gzip: 98.58 kB
 Tasks:    3 successful, 3 total
```

`pnpm typecheck`
```
 Tasks:    5 successful, 5 total
```

`pnpm test`
```
@skamp/shared:test:  ✓ src/index.test.ts (1 test) 2ms
@skamp/shared:test:  Test Files  1 passed (1)
@skamp/functions:test: No test files found, exiting with code 0
@skamp/admin:test:  ✓ src/App.test.tsx (1 test) 21ms
@skamp/admin:test:  Test Files  1 passed (1)
 Tasks:    5 successful, 5 total
```

Mobile bundle through Metro (proves workspace resolution of `@skamp/shared`):
`npx expo export --platform android`
```
› android bundles (1):
_expo/static/js/android/index-498138b5b583f582d805638995696b6a.hbc (1.6MB)
```
