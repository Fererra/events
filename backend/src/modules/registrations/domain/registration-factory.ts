import { EventRegistrationClosedError, TicketsSoldOutError } from './errors.js';
import { Registration } from './registration.js';

export interface CreateRegistrationInput {
  id: string;
  userId: string;
  eventId: string;
  eventAcceptsRegistrations: boolean;
  ticketTypeId: string;
  ticketLimit: number;
  activeCount: number;
  now: Date;
}

/**
 * Domain factory (LR2 §4.1): enforces business invariants for issuing a registration
 * (the event must be ACTIVE and the ticket type must have remaining capacity).
 */
export class RegistrationFactory {
  static create(input: CreateRegistrationInput): Registration {
    if (!input.eventAcceptsRegistrations) {
      throw new EventRegistrationClosedError();
    }
    if (input.activeCount >= input.ticketLimit) {
      throw new TicketsSoldOutError();
    }
    return Registration.create({
      id: input.id,
      userId: input.userId,
      eventId: input.eventId,
      ticketTypeId: input.ticketTypeId,
      registeredAt: input.now,
    });
  }
}
