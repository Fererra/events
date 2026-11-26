export interface TicketType {
  id: number;
  eventId: number;
  type: string;
  limit: number;
  price: number;
  remaining: number;
}

export interface EventRegistration {
  id: string;
  userId: string;
  ticketId: number;
  registrationTimestamp: string;
}
