// Bundles functions into lib/index.js. @skamp/shared is inlined from source so the
// deployed package.json only lists npm dependencies (Cloud Build can't resolve workspace:*).
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: true,
  packages: 'external',
  alias: {
    '@skamp/shared': fileURLToPath(new URL('../packages/shared/src/index.ts', import.meta.url)),
  },
});
