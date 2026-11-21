import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import type { IRefreshTokenRepository } from '../../domain/refresh-token-repository.js';
import type { IClock } from '../ports/clock.js';
import type { ITokenService } from '../ports/token-service.js';

/**
 * Command: ends the session by revoking its refresh token in the DB.
 * Idempotent — logging out twice is not an error. The short-lived access
 * token simply expires (≤ 15 min).
 */
export class LogoutUseCase {
  constructor(
    private readonly tokens: ITokenService,
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly uow: IUnitOfWork,
    private readonly clock: IClock,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    const { sub, jti } = this.tokens.verifyRefreshToken(refreshToken); // 401 if forged

    await this.uow.run(async () => {
      const record = await this.refreshTokens.findByIdForUpdate(jti);
      if (!record || record.userId !== sub || record.isRevoked()) return;
      record.revoke(this.clock.now());
      await this.refreshTokens.save(record);
    });
  }
}
