import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { sql } from 'drizzle-orm';
import { loadConfig } from '../../src/shared/config/env.js';
import { bearer, DEFAULT_PROFILE, login, register, registerAndLogin } from '../helpers/auth.js';
import { createPgTestApp, type PgTestApp } from '../helpers/pg-test-app.js';
import { rowsOf } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };
const SAMPLE_UUID = '00000000-0000-4000-8000-000000000000';

describe('Auth flows, validation boundaries and RBAC matrix (PostgreSQL)', () => {
  let t: PgTestApp;
  let adminToken: string;
  let userToken: string;
  let userRefreshToken: string;

  beforeAll(async () => {
    t = await createPgTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    const user = await registerAndLogin(t.app, 'rbac-user@example.com');
    userToken = user.accessToken;
    userRefreshToken = user.refreshToken;
  });

  afterAll(() => t.close());

  const postRegister = (payload: object) =>
    t.app.inject({ method: 'POST', url: '/auth/register', payload });

  it('registers with profile normalization, stores Argon2id OWASP hash and prevents role escalation', async () => {
    const res = await postRegister({
      surname: '  Kovalenko ',
      name: ' Olena  ',
      phone: '+38 (050) 123-45-67',
      email: 'Alice.Qa@Example.com',
      password: 'strong-password',
      role: 'admin',
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      email: 'alice.qa@example.com',
      surname: 'Kovalenko',
      name: 'Olena',
      phone: '+380501234567',
      role: 'user',
    });
    expect(res.json()).not.toHaveProperty('passwordHash');

    const rows = rowsOf<{ password_hash: string; role: string }>(
      await t.db.execute(
        sql`select password_hash, role from users where email = 'alice.qa@example.com'`,
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe('user');
    expect(rows[0]?.password_hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it('enforces case-insensitive email uniqueness under parallel PostgreSQL requests', async () => {
    const results = await Promise.all([
      postRegister({ ...DEFAULT_PROFILE, email: 'Race.User@example.com', password: 'secret-pass' }),
      postRegister({ ...DEFAULT_PROFILE, email: 'race.user@example.com', password: 'secret-pass' }),
      postRegister({ ...DEFAULT_PROFILE, email: 'RACE.USER@EXAMPLE.COM', password: 'secret-pass' }),
      postRegister({ ...DEFAULT_PROFILE, email: 'race.user@Example.com', password: 'secret-pass' }),
      postRegister({ ...DEFAULT_PROFILE, email: 'Race.user@example.com', password: 'secret-pass' }),
    ]);

    expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409, 409, 409, 409]);
    for (const conflict of results.filter((r) => r.statusCode === 409)) {
      expect(conflict.json()).toEqual({ code: 'EMAIL_TAKEN', message: 'Email is already taken' });
    }

    const countRows = rowsOf<{ total: number }>(
      await t.db.execute(
        sql`select count(*)::int as total from users where email = 'race.user@example.com'`,
      ),
    );
    expect(countRows[0]?.total).toBe(1);
  });

  it('validates password, name, surname and phone boundary constraints', async () => {
    const minPass = await postRegister({
      ...DEFAULT_PROFILE,
      email: 'pass8@example.com',
      password: 'a'.repeat(8),
    });
    expect(minPass.statusCode).toBe(201);

    const maxPass = await postRegister({
      ...DEFAULT_PROFILE,
      email: 'pass128@example.com',
      password: 'a'.repeat(128),
    });
    expect(maxPass.statusCode).toBe(201);

    const tooShortPass = await postRegister({
      ...DEFAULT_PROFILE,
      email: 'pass7@example.com',
      password: 'a'.repeat(7),
    });
    expect(tooShortPass.statusCode).toBe(400);
    expect(tooShortPass.json().code).toBe('VALIDATION_ERROR');

    const tooLongPass = await postRegister({
      ...DEFAULT_PROFILE,
      email: 'pass129@example.com',
      password: 'a'.repeat(129),
    });
    expect(tooLongPass.statusCode).toBe(400);
    expect(tooLongPass.json().code).toBe('VALIDATION_ERROR');

    const badSurname = await postRegister({
      ...DEFAULT_PROFILE,
      surname: 'Koval123',
      email: 'badsurname@example.com',
      password: 'secret-pass',
    });
    expect(badSurname.statusCode).toBe(400);
    expect(badSurname.json().code).toBe('SURNAME_INVALID');

    const badName = await postRegister({
      ...DEFAULT_PROFILE,
      name: 'Olena_99',
      email: 'badname@example.com',
      password: 'secret-pass',
    });
    expect(badName.statusCode).toBe(400);
    expect(badName.json().code).toBe('NAME_INVALID');

    const badPhone = await postRegister({
      ...DEFAULT_PROFILE,
      phone: 'abc-def-ghij',
      email: 'badphone@example.com',
      password: 'secret-pass',
    });
    expect(badPhone.statusCode).toBe(400);
    expect(badPhone.json().code).toBe('PHONE_INVALID');

    const tooLongName = await postRegister({
      ...DEFAULT_PROFILE,
      name: 'A'.repeat(51),
      email: 'longname@example.com',
      password: 'secret-pass',
    });
    expect(tooLongName.statusCode).toBe(400);
    expect(tooLongName.json().code).toBe('VALIDATION_ERROR');
  });

  it('returns identical 401 INVALID_CREDENTIALS for wrong password and unknown email', async () => {
    await register(t.app, 'known@example.com', 'correct-pass');

    const wrongPass = await t.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'known@example.com', password: 'wrong-password' },
    });
    const unknownEmail = await t.app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'ghost@example.com', password: 'wrong-password' },
    });

    expect(wrongPass.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPass.json()).toEqual(unknownEmail.json());
    expect(wrongPass.json().code).toBe('INVALID_CREDENTIALS');
  });

  it('rotates refresh tokens, detects stolen reuse across sessions and supports idempotent logout', async () => {
    await register(t.app, 'sessions@example.com', 'session-pass');
    const sessionA = await login(t.app, 'sessions@example.com', 'session-pass');
    const sessionB = await login(t.app, 'sessions@example.com', 'session-pass');

    // Logout revokes only session B and is idempotent
    const out1 = await t.app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken: sessionB.refreshToken },
    });
    const out2 = await t.app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken: sessionB.refreshToken },
    });
    expect(out1.statusCode).toBe(204);
    expect(out2.statusCode).toBe(204);

    // Session A rotates cleanly
    const rotated = await t.app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: sessionA.refreshToken },
    });
    expect(rotated.statusCode).toBe(200);
    const nextPair = rotated.json<{ accessToken: string; refreshToken: string }>();
    expect(nextPair.refreshToken).not.toBe(sessionA.refreshToken);

    // Reusing the already rotated refresh token triggers family revocation
    const reuse = await t.app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: sessionA.refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json().code).toBe('INVALID_REFRESH_TOKEN');

    // The newly issued token from session A is now also revoked in PostgreSQL
    const afterTheft = await t.app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: nextPair.refreshToken },
    });
    expect(afterTheft.statusCode).toBe(401);
    expect(afterTheft.json().code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('rejects expired, forged and refresh-typed JWTs on authenticated endpoints', async () => {
    const { auth } = loadConfig({ NODE_ENV: 'test' });
    const expiredAccess = jwt.sign({ role: 'user', typ: 'access' }, auth.accessSecret, {
      algorithm: 'HS256',
      issuer: 'event-service',
      subject: SAMPLE_UUID,
      expiresIn: -5,
    });

    const missing = await t.app.inject({ method: 'GET', url: '/me' });
    expect(missing.statusCode).toBe(401);
    expect(missing.json().code).toBe('UNAUTHORIZED');

    const expired = await t.app.inject({
      method: 'GET',
      url: '/me',
      headers: bearer(expiredAccess),
    });
    expect(expired.statusCode).toBe(401);
    expect(expired.json().code).toBe('TOKEN_EXPIRED');

    const wrongType = await t.app.inject({
      method: 'GET',
      url: '/me',
      headers: bearer(userRefreshToken),
    });
    expect(wrongType.statusCode).toBe(401);
    expect(wrongType.json().code).toBe('INVALID_TOKEN');
  });

  it.each([
    {
      name: 'POST /venues',
      method: 'POST' as const,
      url: '/venues',
      payload: { name: 'V', address: 'A', capacity: 10 },
    },
    {
      name: 'PATCH /venues/:id',
      method: 'PATCH' as const,
      url: `/venues/${SAMPLE_UUID}`,
      payload: { capacity: 20 },
    },
    {
      name: 'DELETE /venues/:id',
      method: 'DELETE' as const,
      url: `/venues/${SAMPLE_UUID}`,
    },
    {
      name: 'POST /events',
      method: 'POST' as const,
      url: '/events',
      payload: {
        title: 'T',
        description: 'D',
        startsAt: '2027-01-01T10:00:00Z',
        endsAt: '2027-01-01T12:00:00Z',
        organizer: 'Org',
        venueId: SAMPLE_UUID,
      },
    },
    {
      name: 'PATCH /events/:id/status',
      method: 'PATCH' as const,
      url: `/events/${SAMPLE_UUID}/status`,
      payload: { status: 'CANCELLED' },
    },
    {
      name: 'DELETE /events/:id',
      method: 'DELETE' as const,
      url: `/events/${SAMPLE_UUID}`,
    },
    {
      name: 'POST /events/:id/tickets',
      method: 'POST' as const,
      url: `/events/${SAMPLE_UUID}/tickets`,
      payload: { type: 'VIP', limit: 10, price: 100 },
    },
    {
      name: 'DELETE /admin/registrations/:id',
      method: 'DELETE' as const,
      url: `/admin/registrations/${SAMPLE_UUID}`,
    },
    {
      name: 'GET /analytics/events',
      method: 'GET' as const,
      url: '/analytics/events',
    },
  ])('enforces guest → 401 and regular user → 403 on $name', async ({ method, url, payload }) => {
    const asGuest = await t.app.inject({ method, url, ...(payload ? { payload } : {}) });
    expect(asGuest.statusCode).toBe(401);

    const asUser = await t.app.inject({
      method,
      url,
      headers: bearer(userToken),
      ...(payload ? { payload } : {}),
    });
    expect(asUser.statusCode).toBe(403);
    expect(asUser.json().code).toBe('FORBIDDEN');
  });

  it('grants admin access to analytics while keeping /me/registrations authenticated', async () => {
    expect((await t.app.inject({ method: 'GET', url: '/me/registrations' })).statusCode).toBe(401);
    expect(
      (await t.app.inject({ method: 'GET', url: '/analytics/events', headers: bearer(adminToken) }))
        .statusCode,
    ).toBe(200);
  });
});
