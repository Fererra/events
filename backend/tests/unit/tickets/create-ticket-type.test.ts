import { describe, expect, it } from 'vitest';
import { CreateTicketTypeUseCase } from '../../../src/modules/tickets/application/use-cases/create-ticket-type.js';
import {
  EventNotEditableForTicketsError,
  TicketCapacityExceededError,
  TicketTypeAlreadyExistsError,
} from '../../../src/modules/tickets/domain/errors.js';
import { NotFoundError, ValidationError } from '../../../src/shared/domain/errors.js';
import { fakeTicketDeps } from './fakes.js';

describe('CreateTicketTypeUseCase', () => {
  const build = () => {
    const deps = fakeTicketDeps();
    deps.eventCapacity.seed({ id: 'ev-1', status: 'IN_PLANNING', venueCapacity: 100 });
    deps.eventCapacity.seed({ id: 'ev-cancelled', status: 'CANCELLED', venueCapacity: 100 });
    const useCase = new CreateTicketTypeUseCase(
      deps.tickets,
      deps.eventCapacity,
      deps.uow,
      deps.clock,
      deps.ids,
    );
    return { deps, useCase };
  };

  it('adds ticket types up to the venue capacity including free tickets (price = 0)', async () => {
    const { deps, useCase } = build();

    const standard = await useCase.execute({
      eventId: 'ev-1',
      type: '  Standard  ',
      limit: 70,
      price: 250.5,
    });
    const free = await useCase.execute({
      eventId: 'ev-1',
      type: 'Student Free',
      limit: 30,
      price: 0,
    });

    expect(standard).toEqual({
      id: 'id-1',
      eventId: 'ev-1',
      type: 'Standard',
      limit: 70,
      price: 250.5,
      createdAt: deps.clock.now().toISOString(),
    });
    expect(free.price).toBe(0);
    expect(deps.tickets.all()).toHaveLength(2);
  });

  it('rejects when sum of ticket limits exceeds venue capacity', async () => {
    const { useCase } = build();
    await useCase.execute({ eventId: 'ev-1', type: 'Standard', limit: 60, price: 100 });
    await expect(
      useCase.execute({ eventId: 'ev-1', type: 'VIP', limit: 41, price: 500 }),
    ).rejects.toBeInstanceOf(TicketCapacityExceededError);
  });

  it('rejects duplicate ticket type name for the same event (case-insensitive)', async () => {
    const { useCase } = build();
    await useCase.execute({ eventId: 'ev-1', type: 'VIP', limit: 20, price: 500 });
    await expect(
      useCase.execute({ eventId: 'ev-1', type: '  vip ', limit: 10, price: 600 }),
    ).rejects.toBeInstanceOf(TicketTypeAlreadyExistsError);
  });

  it('throws NotFoundError for unknown event and ConflictError for cancelled/finished event', async () => {
    const { useCase } = build();
    await expect(
      useCase.execute({ eventId: 'missing', type: 'Standard', limit: 10, price: 100 }),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      useCase.execute({ eventId: 'ev-cancelled', type: 'Standard', limit: 10, price: 100 }),
    ).rejects.toBeInstanceOf(EventNotEditableForTicketsError);
  });

  it.each([
    ['blank type', { type: '   ' }, 'TICKET_TYPE_INVALID'],
    ['too long type', { type: 'T'.repeat(101) }, 'TICKET_TYPE_INVALID'],
    ['zero limit', { limit: 0 }, 'TICKET_LIMIT_INVALID'],
    ['fractional limit', { limit: 5.5 }, 'TICKET_LIMIT_INVALID'],
    ['negative price', { price: -1 }, 'TICKET_PRICE_INVALID'],
    ['too many decimals in price', { price: 10.123 }, 'TICKET_PRICE_INVALID'],
  ])('rejects %s', async (_label, patch, code) => {
    const { useCase } = build();
    const err = await useCase
      .execute({ eventId: 'ev-1', type: 'Standard', limit: 10, price: 100, ...patch })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ValidationError);
    expect((err as ValidationError).code).toBe(code);
  });
});
