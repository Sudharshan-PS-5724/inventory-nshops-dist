import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    isolate: false,
    fileParallelism: false,
    maxWorkers: 1,
  },
});
