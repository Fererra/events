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

export interface VenueEventsChecker {
  hasScheduledEvents(venueId: string): Promise<boolean>;
}

/** Public cross-module check used by Venues before deleting a venue (ES-16). */
export function createVenueEventsChecker(db: DbExecutorProvider): VenueEventsChecker {
  const repo = new DrizzleEventRepository(db);
  return {
    hasScheduledEvents: (venueId: string) => repo.hasScheduledForVenue(venueId),
  };
}

export interface EventBasicInfo {
  id: string;
  venueId: string;
  status: EventStatus;
}

export interface EventReader {
  findById(id: string): Promise<EventBasicInfo | null>;
  findByIdForUpdate(id: string): Promise<EventBasicInfo | null>;
}

/** Public cross-module event reader for Tickets and Registrations (via events/index.ts). */
export function createEventReader(db: DbExecutorProvider): EventReader {
  const repo = new DrizzleEventRepository(db);
  const toInfo = (event: { id: string; venueId: string; status: EventStatus }): EventBasicInfo => ({
    id: event.id,
    venueId: event.venueId,
    status: event.status,
  });

  return {
    async findById(id: string): Promise<EventBasicInfo | null> {
      const ev = await repo.findById(id);
      return ev ? toInfo(ev) : null;
    },
    async findByIdForUpdate(id: string): Promise<EventBasicInfo | null> {
      const ev = await repo.findByIdForUpdate(id);
      return ev ? toInfo(ev) : null;
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
