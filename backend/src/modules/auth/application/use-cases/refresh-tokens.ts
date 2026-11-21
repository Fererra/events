import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { UnauthorizedError } from '../../../../shared/domain/errors.js';
import type { IRefreshTokenRepository } from '../../domain/refresh-token-repository.js';
import type { IUserRepository } from '../../domain/user-repository.js';
import type { IClock } from '../ports/clock.js';
import type { ITokenService } from '../ports/token-service.js';
import type { TokenPairDto, TokenPairIssuer } from '../token-pair-issuer.js';

const invalidRefreshToken = () =>
  new UnauthorizedError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid or revoked');

type Outcome = { ok: true; pair: TokenPairDto } | { ok: false };

/**
 * Command: exchanges a valid refresh token for a new pair (refresh-token rotation).
 * The old token is revoked; presenting an already revoked token is treated as
 * theft — every session of that user is revoked.
 */
export class RefreshTokensUseCase {
  constructor(
    private readonly tokens: ITokenService,
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly users: IUserRepository,
    private readonly issuer: TokenPairIssuer,
    private readonly uow: IUnitOfWork,
    private readonly clock: IClock,
  ) {}

  async execute(refreshToken: string): Promise<TokenPairDto> {
    const claims = this.tokens.verifyRefreshToken(refreshToken); // 401 on bad signature / expiry

    // Decide inside the transaction, throw after COMMIT so that a reuse-triggered
    // revocation is persisted rather than rolled back.
    const outcome = await this.uow.run<Outcome>(async () => {
      const now = this.clock.now();
      const record = await this.refreshTokens.findByIdForUpdate(claims.jti); // row lock
      if (!record || record.userId !== claims.sub) return { ok: false };

      if (record.isRevoked()) {
        await this.refreshTokens.revokeAllForUser(record.userId, now);
        return { ok: false };
      }
      if (!record.isActive(now)) return { ok: false };

      const user = await this.users.findById(record.userId);
      if (!user) return { ok: false };

      record.revoke(now);
      await this.refreshTokens.save(record);
      return { ok: true, pair: await this.issuer.issueFor(user) };
    });

    if (!outcome.ok) throw invalidRefreshToken();
    return outcome.pair;
  }
}
