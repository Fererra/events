import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createPgTestApp, type PgTestApp } from '../helpers/pg-test-app.js';
import { rowsOf } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

const settle = async () => {
  for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 10));
};

describe('Concurrent ticket registrations and seat limits (PostgreSQL pool)', () => {
  let t: PgTestApp;
  let adminToken: string;
  let userTokens: string[];
  let venueId: string;

  beforeAll(async () => {
    t = await createPgTestApp({ ...ADMIN, DB_POOL_MAX: '10' });
    await t.app.ready();

    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    const accounts = await Promise.all(
      Array.from({ length: 6 }, (_, i) => registerAndLogin(t.app, `buyer-${i}@example.com`)),
    );
    userTokens = accounts.map((a) => a.accessToken);

    const venue = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'Concurrency Arena', address: 'Kyiv, Concurrency Ave 10', capacity: 100 },
    });
    expect(venue.statusCode).toBe(201);
    venueId = venue.json<{ id: string }>().id;
  });

  afterAll(() => t.close());

  const createActiveEventWithTicket = async (title: string, limit: number) => {
    const ev = await t.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(adminToken),
      payload: {
        title,
        description: 'High concurrency registration stress test',
        startsAt: '2027-06-01T17:00:00Z',
        endsAt: '2027-06-01T21:00:00Z',
        organizer: 'KPI QA',
        venueId,
      },
    });
    expect(ev.statusCode).toBe(201);
    const eventId = ev.json<{ id: string }>().id;

    const tk = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: 'Standard', limit, price: 450 },
    });
    expect(tk.statusCode).toBe(201);
    const ticketTypeId = tk.json<{ id: string }>().id;

    const pub = await t.app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/status`,
      headers: bearer(adminToken),
      payload: { status: 'ACTIVE' },
    });
    expect(pub.statusCode).toBe(200);

    return { eventId, ticketTypeId };
  };

  it('prevents overselling under 30 parallel requests for 5 seats across PostgreSQL connections', async () => {
    const seatLimit = 5;
    const totalRequests = 30;
    const { eventId, ticketTypeId } = await createActiveEventWithTicket('Race Concert', seatLimit);

    const responses = await Promise.all(
      Array.from({ length: totalRequests }, (_, idx) =>
        t.app.inject({
          method: 'POST',
          url: `/events/${eventId}/registrations`,
          headers: bearer(userTokens[idx % userTokens.length]!),
          payload: { ticketTypeId },
        }),
      ),
    );

    const created = responses.filter((r) => r.statusCode === 201);
    const soldOut = responses.filter((r) => r.statusCode === 409);

    expect(created).toHaveLength(seatLimit);
    expect(soldOut).toHaveLength(totalRequests - seatLimit);
    for (const r of soldOut) {
      expect(r.json().code).toBe('TICKETS_SOLD_OUT');
    }

    const dbActive = rowsOf<{ total: number }>(
      await t.db.execute(
        sql`select count(*)::int as total from registrations where ticket_type_id = ${ticketTypeId} and status = 'ACTIVE'`,
      ),
    );
    expect(dbActive[0]?.total).toBe(seatLimit);

    const ticketsRes = await t.app.inject({ method: 'GET', url: `/events/${eventId}/tickets` });
    expect(ticketsRes.statusCode).toBe(200);
    expect(ticketsRes.json()[0]).toMatchObject({
      id: ticketTypeId,
      limit: seatLimit,
      remaining: 0,
    });

    await settle();
    const analytics = await t.app.inject({
      method: 'GET',
      url: '/analytics/events',
      headers: bearer(adminToken),
    });
    const stat = analytics
      .json<Array<{ event: { id: string }; registrationsCount: number; isCancelled: boolean }>>()
      .find((entry) => entry.event.id === eventId);
    expect(stat).toMatchObject({ registrationsCount: seatLimit, isCancelled: false });
  });

  it('releases seats on owner and admin cancellation and serializes a second concurrent wave', async () => {
    const { eventId, ticketTypeId } = await createActiveEventWithTicket('Second Wave Show', 3);

    // Fill all 3 seats by distinct buyers
    const reg0 = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      headers: bearer(userTokens[0]!),
      payload: { ticketTypeId },
    });
    const reg1 = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      headers: bearer(userTokens[1]!),
      payload: { ticketTypeId },
    });
    const reg2 = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      headers: bearer(userTokens[2]!),
      payload: { ticketTypeId },
    });
    expect([reg0.statusCode, reg1.statusCode, reg2.statusCode]).toEqual([201, 201, 201]);

    const reg0Id = reg0.json<{ id: string }>().id;
    const reg1Id = reg1.json<{ id: string }>().id;

    // Another regular user cannot cancel someone else's registration
    const forbidden = await t.app.inject({
      method: 'DELETE',
      url: `/registrations/${reg0Id}`,
      headers: bearer(userTokens[3]!),
    });
    expect(forbidden.statusCode).toBe(403);
    expect(forbidden.json().code).toBe('FORBIDDEN');

    // Owner cancels reg0 → 204; second attempt → 409 REGISTRATION_ALREADY_CANCELLED
    expect(
      (
        await t.app.inject({
          method: 'DELETE',
          url: `/registrations/${reg0Id}`,
          headers: bearer(userTokens[0]!),
        })
      ).statusCode,
    ).toBe(204);

    const doubleCancel = await t.app.inject({
      method: 'DELETE',
      url: `/registrations/${reg0Id}`,
      headers: bearer(userTokens[0]!),
    });
    expect(doubleCancel.statusCode).toBe(409);
    expect(doubleCancel.json().code).toBe('REGISTRATION_ALREADY_CANCELLED');

    // Admin cancels reg1 via AdminGuard route → 204
    expect(
      (
        await t.app.inject({
          method: 'DELETE',
          url: `/admin/registrations/${reg1Id}`,
          headers: bearer(adminToken),
        })
      ).statusCode,
    ).toBe(204);

    // Exactly 2 seats are now free
    const ticketsBefore = await t.app.inject({ method: 'GET', url: `/events/${eventId}/tickets` });
    expect(ticketsBefore.json()[0]).toMatchObject({ limit: 3, remaining: 2 });

    // Second wave of 15 concurrent buyers competes for the 2 freed seats
    const secondWave = await Promise.all(
      Array.from({ length: 15 }, (_, idx) =>
        t.app.inject({
          method: 'POST',
          url: `/events/${eventId}/registrations`,
          headers: bearer(userTokens[idx % userTokens.length]!),
          payload: { ticketTypeId },
        }),
      ),
    );
    expect(secondWave.filter((r) => r.statusCode === 201)).toHaveLength(2);
    expect(secondWave.filter((r) => r.statusCode === 409)).toHaveLength(13);

    // Owner history contains the cancelled registration
    const mine = await t.app.inject({
      method: 'GET',
      url: '/me/registrations',
      headers: bearer(userTokens[0]!),
    });
    expect(mine.statusCode).toBe(200);
    const reg0History = mine
      .json<Array<{ id: string; status: string }>>()
      .find((item) => item.id === reg0Id);
    expect(reg0History?.status).toBe('CANCELLED');

    await settle();
    const analytics = await t.app.inject({
      method: 'GET',
      url: '/analytics/events',
      headers: bearer(adminToken),
    });
    const stat = analytics
      .json<Array<{ event: { id: string }; registrationsCount: number }>>()
      .find((entry) => entry.event.id === eventId);
    expect(stat?.registrationsCount).toBe(3);
  });

  it('prevents concurrent ticket type creation from exceeding venue capacity', async () => {
    const ev = await t.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(adminToken),
      payload: {
        title: 'Capacity Race Event',
        description: 'Checks event row FOR UPDATE lock when creating ticket tiers',
        startsAt: '2027-07-01T10:00:00Z',
        endsAt: '2027-07-01T18:00:00Z',
        organizer: 'KPI QA',
        venueId,
      },
    });
    expect(ev.statusCode).toBe(201);
    const eventId = ev.json<{ id: string }>().id;

    // Venue capacity is 100; 5 parallel tiers of 40 each -> at most 2 (80) can succeed
    const responses = await Promise.all(
      Array.from({ length: 5 }, (_, idx) =>
        t.app.inject({
          method: 'POST',
          url: `/events/${eventId}/tickets`,
          headers: bearer(adminToken),
          payload: { type: `Tier ${idx + 1}`, limit: 40, price: 100 * (idx + 1) },
        }),
      ),
    );

    expect(responses.filter((r) => r.statusCode === 201)).toHaveLength(2);
    const exceeded = responses.filter((r) => r.statusCode === 409);
    expect(exceeded).toHaveLength(3);
    for (const r of exceeded) {
      expect(r.json().code).toBe('TICKET_CAPACITY_EXCEEDED');
    }

    const sumRows = rowsOf<{ total: number }>(
      await t.db.execute(
        sql`select coalesce(sum("limit"), 0)::int as total from ticket_types where event_id = ${eventId}`,
      ),
    );
    expect(sumRows[0]?.total).toBe(80);
  });
});
