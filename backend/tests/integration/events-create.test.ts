import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, rowsOf, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('POST /events', () => {
  let t: TestApp;
  let adminToken: string;
  let userToken: string;
  let venueId: string;

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    ({ accessToken: userToken } = await registerAndLogin(t.app, 'user@example.com'));

    const venue = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'KPI Culture Center', address: 'Kyiv, Beresteiskyi Ave 37', capacity: 500 },
    });
    expect(venue.statusCode).toBe(201);
    venueId = venue.json<{ id: string }>().id;
  });
  afterAll(() => t.close());

  const createEvent = (payload: object, token?: string) =>
    t.app.inject({
      method: 'POST',
      url: '/events',
      headers: token ? bearer(token) : {},
      payload,
    });

  it('allows admin to create an event in IN_PLANNING → 201 and persists it', async () => {
    const res = await createEvent(
      {
        title: 'KPI Software Engineering Summit',
        description: 'Annual conference on software lifecycle and architecture',
        startsAt: '2026-12-15T10:00:00Z',
        endsAt: '2026-12-15T18:00:00Z',
        organizer: 'FICE KPI',
        venueId,
      },
      adminToken,
    );
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toEqual({
      id: expect.any(String),
      title: 'KPI Software Engineering Summit',
      description: 'Annual conference on software lifecycle and architecture',
      startsAt: '2026-12-15T10:00:00.000Z',
      endsAt: '2026-12-15T18:00:00.000Z',
      organizer: 'FICE KPI',
      venueId,
      status: 'IN_PLANNING',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });

    const rows = rowsOf<{ title: string; status: string; venue_id: string }>(
      await t.db.execute(sql`select title, status, venue_id from events where id = ${body.id}`),
    );
    expect(rows).toEqual([
      { title: 'KPI Software Engineering Summit', status: 'IN_PLANNING', venue_id: venueId },
    ]);
  });

  it('unknown venueId → 404 VENUE_NOT_FOUND (checked via Venues port)', async () => {
    const res = await createEvent(
      {
        title: 'Ghost Event',
        description: 'Missing venue',
        startsAt: '2026-12-16T10:00:00Z',
        endsAt: '2026-12-16T12:00:00Z',
        organizer: 'Org',
        venueId: '00000000-0000-4000-8000-000000000000',
      },
      adminToken,
    );
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('VENUE_NOT_FOUND');
  });

  it('endsAt <= startsAt → 400 EVENT_PERIOD_INVALID', async () => {
    const res = await createEvent(
      {
        title: 'Time Travel',
        description: 'Bad period',
        startsAt: '2026-12-16T18:00:00Z',
        endsAt: '2026-12-16T10:00:00Z',
        organizer: 'Org',
        venueId,
      },
      adminToken,
    );
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('EVENT_PERIOD_INVALID');
  });

  it('invalid body → 400 VALIDATION_ERROR with details', async () => {
    const res = await createEvent({ title: '', venueId: 'not-a-uuid' }, adminToken);
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
    expect(res.json().details.length).toBeGreaterThan(0);
  });

  it('is available to admins only: user → 403, guest → 401', async () => {
    const payload = {
      title: 'Unauthorized Event',
      description: 'Desc',
      startsAt: '2026-12-20T10:00:00Z',
      endsAt: '2026-12-20T12:00:00Z',
      organizer: 'Org',
      venueId,
    };
    expect((await createEvent(payload, userToken)).statusCode).toBe(403);
    expect((await createEvent(payload)).statusCode).toBe(401);
  });
});
