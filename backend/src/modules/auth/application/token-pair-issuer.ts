import { RefreshToken } from '../domain/refresh-token.js';
import type { IRefreshTokenRepository } from '../domain/refresh-token-repository.js';
import type { User } from '../domain/user.js';
import type { IClock, IIdGenerator } from './ports/clock.js';
import type { ITokenService } from './ports/token-service.js';

export interface TokenPairDto {
  tokenType: 'Bearer';
  accessToken: string;
  /** Access-token lifetime in seconds. */
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

/** Issues an access/refresh pair and stores the refresh-token record (call inside a UoW). */
export class TokenPairIssuer {
  constructor(
    private readonly tokens: ITokenService,
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async issueFor(user: User): Promise<TokenPairDto> {
    const record = RefreshToken.issue({
      id: this.ids.next(),
      userId: user.id,
      now: this.clock.now(),
      ttlSeconds: this.tokens.refreshTtlSeconds,
    });
    await this.refreshTokens.add(record);

    return {
      tokenType: 'Bearer',
      accessToken: this.tokens.signAccessToken({ sub: user.id, role: user.role }),
      expiresIn: this.tokens.accessTtlSeconds,
      refreshToken: this.tokens.signRefreshToken({ sub: user.id, jti: record.id }),
      refreshExpiresIn: this.tokens.refreshTtlSeconds,
    };
  }
}
