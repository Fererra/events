import type { DomainEvent } from '../../../shared/application/event-bus.js';

/**
 * Integration events published by the Registrations module (after COMMIT).
 * Consumers (Analytics) depend only on these shapes, exported via index.ts.
 */

export interface RegistrationCreated extends DomainEvent<'RegistrationCreated'> {
  registrationId: string;
  eventId: string;
  userId: string;
  ticketTypeId: string;
}

export interface RegistrationCancelled extends DomainEvent<'RegistrationCancelled'> {
  registrationId: string;
  eventId: string;
  userId: string;
  cancelledBy: 'owner' | 'admin';
}
