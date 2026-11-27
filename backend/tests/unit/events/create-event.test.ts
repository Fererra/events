import { describe, expect, it } from 'vitest';
import { CreateEventUseCase } from '../../../src/modules/events/application/use-cases/create-event.js';
import { NotFoundError, ValidationError } from '../../../src/shared/domain/errors.js';
import { fakeEventDeps } from './fakes.js';

describe('CreateEventUseCase', () => {
  const build = () => {
    const deps = fakeEventDeps();
    deps.venues.seed({
      id: 'venue-1',
      name: 'KPI Hall',
      address: 'Kyiv, Beresteiskyi Ave 37',
      capacity: 500,
    });
    const useCase = new CreateEventUseCase(
      deps.events,
      deps.venues,
      deps.uow,
      deps.clock,
      deps.ids,
    );
    return { deps, useCase };
  };

  const valid = {
    title: '  KPI Summit  ',
    description: '  Engineering conference  ',
    startsAt: new Date('2026-12-10T10:00:00Z'),
    endsAt: new Date('2026-12-10T18:00:00Z'),
    organizer: '  FICE KPI  ',
    venueId: 'venue-1',
  };

  it('creates an event in IN_PLANNING when the venue exists', async () => {
    const { deps, useCase } = build();
    const dto = await useCase.execute(valid);

    expect(dto).toEqual({
      id: 'event-1',
      title: 'KPI Summit',
      description: 'Engineering conference',
      startsAt: '2026-12-10T10:00:00.000Z',
      endsAt: '2026-12-10T18:00:00.000Z',
      organizer: 'FICE KPI',
      venueId: 'venue-1',
      status: 'IN_PLANNING',
      createdAt: deps.clock.now().toISOString(),
    });
    expect(deps.events.all()).toHaveLength(1);
  });

  it('throws NotFoundError (VENUE_NOT_FOUND) if the venue does not exist', async () => {
    const { deps, useCase } = build();
    await expect(useCase.execute({ ...valid, venueId: 'missing-venue' })).rejects.toThrow(
      expect.objectContaining({ code: 'VENUE_NOT_FOUND' }),
    );
    await expect(useCase.execute({ ...valid, venueId: 'missing-venue' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(deps.events.all()).toHaveLength(0);
  });

  it('rejects inverted period before hitting the venue lookup', async () => {
    const { useCase } = build();
    await expect(
      useCase.execute({
        ...valid,
        startsAt: new Date('2026-12-10T18:00:00Z'),
        endsAt: new Date('2026-12-10T10:00:00Z'),
      }),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
