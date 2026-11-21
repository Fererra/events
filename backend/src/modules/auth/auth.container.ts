import type { AppContext } from '../../shared/module.js';
import { systemClock, uuidGenerator } from './application/ports/clock.js';
import { TokenPairIssuer } from './application/token-pair-issuer.js';
import { LoginUserUseCase } from './application/use-cases/login-user.js';
import { RegisterUserUseCase } from './application/use-cases/register-user.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { DrizzleRefreshTokenRepository } from './infrastructure/drizzle-refresh-token-repository.js';
import { DrizzleUserRepository } from './infrastructure/drizzle-user-repository.js';
import { JwtTokenService } from './infrastructure/jwt-token-service.js';

/** Module-level composition: wires ports to their infrastructure adapters. */
export function createAuthContainer(ctx: AppContext) {
  const clock = systemClock;
  const ids = uuidGenerator;
  const users = new DrizzleUserRepository(ctx.db);
  const refreshTokens = new DrizzleRefreshTokenRepository(ctx.db);
  const hasher = new Argon2PasswordHasher();
  const tokens = new JwtTokenService(ctx.config.auth);
  const issuer = new TokenPairIssuer(tokens, refreshTokens, clock, ids);

  return {
    users,
    hasher,
    tokens,
    registerUser: new RegisterUserUseCase(users, hasher, ctx.uow, clock, ids),
    loginUser: new LoginUserUseCase(users, hasher, issuer, ctx.uow),
  };
}

export type AuthContainer = ReturnType<typeof createAuthContainer>;
