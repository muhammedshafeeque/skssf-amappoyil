import { defineConfig } from 'vitest/config';

// Integration tests against the emulator suite: `npm run test:emulators`.
export default defineConfig({
  test: {
    include: ['test/**/*.int.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
