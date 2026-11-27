import { describe, expect, it } from 'vitest';
import { DeleteVenueUseCase } from '../../../src/modules/venues/application/use-cases/delete-venue.js';
import { VenueHasScheduledEventsError } from '../../../src/modules/venues/domain/errors.js';
import { Venue } from '../../../src/modules/venues/domain/venue.js';
import { NotFoundError } from '../../../src/shared/domain/errors.js';
import { fakeVenueDeps, FakeVenueEventsChecker } from './fakes.js';

describe('DeleteVenueUseCase', () => {
  const build = async () => {
    const deps = fakeVenueDeps();
    const checker = new FakeVenueEventsChecker();
    await deps.venues.add(
      Venue.create({
        id: 'v-free',
        name: 'Free Hall',
        address: 'Kyiv, Free St 1',
        capacity: 100,
        now: deps.clock.now(),
      }),
    );
    await deps.venues.add(
      Venue.create({
        id: 'v-busy',
        name: 'Busy Hall',
        address: 'Kyiv, Busy St 2',
        capacity: 200,
        now: deps.clock.now(),
      }),
    );
    checker.markBusy('v-busy');
    const useCase = new DeleteVenueUseCase(deps.venues, checker, deps.uow);
    return { deps, useCase };
  };

  it('deletes a venue when it has no scheduled events', async () => {
    const { deps, useCase } = await build();
    await useCase.execute('v-free');
    expect(await deps.venues.findById('v-free')).toBeNull();
  });

  it('rejects deleting a venue that has scheduled events', async () => {
    const { deps, useCase } = await build();
    await expect(useCase.execute('v-busy')).rejects.toBeInstanceOf(VenueHasScheduledEventsError);
    expect(await deps.venues.findById('v-busy')).not.toBeNull();
  });

  it('throws NotFoundError for an unknown venue', async () => {
    const { useCase } = await build();
    await expect(useCase.execute('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
