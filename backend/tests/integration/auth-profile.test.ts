import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from '../helpers/test-app.js';
import { bearer, DEFAULT_PROFILE, login, registerAndLogin } from '../helpers/auth.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('GET /me', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    await t.app.ready();
  });
  afterAll(() => t.close());

  it('returns profile fields, e-mail, role and registration date of the caller', async () => {
    const { user, accessToken } = await registerAndLogin(t.app, 'me@example.com');
    const res = await t.app.inject({ method: 'GET', url: '/me', headers: bearer(accessToken) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      id: user.id,
      email: 'me@example.com',
      surname: DEFAULT_PROFILE.surname,
      name: DEFAULT_PROFILE.name,
      phone: DEFAULT_PROFILE.phone,
      role: 'user',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(res.json()).not.toHaveProperty('passwordHash');
  });

  it('returns nullable profile fields for the bootstrap admin', async () => {
    const { accessToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD);
    const res = await t.app.inject({ method: 'GET', url: '/me', headers: bearer(accessToken) });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      email: ADMIN.ADMIN_EMAIL,
      surname: null,
      name: null,
      phone: null,
      role: 'admin',
    });
  });

  it('without a token → 401', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/me' });
    expect(res.statusCode).toBe(401);
  });
});
