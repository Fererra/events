import type { FastifyInstance } from 'fastify';
import type { AppConfig } from './config/env.js';
import type { IUnitOfWork } from './application/unit-of-work.js';
import type { DbExecutorProvider } from './infrastructure/db/database.js';

/**
 * Dependencies shared by all modules (composition root → modules).
 * Extended as infrastructure appears (event bus, scheduler, ...).
 */
export interface AppContext {
  config: AppConfig;
  /** Transaction boundary for use cases. */
  uow: IUnitOfWork;
  /** Current DB executor for repositories (joins the active transaction). */
  db: DbExecutorProvider;
}

/**
 * Contract every module exposes through its public `index.ts`.
 * `register` wires the module's routes / subscribers into the app.
 */
export interface AppModule {
  readonly name: string;
  register(app: FastifyInstance, ctx: AppContext): Promise<void> | void;
}
