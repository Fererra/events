import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { Database } from './database.js';

/** `backend/drizzle` both from `src/…` (tsx) and from `dist/…` (Docker). */
export const MIGRATIONS_DIR =
  process.env.MIGRATIONS_DIR ?? fileURLToPath(new URL('../../../../drizzle', import.meta.url));

export interface PostgresConnection {
  db: Database;
  close(): Promise<void>;
}

/** Connection pool + Drizzle instance. All queries are parameterized by Drizzle. */
export function connectPostgres(url: string, poolMax: number): PostgresConnection {
  const pool = new pg.Pool({ connectionString: url, max: poolMax });
  const db = drizzle({ client: pool });
  return { db, close: () => pool.end() };
}

/** False until the first `npm run db:generate` creates the migrations journal. */
export function hasMigrations(dir = MIGRATIONS_DIR): boolean {
  return existsSync(join(dir, 'meta', '_journal.json'));
}

export async function runMigrations(db: Database): Promise<void> {
  if (!hasMigrations()) return;
  await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: MIGRATIONS_DIR });
}
