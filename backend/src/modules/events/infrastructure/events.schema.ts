import { index, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const eventStatus = pgEnum('event_status', [
  'IN_PLANNING',
  'ACTIVE',
  'FINISHED',
  'CANCELLED',
]);

/**
 * Owned by Events. No cross-module FK to `venues`: modules share no tables,
 * venue existence is checked through the Venues module's public index.ts.
 */
export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    organizer: text('organizer').notNull(),
    venueId: uuid('venue_id').notNull(),
    status: eventStatus('status').notNull().default('IN_PLANNING'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('events_venue_id_idx').on(t.venueId),
    index('events_status_ends_at_idx').on(t.status, t.endsAt),
  ],
);

export type EventRow = typeof events.$inferSelect;
