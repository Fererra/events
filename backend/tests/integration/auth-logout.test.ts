import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { createTestApp, rowsOf, type TestApp } from '../helpers/test-app.js';
import { login, register } from '../helpers/auth.js';

describe('POST /auth/logout', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await register(t.app, 'logout@example.com');
  });
  afterAll(() => t.close());

  const post = (url: string, refreshToken: string) =>
    t.app.inject({ method: 'POST', url, payload: { refreshToken } });

  it('revokes the refresh token in the DB → 204', async () => {
    const { refreshToken } = await login(t.app, 'logout@example.com');
    const res = await post('/auth/logout', refreshToken);
    expect(res.statusCode).toBe(204);

    const { jti } = jwt.decode(refreshToken) as jwt.JwtPayload;
    const rows = rowsOf<{ revoked_at: Date | null }>(
      await t.db.execute(sql`select revoked_at from refresh_tokens where id = ${jti}`),
    );
    expect(rows[0]?.revoked_at).not.toBeNull();
  });

  it('refresh with a logged-out token → 401', async () => {
    const { refreshToken } = await login(t.app, 'logout@example.com');
    await post('/auth/logout', refreshToken);
    const res = await post('/auth/refresh', refreshToken);
    expect(res.statusCode).toBe(401);
  });

  it('is idempotent', async () => {
    const { refreshToken } = await login(t.app, 'logout@example.com');
    expect((await post('/auth/logout', refreshToken)).statusCode).toBe(204);
    expect((await post('/auth/logout', refreshToken)).statusCode).toBe(204);
  });

  it('logging out one session keeps other sessions alive', async () => {
    const a = await login(t.app, 'logout@example.com');
    const b = await login(t.app, 'logout@example.com');
    await post('/auth/logout', a.refreshToken);
    expect((await post('/auth/refresh', b.refreshToken)).statusCode).toBe(200);
  });

  it('a forged token → 401', async () => {
    expect((await post('/auth/logout', 'not.a.jwt')).statusCode).toBe(401);
  });
});
