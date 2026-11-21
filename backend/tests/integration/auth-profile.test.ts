import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../helpers/test-app.js';
import { bearer, registerAndLogin } from '../helpers/auth.js';

describe('GET /me', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('returns e-mail, role and registration date of the caller', async () => {
    const { user, accessToken } = await registerAndLogin(t.app, 'me@example.com');
    const res = await t.app.inject({ method: 'GET', url: '/me', headers: bearer(accessToken) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: user.id,
      email: 'me@example.com',
      role: 'user',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(res.json()).not.toHaveProperty('passwordHash');
  });

  it('without a token → 401', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/me' });
    expect(res.statusCode).toBe(401);
  });
});
