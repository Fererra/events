/**
 * Events module — public API.
 * Events and their status lifecycle.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { DbExecutorProvider } from '../../shared/infrastructure/db/database.js';
import type { AppModule } from '../../shared/module.js';
import type { EventStatus } from './domain/event.js';
import { createEventsContainer, type EventsModuleOverrides } from './events.container.js';
import { DrizzleEventRepository } from './infrastructure/drizzle-event-repository.js';
import { registerEventCronJobs } from './presentation/event-cron-jobs.js';
import { registerEventsRoutes } from './presentation/events.routes.js';

export type { EventDto } from './application/event-dto.js';
export type { PaginatedEventsDto } from './application/queries/list-events.js';
export type { EventStatus } from './domain/event.js';
export { EVENT_STATUSES } from './domain/event.js';
export type { EventCancelled } from './domain/event-events.js';
export type {
  FinishableEvent,
  IEventLifecycleRepository,
} from './application/ports/event-lifecycle-repository.js';
export { SYNC_EVENT_STATUSES_JOB } from './presentation/event-cron-jobs.js';

export interface EventCatalogEntry {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: EventStatus;
}

export interface EventCatalogQuery {
  from?: Date;
  to?: Date;
  status?: EventStatus;
}

export interface EventCatalogReader {
  list(filter: EventCatalogQuery): Promise<EventCatalogEntry[]>;
}

/** Public cross-module catalog reader for Analytics (via events/index.ts). */
export function createEventCatalogReader(db: DbExecutorProvider): EventCatalogReader {
  const repo = new DrizzleEventRepository(db);
  return {
    async list(filter: EventCatalogQuery): Promise<EventCatalogEntry[]> {
      const list = await repo.listForCatalog(filter);
      return list.map((e) => ({
        id: e.id,
        title: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt,
        status: e.status,
      }));
    },
  };
}

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
