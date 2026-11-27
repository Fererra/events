import { describe, expect, it } from 'vitest';
import { ListEventTicketsQuery } from '../../../src/modules/tickets/application/queries/list-event-tickets.js';
import { TicketType } from '../../../src/modules/tickets/domain/ticket-type.js';
import { NotFoundError } from '../../../src/shared/domain/errors.js';
import { fakeTicketDeps } from './fakes.js';

describe('ListEventTicketsQuery', () => {
  it('returns ticket types ordered by price with remaining seats never below zero', async () => {
    const deps = fakeTicketDeps();
    deps.eventCapacity.seed({ id: 'ev-1', status: 'ACTIVE', venueCapacity: 200 });
    await deps.tickets.add(
      TicketType.create({
        id: 't-vip',
        eventId: 'ev-1',
        type: 'VIP',
        limit: 20,
        price: 900,
        now: deps.clock.now(),
      }),
    );
    await deps.tickets.add(
      TicketType.create({
        id: 't-std',
        eventId: 'ev-1',
        type: 'Standard',
        limit: 50,
        price: 250,
        now: deps.clock.now(),
      }),
    );
    deps.soldCounter.setSold('t-std', 12);
    deps.soldCounter.setSold('t-vip', 25); // defensive clamp to 0

    const result = await new ListEventTicketsQuery(
      deps.tickets,
      deps.eventCapacity,
      deps.soldCounter,
    ).execute('ev-1');

    expect(result).toEqual([
      expect.objectContaining({
        id: 't-std',
        type: 'Standard',
        limit: 50,
        price: 250,
        remaining: 38,
      }),
      expect.objectContaining({ id: 't-vip', type: 'VIP', limit: 20, price: 900, remaining: 0 }),
    ]);
  });

  it('throws NotFoundError when event does not exist', async () => {
    const deps = fakeTicketDeps();
    await expect(
      new ListEventTicketsQuery(deps.tickets, deps.eventCapacity, deps.soldCounter).execute(
        'missing',
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
