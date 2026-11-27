import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createRegistrationsModule,
  type IMyRegistrationsReadModel,
  type MyRegistrationView,
} from '../../src/modules/registrations/index.js';
import { createTestApp, type TestApp } from '../helpers/test-app.js';
import { bearer, registerAndLogin } from '../helpers/auth.js';

/** Fake read model: the real one needs registrations/events tables (ES-17/21/23). */
class FakeReadModel implements IMyRegistrationsReadModel {
  rows: (MyRegistrationView & { userId: string })[] = [];
  async listByUser(userId: string) {
    return this.rows.filter((r) => r.userId === userId);
  }
}

const view = (
  userId: string,
  id: string,
  eventStartsAt: string,
  status: 'ACTIVE' | 'CANCELLED' = 'ACTIVE',
) => ({
  userId,
  id,
  eventId: `ev-${id}`,
  eventTitle: `Event ${id}`,
  eventStartsAt: new Date(eventStartsAt),
  eventEndsAt: new Date(new Date(eventStartsAt).getTime() + 3_600_000),
  ticketType: 'Standard',
  ticketPrice: 250,
  status,
  registeredAt: new Date('2026-10-01T00:00:00Z'),
});

describe('GET /me/registrations', () => {
  let t: TestApp;
  const readModel = new FakeReadModel();
  let alice: { id: string; token: string };

  beforeAll(async () => {
    t = await createTestApp({}, [createRegistrationsModule({ myRegistrations: readModel })]);
    const a = await registerAndLogin(t.app, 'alice@example.com');
    const b = await registerAndLogin(t.app, 'bob@example.com');
    alice = { id: a.user.id, token: a.accessToken };
    readModel.rows.push(
      view(a.user.id, 'r1', '2026-12-01T18:00:00Z'),
      view(a.user.id, 'r2', '2027-01-15T18:00:00Z', 'CANCELLED'),
      view(b.user.id, 'r3', '2026-12-05T18:00:00Z'),
    );
  });
  afterAll(() => t.close());

  it('returns only the caller’s registrations with event, date, ticket type and status', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/me/registrations',
      headers: bearer(alice.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.map((r: { id: string }) => r.id)).toEqual(['r2', 'r1']); // newest event first
    expect(body[1]).toEqual({
      id: 'r1',
      event: {
        id: 'ev-r1',
        title: 'Event r1',
        startsAt: '2026-12-01T18:00:00.000Z',
        endsAt: '2026-12-01T19:00:00.000Z',
      },
      ticket: { type: 'Standard', price: 250 },
      status: 'ACTIVE',
      registeredAt: '2026-10-01T00:00:00.000Z',
    });
  });

  it('without a token → 401', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/me/registrations' });
    expect(res.statusCode).toBe(401);
  });

  it('default read model returns an empty list when user has no registrations', async () => {
    const plain = await createTestApp();
    const { accessToken } = await registerAndLogin(plain.app, 'carol@example.com');
    const res = await plain.app.inject({
      method: 'GET',
      url: '/me/registrations',
      headers: bearer(accessToken),
    });
    expect(res.json()).toEqual([]);
    await plain.close();
  });
});
