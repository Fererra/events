import type { TicketType } from './ticket-type.js';

/** Persistence port for ticket types (implemented in infrastructure). */
export interface ITicketTypeRepository {
  findByIdForUpdate(id: string): Promise<TicketType | null>;
  listByEvent(eventId: string): Promise<TicketType[]>;
  hasAnyForEvent(eventId: string): Promise<boolean>;
  sumLimitsByEvent(eventId: string): Promise<number>;
  findByEventAndNormalizedType(eventId: string, normalizedType: string): Promise<TicketType | null>;
  /** Inserts a ticket type. Throws TicketTypeAlreadyExistsError on duplicate (eventId, normalizedType). */
  add(ticket: TicketType): Promise<void>;
}
