import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    environment: 'node',
    hookTimeout: 60_000,
    testTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Entry point and type-only files (ports, event contracts) have no runtime logic.
      exclude: [
        'src/server.ts',
        'src/**/ports/**',
        'src/**/domain/*-repository.ts',
        'src/**/domain/*-events.ts',
        'src/shared/module.ts',
        'src/shared/application/**',
        'src/shared/infrastructure/db/database.ts',
      ],
      reporter: ['text', 'text-summary', 'html', 'json-summary'],
      // CI fails if coverage drops below these (current: ~97% lines, ~92% branches).
      thresholds: { lines: 90, statements: 90, branches: 85, functions: 85 },
      reportsDirectory: 'coverage',
    },
  },
});
