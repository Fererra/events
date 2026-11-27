import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, login, registerAndLogin } from '../helpers/auth.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('POST /events/:id/tickets', () => {
  let t: TestApp;
  let adminToken: string;
  let userToken: string;
  let eventId: string;

  beforeAll(async () => {
    t = await createTestApp(ADMIN);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));
    ({ accessToken: userToken } = await registerAndLogin(t.app, 'user@example.com'));

    const venue = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'Compact Hall', address: 'Kyiv, Tickets St 1', capacity: 100 },
    });
    const venueId = venue.json<{ id: string }>().id;

    const event = await t.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(adminToken),
      payload: {
        title: 'Ticketed Summit',
        description: 'With multiple ticket tiers',
        startsAt: '2026-12-20T10:00:00Z',
        endsAt: '2026-12-20T18:00:00Z',
        organizer: 'KPI',
        venueId,
      },
    });
    eventId = event.json<{ id: string }>().id;
  });
  afterAll(() => t.close());

  const addTicket = (id: string, payload: object, token?: string) =>
    t.app.inject({
      method: 'POST',
      url: `/events/${id}/tickets`,
      headers: token ? bearer(token) : {},
      payload,
    });

  it('allows admin to add ticket types within venue capacity → 201', async () => {
    const standard = await addTicket(
      eventId,
      { type: 'Standard', limit: 60, price: 299.5 },
      adminToken,
    );
    expect(standard.statusCode).toBe(201);
    expect(standard.json()).toEqual({
      id: expect.any(String),
      eventId,
      type: 'Standard',
      limit: 60,
      price: 299.5,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });

    const free = await addTicket(eventId, { type: 'Student', limit: 40, price: 0 }, adminToken);
    expect(free.statusCode).toBe(201);
    expect(free.json().price).toBe(0);
  });

  it('rejects ticket type that pushes sum of limits over venue capacity → 409 TICKET_CAPACITY_EXCEEDED', async () => {
    const res = await addTicket(eventId, { type: 'Overflow', limit: 1, price: 100 }, adminToken);
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('TICKET_CAPACITY_EXCEEDED');
  });

  it('rejects duplicate ticket type name on the same event → 409 TICKET_TYPE_TAKEN', async () => {
    const res = await addTicket(eventId, { type: '  standard ', limit: 1, price: 100 }, adminToken);
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('TICKET_TYPE_TAKEN');
  });

  it('unknown event → 404 EVENT_NOT_FOUND; invalid limit/price → 400', async () => {
    const missing = await addTicket(
      '00000000-0000-4000-8000-000000000000',
      { type: 'VIP', limit: 10, price: 500 },
      adminToken,
    );
    expect(missing.statusCode).toBe(404);
    expect(missing.json().code).toBe('EVENT_NOT_FOUND');

    const badLimit = await addTicket(eventId, { type: 'Zero', limit: 0, price: 10 }, adminToken);
    expect(badLimit.statusCode).toBe(400);
    expect(badLimit.json().code).toBe('TICKET_LIMIT_INVALID');

    const badPrice = await addTicket(eventId, { type: 'Neg', limit: 5, price: -10 }, adminToken);
    expect(badPrice.statusCode).toBe(400);
    expect(badPrice.json().code).toBe('TICKET_PRICE_INVALID');
  });

  it('is available to admins only: user → 403, guest → 401', async () => {
    const payload = { type: 'Hack', limit: 5, price: 0 };
    expect((await addTicket(eventId, payload, userToken)).statusCode).toBe(403);
    expect((await addTicket(eventId, payload)).statusCode).toBe(401);
  });
});
