import type { FastifyInstance } from 'fastify';
import { buildApp, modules } from '../../src/app.js';
import { loadConfig } from '../../src/shared/config/env.js';
import type { AppModule } from '../../src/shared/module.js';
import type { Database } from '../../src/shared/infrastructure/db/database.js';
import { createTestDatabase } from './test-db.js';

export interface TestApp {
  app: FastifyInstance;
  db: Database;
  close(): Promise<void>;
}

/**
 * Full app on top of an in-memory PGlite database.
 * `replace` swaps modules by name (e.g. a module built with fake adapters).
 */
export async function createTestApp(
  env: NodeJS.ProcessEnv = {},
  replace: AppModule[] = [],
): Promise<TestApp> {
  const { db, close } = await createTestDatabase();
  const moduleList = modules.map((m) => replace.find((r) => r.name === m.name) ?? m);
  const app = await buildApp({
    config: loadConfig({ NODE_ENV: 'test', ...env }),
    database: db,
    modules: moduleList,
  });
  return {
    app,
    db,
    close: async () => {
      await app.close();
      await close();
    },
  };
}

/** Typed rows from a raw `db.execute(sql\`...\`)` call (pg and PGlite share the shape). */
export function rowsOf<T>(result: unknown): T[] {
  return (result as { rows: T[] }).rows;
}
