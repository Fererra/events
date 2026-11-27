import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

const settle = async () => {
  for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 5));
};

describe('DELETE /registrations/:id', () => {
  let t: TestApp;
  let adminToken: string;
  let aliceToken: string;
  let bobToken: string;
  let venueId: string;

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    ({ accessToken: aliceToken } = await registerAndLogin(t.app, 'alice@example.com'));
    ({ accessToken: bobToken } = await registerAndLogin(t.app, 'bob@example.com'));

    const venue = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'Cancel Hall', address: 'Kyiv, Cancel St 1', capacity: 100 },
    });
    expect(venue.statusCode).toBe(201);
    venueId = venue.json<{ id: string }>().id;
  });
  afterAll(() => t.close());

  const createPublishedEventWithTicket = async (
    title: string,
    limit: number,
    startsAt = '2026-12-26T17:00:00Z',
    endsAt = '2026-12-26T21:00:00Z',
  ) => {
    const ev = await t.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(adminToken),
      payload: { title, description: 'Cancel flow', startsAt, endsAt, organizer: 'KPI', venueId },
    });
    const eventId = ev.json<{ id: string }>().id;

    const tk = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: 'Standard', limit, price: 300 },
    });
    const ticketTypeId = tk.json<{ id: string }>().id;

    await t.app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/status`,
      headers: bearer(adminToken),
      payload: { status: 'ACTIVE' },
    });

    return { eventId, ticketTypeId };
  };

  const register = async (eventId: string, ticketTypeId: string, token: string) => {
    const res = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      headers: bearer(token),
      payload: { ticketTypeId },
    });
    expect(res.statusCode).toBe(201);
    return res.json<{ id: string }>().id;
  };

  const cancel = (id: string, token?: string) =>
    t.app.inject({
      method: 'DELETE',
      url: `/registrations/${id}`,
      headers: token ? bearer(token) : {},
    });

  it('owner cancels registration → 204, frees seat in limit, updates /me/registrations and Analytics', async () => {
    const { eventId, ticketTypeId } = await createPublishedEventWithTicket('Single Seat Event', 1);
    const regId = await register(eventId, ticketTypeId, aliceToken);

    // Seat is taken → Bob gets 409 TICKETS_SOLD_OUT
    const soldOut = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      headers: bearer(bobToken),
      payload: { ticketTypeId },
    });
    expect(soldOut.statusCode).toBe(409);

    // Alice cancels her registration
    const del = await cancel(regId, aliceToken);
    expect(del.statusCode).toBe(204);

    // Seat is back in remaining and /me/registrations shows CANCELLED
    const tickets = await t.app.inject({ method: 'GET', url: `/events/${eventId}/tickets` });
    expect(tickets.json()[0]).toMatchObject({ limit: 1, remaining: 1 });

    const mine = await t.app.inject({
      method: 'GET',
      url: '/me/registrations',
      headers: bearer(aliceToken),
    });
    expect(mine.json().find((r: { id: string }) => r.id === regId)?.status).toBe('CANCELLED');

    await settle();
    const analytics = await t.app.inject({
      method: 'GET',
      url: '/analytics/events',
      headers: bearer(adminToken),
    });
    const stats = analytics
      .json<Array<{ event: { id: string }; registrationsCount: number }>>()
      .find((r) => r.event.id === eventId);
    expect(stats?.registrationsCount).toBe(0);

    // Bob can now claim the freed seat
    const bobReg = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/registrations`,
      headers: bearer(bobToken),
      payload: { ticketTypeId },
    });
    expect(bobReg.statusCode).toBe(201);
  });

  it('rejects non-owner (403), already cancelled (409), unknown (404), and guest (401)', async () => {
    const { eventId, ticketTypeId } = await createPublishedEventWithTicket('Guarded Reg Event', 5);
    const regId = await register(eventId, ticketTypeId, aliceToken);

    expect((await cancel(regId)).statusCode).toBe(401);
    expect((await cancel(regId, bobToken)).statusCode).toBe(403);
    expect((await cancel('00000000-0000-4000-8000-000000000000', aliceToken)).statusCode).toBe(404);

    expect((await cancel(regId, aliceToken)).statusCode).toBe(204);
    const repeat = await cancel(regId, aliceToken);
    expect(repeat.statusCode).toBe(409);
    expect(repeat.json().code).toBe('REGISTRATION_ALREADY_CANCELLED');
  });

  it('rejects cancelling a registration for a FINISHED event → 409 EVENT_REGISTRATION_CLOSED', async () => {
    const { eventId, ticketTypeId } = await createPublishedEventWithTicket(
      'Finished Show',
      5,
      '2020-01-01T10:00:00Z',
      '2020-01-01T14:00:00Z',
    );
    const regId = await register(eventId, ticketTypeId, aliceToken);

    const fin = await t.app.inject({
      method: 'PATCH',
      url: `/events/${eventId}/status`,
      headers: bearer(adminToken),
      payload: { status: 'FINISHED' },
    });
    expect(fin.statusCode).toBe(200);

    const res = await cancel(regId, aliceToken);
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('EVENT_REGISTRATION_CLOSED');
  });
});
