/**
 * Venues module — public API.
 * Venues (locations) management.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';
import { registerVenuesRoutes } from './presentation/venues.routes.js';
import { createVenuesContainer } from './venues.container.js';

export type { VenueDto } from './application/venue-dto.js';
export type { PaginatedVenuesDto } from './application/queries/list-venues.js';

export function createVenuesModule(): AppModule {
  return {
    name: 'venues',
    register(app, ctx) {
      const container = createVenuesContainer(ctx);
      registerVenuesRoutes(app, container);
    },
  };
}

export const venuesModule: AppModule = createVenuesModule();
