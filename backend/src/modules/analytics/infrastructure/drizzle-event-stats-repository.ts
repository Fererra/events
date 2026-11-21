import { eq } from 'drizzle-orm';
import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { EventStats } from '../domain/event-stats.js';
import type { IEventStatsRepository } from '../domain/event-stats-repository.js';
import { eventStats, type EventStatsRow } from './analytics.schema.js';

const toDomain = (row: EventStatsRow) => EventStats.restore({ ...row });

export class DrizzleEventStatsRepository implements IEventStatsRepository {
  constructor(private readonly db: DbExecutorProvider) {}

  async getForUpdate(eventId: string): Promise<EventStats> {
    const db = this.db.executor();
    await db.insert(eventStats).values({ eventId }).onConflictDoNothing();
    const [row] = await db
      .select()
      .from(eventStats)
      .where(eq(eventStats.eventId, eventId))
      .for('update');
    return row ? toDomain(row) : EventStats.empty(eventId);
  }

  async save(stats: EventStats): Promise<void> {
    await this.db
      .executor()
      .update(eventStats)
      .set({
        registrationsCount: stats.registrationsCount,
        isCancelled: stats.isCancelled,
        lastActivityAt: stats.lastActivityAt,
      })
      .where(eq(eventStats.eventId, stats.eventId));
  }

  async list(): Promise<EventStats[]> {
    const rows = await this.db.executor().select().from(eventStats);
    return rows.map(toDomain);
  }
}
