/**
 * Analytics module — public API.
 * Event attendance statistics (event_stats), fed asynchronously by domain events.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';
import { authGuards } from '../auth/index.js';
import { EventStatsProjector } from './application/handlers/event-stats-projector.js';
import type { IEventCatalog } from './application/ports/event-catalog.js';
import { ListEventAnalyticsQuery } from './application/queries/list-event-analytics.js';
import { DrizzleEventStatsRepository } from './infrastructure/drizzle-event-stats-repository.js';
import { EventsModuleCatalog } from './infrastructure/events-module-catalog.js';
import { registerAnalyticsRoutes } from './presentation/analytics.routes.js';

export type { EventAnalyticsDto } from './application/queries/list-event-analytics.js';
export type { EventSummary, IEventCatalog } from './application/ports/event-catalog.js';

/** Factory so tests can supply custom catalog adapters when needed. */
export function createAnalyticsModule(overrides: { eventCatalog?: IEventCatalog } = {}): AppModule {
  return {
    name: 'analytics',
    register(app, ctx) {
      const stats = new DrizzleEventStatsRepository(ctx.db);
      new EventStatsProjector(stats, ctx.uow).subscribe(ctx.eventBus);

      const catalog = overrides.eventCatalog ?? new EventsModuleCatalog(ctx.db);
      registerAnalyticsRoutes(app, {
        requireAdmin: authGuards(ctx.config).requireAdmin,
        query: new ListEventAnalyticsQuery(catalog, stats),
      });
    },
  };
}

export const analyticsModule: AppModule = createAnalyticsModule();
