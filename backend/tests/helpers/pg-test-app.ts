import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { buildApp, modules } from '../../src/app.js';
import { loadConfig } from '../../src/shared/config/env.js';
import type { Database } from '../../src/shared/infrastructure/db/database.js';
import { connectPostgres, runMigrations } from '../../src/shared/infrastructure/db/postgres.js';
import type { AppModule } from '../../src/shared/module.js';

export const DEFAULT_TEST_DATABASE_URL = 'postgres://events:events@localhost:5433/events_test';

export interface PgTestApp {
  app: FastifyInstance;
  db: Database;
  resetDatabase(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Truncates all domain tables so each E2E suite runs against a clean PostgreSQL state
 * while keeping schema and applied migrations intact.
 */
export async function truncateAllTables(db: Database): Promise<void> {
  await db.execute(
    sql`truncate table registrations, ticket_types, events, venues, event_stats, refresh_tokens, users restart identity cascade`,
  );
}

/**
 * Full Fastify application connected to a real PostgreSQL 17 instance (`pg.Pool`).
 * Start the test container locally with `docker compose -f docker-compose.test.yml up -d --wait`.
 */
export async function createPgTestApp(
  env: NodeJS.ProcessEnv = {},
  replace: AppModule[] = [],
): Promise<PgTestApp> {
  const url = env.TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const config = loadConfig({ NODE_ENV: 'test', DATABASE_URL: url, ...env });
  const pg = connectPostgres(config.db.url, config.db.poolMax);

  try {
    await runMigrations(pg.db);
    await truncateAllTables(pg.db);
  } catch (err) {
    await pg.close();
    throw new Error(
      `Failed to connect or migrate test PostgreSQL at ${url}. ` +
        'Ensure `docker compose -f docker-compose.test.yml up -d --wait` is running.',
      { cause: err },
    );
  }

  const moduleList = modules.map((m) => replace.find((r) => r.name === m.name) ?? m);
  const app = await buildApp({ config, database: pg.db, modules: moduleList });

  return {
    app,
    db: pg.db,
    resetDatabase: () => truncateAllTables(pg.db),
    close: async () => {
      await app.close();
      await pg.close();
    },
  };
}
