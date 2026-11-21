import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { createTestApp, rowsOf, type TestApp } from '../helpers/test-app.js';
import { register } from '../helpers/auth.js';

describe('POST /auth/login', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await register(t.app, 'login@example.com', 'correct-horse');
  });
  afterAll(() => t.close());

  const login = (email: string, password: string) =>
    t.app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });

  it('returns an access JWT (15 min) and a refresh JWT (7 days)', async () => {
    const res = await login('login@example.com', 'correct-horse');
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ tokenType: 'Bearer', expiresIn: 900, refreshExpiresIn: 604_800 });

    const access = jwt.decode(body.accessToken) as jwt.JwtPayload;
    const refresh = jwt.decode(body.refreshToken) as jwt.JwtPayload;
    expect(access.exp! - access.iat!).toBe(15 * 60);
    expect(refresh.exp! - refresh.iat!).toBe(7 * 24 * 60 * 60);
    expect(access.role).toBe('user');
  });

  it('stores the refresh token in the database so it can be revoked', async () => {
    const { refreshToken } = (await login('login@example.com', 'correct-horse')).json();
    const { jti } = jwt.decode(refreshToken) as jwt.JwtPayload;
    const rows = rowsOf<{ revoked_at: Date | null }>(
      await t.db.execute(sql`select revoked_at from refresh_tokens where id = ${jti}`),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.revoked_at).toBeNull();
  });

  it('accepts the e-mail case-insensitively', async () => {
    expect((await login('LOGIN@Example.com', 'correct-horse')).statusCode).toBe(200);
  });

  it('wrong password and unknown e-mail give the same 401 (no enumeration)', async () => {
    const wrongPassword = await login('login@example.com', 'wrong-horse');
    const unknownEmail = await login('ghost@example.com', 'correct-horse');
    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.json()).toEqual(unknownEmail.json());
    expect(wrongPassword.json()).toEqual({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  });
});
