import type { AppContext } from '../../shared/module.js';
import { authGuards } from '../auth/index.js';
import { systemClock, uuidGenerator } from './application/ports/clock.js';
import type { IEventLifecycleRepository } from './application/ports/event-lifecycle-repository.js';
import type { IVenueLookup } from './application/ports/venue-lookup.js';
import { GetEventQuery } from './application/queries/get-event.js';
import { ListEventsQuery } from './application/queries/list-events.js';
import { CreateEventUseCase } from './application/use-cases/create-event.js';
import { SyncEventStatusesUseCase } from './application/use-cases/sync-event-statuses.js';
import { DrizzleEventRepository } from './infrastructure/drizzle-event-repository.js';
import { VenuesModuleLookup } from './infrastructure/venues-module-lookup.js';

export interface EventsModuleOverrides {
  lifecycle?: IEventLifecycleRepository;
  venueLookup?: IVenueLookup;
}

/** Module-level composition: wires ports to their infrastructure adapters. */
export function createEventsContainer(ctx: AppContext, overrides: EventsModuleOverrides = {}) {
  const clock = systemClock;
  const ids = uuidGenerator;
  const events = new DrizzleEventRepository(ctx.db);
  const venues = overrides.venueLookup ?? new VenuesModuleLookup(ctx.db);
  const lifecycle = overrides.lifecycle ?? events;

  return {
    events,
    guards: authGuards(ctx.config),
    listEvents: new ListEventsQuery(events),
    getEvent: new GetEventQuery(events),
    createEvent: new CreateEventUseCase(events, venues, ctx.uow, clock, ids),
    syncStatuses: new SyncEventStatusesUseCase(lifecycle, ctx.uow),
  };
}

export type EventsContainer = ReturnType<typeof createEventsContainer>;
