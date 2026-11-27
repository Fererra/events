import type { AppContext } from '../../shared/module.js';
import { authGuards } from '../auth/index.js';
import { systemClock, uuidGenerator } from './application/ports/clock.js';
import type { IVenueEventsChecker } from './application/ports/venue-events-checker.js';
import { GetVenueQuery } from './application/queries/get-venue.js';
import { ListVenuesQuery } from './application/queries/list-venues.js';
import { CreateVenueUseCase } from './application/use-cases/create-venue.js';
import { DeleteVenueUseCase } from './application/use-cases/delete-venue.js';
import { UpdateVenueUseCase } from './application/use-cases/update-venue.js';
import { DrizzleVenueRepository } from './infrastructure/drizzle-venue-repository.js';
import { EventsModuleChecker } from './infrastructure/events-module-checker.js';

export interface VenuesModuleOverrides {
  eventsChecker?: IVenueEventsChecker;
}

/** Module-level composition: wires ports to their infrastructure adapters. */
export function createVenuesContainer(ctx: AppContext, overrides: VenuesModuleOverrides = {}) {
  const clock = systemClock;
  const ids = uuidGenerator;
  const venues = new DrizzleVenueRepository(ctx.db);
  const eventsChecker = overrides.eventsChecker ?? new EventsModuleChecker(ctx.db);

  return {
    venues,
    guards: authGuards(ctx.config),
    listVenues: new ListVenuesQuery(venues),
    getVenue: new GetVenueQuery(venues),
    createVenue: new CreateVenueUseCase(venues, ctx.uow, clock, ids),
    updateVenue: new UpdateVenueUseCase(venues, ctx.uow),
    deleteVenue: new DeleteVenueUseCase(venues, eventsChecker, ctx.uow),
  };
}

export type VenuesContainer = ReturnType<typeof createVenuesContainer>;
