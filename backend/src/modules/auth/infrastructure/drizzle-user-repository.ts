import { eq } from 'drizzle-orm';
import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { isUniqueViolation } from '../../../shared/infrastructure/db/pg-errors.js';
import { Email } from '../domain/email.js';
import { EmailAlreadyTakenError } from '../domain/errors.js';
import { User } from '../domain/user.js';
import type { IUserRepository } from '../domain/user-repository.js';
import { users, type UserRow } from './auth.schema.js';

/** Maps ORM rows ↔ domain entities; the domain never sees Drizzle types. */
function toDomain(row: UserRow): User {
  return User.restore({
    id: row.id,
    email: Email.create(row.email),
    passwordHash: row.passwordHash,
    role: row.role,
    createdAt: row.createdAt,
  });
}

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: DbExecutorProvider) {}

  async findById(id: string): Promise<User | null> {
    const [row] = await this.db.executor().select().from(users).where(eq(users.id, id)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const [row] = await this.db
      .executor()
      .select()
      .from(users)
      .where(eq(users.email, email.value))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async add(user: User): Promise<void> {
    try {
      await this.db.executor().insert(users).values({
        id: user.id,
        email: user.email.value,
        passwordHash: user.passwordHash,
        role: user.role,
        createdAt: user.createdAt,
      });
    } catch (err) {
      if (isUniqueViolation(err)) throw new EmailAlreadyTakenError();
      throw err;
    }
  }
}
