import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { createEventReader, type EventReader } from '../../events/index.js';
import { createTicketReader, type TicketReader } from '../../tickets/index.js';
import type {
  IRegistrationContextLookup,
  LockedTicketInfo,
  RegistrationEventInfo,
} from '../application/ports/registration-context-lookup.js';

/**
 * Adapter: implements Registrations' IRegistrationContextLookup port through
 * Events' and Tickets' public index.ts APIs (joins the active UnitOfWork).
 */
export class ModulesRegistrationContextLookup implements IRegistrationContextLookup {
  private readonly events: EventReader;
  private readonly tickets: TicketReader;

  constructor(db: DbExecutorProvider) {
    this.events = createEventReader(db);
    this.tickets = createTicketReader(db);
  }

  async findEventById(eventId: string): Promise<RegistrationEventInfo | null> {
    const event = await this.events.findById(eventId);
    if (!event) return null;
    return { id: event.id, status: event.status };
  }

  findTicketByIdForUpdate(ticketTypeId: string): Promise<LockedTicketInfo | null> {
    return this.tickets.findByIdForUpdate(ticketTypeId);
  }
}
