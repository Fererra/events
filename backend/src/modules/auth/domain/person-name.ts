import { ValidationError } from '../../../shared/domain/errors.js';

const NAME_RE = /^\p{L}[\p{L}\s'-]*$/u;
export const PERSON_NAME_MAX_LENGTH = 50;

export type PersonNameField = 'surname' | 'name';

/** Value object: trimmed human name or surname (letters, spaces, hyphens, apostrophes). */
export class PersonName {
  private constructor(public readonly value: string) {}

  static create(raw: string, field: PersonNameField): PersonName {
    const value = raw.trim();
    if (value.length === 0 || value.length > PERSON_NAME_MAX_LENGTH || !NAME_RE.test(value)) {
      throw new ValidationError(
        field === 'surname' ? 'SURNAME_INVALID' : 'NAME_INVALID',
        `${field === 'surname' ? 'Surname' : 'Name'} is invalid`,
      );
    }
    return new PersonName(value);
  }
}
