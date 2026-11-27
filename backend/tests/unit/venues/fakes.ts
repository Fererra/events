import type { IUnitOfWork } from '../../../src/shared/application/unit-of-work.js';
import type { IClock, IIdGenerator } from '../../../src/modules/venues/application/ports/clock.js';
import { VenueAddressAlreadyTakenError } from '../../../src/modules/venues/domain/errors.js';
import type { Venue } from '../../../src/modules/venues/domain/venue.js';
import type { IVenueRepository } from '../../../src/modules/venues/domain/venue-repository.js';

/** In-memory test doubles for the Venues ports (unit tests, no DB). */

export class InMemoryVenueRepository implements IVenueRepository {
  private readonly byId = new Map<string, Venue>();

  async findByNormalizedAddress(normalizedAddress: string) {
    return [...this.byId.values()].find((v) => v.normalizedAddress === normalizedAddress) ?? null;
  }

  async add(venue: Venue) {
    if (await this.findByNormalizedAddress(venue.normalizedAddress)) {
      throw new VenueAddressAlreadyTakenError();
    }
    this.byId.set(venue.id, venue);
  }

  all() {
    return [...this.byId.values()];
  }
}

export const immediateUow: IUnitOfWork = {
  run: (work) => work(),
  afterCommit: (cb) => void cb(),
};

export class FixedClock implements IClock {
  constructor(public current = new Date('2026-11-27T12:00:00.000Z')) {}
  now() {
    return new Date(this.current);
  }
}

export class SequentialIds implements IIdGenerator {
  private n = 0;
  next() {
    return `venue-${++this.n}`;
  }
}

export function fakeVenueDeps() {
  return {
    venues: new InMemoryVenueRepository(),
    uow: immediateUow,
    clock: new FixedClock(),
    ids: new SequentialIds(),
  };
}
