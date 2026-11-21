import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../../shared/domain/errors.js';
import type {
  AccessTokenClaims,
  ITokenService,
  RefreshTokenClaims,
} from '../application/ports/token-service.js';
import { isRole } from '../domain/role.js';

export interface JwtOptions {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

const ISSUER = 'event-service';
const ALGORITHM = 'HS256' as const;

/** HS256 JWTs; access and refresh tokens use different secrets and `typ` claims. */
export class JwtTokenService implements ITokenService {
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;

  constructor(private readonly options: JwtOptions) {
    this.accessTtlSeconds = options.accessTtlSeconds;
    this.refreshTtlSeconds = options.refreshTtlSeconds;
  }

  signAccessToken({ sub, role }: AccessTokenClaims): string {
    return jwt.sign({ role, typ: 'access' }, this.options.accessSecret, {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      subject: sub,
      expiresIn: this.accessTtlSeconds,
    });
  }

  signRefreshToken({ sub, jti }: RefreshTokenClaims): string {
    return jwt.sign({ typ: 'refresh' }, this.options.refreshSecret, {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      subject: sub,
      jwtid: jti,
      expiresIn: this.refreshTtlSeconds,
    });
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    const payload = this.verify(token, this.options.accessSecret, 'access');
    const role = payload.role;
    if (typeof role !== 'string' || !isRole(role) || !payload.sub) throw invalid('access');
    return { sub: payload.sub, role };
  }

  verifyRefreshToken(token: string): RefreshTokenClaims {
    const payload = this.verify(token, this.options.refreshSecret, 'refresh');
    if (!payload.sub || !payload.jti) throw invalid('refresh');
    return { sub: payload.sub, jti: payload.jti };
  }

  private verify(token: string, secret: string, typ: 'access' | 'refresh'): jwt.JwtPayload {
    try {
      const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM], issuer: ISSUER });
      if (typeof payload === 'string' || payload.typ !== typ) throw invalid(typ);
      return payload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError(
          typ === 'access' ? 'TOKEN_EXPIRED' : 'INVALID_REFRESH_TOKEN',
          `${typ === 'access' ? 'Access' : 'Refresh'} token expired`,
        );
      }
      if (err instanceof UnauthorizedError) throw err;
      throw invalid(typ);
    }
  }
}

function invalid(typ: 'access' | 'refresh'): UnauthorizedError {
  return typ === 'access'
    ? new UnauthorizedError('INVALID_TOKEN', 'Access token is invalid')
    : new UnauthorizedError('INVALID_REFRESH_TOKEN', 'Refresh token is invalid');
}
