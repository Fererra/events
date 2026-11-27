import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Owned by Tickets. No cross-module FK to `events`: modules share no tables,
 * event existence and venue capacity are checked through public index.ts ports.
 */
export const ticketTypes = pgTable(
  'ticket_types',
  {
    id: uuid('id').primaryKey(),
    eventId: uuid('event_id').notNull(),
    type: text('type').notNull(),
    normalizedType: text('normalized_type').notNull(),
    limit: integer('limit').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('ticket_types_event_id_idx').on(t.eventId),
    unique('ticket_types_event_type_unique').on(t.eventId, t.normalizedType),
  ],
);

export type TicketTypeRow = typeof ticketTypes.$inferSelect;
