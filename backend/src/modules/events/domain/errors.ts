import { ConflictError } from '../../../shared/domain/errors.js';

export class InvalidEventStatusTransitionError extends ConflictError {
  constructor(message: string) {
    super('INVALID_STATUS_TRANSITION', message);
  }
}
