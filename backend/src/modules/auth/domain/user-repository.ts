import type { Email } from './email.js';
import type { User } from './user.js';

/** Persistence port for users (implemented in infrastructure). */
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  /** Inserts a new user. Throws EmailAlreadyTakenError on a duplicate e-mail. */
  add(user: User): Promise<void>;
}
