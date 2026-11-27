import { describe, expect, it } from 'vitest';
import { CreateVenueUseCase } from '../../../src/modules/venues/application/use-cases/create-venue.js';
import { VenueAddressAlreadyTakenError } from '../../../src/modules/venues/domain/errors.js';
import { ValidationError } from '../../../src/shared/domain/errors.js';
import { fakeVenueDeps } from './fakes.js';

describe('CreateVenueUseCase', () => {
  const build = () => {
    const deps = fakeVenueDeps();
    const useCase = new CreateVenueUseCase(deps.venues, deps.uow, deps.clock, deps.ids);
    return { deps, useCase };
  };

  const valid = {
    name: 'KPI Culture Center',
    address: 'Kyiv, Beresteiskyi Ave 37',
    capacity: 500,
  };

  it('creates a venue with normalized whitespace while keeping display casing', async () => {
    const { deps, useCase } = build();
    const dto = await useCase.execute({
      name: '  KPI Culture Center  ',
      address: '  Kyiv,   Beresteiskyi Ave 37 ',
      capacity: 500,
    });

    expect(dto).toEqual({
      id: 'venue-1',
      name: 'KPI Culture Center',
      address: 'Kyiv, Beresteiskyi Ave 37',
      capacity: 500,
      createdAt: deps.clock.now().toISOString(),
    });
    expect(deps.venues.all()[0]?.normalizedAddress).toBe('kyiv, beresteiskyi ave 37');
  });

  it('rejects a duplicate address (case- and whitespace-insensitive)', async () => {
    const { useCase } = build();
    await useCase.execute(valid);
    await expect(
      useCase.execute({ ...valid, address: '  KYIV,   beresteiskyi ave 37 ' }),
    ).rejects.toBeInstanceOf(VenueAddressAlreadyTakenError);
  });

  it.each([
    ['blank name', { name: '   ' }, 'VENUE_NAME_INVALID'],
    ['too long name', { name: 'A'.repeat(201) }, 'VENUE_NAME_INVALID'],
    ['blank address', { address: '   ' }, 'VENUE_ADDRESS_INVALID'],
    ['too long address', { address: 'B'.repeat(301) }, 'VENUE_ADDRESS_INVALID'],
    ['zero capacity', { capacity: 0 }, 'CAPACITY_INVALID'],
    ['negative capacity', { capacity: -10 }, 'CAPACITY_INVALID'],
    ['fractional capacity', { capacity: 12.5 }, 'CAPACITY_INVALID'],
  ])('rejects %s', async (_case, override, expectedCode) => {
    const { useCase } = build();
    await expect(useCase.execute({ ...valid, ...override })).rejects.toThrow(
      expect.objectContaining({ code: expectedCode }),
    );
    await expect(useCase.execute({ ...valid, ...override })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
