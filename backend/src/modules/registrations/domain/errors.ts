import { ConflictError } from '../../../shared/domain/errors.js';

export class EventRegistrationClosedError extends ConflictError {
  constructor(message = 'Registration is only available for active events') {
    super('EVENT_REGISTRATION_CLOSED', message);
  }
}

export class TicketsSoldOutError extends ConflictError {
  constructor(message = 'Tickets of this type are sold out') {
    super('TICKETS_SOLD_OUT', message);
  }
}
