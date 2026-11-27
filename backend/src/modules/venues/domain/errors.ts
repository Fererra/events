import { ConflictError } from '../../../shared/domain/errors.js';

export class VenueAddressAlreadyTakenError extends ConflictError {
  constructor() {
    super('ADDRESS_TAKEN', 'Venue address is already taken');
  }
}

export class VenueHasScheduledEventsError extends ConflictError {
  constructor() {
    super('VENUE_HAS_EVENTS', 'Cannot delete venue with scheduled events');
  }
}
