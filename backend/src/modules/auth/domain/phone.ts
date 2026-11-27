import { ValidationError } from '../../../shared/domain/errors.js';

const PHONE_RE = /^\+?\d{10,15}$/;

/** Value object: normalized phone number (spaces, parentheses and hyphens stripped). */
export class Phone {
  private constructor(public readonly value: string) {}

  static create(raw: string): Phone {
    const value = raw.trim().replace(/[\s()-]/g, '');
    if (!PHONE_RE.test(value)) {
      throw new ValidationError('PHONE_INVALID', 'Phone number is invalid');
    }
    return new Phone(value);
  }
}
