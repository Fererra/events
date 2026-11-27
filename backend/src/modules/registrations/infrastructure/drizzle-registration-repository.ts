import { and, desc, eq, sql } from 'drizzle-orm';
import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { Registration } from '../domain/registration.js';
import type { IRegistrationRepository } from '../domain/registration-repository.js';
import { registrations, type RegistrationRow } from './registrations.schema.js';

function toDomain(row: RegistrationRow): Registration {
  return Registration.restore({
    id: row.id,
    userId: row.userId,
    eventId: row.eventId,
    ticketTypeId: row.ticketTypeId,
    status: row.status,
    registeredAt: row.registeredAt,
  });
}

export class DrizzleRegistrationRepository implements IRegistrationRepository {
  constructor(private readonly db: DbExecutorProvider) {}

  async findByIdForUpdate(id: string): Promise<Registration | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(registrations)
      .where(eq(registrations.id, id))
      .for('update');
    return row ? toDomain(row) : null;
  }

  async listByUser(userId: string): Promise<Registration[]> {
    const rows = await this.db
      .executor()
      .select()
      .from(registrations)
      .where(eq(registrations.userId, userId))
      .orderBy(desc(registrations.registeredAt));
    return rows.map(toDomain);
  }

  async countActiveByTicketType(ticketTypeId: string): Promise<number> {
    const [row] = await this.db
      .executor()
      .select({ total: sql<number>`count(*)::int` })
      .from(registrations)
      .where(and(eq(registrations.ticketTypeId, ticketTypeId), eq(registrations.status, 'ACTIVE')));
    return Number(row?.total ?? 0);
  }

  async countActiveByEventGroupedByTicketType(eventId: string): Promise<Map<string, number>> {
    const rows = await this.db
      .executor()
      .select({
        ticketTypeId: registrations.ticketTypeId,
        sold: sql<number>`count(*)::int`,
      })
      .from(registrations)
      .where(and(eq(registrations.eventId, eventId), eq(registrations.status, 'ACTIVE')))
      .groupBy(registrations.ticketTypeId);

    const counts = new Map<string, number>();
    for (const row of rows) {
      counts.set(row.ticketTypeId, Number(row.sold));
    }
    return counts;
  }

  async add(registration: Registration): Promise<void> {
    await this.db.executor().insert(registrations).values({
      id: registration.id,
      userId: registration.userId,
      eventId: registration.eventId,
      ticketTypeId: registration.ticketTypeId,
      status: registration.status,
      registeredAt: registration.registeredAt,
    });
  }

  async save(registration: Registration): Promise<void> {
    await this.db
      .executor()
      .update(registrations)
      .set({ status: registration.status })
      .where(eq(registrations.id, registration.id));
  }
}
