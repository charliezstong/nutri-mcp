import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    env: { LOG_LEVEL: 'error', ENABLE_USDA: 'true' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      // Entry point and barrel files only; tool modules are named index.ts too
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/{config,providers,resilience,services,transport,types,utils,tools}/index.ts',
        'src/providers/*/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
