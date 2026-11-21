/**
 * Analytics module — public API.
 * Event attendance statistics (event_stats), fed asynchronously by domain events.
 *
 * Other modules may import ONLY from this file (enforced by ESLint).
 */
import type { AppModule } from '../../shared/module.js';
import { EventStatsProjector } from './application/handlers/event-stats-projector.js';
import { DrizzleEventStatsRepository } from './infrastructure/drizzle-event-stats-repository.js';

export const analyticsModule: AppModule = {
  name: 'analytics',
  register(_app, ctx) {
    const stats = new DrizzleEventStatsRepository(ctx.db);
    new EventStatsProjector(stats, ctx.uow).subscribe(ctx.eventBus);
  },
};
