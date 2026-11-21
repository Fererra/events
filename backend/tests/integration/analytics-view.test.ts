import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import {
  createAnalyticsModule,
  type EventSummary,
  type IEventCatalog,
} from '../../src/modules/analytics/index.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };
const E1 = '11111111-1111-4111-8111-111111111111';
const E2 = '22222222-2222-4222-8222-222222222222';
const E3 = '33333333-3333-4333-8333-333333333333';

/** Fake Events catalog: the real one arrives with ES-17/ES-19. */
class FakeCatalog implements IEventCatalog {
  events: EventSummary[] = [
    ev(E1, 'Jazz night', '2026-12-01T18:00:00Z', 'ACTIVE'),
    ev(E2, 'Tech talk', '2026-12-10T18:00:00Z', 'CANCELLED'),
    ev(E3, 'Old expo', '2026-10-01T10:00:00Z', 'FINISHED'),
  ];
  async list({ from, to, status }: { from?: Date; to?: Date; status?: string }) {
    return this.events.filter(
      (e) =>
        (!from || e.startsAt >= from) &&
        (!to || e.startsAt <= to) &&
        (!status || e.status === status),
    );
  }
}
function ev(
  id: string,
  title: string,
  start: string,
  status: EventSummary['status'],
): EventSummary {
  const startsAt = new Date(start);
  return { id, title, startsAt, endsAt: new Date(startsAt.getTime() + 7_200_000), status };
}

describe('GET /analytics/events', () => {
  let t: TestApp;
  let admin: string;
  let user: string;

  beforeAll(async () => {
    t = await createTestApp(ADMIN, [createAnalyticsModule({ eventCatalog: new FakeCatalog() })]);
    ({ accessToken: admin } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    ({ accessToken: user } = await registerAndLogin(t.app, 'user@example.com'));
    await t.db.execute(sql`
      insert into event_stats (event_id, registrations_count, is_cancelled, last_activity_at) values
        (${E1}, 42, false, '2026-11-20T10:00:00Z'),
        (${E2}, 3, true, '2026-11-18T09:00:00Z')`);
  });
  afterAll(() => t.close());

  const get = (url: string, token = admin) =>
    t.app.inject({ method: 'GET', url, headers: bearer(token) });

  it('lists every event with its stats, newest first; events without stats show zeros', async () => {
    const res = await get('/analytics/events');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        event: expect.objectContaining({ id: E2, title: 'Tech talk', status: 'CANCELLED' }),
        registrationsCount: 3,
        isCancelled: true,
        lastActivityAt: '2026-11-18T09:00:00.000Z',
      },
      {
        event: expect.objectContaining({ id: E1, status: 'ACTIVE' }),
        registrationsCount: 42,
        isCancelled: false,
        lastActivityAt: '2026-11-20T10:00:00.000Z',
      },
      {
        event: expect.objectContaining({ id: E3, status: 'FINISHED' }),
        registrationsCount: 0,
        isCancelled: false,
        lastActivityAt: null,
      },
    ]);
  });

  it('filters by period', async () => {
    const res = await get('/analytics/events?from=2026-11-01T00:00:00Z&to=2026-12-05T00:00:00Z');
    expect(res.json().map((r: { event: { id: string } }) => r.event.id)).toEqual([E1]);
  });

  it('filters by event status', async () => {
    const res = await get('/analytics/events?status=CANCELLED');
    expect(res.json().map((r: { event: { id: string } }) => r.event.id)).toEqual([E2]);
  });

  it('rejects an inverted period → 400 PERIOD_INVALID', async () => {
    const res = await get('/analytics/events?from=2026-12-31T00:00:00Z&to=2026-01-01T00:00:00Z');
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('PERIOD_INVALID');
  });

  it('rejects an unknown status → 400 VALIDATION_ERROR', async () => {
    const res = await get('/analytics/events?status=PARTY');
    expect(res.statusCode).toBe(400);
    expect(res.json().code).toBe('VALIDATION_ERROR');
  });

  it('is available to admins only: user → 403, guest → 401', async () => {
    expect((await get('/analytics/events', user)).statusCode).toBe(403);
    const guest = await t.app.inject({ method: 'GET', url: '/analytics/events' });
    expect(guest.statusCode).toBe(401);
  });
});
