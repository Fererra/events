import type { AppContext } from '../../shared/module.js';
import { systemClock, uuidGenerator } from './application/ports/clock.js';
import { TokenPairIssuer } from './application/token-pair-issuer.js';
import { EnsureAdminUseCase } from './application/use-cases/ensure-admin.js';
import { LoginUserUseCase } from './application/use-cases/login-user.js';
import { LogoutUseCase } from './application/use-cases/logout.js';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.js';
import { RegisterUserUseCase } from './application/use-cases/register-user.js';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher.js';
import { DrizzleRefreshTokenRepository } from './infrastructure/drizzle-refresh-token-repository.js';
import { DrizzleUserRepository } from './infrastructure/drizzle-user-repository.js';
import { JwtTokenService } from './infrastructure/jwt-token-service.js';
import { createAuthGuards } from './presentation/guards.js';

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
    guards: createAuthGuards(tokens),
    registerUser: new RegisterUserUseCase(users, hasher, ctx.uow, clock, ids),
    loginUser: new LoginUserUseCase(users, hasher, issuer, ctx.uow),
    ensureAdmin: new EnsureAdminUseCase(users, hasher, ctx.uow, clock, ids),
    refreshTokens: new RefreshTokensUseCase(tokens, refreshTokens, users, issuer, ctx.uow, clock),
    logout: new LogoutUseCase(tokens, refreshTokens, ctx.uow, clock),
  };
}

export type AuthContainer = ReturnType<typeof createAuthContainer>;
