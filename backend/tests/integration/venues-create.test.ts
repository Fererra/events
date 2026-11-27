import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, rowsOf, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('POST /venues', () => {
  let t: TestApp;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    ({ accessToken: userToken } = await registerAndLogin(t.app, 'user@example.com'));
  });
  afterAll(() => t.close());

  const createVenue = (payload: object, token?: string) =>
    t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: token ? bearer(token) : {},
      payload,
    });

  it('allows admin to create a venue → 201 and persists it in PostgreSQL', async () => {
    const res = await createVenue(
      { name: 'KPI Culture Center', address: 'Kyiv, Beresteiskyi Ave 37', capacity: 800 },
      adminToken,
    );
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toEqual({
      id: expect.any(String),
      name: 'KPI Culture Center',
      address: 'Kyiv, Beresteiskyi Ave 37',
      capacity: 800,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });

    const rows = rowsOf<{ address: string; normalized_address: string; capacity: number }>(
      await t.db.execute(
        sql`select address, normalized_address, capacity from venues where id = ${body.id}`,
      ),
    );
    expect(rows).toEqual([
      {
        address: 'Kyiv, Beresteiskyi Ave 37',
        normalized_address: 'kyiv, beresteiskyi ave 37',
        capacity: 800,
      },
    ]);
  });

  it('duplicate address (case- and whitespace-insensitive) → 409 ADDRESS_TAKEN', async () => {
    await createVenue(
      { name: 'Hall A', address: 'Kyiv, Politekhnichna 14', capacity: 120 },
      adminToken,
    );
    const res = await createVenue(
      { name: 'Hall B', address: '  KYIV,   politekhnichna 14 ', capacity: 200 },
      adminToken,
    );
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      code: 'ADDRESS_TAKEN',
      message: 'Venue address is already taken',
    });
  });

  it('concurrent creations with the same address: exactly one wins, others → 409', async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        createVenue(
          { name: `Race Hall ${i}`, address: 'Kyiv, Race Street 1', capacity: 100 },
          adminToken,
        ),
      ),
    );
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes).toEqual([201, 409, 409, 409, 409]);

    const rows = rowsOf<{ n: number }>(
      await t.db.execute(
        sql`select count(*)::int as n from venues where normalized_address = 'kyiv, race street 1'`,
      ),
    );
    expect(rows[0]?.n).toBe(1);
  });

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['non-integer', 10.5],
  ])('rejects %s capacity → 400 CAPACITY_INVALID', async (_label, capacity) => {
    const res = await createVenue(
      { name: 'Bad Cap', address: `Kyiv, Cap St ${_label}`, capacity },
      adminToken,
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('CAPACITY_INVALID');
  });

  it('invalid body → 400 VALIDATION_ERROR with field details', async () => {
    const res = await createVenue({ name: '', capacity: 'many' }, adminToken);
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details.length).toBeGreaterThan(0);
  });

  it('is available to admins only: user → 403, guest → 401', async () => {
    const payload = { name: 'Secret Hall', address: 'Kyiv, Guard St 1', capacity: 50 };
    expect((await createVenue(payload, userToken)).statusCode).toBe(403);
    expect((await createVenue(payload)).statusCode).toBe(401);
  });
});
