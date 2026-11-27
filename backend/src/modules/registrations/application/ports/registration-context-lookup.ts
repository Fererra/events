/** Minimal event info needed by Registrations to verify event availability. */
export interface RegistrationEventInfo {
  id: string;
  status: 'IN_PLANNING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
}

/** Ticket type info locked for update during atomic registration. */
export interface LockedTicketInfo {
  id: string;
  eventId: string;
  type: string;
  limit: number;
  price: number;
}

/** Port: reads Event status and locks TicketType row through their public index.ts APIs. */
export interface IRegistrationContextLookup {
  findEventById(eventId: string): Promise<RegistrationEventInfo | null>;
  findTicketByIdForUpdate(ticketTypeId: string): Promise<LockedTicketInfo | null>;
}
