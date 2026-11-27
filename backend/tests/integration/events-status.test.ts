import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 5));
};

describe('PATCH /events/:id/status and DELETE /events/:id', () => {
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
      payload: { name: 'Status Hall', address: 'Kyiv, Lifecycle St 1', capacity: 300 },
    });
    expect(venue.statusCode).toBe(201);
    venueId = venue.json<{ id: string }>().id;
  });
  afterAll(() => t.close());

  const createEvent = async (
    title: string,
    startsAt = '2026-12-20T10:00:00Z',
    endsAt = '2026-12-20T18:00:00Z',
  ) => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(adminToken),
      payload: {
        title,
        description: 'Lifecycle test',
        startsAt,
        endsAt,
        organizer: 'KPI',
        venueId,
      },
    });
    expect(res.statusCode).toBe(201);
    return res.json<{ id: string }>().id;
  };

  const addTicket = async (eventId: string) => {
    const res = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: 'Standard', limit: 100, price: 200 },
    });
    expect(res.statusCode).toBe(201);
  };

  const patchStatus = (eventId: string, status: string, token?: string) =>
    t.app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/status`,
      headers: token ? bearer(token) : {},
      payload: { status },
    });

  const delEvent = (eventId: string, token?: string) =>
    t.app.inject({
      method: 'DELETE',
      url: `/events/${eventId}`,
      headers: token ? bearer(token) : {},
    });

  it('requires at least one ticket type to publish IN_PLANNING → ACTIVE', async () => {
    const eventId = await createEvent('Publish Flow');

    const denied = await patchStatus(eventId, 'ACTIVE', adminToken);
    expect(denied.statusCode).toBe(409);
    expect(denied.json().code).toBe('INVALID_STATUS_TRANSITION');

    await addTicket(eventId);

    const published = await patchStatus(eventId, 'ACTIVE', adminToken);
    expect(published.statusCode).toBe(200);
    expect(published.json().status).toBe('ACTIVE');
  });

  it('cancels an ACTIVE event and asynchronously marks it cancelled in Analytics', async () => {
    const eventId = await createEvent('Cancel Flow');
    await addTicket(eventId);
    expect((await patchStatus(eventId, 'ACTIVE', adminToken)).statusCode).toBe(200);

    const cancelled = await patchStatus(eventId, 'CANCELLED', adminToken);
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().status).toBe('CANCELLED');

    await settle();

    const analytics = await t.app.inject({
      method: 'GET',
      url: '/analytics/events?status=CANCELLED',
      headers: bearer(adminToken),
    });
    expect(analytics.statusCode).toBe(200);
    const entry = analytics
      .json<Array<{ event: { id: string }; isCancelled: boolean; lastActivityAt: string | null }>>()
      .find((row) => row.event.id === eventId);
    expect(entry).toMatchObject({ isCancelled: true });
    expect(entry?.lastActivityAt).not.toBeNull();
  });

  it('finishes an ended ACTIVE event and rejects invalid status transitions with 409', async () => {
    const endedId = await createEvent(
      'Ended Event',
      '2020-01-01T10:00:00Z',
      '2020-01-01T18:00:00Z',
    );
    await addTicket(endedId);
    expect((await patchStatus(endedId, 'ACTIVE', adminToken)).statusCode).toBe(200);

    const finished = await patchStatus(endedId, 'FINISHED', adminToken);
    expect(finished.statusCode).toBe(200);
    expect(finished.json().status).toBe('FINISHED');

    // Terminal state cannot transition back to ACTIVE or CANCELLED
    const reopen = await patchStatus(endedId, 'ACTIVE', adminToken);
    expect(reopen.statusCode).toBe(409);
    expect(reopen.json().code).toBe('INVALID_STATUS_TRANSITION');

    // Future event cannot be finished early or transitioned to IN_PLANNING
    const futureId = await createEvent(
      'Future Event',
      '2099-01-01T10:00:00Z',
      '2099-01-01T18:00:00Z',
    );
    await addTicket(futureId);
    expect((await patchStatus(futureId, 'ACTIVE', adminToken)).statusCode).toBe(200);
    expect((await patchStatus(futureId, 'FINISHED', adminToken)).statusCode).toBe(409);
    expect((await patchStatus(futureId, 'IN_PLANNING', adminToken)).statusCode).toBe(409);
  });

  it('deletes only CANCELLED or FINISHED events and rejects IN_PLANNING or ACTIVE with 409', async () => {
    const planningId = await createEvent('Planning Delete');
    expect((await delEvent(planningId, adminToken)).statusCode).toBe(409);

    await addTicket(planningId);
    expect((await patchStatus(planningId, 'ACTIVE', adminToken)).statusCode).toBe(200);
    expect((await delEvent(planningId, adminToken)).statusCode).toBe(409);

    expect((await patchStatus(planningId, 'CANCELLED', adminToken)).statusCode).toBe(200);
    expect((await delEvent(planningId, adminToken)).statusCode).toBe(204);
    expect((await t.app.inject({ method: 'GET', url: `/events/${planningId}` })).statusCode).toBe(
      404,
    );
  });

  it('enforces admin guard, 404 for unknown event, and 400 for invalid status', async () => {
    const eventId = await createEvent('Guarded Event');
    const missingId = '00000000-0000-4000-8000-000000000000';

    expect((await patchStatus(eventId, 'CANCELLED')).statusCode).toBe(401);
    expect((await patchStatus(eventId, 'CANCELLED', userToken)).statusCode).toBe(403);
    expect((await patchStatus(missingId, 'CANCELLED', adminToken)).statusCode).toBe(404);
    expect((await patchStatus(eventId, 'UNKNOWN', adminToken)).statusCode).toBe(400);

    expect((await delEvent(eventId)).statusCode).toBe(401);
    expect((await delEvent(eventId, userToken)).statusCode).toBe(403);
    expect((await delEvent(missingId, adminToken)).statusCode).toBe(404);
  });
});
