import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { createTicketReader, type TicketReader } from '../../tickets/index.js';
import type { IEventTicketChecker } from '../application/ports/event-ticket-checker.js';

/** Adapter: implements Events' IEventTicketChecker port through Tickets' public index.ts. */
export class TicketsModuleChecker implements IEventTicketChecker {
  private readonly reader: TicketReader;

  constructor(db: DbExecutorProvider) {
    this.reader = createTicketReader(db);
  }

  hasAnyForEvent(eventId: string): Promise<boolean> {
    return this.reader.hasAnyForEvent(eventId);
  }
}
