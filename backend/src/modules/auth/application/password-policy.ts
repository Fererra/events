import { ValidationError } from '../../../shared/domain/errors.js';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Length-based policy in line with OWASP ASVS (no composition rules). */
export function assertPasswordPolicy(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
    throw new ValidationError(
      'PASSWORD_INVALID',
      `Password must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters long`,
    );
  }
}
