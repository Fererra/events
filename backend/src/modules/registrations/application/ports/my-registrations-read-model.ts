import type { RegistrationStatus } from '../../domain/registration.js';

export type { RegistrationStatus };

/** Read-side projection for "my registrations" (CQS query side, no domain entities). */
export interface MyRegistrationView {
  id: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: Date;
  eventEndsAt: Date;
  ticketType: string;
  ticketPrice: number;
  status: RegistrationStatus;
  registeredAt: Date;
}

/** Port: read model over registrations + events + ticket types. */
export interface IMyRegistrationsReadModel {
  listByUser(userId: string): Promise<MyRegistrationView[]>;
}
