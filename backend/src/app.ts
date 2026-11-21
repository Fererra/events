import Fastify, { type FastifyInstance } from 'fastify';
import type { AppConfig } from './shared/config/env.js';
import type { AppContext, AppModule } from './shared/module.js';
import { authModule } from './modules/auth/index.js';
import { venuesModule } from './modules/venues/index.js';
import { eventsModule } from './modules/events/index.js';
import { ticketsModule } from './modules/tickets/index.js';
import { registrationsModule } from './modules/registrations/index.js';
import { analyticsModule } from './modules/analytics/index.js';

export const modules: readonly AppModule[] = [
  authModule,
  venuesModule,
  eventsModule,
  ticketsModule,
  registrationsModule,
  analyticsModule,
];

/** Composition root: builds the Fastify app and registers every module. */
export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel } });
  const ctx: AppContext = { config };

  app.get('/health', async () => ({ status: 'ok' }));

  for (const module of modules) {
    await app.register(async (scope) => module.register(scope, ctx));
  }

  return app;
}
