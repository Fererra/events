import { describe, expect, it } from 'vitest';
import { UpdateVenueUseCase } from '../../../src/modules/venues/application/use-cases/update-venue.js';
import { VenueAddressAlreadyTakenError } from '../../../src/modules/venues/domain/errors.js';
import { Venue } from '../../../src/modules/venues/domain/venue.js';
import { NotFoundError, ValidationError } from '../../../src/shared/domain/errors.js';
import { fakeVenueDeps } from './fakes.js';

describe('UpdateVenueUseCase', () => {
  const build = async () => {
    const deps = fakeVenueDeps();
    const v1 = Venue.create({
      id: 'v-1',
      name: 'Main Hall',
      address: 'Kyiv, Main St 1',
      capacity: 300,
      now: deps.clock.now(),
    });
    const v2 = Venue.create({
      id: 'v-2',
      name: 'Side Hall',
      address: 'Kyiv, Side St 2',
      capacity: 150,
      now: deps.clock.now(),
    });
    await deps.venues.add(v1);
    await deps.venues.add(v2);
    const useCase = new UpdateVenueUseCase(deps.venues, deps.uow);
    return { deps, useCase };
  };

  it('partially updates name, capacity, and address while keeping unchanged fields', async () => {
    const { useCase } = await build();

    const updated = await useCase.execute({ id: 'v-1', name: '  Grand Hall  ', capacity: 450 });
    expect(updated).toMatchObject({
      id: 'v-1',
      name: 'Grand Hall',
      address: 'Kyiv, Main St 1',
      capacity: 450,
    });
  });

  it('allows changing only the casing/whitespace of the venue’s own address', async () => {
    const { useCase } = await build();
    const updated = await useCase.execute({ id: 'v-1', address: '  KYIV,   Main St 1 ' });
    expect(updated.address).toBe('KYIV, Main St 1');
  });

  it('rejects changing address to another venue’s address', async () => {
    const { useCase } = await build();
    await expect(
      useCase.execute({ id: 'v-1', address: 'kyiv,  side st 2' }),
    ).rejects.toBeInstanceOf(VenueAddressAlreadyTakenError);
  });

  it('throws NotFoundError when venue does not exist', async () => {
    const { useCase } = await build();
    await expect(useCase.execute({ id: 'missing', name: 'New' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it.each([
    ['blank name', { name: '   ' }, 'VENUE_NAME_INVALID'],
    ['blank address', { address: '   ' }, 'VENUE_ADDRESS_INVALID'],
    ['zero capacity', { capacity: 0 }, 'CAPACITY_INVALID'],
    ['fractional capacity', { capacity: 5.5 }, 'CAPACITY_INVALID'],
  ])('rejects %s', async (_label, patch, code) => {
    const { useCase } = await build();
    await expect(useCase.execute({ id: 'v-1', ...patch })).rejects.toThrow(
      expect.objectContaining({ code }),
    );
    await expect(useCase.execute({ id: 'v-1', ...patch })).rejects.toBeInstanceOf(ValidationError);
  });
});
