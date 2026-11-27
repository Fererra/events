/**
 * Events module — public API.
 * Events and their status lifecycle.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';
import type { IEventLifecycleRepository } from './application/ports/event-lifecycle-repository.js';
import { SyncEventStatusesUseCase } from './application/use-cases/sync-event-statuses.js';
import { DrizzleEventRepository } from './infrastructure/drizzle-event-repository.js';
import { registerEventCronJobs } from './presentation/event-cron-jobs.js';

export type { EventStatus } from './domain/event.js';
export { EVENT_STATUSES } from './domain/event.js';
export type { EventCancelled } from './domain/event-events.js';
export type {
  FinishableEvent,
  IEventLifecycleRepository,
} from './application/ports/event-lifecycle-repository.js';
export { SYNC_EVENT_STATUSES_JOB } from './presentation/event-cron-jobs.js';

/** Factory so tests can supply custom adapters when needed. */
export function createEventsModule(
  overrides: { lifecycle?: IEventLifecycleRepository } = {},
): AppModule {
  return {
    name: 'events',
    register(_app, ctx) {
      const lifecycle = overrides.lifecycle ?? new DrizzleEventRepository(ctx.db);
      registerEventCronJobs(ctx.scheduler, new SyncEventStatusesUseCase(lifecycle, ctx.uow));
    },
  };
}

export const eventsModule: AppModule = createEventsModule();
