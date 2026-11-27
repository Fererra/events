/**
 * Venues module — public API.
 * Venues (locations) management.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { DbExecutorProvider } from '../../shared/infrastructure/db/database.js';
import type { AppModule } from '../../shared/module.js';
import { DrizzleVenueRepository } from './infrastructure/drizzle-venue-repository.js';
import { registerVenuesRoutes } from './presentation/venues.routes.js';
import { createVenuesContainer, type VenuesModuleOverrides } from './venues.container.js';

export type { VenueDto } from './application/venue-dto.js';
export type { PaginatedVenuesDto } from './application/queries/list-venues.js';

/** Minimal projection exposed to sibling modules (Events, Tickets) via index.ts. */
export interface VenueSummary {
  id: string;
  name: string;
  address: string;
  capacity: number;
}

export interface VenueReader {
  findById(id: string): Promise<VenueSummary | null>;
}

/** Public cross-module reader adapter (joins active UoW transaction via DbExecutorProvider). */
export function createVenueReader(db: DbExecutorProvider): VenueReader {
  const repo = new DrizzleVenueRepository(db);
  return {
    async findById(id: string): Promise<VenueSummary | null> {
      const venue = await repo.findById(id);
      if (!venue) return null;
      return {
        id: venue.id,
        name: venue.name,
        address: venue.address,
        capacity: venue.capacity,
      };
    },
  };
}

export function createVenuesModule(overrides: VenuesModuleOverrides = {}): AppModule {
  return {
    name: 'venues',
    register(app, ctx) {
      const container = createVenuesContainer(ctx, overrides);
      registerVenuesRoutes(app, container);
    },
  };
}

export const venuesModule: AppModule = createVenuesModule();
