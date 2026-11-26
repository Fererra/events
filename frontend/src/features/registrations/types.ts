import type { EventStatus } from '../events/types';

export type RegistrationStatus = 'ACTIVE' | 'CANCELLED';

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
  status: RegistrationStatus;
  registrationTimestamp: string;
}

export interface MyRegistration {
  id: string;
  event: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status?: EventStatus;
  };
  ticket: {
    type: string;
    price: number;
  };
  status: RegistrationStatus;
  registeredAt: string;
}
