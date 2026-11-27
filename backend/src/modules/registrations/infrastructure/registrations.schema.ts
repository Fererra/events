import { index, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const registrationStatusEnum = pgEnum('registration_status', ['ACTIVE', 'CANCELLED']);

/**
 * Owned by Registrations. No cross-module FKs to users / events / ticket_types:
 * modules share no tables; existence & invariants are checked through public index.ts ports.
 */
export const registrations = pgTable(
  'registrations',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    eventId: uuid('event_id').notNull(),
    ticketTypeId: uuid('ticket_type_id').notNull(),
    status: registrationStatusEnum('status').notNull().default('ACTIVE'),
    registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('registrations_user_id_idx').on(t.userId),
    index('registrations_ticket_type_status_idx').on(t.ticketTypeId, t.status),
    index('registrations_event_id_status_idx').on(t.eventId, t.status),
  ],
);

export type RegistrationRow = typeof registrations.$inferSelect;
