import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('DELETE /venues/:id', () => {
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

  const createVenue = async (name: string, address: string) => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name, address, capacity: 250 },
    });
    expect(res.statusCode).toBe(201);
    return res.json<{ id: string }>().id;
  };

  const del = (id: string, token?: string) =>
    t.app.inject({
      method: 'DELETE',
      url: `/venues/${id}`,
      headers: token ? bearer(token) : {},
    });

  it('deletes a venue without events → 204', async () => {
    const id = await createVenue('Empty Hall', 'Kyiv, Delete St 1');
    expect((await del(id, adminToken)).statusCode).toBe(204);
    expect((await t.app.inject({ method: 'GET', url: `/venues/${id}` })).statusCode).toBe(404);
  });

  it('rejects deleting a venue that has a scheduled event → 409 VENUE_HAS_EVENTS', async () => {
    const id = await createVenue('Scheduled Hall', 'Kyiv, Delete St 2');
    const ev = await t.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(adminToken),
      payload: {
        title: 'Upcoming Conf',
        description: 'Blocks deletion',
        startsAt: '2026-12-20T10:00:00Z',
        endsAt: '2026-12-20T18:00:00Z',
        organizer: 'KPI',
        venueId: id,
      },
    });
    expect(ev.statusCode).toBe(201);

    const res = await del(id, adminToken);
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('VENUE_HAS_EVENTS');
    expect((await t.app.inject({ method: 'GET', url: `/venues/${id}` })).statusCode).toBe(200);
  });

  it('allows deleting a venue whose events are only FINISHED or CANCELLED → 204', async () => {
    const id = await createVenue('Archive Hall', 'Kyiv, Delete St 3');
    const ev = await t.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(adminToken),
      payload: {
        title: 'Past Conf',
        description: 'Already done',
        startsAt: '2026-10-01T10:00:00Z',
        endsAt: '2026-10-01T18:00:00Z',
        organizer: 'KPI',
        venueId: id,
      },
    });
    const eventId = ev.json<{ id: string }>().id;
    await t.db.execute(sql`update events set status = 'CANCELLED' where id = ${eventId}`);

    expect((await del(id, adminToken)).statusCode).toBe(204);
  });

  it('unknown venue → 404 VENUE_NOT_FOUND; user → 403; guest → 401', async () => {
    const id = await createVenue('Guarded Hall', 'Kyiv, Delete St 4');
    expect((await del('00000000-0000-4000-8000-000000000000', adminToken)).statusCode).toBe(404);
    expect((await del(id, userToken)).statusCode).toBe(403);
    expect((await del(id)).statusCode).toBe(401);
  });
});
