import type { AppContext } from '../../shared/module.js';
import { systemClock, uuidGenerator } from './application/ports/clock.js';
import { RegisterUserUseCase } from './application/use-cases/register-user.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { DrizzleUserRepository } from './infrastructure/drizzle-user-repository.js';

/** Module-level composition: wires ports to their infrastructure adapters. */
export function createAuthContainer(ctx: AppContext) {
  const users = new DrizzleUserRepository(ctx.db);
  const hasher = new Argon2PasswordHasher();

  return {
    users,
    hasher,
    registerUser: new RegisterUserUseCase(users, hasher, ctx.uow, systemClock, uuidGenerator),
  };
}

export type AuthContainer = ReturnType<typeof createAuthContainer>;
