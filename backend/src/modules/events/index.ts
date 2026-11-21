/**
 * Events module — public API.
 * Events and their status lifecycle.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';
import type { IEventLifecycleRepository } from './application/ports/event-lifecycle-repository.js';
import { SyncEventStatusesUseCase } from './application/use-cases/sync-event-statuses.js';
import { StubEventLifecycleRepository } from './infrastructure/stub-event-lifecycle-repository.js';
import { registerEventCronJobs } from './presentation/event-cron-jobs.js';

export type { EventCancelled } from './domain/event-events.js';
export type {
  FinishableEvent,
  IEventLifecycleRepository,
} from './application/ports/event-lifecycle-repository.js';
export { SYNC_EVENT_STATUSES_JOB } from './presentation/event-cron-jobs.js';

/** Factory so tests (and later the Drizzle repository, ES-17) can supply adapters. */
export function createEventsModule(
  overrides: { lifecycle?: IEventLifecycleRepository } = {},
): AppModule {
  return {
    name: 'events',
    register(_app, ctx) {
      const lifecycle = overrides.lifecycle ?? new StubEventLifecycleRepository();
      registerEventCronJobs(ctx.scheduler, new SyncEventStatusesUseCase(lifecycle, ctx.uow));
    },
  };
}

export const eventsModule: AppModule = createEventsModule();
