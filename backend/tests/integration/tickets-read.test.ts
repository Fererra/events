import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTicketReader, createTicketsModule } from '../../src/modules/tickets/index.js';
import { DrizzleUnitOfWork } from '../../src/shared/infrastructure/db/unit-of-work.js';
import { bearer, login } from '../helpers/auth.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';

const ADMIN = { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password' };

describe('GET /events/:id/tickets and TicketReader', () => {
  let t: TestApp;
  let adminToken: string;
  let eventId: string;
  let emptyEventId: string;
  let stdId: string;
  let vipId: string;
  const sold = new Map<string, number>();

  beforeAll(async () => {
    t = await createTestApp(ADMIN, [
      createTicketsModule({
        soldCounter: { countActiveByEvent: async () => new Map(sold) },
      }),
    ]);
    await t.app.ready();
    ({ accessToken: adminToken } = await login(t.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD));

    const venue = await t.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(adminToken),
      payload: { name: 'Main Hall', address: 'Kyiv, Ticket Read St 1', capacity: 300 },
    });
    const venueId = venue.json<{ id: string }>().id;

    const createEvent = async (title: string) => {
      const res = await t.app.inject({
        method: 'POST',
        url: '/events',
        headers: bearer(adminToken),
        payload: {
          title,
          description: 'Desc',
          startsAt: '2026-12-22T10:00:00Z',
          endsAt: '2026-12-22T18:00:00Z',
          organizer: 'KPI',
          venueId,
        },
      });
      return res.json<{ id: string }>().id;
    };

    eventId = await createEvent('Concert');
    emptyEventId = await createEvent('No Tickets Yet');

    const vip = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: 'VIP', limit: 20, price: 1000 },
    });
    const std = await t.app.inject({
      method: 'POST',
      url: `/events/${eventId}/tickets`,
      headers: bearer(adminToken),
      payload: { type: 'Standard', limit: 100, price: 350 },
    });
    vipId = vip.json<{ id: string }>().id;
    stdId = std.json<{ id: string }>().id;
    sold.set(stdId, 15);
  });
  afterAll(() => t.close());

  it('lists ticket types with price, limit and remaining seats for guests (ordered by price)', async () => {
    const res = await t.app.inject({ method: 'GET', url: `/events/${eventId}/tickets` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      {
        id: stdId,
        eventId,
        type: 'Standard',
        limit: 100,
        price: 350,
        remaining: 85,
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
      {
        id: vipId,
        eventId,
        type: 'VIP',
        limit: 20,
        price: 1000,
        remaining: 20,
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      },
    ]);
  });

  it('default stub soldCounter reports full limit as remaining', async () => {
    const plain = await createTestApp(ADMIN);
    await plain.app.ready();
    const { accessToken } = await login(plain.app, ADMIN.ADMIN_EMAIL, ADMIN.ADMIN_PASSWORD);
    const venue = await plain.app.inject({
      method: 'POST',
      url: '/venues',
      headers: bearer(accessToken),
      payload: { name: 'Stub Hall', address: 'Kyiv, Stub St 1', capacity: 50 },
    });
    const ev = await plain.app.inject({
      method: 'POST',
      url: '/events',
      headers: bearer(accessToken),
      payload: {
        title: 'Stub Event',
        description: 'Desc',
        startsAt: '2026-12-23T10:00:00Z',
        endsAt: '2026-12-23T12:00:00Z',
        organizer: 'KPI',
        venueId: venue.json<{ id: string }>().id,
      },
    });
    const evId = ev.json<{ id: string }>().id;
    await plain.app.inject({
      method: 'POST',
      url: `/events/${evId}/tickets`,
      headers: bearer(accessToken),
      payload: { type: 'General', limit: 25, price: 0 },
    });

    const res = await plain.app.inject({ method: 'GET', url: `/events/${evId}/tickets` });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0]).toMatchObject({ limit: 25, remaining: 25 });
    await plain.close();
  });

  it('unknown event → 404 EVENT_NOT_FOUND', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/events/00000000-0000-4000-8000-000000000000/tickets',
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().code).toBe('EVENT_NOT_FOUND');
  });

  it('exposes TicketInfo and hasAnyForEvent via public createTicketReader', async () => {
    const uow = new DrizzleUnitOfWork(t.db);
    const reader = createTicketReader(uow);

    expect(await reader.hasAnyForEvent(eventId)).toBe(true);
    expect(await reader.hasAnyForEvent(emptyEventId)).toBe(false);

    const info = await uow.run(() => reader.findByIdForUpdate(stdId));
    expect(info).toEqual({ id: stdId, eventId, type: 'Standard', limit: 100, price: 350 });
    expect(
      await uow.run(() => reader.findByIdForUpdate('00000000-0000-4000-8000-000000000000')),
    ).toBeNull();
  });
});
