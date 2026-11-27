import type { Registration } from './registration.js';

/** Persistence port for registrations (implemented in infrastructure). */
export interface IRegistrationRepository {
  listByUser(userId: string): Promise<Registration[]>;
  countActiveByTicketType(ticketTypeId: string): Promise<number>;
  countActiveByEventGroupedByTicketType(eventId: string): Promise<Map<string, number>>;
  add(registration: Registration): Promise<void>;
}
