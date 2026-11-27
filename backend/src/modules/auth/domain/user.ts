import type { Email } from './email.js';
import type { PersonName } from './person-name.js';
import type { Phone } from './phone.js';
import type { Role } from './role.js';

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string;
  surname: string | null;
  name: string | null;
  phone: string | null;
  role: Role;
  createdAt: Date;
}

/**
 * User account (aggregate root of the Auth module).
 * Responsible only for identity, profile basics and role — not for registrations, etc. (SRP).
 */
export class User {
  private constructor(private readonly props: UserProps) {}

  /** A newly registered account always gets the `user` role. */
  static register(input: {
    id: string;
    email: Email;
    passwordHash: string;
    surname: PersonName;
    name: PersonName;
    phone: Phone;
    now: Date;
  }): User {
    return new User({
      id: input.id,
      email: input.email,
      passwordHash: input.passwordHash,
      surname: input.surname.value,
      name: input.name.value,
      phone: input.phone.value,
      role: 'user',
      createdAt: input.now,
    });
  }

  /** Bootstrap administrator account (see ensureAdmin). */
  static createAdmin(input: { id: string; email: Email; passwordHash: string; now: Date }): User {
    return new User({
      ...input,
      surname: null,
      name: null,
      phone: null,
      role: 'admin',
      createdAt: input.now,
    });
  }

  /** Rehydrates a persisted user (used by repositories). */
  static restore(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }
  get email(): Email {
    return this.props.email;
  }
  get passwordHash(): string {
    return this.props.passwordHash;
  }
  get surname(): string | null {
    return this.props.surname;
  }
  get name(): string | null {
    return this.props.name;
  }
  get phone(): string | null {
    return this.props.phone;
  }
  get role(): Role {
    return this.props.role;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }

  isAdmin(): boolean {
    return this.props.role === 'admin';
  }
}
