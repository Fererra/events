import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('PATCH /venues/:id', () => {
  let t: TestApp;
  let adminToken: string;
  let userToken: string;
  let venueA: string;
  let venueB: string;

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    ({ accessToken: userToken } = await registerAndLogin(t.app, 'user@example.com'));

    const resA = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'Alpha Hall', address: 'Kyiv, Alpha St 1', capacity: 200 },
    });
    const resB = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'Beta Hall', address: 'Kyiv, Beta St 2', capacity: 300 },
    });
    venueA = resA.json<{ id: string }>().id;
    venueB = resB.json<{ id: string }>().id;
  });
  afterAll(() => t.close());

  const patchVenue = (id: string, payload: object, token?: string) =>
    t.app.inject({
      method: 'PATCH',
      url: `/venues/${id}`,
      headers: token ? bearer(token) : {},
      payload,
    });

  it('allows admin to edit venue fields → 200 and persists changes', async () => {
    const res = await patchVenue(
      venueA,
      { name: 'Alpha Arena', address: 'Kyiv, Alpha Blvd 10', capacity: 550 },
      adminToken,
    );
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      id: venueA,
      name: 'Alpha Arena',
      address: 'Kyiv, Alpha Blvd 10',
      capacity: 550,
    });

    const fetched = await t.app.inject({ method: 'GET', url: `/venues/${venueA}` });
    expect(fetched.json()).toMatchObject({
      name: 'Alpha Arena',
      address: 'Kyiv, Alpha Blvd 10',
      capacity: 550,
    });
  });

  it('allows updating the same venue with a case-variant of its own address', async () => {
    const res = await patchVenue(venueB, { address: 'kyiv, BETA st 2' }, adminToken);
    expect(res.statusCode).toBe(200);
    expect(res.json().address).toBe('kyiv, BETA st 2');
  });

  it('changing address to an already taken address → 409 ADDRESS_TAKEN', async () => {
    const res = await patchVenue(venueA, { address: '  KYIV, beta st 2 ' }, adminToken);
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      code: 'ADDRESS_TAKEN',
      message: 'Venue address is already taken',
    });
  });

  it('empty body → 400 VALIDATION_ERROR; non-positive capacity → 400 CAPACITY_INVALID', async () => {
    const empty = await patchVenue(venueA, {}, adminToken);
    expect(empty.statusCode).toBe(400);
    expect(empty.json().code).toBe('VALIDATION_ERROR');

    const badCap = await patchVenue(venueA, { capacity: 0 }, adminToken);
    expect(badCap.statusCode).toBe(400);
    expect(badCap.json().code).toBe('CAPACITY_INVALID');
  });

  it('unknown venue UUID → 404 VENUE_NOT_FOUND', async () => {
    const res = await patchVenue(
      '00000000-0000-4000-8000-000000000000',
      { name: 'Ghost' },
      adminToken,
    );
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('VENUE_NOT_FOUND');
  });

  it('is available to admins only: user → 403, guest → 401', async () => {
    expect((await patchVenue(venueA, { name: 'Hacked' }, userToken)).statusCode).toBe(403);
    expect((await patchVenue(venueA, { name: 'Hacked' })).statusCode).toBe(401);
  });
});
