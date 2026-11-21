import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { loadConfig } from '../../src/shared/config/env.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/jwt-token-service.js';
import { login, register } from '../helpers/auth.js';

describe('POST /auth/refresh', () => {
  let t: TestApp;
  let n = 0;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  /** Fresh account per test so token families do not interfere. */
  const freshLogin = async () => {
    const email = `refresh${++n}@example.com`;
    await register(t.app, email);
    return login(t.app, email);
  };
  const refresh = (refreshToken: string) =>
    t.app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });

  it('issues a new pair and the new access token works', async () => {
    const { refreshToken } = await freshLogin();
    const res = await refresh(refreshToken);
    expect(res.statusCode).toBe(200);
    const pair = res.json();
    expect(pair.refreshToken).not.toBe(refreshToken); // rotated

    const service = new JwtTokenService(loadConfig({ NODE_ENV: 'test' }).auth);
    expect(service.verifyAccessToken(pair.accessToken)).toMatchObject({ role: 'user' });
  });

  it('a rotated (old) refresh token is rejected → 401', async () => {
    const { refreshToken } = await freshLogin();
    expect((await refresh(refreshToken)).statusCode).toBe(200);
    const reused = await refresh(refreshToken);
    expect(reused.statusCode).toBe(401);
    expect(reused.json().code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('reuse of a rotated token revokes the whole session family', async () => {
    const { refreshToken: first } = await freshLogin();
    const second = (await refresh(first)).json().refreshToken as string;
    expect((await refresh(first)).statusCode).toBe(401); // theft detected
    expect((await refresh(second)).statusCode).toBe(401); // attacker's / victim's newer token also dead
  });

  it('expired refresh token → 401', async () => {
    const { auth } = loadConfig({ NODE_ENV: 'test' });
    const expired = jwt.sign({ typ: 'refresh' }, auth.refreshSecret, {
      algorithm: 'HS256',
      issuer: 'event-service',
      subject: 'u',
      jwtid: crypto.randomUUID(),
      expiresIn: -1,
    });
    expect((await refresh(expired)).statusCode).toBe(401);
  });

  it('an access token cannot be used as a refresh token → 401', async () => {
    const { accessToken } = await freshLogin();
    expect((await refresh(accessToken)).statusCode).toBe(401);
  });

  it('a validly signed token with unknown jti → 401', async () => {
    const { auth } = loadConfig({ NODE_ENV: 'test' });
    const forged = jwt.sign({ typ: 'refresh' }, auth.refreshSecret, {
      algorithm: 'HS256',
      issuer: 'event-service',
      subject: 'u',
      jwtid: crypto.randomUUID(),
      expiresIn: 60,
    });
    expect((await refresh(forged)).statusCode).toBe(401);
  });
});
