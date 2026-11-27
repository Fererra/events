import { and, asc, count, desc, eq, gte, inArray, lte, type SQL } from 'drizzle-orm';
import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { Event } from '../domain/event.js';
import { EventPeriod } from '../domain/event-period.js';
import type {
  EventCatalogRangeFilter,
  EventListFilter,
  EventPage,
  IEventRepository,
} from '../domain/event-repository.js';
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

  async list(filter: EventListFilter): Promise<EventPage> {
    const db = this.db.executor();
    const conditions: SQL[] = [];
    if (filter.venueId) conditions.push(eq(events.venueId, filter.venueId));
    if (filter.status) conditions.push(eq(events.status, filter.status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(events)
        .where(where)
        .orderBy(desc(events.startsAt), asc(events.id))
        .limit(filter.limit)
        .offset(filter.offset),
      db.select({ total: count() }).from(events).where(where),
    ]);

    return {
      items: rows.map(toDomain),
      total: Number(totals[0]?.total ?? 0),
    };
  }

  async listForCatalog(filter: EventCatalogRangeFilter): Promise<Event[]> {
    const conditions: SQL[] = [];
    if (filter.from) conditions.push(gte(events.startsAt, filter.from));
    if (filter.to) conditions.push(lte(events.startsAt, filter.to));
    if (filter.status) conditions.push(eq(events.status, filter.status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .executor()
      .select()
      .from(events)
      .where(where)
      .orderBy(desc(events.startsAt), asc(events.id));
    return rows.map(toDomain);
  }

  async hasScheduledForVenue(venueId: string): Promise<boolean> {
    const [row] = await this.db
      .executor()
      .select({ id: events.id })
      .from(events)
      .where(and(eq(events.venueId, venueId), inArray(events.status, ['IN_PLANNING', 'ACTIVE'])))
      .limit(1);
    return row !== undefined;
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
