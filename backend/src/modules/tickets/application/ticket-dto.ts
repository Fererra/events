import type { TicketType } from '../domain/ticket-type.js';

/** Public view of a created ticket type. */
export interface TicketTypeDto {
  id: string;
  eventId: string;
  type: string;
  limit: number;
  price: number;
  createdAt: string;
}

export function toTicketTypeDto(ticket: TicketType): TicketTypeDto {
  return {
    id: ticket.id,
    eventId: ticket.eventId,
    type: ticket.type,
    limit: ticket.limit,
    price: ticket.price,
    createdAt: ticket.createdAt.toISOString(),
  };
}
