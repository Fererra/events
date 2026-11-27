import { describe, expect, it } from 'vitest';
import { CancelRegistrationUseCase } from '../../../src/modules/registrations/application/use-cases/cancel-registration.js';
import {
  EventRegistrationClosedError,
  RegistrationAlreadyCancelledError,
} from '../../../src/modules/registrations/domain/errors.js';
import { Registration } from '../../../src/modules/registrations/domain/registration.js';
import { ForbiddenError, NotFoundError } from '../../../src/shared/domain/errors.js';
import { fakeRegistrationDeps } from './fakes.js';

describe('CancelRegistrationUseCase', () => {
  const setup = async (
    eventStatus: 'IN_PLANNING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED' = 'ACTIVE',
    alreadyCancelled = false,
  ) => {
    const deps = fakeRegistrationDeps();
    deps.context.seedEvent({ id: 'ev-1', status: eventStatus });
    const reg = Registration.restore({
      id: 'reg-1',
      userId: 'owner-1',
      eventId: 'ev-1',
      ticketTypeId: 'tk-1',
      status: alreadyCancelled ? 'CANCELLED' : 'ACTIVE',
      registeredAt: new Date('2026-11-27T10:00:00Z'),
    });
    await deps.registrations.add(reg);
    const useCase = new CancelRegistrationUseCase(
      deps.registrations,
      deps.context,
      deps.uow,
      deps.eventBus,
      deps.clock,
    );
    return { deps, useCase };
  };

  it('allows the owner to cancel an active registration and publishes RegistrationCancelled', async () => {
    const { deps, useCase } = await setup('ACTIVE');

    await useCase.execute({ registrationId: 'reg-1', actorId: 'owner-1', actorRole: 'user' });

    expect((await deps.registrations.findByIdForUpdate('reg-1'))?.status).toBe('CANCELLED');
    expect(await deps.registrations.countActiveByTicketType('tk-1')).toBe(0);
    expect(deps.eventBus.published).toEqual([
      {
        type: 'RegistrationCancelled',
        occurredAt: deps.clock.now(),
        registrationId: 'reg-1',
        eventId: 'ev-1',
        userId: 'owner-1',
        cancelledBy: 'owner',
      },
    ]);
  });

  it('allows an admin to cancel any user’s registration with cancelledBy: admin', async () => {
    const { deps, useCase } = await setup('ACTIVE');

    await useCase.execute({ registrationId: 'reg-1', actorId: 'admin-1', actorRole: 'admin' });

    expect((await deps.registrations.findByIdForUpdate('reg-1'))?.status).toBe('CANCELLED');
    expect(deps.eventBus.published).toEqual([
      {
        type: 'RegistrationCancelled',
        occurredAt: deps.clock.now(),
        registrationId: 'reg-1',
        eventId: 'ev-1',
        userId: 'owner-1',
        cancelledBy: 'admin',
      },
    ]);
  });

  it('rejects cancelling another user’s registration as a regular user with ForbiddenError', async () => {
    const { deps, useCase } = await setup('ACTIVE');

    const err = await useCase
      .execute({ registrationId: 'reg-1', actorId: 'other-user', actorRole: 'user' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ForbiddenError);
    expect((await deps.registrations.findByIdForUpdate('reg-1'))?.status).toBe('ACTIVE');
    expect(deps.eventBus.published).toHaveLength(0);
  });

  it('rejects repeated cancellation with RegistrationAlreadyCancelledError', async () => {
    const { deps, useCase } = await setup('ACTIVE', true);

    const err = await useCase
      .execute({ registrationId: 'reg-1', actorId: 'owner-1', actorRole: 'user' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(RegistrationAlreadyCancelledError);
    expect(err).toMatchObject({ code: 'REGISTRATION_ALREADY_CANCELLED' });
    expect(deps.eventBus.published).toHaveLength(0);
  });

  it('rejects cancellation for a FINISHED event with EventRegistrationClosedError', async () => {
    const { deps, useCase } = await setup('FINISHED');

    const err = await useCase
      .execute({ registrationId: 'reg-1', actorId: 'owner-1', actorRole: 'user' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(EventRegistrationClosedError);
    expect(err).toMatchObject({ code: 'EVENT_REGISTRATION_CLOSED' });
    expect(deps.eventBus.published).toHaveLength(0);
  });

  it('throws NotFoundError when registration does not exist', async () => {
    const { useCase } = await setup('ACTIVE');

    const err = await useCase
      .execute({ registrationId: 'missing', actorId: 'owner-1', actorRole: 'user' })
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toMatchObject({ code: 'REGISTRATION_NOT_FOUND' });
  });
});
