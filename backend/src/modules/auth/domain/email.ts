import { ValidationError } from '../../../shared/domain/errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Value object: normalized (trimmed, lower-case) e-mail address. */
export class Email {
  private constructor(public readonly value: string) {}

  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (value.length > 254 || !EMAIL_RE.test(value)) {
      throw new ValidationError('EMAIL_INVALID', 'Email address is invalid');
    }
    return new Email(value);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
