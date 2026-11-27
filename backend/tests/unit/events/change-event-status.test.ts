import { describe, expect, it } from 'vitest';
import { ChangeEventStatusUseCase } from '../../../src/modules/events/application/use-cases/change-event-status.js';
import { DeleteEventUseCase } from '../../../src/modules/events/application/use-cases/delete-event.js';
import { InvalidEventStatusTransitionError } from '../../../src/modules/events/domain/errors.js';
import { Event, type EventStatus } from '../../../src/modules/events/domain/event.js';
import { NotFoundError } from '../../../src/shared/domain/errors.js';
import { fakeEventDeps } from './fakes.js';

const NOW = new Date('2026-11-27T12:00:00Z');
const START = new Date('2026-12-01T10:00:00Z');
const END = new Date('2026-12-01T18:00:00Z');
const PAST_START = new Date('2026-11-20T10:00:00Z');
const PAST_END = new Date('2026-11-20T18:00:00Z');

function buildEvent(
  id: string,
  status: EventStatus = 'IN_PLANNING',
  startsAt = START,
  endsAt = END,
): Event {
  const event = Event.create({
    id,
    title: 'KPI Summit',
    description: 'Annual conference',
    startsAt,
    endsAt,
    organizer: 'FICE KPI',
    venueId: 'venue-1',
    now: NOW,
  });
  if (status === 'ACTIVE') {
    event.publish(true);
  } else if (status === 'CANCELLED') {
    event.cancel();
  } else if (status === 'FINISHED') {
    event.publish(true);
    event.finish(new Date(endsAt.getTime() + 1000));
  }
  return event;
}

describe('ChangeEventStatusUseCase', () => {
  it('publishes IN_PLANNING → ACTIVE when at least one ticket type exists', async () => {
    const deps = fakeEventDeps();
    await deps.events.add(buildEvent('ev-1', 'IN_PLANNING'));
    deps.tickets.markHasTickets('ev-1');
    const useCase = new ChangeEventStatusUseCase(
      deps.events,
      deps.tickets,
      deps.uow,
      deps.eventBus,
      deps.clock,
    );

    const updated = await useCase.execute({ eventId: 'ev-1', status: 'ACTIVE' });

    expect(updated.status).toBe('ACTIVE');
    expect((await deps.events.findById('ev-1'))?.status).toBe('ACTIVE');
    expect(deps.eventBus.published).toHaveLength(0);
  });

  it('rejects publishing without ticket types with InvalidEventStatusTransitionError', async () => {
    const deps = fakeEventDeps();
    await deps.events.add(buildEvent('ev-1', 'IN_PLANNING'));
    const useCase = new ChangeEventStatusUseCase(
      deps.events,
      deps.tickets,
      deps.uow,
      deps.eventBus,
      deps.clock,
    );

    const err = await useCase
      .execute({ eventId: 'ev-1', status: 'ACTIVE' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InvalidEventStatusTransitionError);
    expect((await deps.events.findById('ev-1'))?.status).toBe('IN_PLANNING');
  });

  it.each(['IN_PLANNING', 'ACTIVE'] as const)(
    'cancels %s event and publishes EventCancelled',
    async (initialStatus) => {
      const deps = fakeEventDeps();
      await deps.events.add(buildEvent('ev-1', initialStatus));
      const useCase = new ChangeEventStatusUseCase(
        deps.events,
        deps.tickets,
        deps.uow,
        deps.eventBus,
        deps.clock,
      );

      const updated = await useCase.execute({ eventId: 'ev-1', status: 'CANCELLED' });

      expect(updated.status).toBe('CANCELLED');
      expect((await deps.events.findById('ev-1'))?.status).toBe('CANCELLED');
      expect(deps.eventBus.published).toEqual([
        {
          type: 'EventCancelled',
          eventId: 'ev-1',
          occurredAt: deps.clock.now(),
        },
      ]);
    },
  );

  it('finishes an ended ACTIVE event and rejects finishing before endsAt', async () => {
    const deps = fakeEventDeps();
    await deps.events.add(buildEvent('ev-past', 'ACTIVE', PAST_START, PAST_END));
    await deps.events.add(buildEvent('ev-future', 'ACTIVE', START, END));
    const useCase = new ChangeEventStatusUseCase(
      deps.events,
      deps.tickets,
      deps.uow,
      deps.eventBus,
      deps.clock,
    );

    const finished = await useCase.execute({ eventId: 'ev-past', status: 'FINISHED' });
    expect(finished.status).toBe('FINISHED');

    const err = await useCase
      .execute({ eventId: 'ev-future', status: 'FINISHED' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InvalidEventStatusTransitionError);
    expect((await deps.events.findById('ev-future'))?.status).toBe('ACTIVE');
  });

  it.each<[EventStatus, EventStatus]>([
    ['IN_PLANNING', 'IN_PLANNING'],
    ['ACTIVE', 'IN_PLANNING'],
    ['ACTIVE', 'ACTIVE'],
    ['CANCELLED', 'ACTIVE'],
    ['CANCELLED', 'CANCELLED'],
    ['FINISHED', 'ACTIVE'],
    ['FINISHED', 'CANCELLED'],
  ])('rejects transition %s → %s without publishing events', async (from, to) => {
    const deps = fakeEventDeps();
    await deps.events.add(buildEvent('ev-1', from));
    deps.tickets.markHasTickets('ev-1');
    const useCase = new ChangeEventStatusUseCase(
      deps.events,
      deps.tickets,
      deps.uow,
      deps.eventBus,
      deps.clock,
    );

    const err = await useCase.execute({ eventId: 'ev-1', status: to }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InvalidEventStatusTransitionError);
    expect((await deps.events.findById('ev-1'))?.status).toBe(from);
    expect(deps.eventBus.published).toHaveLength(0);
  });

  it('throws NotFoundError when the event does not exist', async () => {
    const deps = fakeEventDeps();
    const useCase = new ChangeEventStatusUseCase(
      deps.events,
      deps.tickets,
      deps.uow,
      deps.eventBus,
      deps.clock,
    );

    const err = await useCase
      .execute({ eventId: 'missing', status: 'CANCELLED' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toMatchObject({ code: 'EVENT_NOT_FOUND' });
  });
});

describe('DeleteEventUseCase', () => {
  it.each(['CANCELLED', 'FINISHED'] as const)('deletes a %s event', async (status) => {
    const deps = fakeEventDeps();
    await deps.events.add(buildEvent('ev-1', status));
    const useCase = new DeleteEventUseCase(deps.events, deps.uow);

    await useCase.execute('ev-1');

    expect(await deps.events.findById('ev-1')).toBeNull();
  });

  it.each(['IN_PLANNING', 'ACTIVE'] as const)(
    'rejects deleting an %s event with InvalidEventStatusTransitionError',
    async (status) => {
      const deps = fakeEventDeps();
      await deps.events.add(buildEvent('ev-1', status));
      const useCase = new DeleteEventUseCase(deps.events, deps.uow);

      const err = await useCase.execute('ev-1').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(InvalidEventStatusTransitionError);
      expect(await deps.events.findById('ev-1')).not.toBeNull();
    },
  );

  it('throws NotFoundError when the event does not exist', async () => {
    const deps = fakeEventDeps();
    const useCase = new DeleteEventUseCase(deps.events, deps.uow);

    const err = await useCase.execute('missing').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err).toMatchObject({ code: 'EVENT_NOT_FOUND' });
  });
});
