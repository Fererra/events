import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { createSoldTicketsCounter, type SoldTicketsCounter } from '../../registrations/index.js';
import type { ISoldTicketsCounter } from '../application/ports/sold-tickets-counter.js';

/** Adapter: implements Tickets' ISoldTicketsCounter port through Registrations' public index.ts. */
export class RegistrationsModuleSoldCounter implements ISoldTicketsCounter {
  private readonly counter: SoldTicketsCounter;

  constructor(db: DbExecutorProvider) {
    this.counter = createSoldTicketsCounter(db);
  }

  countActiveByEvent(eventId: string): Promise<Map<string, number>> {
    return this.counter.countActiveByEvent(eventId);
  }
}
