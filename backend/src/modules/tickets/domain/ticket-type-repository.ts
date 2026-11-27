import type { TicketType } from './ticket-type.js';

/** Persistence port for ticket types (implemented in infrastructure). */
export interface ITicketTypeRepository {
  sumLimitsByEvent(eventId: string): Promise<number>;
  findByEventAndNormalizedType(eventId: string, normalizedType: string): Promise<TicketType | null>;
  /** Inserts a ticket type. Throws TicketTypeAlreadyExistsError on duplicate (eventId, normalizedType). */
  add(ticket: TicketType): Promise<void>;
}
