/**
 * Events module — public API.
 * Events and their status lifecycle.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';
import { createEventsContainer, type EventsModuleOverrides } from './events.container.js';
import { registerEventCronJobs } from './presentation/event-cron-jobs.js';
import { registerEventsRoutes } from './presentation/events.routes.js';

export type { EventDto } from './application/event-dto.js';
export type { EventStatus } from './domain/event.js';
export { EVENT_STATUSES } from './domain/event.js';
export type { EventCancelled } from './domain/event-events.js';
export type {
  FinishableEvent,
  IEventLifecycleRepository,
} from './application/ports/event-lifecycle-repository.js';
export { SYNC_EVENT_STATUSES_JOB } from './presentation/event-cron-jobs.js';

/** Factory so tests can supply custom adapters when needed. */
export function createEventsModule(overrides: EventsModuleOverrides = {}): AppModule {
  return {
    name: 'events',
    register(app, ctx) {
      const container = createEventsContainer(ctx, overrides);
      registerEventsRoutes(app, container);
      registerEventCronJobs(ctx.scheduler, container.syncStatuses);
    },
  };
}

export const eventsModule: AppModule = createEventsModule();
