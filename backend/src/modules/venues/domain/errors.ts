import { ConflictError } from '../../../shared/domain/errors.js';

export class VenueAddressAlreadyTakenError extends ConflictError {
  constructor() {
    super('ADDRESS_TAKEN', 'Venue address is already taken');
  }
}
