import type { FastifyInstance } from 'fastify';
import type { AppConfig } from './config/env.js';

/**
 * Dependencies shared by all modules (composition root → modules).
 * Extended as infrastructure appears (DB, unit of work, event bus, ...).
 */
export interface AppContext {
  config: AppConfig;
}

/**
 * Contract every module exposes through its public `index.ts`.
 * `register` wires the module's routes / subscribers into the app.
 */
export interface AppModule {
  readonly name: string;
  register(app: FastifyInstance, ctx: AppContext): Promise<void> | void;
}
