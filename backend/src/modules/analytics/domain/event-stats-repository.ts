import type { EventStats } from './event-stats.js';

/** Persistence port for event_stats. */
export interface IEventStatsRepository {
  /**
   * Returns the stats row locked for update, creating an empty one if absent.
   * Must be called inside a UnitOfWork so concurrent updates are serialized.
   */
  getForUpdate(eventId: string): Promise<EventStats>;
  save(stats: EventStats): Promise<void>;
  list(): Promise<EventStats[]>;
}
