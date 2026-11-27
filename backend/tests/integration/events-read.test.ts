import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('GET /events, GET /events/:id and live Analytics EventCatalog (ES-19)', () => {
  let t: TestApp;
  let adminToken: string;
  let userToken: string;
  let venueA: string;
  let venueB: string;
  const eventIds: string[] = [];

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    ({ accessToken: userToken } = await registerAndLogin(t.app, 'viewer@example.com'));

    const vA = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'Hall A', address: 'Kyiv, Event Ave 1', capacity: 200 },
    });
    const vB = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'Hall B', address: 'Kyiv, Event Ave 2', capacity: 300 },
    });
    venueA = vA.json<{ id: string }>().id;
    venueB = vB.json<{ id: string }>().id;

    for (let i = 1; i <= 5; i++) {
      const res = await t.app.inject({
        method: 'POST',
        url: '/events',
        headers: bearer(adminToken),
        payload: {
          title: `Conference ${i}`,
          description: `Details ${i}`,
          startsAt: `2026-12-0${i}T10:00:00Z`,
          endsAt: `2026-12-0${i}T16:00:00Z`,
          organizer: 'KPI',
          venueId: i <= 2 ? venueA : venueB,
        },
      });
      expect(res.statusCode).toBe(201);
      eventIds.push(res.json<{ id: string }>().id);
    }
  });
  afterAll(() => t.close());

  it('lists events with pagination for guests (no auth required)', async () => {
    const p1 = await t.app.inject({ method: 'GET', url: '/events?page=1&limit=2' });
    expect(p1.statusCode).toBe(200);
    expect(p1.json()).toMatchObject({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(p1.json().items.map((e: { title: string }) => e.title)).toEqual([
      'Conference 5',
      'Conference 4',
    ]);

    const p3 = await t.app.inject({ method: 'GET', url: '/events?page=3&limit=2' });
    expect(p3.json().items.map((e: { title: string }) => e.title)).toEqual(['Conference 1']);
  });

  it('supports optional venueId and status filters for guests and users', async () => {
    const byVenue = await t.app.inject({
      method: 'GET',
      url: `/events?venueId=${venueA}`,
      headers: bearer(userToken),
    });
    expect(byVenue.statusCode).toBe(200);
    expect(byVenue.json().total).toBe(2);

    const byStatus = await t.app.inject({ method: 'GET', url: '/events?status=IN_PLANNING' });
    expect(byStatus.statusCode).toBe(200);
    expect(byStatus.json().total).toBe(5);
  });

  it('returns event details by id for guests; unknown → 404; bad UUID → 400', async () => {
    const id = eventIds[0]!;
    const ok = await t.app.inject({ method: 'GET', url: `/events/${id}` });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ id, title: 'Conference 1', venueId: venueA });

    const missing = await t.app.inject({
      method: 'GET',
      url: '/events/00000000-0000-4000-8000-000000000000',
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json().code).toBe('EVENT_NOT_FOUND');

    const bad = await t.app.inject({ method: 'GET', url: '/events/not-a-uuid' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().code).toBe('VALIDATION_ERROR');
  });

  it('wires real Events catalog into GET /analytics/events without stubs', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/analytics/events?from=2026-12-02T00:00:00Z&to=2026-12-04T23:59:59Z&status=IN_PLANNING',
      headers: bearer(adminToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((r: { event: { title: string } }) => r.event.title)).toEqual([
      'Conference 4',
      'Conference 3',
      'Conference 2',
    ]);
    expect(res.json()[0]).toMatchObject({
      registrationsCount: 0,
      isCancelled: false,
      lastActivityAt: null,
    });
  });
});
