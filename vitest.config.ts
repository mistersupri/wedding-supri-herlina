import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@shared': path.resolve(__dirname, 'shared') } },
  test: {
    include: ['test/**/*.test.ts'],
    // The database tests share one embedded PostgreSQL, so files run one after another.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    globalSetup: ['test/support/globalSetup.ts'],
    env: { NODE_ENV: 'test' },
  },
});
