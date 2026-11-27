import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SYNC_EVENT_STATUSES_JOB } from '../../src/modules/events/index.js';
import { bearer, login } from '../helpers/auth.js';
import { createPgTestApp, type PgTestApp } from '../helpers/pg-test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };
const MISSING_UUID = '00000000-0000-4000-8000-000000000000';

const settle = async () => {
  for (let i = 0; i < 30; i++) await new Promise((r) => setTimeout(r, 10));
};

describe('Venues, events lifecycle, tickets and analytics (PostgreSQL)', () => {
  let t: PgTestApp;
  let adminToken: string;

  beforeAll(async () => {
    t = await createPgTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
  });

  afterAll(() => t.close());

  const createVenue = (name: string, address: string, capacity: number) =>
    t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name, address, capacity },
    });

  const createEvent = (venueId: string, overrides: Record<string, unknown> = {}) =>
    t.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(adminToken),
      payload: {
        title: 'KPI Jazz Night',
        description: 'Live concert at KPI',
        startsAt: '2027-05-10T17:00:00Z',
        endsAt: '2027-05-10T21:00:00Z',
        organizer: 'FICE KPI',
        venueId,
        ...overrides,
      },
    });

  it('handles venues CRUD, address normalization, concurrent duplicates and public pagination', async () => {
    const v1 = await createVenue('KPI Culture Center', 'Kyiv, Beresteiskyi Ave 37', 500);
    const v2 = await createVenue('Open Amphitheater', 'Kyiv, Politekhnichna St 14', 250);
    const v3 = await createVenue('Innovation Hub', 'Kyiv, Borshchahivska St 126', 120);
    expect([v1.statusCode, v2.statusCode, v3.statusCode]).toEqual([201, 201, 201]);

    const v1Id = v1.json<{ id: string }>().id;

    // Duplicate normalized address (mixed case + extra spaces) → 409 ADDRESS_TAKEN
    const dup = await createVenue('Duplicate', '  KYIV,   beresteiskyi ave 37 ', 100);
    expect(dup.statusCode).toBe(409);
    expect(dup.json().code).toBe('ADDRESS_TAKEN');

    // Concurrent duplicate address creation on PostgreSQL pool: exactly one wins
    const race = await Promise.all(
      Array.from({ length: 5 }, (_, idx) =>
        createVenue(`Race Hall ${idx}`, '  Kyiv, Unique Race St 99 ', 80),
      ),
    );
    expect(race.map((r) => r.statusCode).sort()).toEqual([201, 409, 409, 409, 409]);

    // Invalid capacity and empty PATCH → 400
    expect((await createVenue('Bad Cap', 'Kyiv, Cap St 1', 0)).json().code).toBe(
      'CAPACITY_INVALID',
    );
    const emptyPatch = await t.app.inject({
      method: 'PATCH',
      url: `/venues/${v1Id}`,
      headers: bearer(adminToken),
      payload: {},
    });
    expect(emptyPatch.statusCode).toBe(400);
    expect(emptyPatch.json().code).toBe('VALIDATION_ERROR');

    // Partial PATCH succeeds and persists
    const patched = await t.app.inject({
      method: 'PATCH',
      url: `/venues/${v1Id}`,
      headers: bearer(adminToken),
      payload: { capacity: 600 },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json()).toMatchObject({ id: v1Id, capacity: 600 });

    // Guest pagination and details
    const page1 = await t.app.inject({ method: 'GET', url: '/venues?page=1&limit=2' });
    expect(page1.statusCode).toBe(200);
    expect(page1.json()).toMatchObject({ page: 1, limit: 2, total: 4, totalPages: 2 });
    expect(page1.json().items).toHaveLength(2);

    expect((await t.app.inject({ method: 'GET', url: `/venues/${v1Id}` })).statusCode).toBe(200);
    expect((await t.app.inject({ method: 'GET', url: `/venues/${MISSING_UUID}` })).statusCode).toBe(
      404,
    );
    expect((await t.app.inject({ method: 'GET', url: '/venues/not-a-uuid' })).statusCode).toBe(400);
    expect(
      (await t.app.inject({ method: 'GET', url: '/venues?page=1&limit=101' })).statusCode,
    ).toBe(400);
  });

  it('enforces full event state machine, ticket invariants, venue delete guard and analytics', async () => {
    const venueRes = await createVenue('Lifecycle Venue', 'Kyiv, State Machine St 1', 100);
    expect(venueRes.statusCode).toBe(201);
    const venueId = venueRes.json<{ id: string }>().id;

    // Invalid event period and unknown venue
    const badPeriod = await createEvent(venueId, {
      startsAt: '2027-05-10T21:00:00Z',
      endsAt: '2027-05-10T17:00:00Z',
    });
    expect(badPeriod.statusCode).toBe(400);
    expect(badPeriod.json().code).toBe('EVENT_PERIOD_INVALID');

    const badVenue = await createEvent(MISSING_UUID);
    expect(badVenue.statusCode).toBe(404);
    expect(badVenue.json().code).toBe('VENUE_NOT_FOUND');

    // Create event → IN_PLANNING
    const evRes = await createEvent(venueId, { title: 'Tech Summit 2027' });
    expect(evRes.statusCode).toBe(201);
    expect(evRes.json().status).toBe('IN_PLANNING');
    const eventId = evRes.json<{ id: string }>().id;

    // Scheduled event blocks venue deletion → 409 VENUE_HAS_EVENTS
    const blockedDelete = await t.app.inject({
      method: 'DELETE',
      url: `/venues/${venueId}`,
      headers: bearer(adminToken),
    });
    expect(blockedDelete.statusCode).toBe(409);
    expect(blockedDelete.json().code).toBe('VENUE_HAS_EVENTS');

    // Cannot publish without tickets or delete while IN_PLANNING
    const pubWithoutTickets = await t.app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/status`,
      headers: bearer(adminToken),
      payload: { status: 'ACTIVE' },
    });
    expect(pubWithoutTickets.statusCode).toBe(409);
    expect(pubWithoutTickets.json().code).toBe('INVALID_STATUS_TRANSITION');

    expect(
      (
        await t.app.inject({
          method: 'DELETE',
          url: `/events/${eventId}`,
          headers: bearer(adminToken),
        })
      ).statusCode,
    ).toBe(409);

    // Add valid ticket type + validate duplicate name, precision, and venue capacity limit
    const t1 = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: 'Standard', limit: 70, price: 350.5 },
    });
    expect(t1.statusCode).toBe(201);

    const dupType = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: '  standard ', limit: 10, price: 200 },
    });
    expect(dupType.statusCode).toBe(409);
    expect(dupType.json().code).toBe('TICKET_TYPE_TAKEN');

    const badPrice = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: 'BadPrice', limit: 10, price: 99.999 },
    });
    expect(badPrice.statusCode).toBe(400);
    expect(badPrice.json().code).toBe('TICKET_PRICE_INVALID');

    const overCap = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: 'VIP', limit: 31, price: 1000 },
    });
    expect(overCap.statusCode).toBe(409);
    expect(overCap.json().code).toBe('TICKET_CAPACITY_EXCEEDED');

    // Public GET /events/:id/tickets shows live remaining === limit
    const publicTickets = await t.app.inject({ method: 'GET', url: `/events/${eventId}/tickets` });
    expect(publicTickets.statusCode).toBe(200);
    expect(publicTickets.json()).toEqual([
      expect.objectContaining({ type: 'Standard', limit: 70, price: 350.5, remaining: 70 }),
    ]);

    // Publish IN_PLANNING → ACTIVE
    const published = await t.app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/status`,
      headers: bearer(adminToken),
      payload: { status: 'ACTIVE' },
    });
    expect(published.statusCode).toBe(200);
    expect(published.json().status).toBe('ACTIVE');

    // Guest filtering on GET /events
    const activeList = await t.app.inject({
      method: 'GET',
      url: `/events?venueId=${venueId}&status=ACTIVE`,
    });
    expect(activeList.statusCode).toBe(200);
    expect(activeList.json().items).toHaveLength(1);
    expect(activeList.json().items[0].id).toBe(eventId);

    const invalidStatusFilter = await t.app.inject({ method: 'GET', url: '/events?status=DRAFT' });
    expect(invalidStatusFilter.statusCode).toBe(400);

    // Future event cannot be finished early or reverted to IN_PLANNING
    expect(
      (
        await t.app.inject({
          method: 'PATCH',
          url: `/events/${eventId}/status`,
          headers: bearer(adminToken),
          payload: { status: 'FINISHED' },
        })
      ).statusCode,
    ).toBe(409);

    expect(
      (
        await t.app.inject({
          method: 'PATCH',
          url: `/events/${eventId}/status`,
          headers: bearer(adminToken),
          payload: { status: 'IN_PLANNING' },
        })
      ).statusCode,
    ).toBe(409);

    // Cancel ACTIVE → CANCELLED, verify EventCancelled projection in Analytics
    const cancelled = await t.app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/status`,
      headers: bearer(adminToken),
      payload: { status: 'CANCELLED' },
    });
    expect(cancelled.statusCode).toBe(200);

    // Terminal state rejects reopening and adding tickets
    expect(
      (
        await t.app.inject({
          method: 'PATCH',
          url: `/events/${eventId}/status`,
          headers: bearer(adminToken),
          payload: { status: 'ACTIVE' },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: `/events/${eventId}/tickets`,
          headers: bearer(adminToken),
          payload: { type: 'Late', limit: 5, price: 10 },
        })
      ).statusCode,
    ).toBe(409);

    await settle();
    const analytics = await t.app.inject({
      method: 'GET',
      url: '/analytics/events?status=CANCELLED',
      headers: bearer(adminToken),
    });
    expect(analytics.statusCode).toBe(200);
    const stat = analytics
      .json<
        Array<{
          event: { id: string };
          registrationsCount: number;
          isCancelled: boolean;
          lastActivityAt: string | null;
        }>
      >()
      .find((entry) => entry.event.id === eventId);
    expect(stat).toMatchObject({ registrationsCount: 0, isCancelled: true });
    expect(stat?.lastActivityAt).not.toBeNull();

    // Invalid analytics period → 400 PERIOD_INVALID
    const badAnalyticsRange = await t.app.inject({
      method: 'GET',
      url: '/analytics/events?from=2027-12-01T00:00:00Z&to=2027-01-01T00:00:00Z',
      headers: bearer(adminToken),
    });
    expect(badAnalyticsRange.statusCode).toBe(400);
    expect(badAnalyticsRange.json().code).toBe('PERIOD_INVALID');

    // Venue with only CANCELLED events can now be deleted → 204
    const deletedVenue = await t.app.inject({
      method: 'DELETE',
      url: `/venues/${venueId}`,
      headers: bearer(adminToken),
    });
    expect(deletedVenue.statusCode).toBe(204);
  });

  it('auto-finishes past ACTIVE events via sync-event-statuses job and allows deleting FINISHED events', async () => {
    const venueRes = await createVenue('Cron Hall', 'Kyiv, Cron Blvd 5', 200);
    const venueId = venueRes.json<{ id: string }>().id;

    const pastEv = await createEvent(venueId, {
      title: 'Past Hackathon',
      startsAt: '2020-05-01T09:00:00Z',
      endsAt: '2020-05-01T18:00:00Z',
    });
    const pastEventId = pastEv.json<{ id: string }>().id;

    expect(
      (
        await t.app.inject({
          method: 'POST',
          url: `/events/${pastEventId}/tickets`,
          headers: bearer(adminToken),
          payload: { type: 'Free', limit: 50, price: 0 },
        })
      ).statusCode,
    ).toBe(201);

    expect(
      (
        await t.app.inject({
          method: 'PATCH',
          url: `/events/${pastEventId}/status`,
          headers: bearer(adminToken),
          payload: { status: 'ACTIVE' },
        })
      ).statusCode,
    ).toBe(200);

    // First run finishes the past active event; second run is idempotent
    const firstRun = await t.app.scheduler.runNow(SYNC_EVENT_STATUSES_JOB);
    expect(firstRun).toEqual({ finished: 1, failed: 0 });

    const secondRun = await t.app.scheduler.runNow(SYNC_EVENT_STATUSES_JOB);
    expect(secondRun).toEqual({ finished: 0, failed: 0 });

    const fetched = await t.app.inject({ method: 'GET', url: `/events/${pastEventId}` });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().status).toBe('FINISHED');

    // Deleting a FINISHED event succeeds → 204
    const deleted = await t.app.inject({
      method: 'DELETE',
      url: `/events/${pastEventId}`,
      headers: bearer(adminToken),
    });
    expect(deleted.statusCode).toBe(204);
  });
});
