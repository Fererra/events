// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const LAYERS = ['presentation', 'application', 'domain', 'infrastructure'];

/**
 * Module boundaries (modular monolith, LR2 §2.2):
 * a module may import another module ONLY through its public `index.ts`.
 * Any import that reaches into `<module>/<layer>/...` of a sibling module is forbidden.
 */
const crossModuleInternals = LAYERS.flatMap((layer) => [
  `../../*/${layer}/**`,
  `../../../*/${layer}/**`,
  `../../../../*/${layer}/**`,
  `**/modules/*/${layer}/**`,
]);

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'drizzle/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: crossModuleInternals,
              message:
                'Import other modules only through their public index.ts (e.g. "../../events/index.js").',
            },
          ],
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Domain layer must not depend on frameworks / ORM (LR2 §2.2).
    files: ['src/modules/*/domain/**/*.ts', 'src/shared/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['fastify', 'drizzle-orm', 'pg', 'argon2', 'jsonwebtoken', 'node-cron'],
          patterns: [
            {
              group: ['drizzle-orm/*', 'fastify/*'],
              message: 'Domain must stay framework-agnostic.',
            },
            { group: crossModuleInternals, message: 'Import other modules only through index.ts.' },
          ],
        },
      ],
    },
  },
  prettier,
);
