import { defineConfig } from 'drizzle-kit';

/**
 * Each module owns its tables in `infrastructure/*.schema.ts`.
 * `npm run db:generate` creates SQL migrations in ./drizzle,
 * they are applied automatically when the app starts.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/modules/*/infrastructure/*.schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://events:events@localhost:5432/events',
  },
});
