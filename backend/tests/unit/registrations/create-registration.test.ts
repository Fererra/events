import { describe, expect, it } from 'vitest';
import { CreateRegistrationUseCase } from '../../../src/modules/registrations/application/use-cases/create-registration.js';
import {
  EventRegistrationClosedError,
  TicketsSoldOutError,
} from '../../../src/modules/registrations/domain/errors.js';
import { NotFoundError } from '../../../src/shared/domain/errors.js';
import { fakeRegistrationDeps } from './fakes.js';

describe('CreateRegistrationUseCase', () => {
  const setup = (
    eventStatus: 'IN_PLANNING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED' = 'ACTIVE',
    limit = 2,
  ) => {
    const deps = fakeRegistrationDeps();
    deps.context.seedEvent({ id: 'ev-1', status: eventStatus });
    deps.context.seedTicket({ id: 'tk-1', eventId: 'ev-1', type: 'Standard', limit, price: 250 });
    const useCase = new CreateRegistrationUseCase(
      deps.registrations,
      deps.context,
      deps.uow,
      deps.eventBus,
      deps.clock,
      deps.ids,
    );
    return { deps, useCase };
  };

  it('creates an ACTIVE registration within limit and publishes RegistrationCreated', async () => {
    const { deps, useCase } = setup('ACTIVE', 2);

    const dto = await useCase.execute({
      userId: 'user-1',
      eventId: 'ev-1',
      ticketTypeId: 'tk-1',
    });

    expect(dto).toEqual({
      id: 'id-1',
      userId: 'user-1',
      eventId: 'ev-1',
      ticketTypeId: 'tk-1',
      status: 'ACTIVE',
      registeredAt: deps.clock.now().toISOString(),
    });
    expect(deps.registrations.all()).toHaveLength(1);
    expect(deps.eventBus.published).toEqual([
      {
        type: 'RegistrationCreated',
        occurredAt: deps.clock.now(),
        registrationId: 'id-1',
        eventId: 'ev-1',
        userId: 'user-1',
        ticketTypeId: 'tk-1',
      },
    ]);
  });

  it('rejects when ticket limit is exhausted with TicketsSoldOutError', async () => {
    const { deps, useCase } = setup('ACTIVE', 1);
    await useCase.execute({ userId: 'user-1', eventId: 'ev-1', ticketTypeId: 'tk-1' });

    const err = await useCase
      .execute({ userId: 'user-2', eventId: 'ev-1', ticketTypeId: 'tk-1' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TicketsSoldOutError);
    expect(err).toMatchObject({ code: 'TICKETS_SOLD_OUT' });
    expect(deps.registrations.all()).toHaveLength(1);
    expect(deps.eventBus.published).toHaveLength(1);
  });

  it.each(['IN_PLANNING', 'FINISHED', 'CANCELLED'] as const)(
    'rejects registration when event is %s with EventRegistrationClosedError',
    async (status) => {
      const { deps, useCase } = setup(status, 10);

      const err = await useCase
        .execute({ userId: 'user-1', eventId: 'ev-1', ticketTypeId: 'tk-1' })
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(EventRegistrationClosedError);
      expect(err).toMatchObject({ code: 'EVENT_REGISTRATION_CLOSED' });
      expect(deps.eventBus.published).toHaveLength(0);
    },
  );

  it('throws NotFoundError when event is missing or ticket does not belong to the event', async () => {
    const { deps, useCase } = setup('ACTIVE', 5);
    deps.context.seedTicket({
      id: 'tk-other',
      eventId: 'ev-other',
      type: 'VIP',
      limit: 5,
      price: 900,
    });

    const missingEvent = await useCase
      .execute({ userId: 'user-1', eventId: 'ev-missing', ticketTypeId: 'tk-1' })
      .catch((e: unknown) => e);
    expect(missingEvent).toBeInstanceOf(NotFoundError);
    expect(missingEvent).toMatchObject({ code: 'EVENT_NOT_FOUND' });

    const missingTicket = await useCase
      .execute({ userId: 'user-1', eventId: 'ev-1', ticketTypeId: 'tk-missing' })
      .catch((e: unknown) => e);
    expect(missingTicket).toBeInstanceOf(NotFoundError);
    expect(missingTicket).toMatchObject({ code: 'TICKET_NOT_FOUND' });

    const foreignTicket = await useCase
      .execute({ userId: 'user-1', eventId: 'ev-1', ticketTypeId: 'tk-other' })
      .catch((e: unknown) => e);
    expect(foreignTicket).toBeInstanceOf(NotFoundError);
    expect(foreignTicket).toMatchObject({ code: 'TICKET_NOT_FOUND' });
  });
});
