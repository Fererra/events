import { and, eq, lte } from 'drizzle-orm';
import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { Event } from '../domain/event.js';
import { EventPeriod } from '../domain/event-period.js';
import type { IEventRepository } from '../domain/event-repository.js';
import { events, type EventRow } from './events.schema.js';

function toDomain(row: EventRow): Event {
  return Event.restore({
    id: row.id,
    title: row.title,
    description: row.description,
    period: EventPeriod.create(row.startsAt, row.endsAt),
    organizer: row.organizer,
    venueId: row.venueId,
    status: row.status,
    createdAt: row.createdAt,
  });
}

export class DrizzleEventRepository implements IEventRepository {
  constructor(private readonly db: DbExecutorProvider) {}

  async findById(id: string): Promise<Event | null> {
    const [row] = await this.db.executor().select().from(events).where(eq(events.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async add(event: Event): Promise<void> {
    await this.db.executor().insert(events).values({
      id: event.id,
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      organizer: event.organizer,
      venueId: event.venueId,
      status: event.status,
      createdAt: event.createdAt,
    });
  }

  async save(event: Event): Promise<void> {
    await this.db
      .executor()
      .update(events)
      .set({
        title: event.title,
        description: event.description,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        organizer: event.organizer,
        venueId: event.venueId,
        status: event.status,
      })
      .where(eq(events.id, event.id));
  }

  async findActiveEndedBefore(now: Date): Promise<Event[]> {
    const rows = await this.db
      .executor()
      .select()
      .from(events)
      .where(and(eq(events.status, 'ACTIVE'), lte(events.endsAt, now)))
      .for('update', { skipLocked: true });
    return rows.map(toDomain);
  }
}
