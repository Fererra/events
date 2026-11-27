import { ConflictError } from '../../../shared/domain/errors.js';

export class TicketCapacityExceededError extends ConflictError {
  constructor() {
    super('TICKET_CAPACITY_EXCEEDED', 'Sum of ticket limits exceeds venue capacity');
  }
}

export class TicketTypeAlreadyExistsError extends ConflictError {
  constructor() {
    super('TICKET_TYPE_TAKEN', 'Ticket type with this name already exists for the event');
  }
}

export class EventNotEditableForTicketsError extends ConflictError {
  constructor(status: string) {
    super('INVALID_STATUS_TRANSITION', `Cannot add ticket types to an event in status ${status}`);
  }
}
