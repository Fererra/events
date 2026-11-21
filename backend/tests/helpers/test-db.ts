import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import type { Database } from '../../src/shared/infrastructure/db/database.js';
import { hasMigrations, MIGRATIONS_DIR } from '../../src/shared/infrastructure/db/postgres.js';

/**
 * In-process PostgreSQL (PGlite) with all migrations applied.
 * Fast, isolated per test file, no Docker needed.
 */
export async function createTestDatabase(): Promise<{ db: Database; close(): Promise<void> }> {
  const client = new PGlite();
  const db = drizzle({ client });
  if (hasMigrations()) await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db: db as unknown as Database, close: () => client.close() };
}
