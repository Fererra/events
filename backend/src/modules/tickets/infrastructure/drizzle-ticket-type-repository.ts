import { and, asc, eq, sql } from 'drizzle-orm';
import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { isUniqueViolation } from '../../../shared/infrastructure/db/pg-errors.js';
import { TicketTypeAlreadyExistsError } from '../domain/errors.js';
import { TicketType } from '../domain/ticket-type.js';
import type { ITicketTypeRepository } from '../domain/ticket-type-repository.js';
import { ticketTypes, type TicketTypeRow } from './tickets.schema.js';

function toDomain(row: TicketTypeRow): TicketType {
  return TicketType.restore({
    id: row.id,
    eventId: row.eventId,
    type: row.type,
    normalizedType: row.normalizedType,
    limit: row.limit,
    price: Number(row.price),
    createdAt: row.createdAt,
  });
}

export class DrizzleTicketTypeRepository implements ITicketTypeRepository {
  constructor(private readonly db: DbExecutorProvider) {}

  async findByIdForUpdate(id: string): Promise<TicketType | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.id, id))
      .for('update');
    return row ? toDomain(row) : null;
  }

  async listByEvent(eventId: string): Promise<TicketType[]> {
    const rows = await this.db
      .executor()
      .select()
      .from(ticketTypes)
      .where(eq(ticketTypes.eventId, eventId))
      .orderBy(asc(ticketTypes.price), asc(ticketTypes.createdAt), asc(ticketTypes.id));
    return rows.map(toDomain);
  }

  async hasAnyForEvent(eventId: string): Promise<boolean> {
    const [row] = await this.db
      .executor()
      .select({ id: ticketTypes.id })
      .from(ticketTypes)
      .where(eq(ticketTypes.eventId, eventId))
      .limit(1);
    return row !== undefined;
  }

  async sumLimitsByEvent(eventId: string): Promise<number> {
    const [row] = await this.db
      .executor()
      .select({ total: sql<number>`coalesce(sum(${ticketTypes.limit}), 0)::int` })
      .from(ticketTypes)
      .where(eq(ticketTypes.eventId, eventId));
    return Number(row?.total ?? 0);
  }

  async findByEventAndNormalizedType(
    eventId: string,
    normalizedType: string,
  ): Promise<TicketType | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(ticketTypes)
      .where(and(eq(ticketTypes.eventId, eventId), eq(ticketTypes.normalizedType, normalizedType)))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async add(ticket: TicketType): Promise<void> {
    try {
      await this.db
        .executor()
        .insert(ticketTypes)
        .values({
          id: ticket.id,
          eventId: ticket.eventId,
          type: ticket.type,
          normalizedType: ticket.normalizedType,
          limit: ticket.limit,
          price: ticket.price.toFixed(2),
          createdAt: ticket.createdAt,
        });
    } catch (err) {
      if (isUniqueViolation(err)) throw new TicketTypeAlreadyExistsError();
      throw err;
    }
  }
}
