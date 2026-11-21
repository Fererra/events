import { boolean, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Owned by Analytics. No FK to `events`: modules share no tables, the link
 * is the event id carried by domain events.
 */
export const eventStats = pgTable('event_stats', {
  eventId: uuid('event_id').primaryKey(),
  registrationsCount: integer('registrations_count').notNull().default(0),
  isCancelled: boolean('is_cancelled').notNull().default(false),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
});

export type EventStatsRow = typeof eventStats.$inferSelect;
