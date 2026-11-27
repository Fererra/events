import type { Registration, RegistrationStatus } from '../domain/registration.js';

/** Public view of a newly created registration. */
export interface RegistrationDto {
  id: string;
  userId: string;
  eventId: string;
  ticketTypeId: string;
  status: RegistrationStatus;
  registeredAt: string;
}

export function toRegistrationDto(registration: Registration): RegistrationDto {
  return {
    id: registration.id,
    userId: registration.userId,
    eventId: registration.eventId,
    ticketTypeId: registration.ticketTypeId,
    status: registration.status,
    registeredAt: registration.registeredAt.toISOString(),
  };
}
