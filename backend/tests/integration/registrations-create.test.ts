import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 5));
};

describe('POST /events/:eventId/registrations', () => {
  let t: TestApp;
  let adminToken: string;
  let aliceToken: string;
  let aliceId: string;
  let bobToken: string;
  let venueId: string;

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    const alice = await registerAndLogin(t.app, 'alice@example.com');
    aliceToken = alice.accessToken;
    aliceId = alice.user.id;
    ({ accessToken: bobToken } = await registerAndLogin(t.app, 'bob@example.com'));

    const venue = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'Main Arena', address: 'Kyiv, Registration St 1', capacity: 500 },
    });
    expect(venue.statusCode).toBe(201);
    venueId = venue.json<{ id: string }>().id;
  });
  afterAll(() => t.close());

  const createEventWithTicket = async (
    title: string,
    ticketLimit: number,
    publish = true,
  ): Promise<{ eventId: string; ticketTypeId: string }> => {
    const ev = await t.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(adminToken),
      payload: {
        title,
        description: 'Live registration flow',
        startsAt: '2026-12-25T17:00:00Z',
        endsAt: '2026-12-25T21:00:00Z',
        organizer: 'KPI',
        venueId,
      },
    });
    expect(ev.statusCode).toBe(201);
    const eventId = ev.json<{ id: string }>().id;

    const tk = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: 'Standard', limit: ticketLimit, price: 350 },
    });
    expect(tk.statusCode).toBe(201);
    const ticketTypeId = tk.json<{ id: string }>().id;

    if (publish) {
      const pub = await t.app.inject({
        method: 'PATCH',
        url: `/events/${eventId}/status`,
        headers: bearer(adminToken),
        payload: { status: 'ACTIVE' },
      });
      expect(pub.statusCode).toBe(200);
    }

    return { eventId, ticketTypeId };
  };

  const registerTicket = (eventId: string, ticketTypeId: string, token?: string) =>
    t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      headers: token ? bearer(token) : {},
      payload: { ticketTypeId },
    });

  it('registers a user → 201 and updates remaining seats, /me/registrations and Analytics', async () => {
    const { eventId, ticketTypeId } = await createEventWithTicket('Jazz Night', 5);

    const res = await registerTicket(eventId, ticketTypeId, aliceToken);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toEqual({
      id: expect.any(String),
      userId: aliceId,
      eventId,
      ticketTypeId,
      status: 'ACTIVE',
      registeredAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });

    // Live remaining count in Tickets module (no stub)
    const tickets = await t.app.inject({ method: 'GET', url: `/events/${eventId}/tickets` });
    expect(tickets.statusCode).toBe(200);
    expect(tickets.json()[0]).toMatchObject({ id: ticketTypeId, limit: 5, remaining: 4 });

    // Live read model in GET /me/registrations (no stub)
    const mine = await t.app.inject({
      method: 'GET',
      url: '/me/registrations',
      headers: bearer(aliceToken),
    });
    expect(mine.statusCode).toBe(200);
    expect(mine.json()).toEqual([
      {
        id: body.id,
        event: {
          id: eventId,
          title: 'Jazz Night',
          startsAt: '2026-12-25T17:00:00.000Z',
          endsAt: '2026-12-25T21:00:00.000Z',
        },
        ticket: { type: 'Standard', price: 350 },
        status: 'ACTIVE',
        registeredAt: body.registeredAt,
      },
    ]);

    // Asynchronous Analytics projection updated after COMMIT
    await settle();
    const analytics = await t.app.inject({
      method: 'GET',
      url: '/analytics/events',
      headers: bearer(adminToken),
    });
    expect(analytics.statusCode).toBe(200);
    const stats = analytics
      .json<Array<{ event: { id: string }; registrationsCount: number; isCancelled: boolean }>>()
      .find((r) => r.event.id === eventId);
    expect(stats).toMatchObject({ registrationsCount: 1, isCancelled: false });
  });

  it('rejects registration when event is not ACTIVE → 409 EVENT_REGISTRATION_CLOSED', async () => {
    const { eventId, ticketTypeId } = await createEventWithTicket('Draft Concert', 10, false);

    const res = await registerTicket(eventId, ticketTypeId, aliceToken);
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('EVENT_REGISTRATION_CLOSED');
  });

  it('enforces auth, unknown event/ticket → 404, and ticket belonging to another event → 404', async () => {
    const a = await createEventWithTicket('Event A', 5);
    const b = await createEventWithTicket('Event B', 5);
    const missing = '00000000-0000-4000-8000-000000000000';

    expect((await registerTicket(a.eventId, a.ticketTypeId)).statusCode).toBe(401);
    expect((await registerTicket(missing, a.ticketTypeId, aliceToken)).statusCode).toBe(404);
    expect((await registerTicket(a.eventId, missing, aliceToken)).statusCode).toBe(404);

    const foreign = await registerTicket(a.eventId, b.ticketTypeId, aliceToken);
    expect(foreign.statusCode).toBe(404);
    expect(foreign.json().code).toBe('TICKET_NOT_FOUND');
  });

  it('prevents overselling under concurrent requests (limit 4, 10 parallel requests)', async () => {
    const { eventId, ticketTypeId } = await createEventWithTicket('Limited Show', 4);

    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        registerTicket(eventId, ticketTypeId, idx % 2 === 0 ? aliceToken : bobToken),
      ),
    );

    const created = responses.filter((r) => r.statusCode === 201);
    const soldOut = responses.filter((r) => r.statusCode === 409);

    expect(created).toHaveLength(4);
    expect(soldOut).toHaveLength(6);
    for (const r of soldOut) {
      expect(r.json().code).toBe('TICKETS_SOLD_OUT');
    }

    const dbCount = (await t.db.execute(
      sql`select count(*)::int as total from registrations where ticket_type_id = ${ticketTypeId}`,
    )) as { rows: Array<{ total: number }> };
    expect(Number(dbCount.rows[0]?.total)).toBe(4);

    const tickets = await t.app.inject({ method: 'GET', url: `/events/${eventId}/tickets` });
    expect(tickets.json()[0]).toMatchObject({ limit: 4, remaining: 0 });

    await settle();
    const analytics = await t.app.inject({
      method: 'GET',
      url: '/analytics/events',
      headers: bearer(adminToken),
    });
    const stats = analytics
      .json<Array<{ event: { id: string }; registrationsCount: number }>>()
      .find((r) => r.event.id === eventId);
    expect(stats?.registrationsCount).toBe(4);
  });
});
