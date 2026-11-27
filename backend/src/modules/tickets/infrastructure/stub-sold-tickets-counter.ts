import type { ISoldTicketsCounter } from '../application/ports/sold-tickets-counter.js';

/**
 * TEMPORARY stand-in until the registrations table exists (ES-23).
 * Replaced by an adapter calling registrations/index.ts.
 */
export class StubSoldTicketsCounter implements ISoldTicketsCounter {
  async countActiveByEvent(_eventId: string): Promise<Map<string, number>> {
    return new Map();
  }
}
