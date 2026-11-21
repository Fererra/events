import type { Email } from './email.js';
import type { Role } from './role.js';

export interface UserProps {
  id: string;
  email: Email;
  passwordHash: string;
  role: Role;
  createdAt: Date;
}

/**
 * User account (aggregate root of the Auth module).
 * Responsible only for identity and role — not for payments, registrations, etc. (SRP).
 */
export class User {
  private constructor(private readonly props: UserProps) {}

  /** A newly registered account always gets the `user` role. */
  static register(input: { id: string; email: Email; passwordHash: string; now: Date }): User {
    return new User({ ...input, role: 'user', createdAt: input.now });
  }

  /** Bootstrap administrator account (see ensureAdmin). */
  static createAdmin(input: { id: string; email: Email; passwordHash: string; now: Date }): User {
    return new User({ ...input, role: 'admin', createdAt: input.now });
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
