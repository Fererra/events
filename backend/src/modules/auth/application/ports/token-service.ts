import type { Role } from '../../domain/role.js';

export interface AccessTokenClaims {
  /** User id. */
  sub: string;
  role: Role;
}

export interface RefreshTokenClaims {
  sub: string;
  /** Id of the server-side RefreshToken record. */
  jti: string;
}

/**
 * Port: signs and verifies JWTs (jsonwebtoken in infrastructure).
 * `verify*` methods throw UnauthorizedError on an invalid, tampered or expired token.
 */
export interface ITokenService {
  readonly accessTtlSeconds: number;
  readonly refreshTtlSeconds: number;
  signAccessToken(claims: AccessTokenClaims): string;
  signRefreshToken(claims: RefreshTokenClaims): string;
  verifyAccessToken(token: string): AccessTokenClaims;
  verifyRefreshToken(token: string): RefreshTokenClaims;
}
