import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { JwtTokenService } from '../../../src/modules/auth/infrastructure/jwt-token-service.js';
import { UnauthorizedError } from '../../../src/shared/domain/errors.js';

const service = new JwtTokenService({
  accessSecret: 'a'.repeat(32),
  refreshSecret: 'r'.repeat(32),
  accessTtlSeconds: 900,
  refreshTtlSeconds: 604_800,
});

describe('JwtTokenService', () => {
  it('round-trips access token claims with a 15 min lifetime', () => {
    const token = service.signAccessToken({ sub: 'u1', role: 'admin' });
    expect(service.verifyAccessToken(token)).toEqual({ sub: 'u1', role: 'admin' });
    const { exp, iat } = jwt.decode(token) as jwt.JwtPayload;
    expect(exp! - iat!).toBe(900);
  });

  it('round-trips refresh token claims with a 7 day lifetime', () => {
    const token = service.signRefreshToken({ sub: 'u1', jti: 't1' });
    expect(service.verifyRefreshToken(token)).toEqual({ sub: 'u1', jti: 't1' });
    const { exp, iat } = jwt.decode(token) as jwt.JwtPayload;
    expect(exp! - iat!).toBe(604_800);
  });

  it('does not accept a refresh token as an access token and vice versa', () => {
    const access = service.signAccessToken({ sub: 'u1', role: 'user' });
    const refresh = service.signRefreshToken({ sub: 'u1', jti: 't1' });
    expect(() => service.verifyAccessToken(refresh)).toThrow(UnauthorizedError);
    expect(() => service.verifyRefreshToken(access)).toThrow(UnauthorizedError);
  });

  it('rejects a tampered token', () => {
    const token = service.signAccessToken({ sub: 'u1', role: 'user' });
    const [h, , s] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({ sub: 'u1', role: 'admin', typ: 'access' }),
    ).toString('base64url');
    expect(() => service.verifyAccessToken(`${h}.${forged}.${s}`)).toThrow(UnauthorizedError);
  });

  it('rejects "alg: none" tokens', () => {
    const unsigned = jwt.sign({ role: 'admin', typ: 'access', sub: 'u1' }, '', {
      algorithm: 'none',
    });
    expect(() => service.verifyAccessToken(unsigned)).toThrow(UnauthorizedError);
  });

  it('reports an expired access token with TOKEN_EXPIRED', () => {
    const expired = jwt.sign({ role: 'user', typ: 'access' }, 'a'.repeat(32), {
      algorithm: 'HS256',
      issuer: 'event-service',
      subject: 'u1',
      expiresIn: -10,
    });
    expect(() => service.verifyAccessToken(expired)).toThrow(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
    );
  });
});
