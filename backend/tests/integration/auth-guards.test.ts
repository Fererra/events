import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { authGuards, currentUser } from '../../src/modules/auth/index.js';
import { loadConfig } from '../../src/shared/config/env.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('JwtGuard / AdminGuard', () => {
  let t: TestApp;
  let userToken: string;
  let adminToken: string;
  let businessLogicCalls = 0;

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    // Routes that another module would declare with the public guards.
    const { requireAuth, requireAdmin } = authGuards(loadConfig({ NODE_ENV: 'test' }));
    t.app.get('/test/public', async () => ({ public: true }));
    t.app.get('/test/me', { preHandler: requireAuth }, async (req) => {
      businessLogicCalls++;
      return currentUser(req);
    });
    t.app.post('/test/admin', { preHandler: requireAdmin }, async () => {
      businessLogicCalls++;
      return { ok: true };
    });
    await t.app.ready();

    ({ accessToken: userToken } = await registerAndLogin(t.app, 'user@example.com'));
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
  });
  afterAll(() => t.close());

  const call = (method: 'GET' | 'POST', url: string, headers = {}) =>
    t.app.inject({ method, url, headers });

  it('public routes are available to guests', async () => {
    expect((await call('GET', '/test/public')).statusCode).toBe(200);
  });

  it.each([
    ['no header', {}],
    ['malformed header', { authorization: 'Token abc' }],
    ['garbage token', bearer('not-a-jwt')],
  ])('%s → 401 before business logic', async (_case, headers) => {
    const before = businessLogicCalls;
    const res = await call('GET', '/test/me', headers);
    expect(res.statusCode).toBe(401);
    expect(businessLogicCalls).toBe(before);
  });

  it('expired access token → 401 TOKEN_EXPIRED', async () => {
    const { auth } = loadConfig({ NODE_ENV: 'test' });
    const expired = jwt.sign({ role: 'user', typ: 'access' }, auth.accessSecret, {
      algorithm: 'HS256',
      issuer: 'event-service',
      subject: 'someone',
      expiresIn: -1,
    });
    const res = await call('GET', '/test/me', bearer(expired));
    expect(res.statusCode).toBe(401);
    expect(res.json().code).toBe('TOKEN_EXPIRED');
  });

  it('valid token → userId and role are passed to the handler', async () => {
    const res = await call('GET', '/test/me', bearer(userToken));
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ role: 'user' });
    expect(res.json().userId).toEqual(expect.any(String));
  });

  it('admin action by a regular user → 403', async () => {
    const before = businessLogicCalls;
    const res = await call('POST', '/test/admin', bearer(userToken));
    expect(res.statusCode).toBe(403);
    expect(res.json().code).toBe('FORBIDDEN');
    expect(businessLogicCalls).toBe(before);
  });

  it('admin action by the bootstrap admin → 200', async () => {
    expect((await call('POST', '/test/admin', bearer(adminToken))).statusCode).toBe(200);
  });

  it('public registration never grants the admin role', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'sneaky@example.com', password: 'secret-pass', role: 'admin' },
    });
    // additionalProperties: false → the extra field is stripped, role stays "user"
    expect(res.statusCode).toBe(201);
    expect(res.json().role).toBe('user');
  });
});
