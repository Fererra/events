import type { AppContext } from '../../shared/module.js';
import { authGuards } from '../auth/index.js';
import { systemClock, uuidGenerator } from './application/ports/clock.js';
import { CreateVenueUseCase } from './application/use-cases/create-venue.js';
import { DrizzleVenueRepository } from './infrastructure/drizzle-venue-repository.js';

/** Module-level composition: wires ports to their infrastructure adapters. */
export function createVenuesContainer(ctx: AppContext) {
  const clock = systemClock;
  const ids = uuidGenerator;
  const venues = new DrizzleVenueRepository(ctx.db);

  return {
    venues,
    guards: authGuards(ctx.config),
    createVenue: new CreateVenueUseCase(venues, ctx.uow, clock, ids),
  };
}

export type VenuesContainer = ReturnType<typeof createVenuesContainer>;
