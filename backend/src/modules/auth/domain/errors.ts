import { ConflictError, UnauthorizedError } from '../../../shared/domain/errors.js';

export class EmailAlreadyTakenError extends ConflictError {
  constructor() {
    super('EMAIL_TAKEN', 'Email is already taken');
  }
}

/** Deliberately does not reveal whether the e-mail or the password was wrong. */
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('INVALID_CREDENTIALS', 'Invalid email or password');
  }
}
