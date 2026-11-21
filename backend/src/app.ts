import Fastify, { type FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import type { AppConfig } from './shared/config/env.js';
import type { AppContext, AppModule } from './shared/module.js';
import type { Database } from './shared/infrastructure/db/database.js';
import { DrizzleUnitOfWork } from './shared/infrastructure/db/unit-of-work.js';
import { registerErrorHandler } from './shared/presentation/error-handler.js';
import { InProcessEventBus } from './shared/infrastructure/in-process-event-bus.js';
import { NodeCronScheduler } from './shared/infrastructure/node-cron-scheduler.js';
import type { IScheduler } from './shared/application/scheduler.js';

declare module 'fastify' {
  interface FastifyInstance {
    /** Background job scheduler (exposed for manual runs and tests). */
    scheduler: IScheduler;
  }
}
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

export interface AppDependencies {
  config: AppConfig;
  database: Database;
  /** Override the module list (tests swap adapters through module factories). */
  modules?: readonly AppModule[];
}

/** Composition root: builds the Fastify app and registers every module. */
export async function buildApp({
  config,
  database,
  modules: moduleList = modules,
}: AppDependencies): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel } });

  const uow = new DrizzleUnitOfWork(database, (err) =>
    app.log.error({ err }, 'afterCommit callback failed'),
  );
  const eventBus = new InProcessEventBus(uow, (err, event) =>
    app.log.error({ err, eventType: event.type }, 'domain event handler failed'),
  );
  const scheduler = new NodeCronScheduler(app.log);
  const ctx: AppContext = { config, uow, db: uow, eventBus, scheduler };

  // Background jobs tick only once the app is fully ready and stop on close.
  if (config.scheduler.enabled) app.addHook('onReady', async () => scheduler.start());
  app.addHook('onClose', () => scheduler.stop());
  app.decorate('scheduler', scheduler);

  registerErrorHandler(app);

  /** Liveness: the process is up. */
  app.get('/health', async () => ({ status: 'ok' }));

  /** Readiness: the database answers. */
  app.get('/health/db', async (_req, reply) => {
    try {
      await database.execute(sql`select 1`);
      return { status: 'ok' };
    } catch (err) {
      app.log.warn({ err }, 'database health check failed');
      return reply.code(503).send({ status: 'unavailable' });
    }
  });

  for (const module of moduleList) {
    await app.register(async (scope) => module.register(scope, ctx));
  }

  return app;
}
