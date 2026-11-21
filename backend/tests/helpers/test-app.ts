import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { loadConfig } from '../../src/shared/config/env.js';
import { createTestDatabase } from './test-db.js';

/** Full app on top of an in-memory PGlite database. */
export async function createTestApp(env: NodeJS.ProcessEnv = {}): Promise<FastifyInstance> {
  const { db, close } = await createTestDatabase();
  const app = await buildApp({ config: loadConfig({ NODE_ENV: 'test', ...env }), database: db });
  app.addHook('onClose', close);
  return app;
}
