import type { IUnitOfWork } from '../../../src/shared/application/unit-of-work.js';
import type { IClock, IIdGenerator } from '../../../src/modules/venues/application/ports/clock.js';
import { VenueAddressAlreadyTakenError } from '../../../src/modules/venues/domain/errors.js';
import { Venue } from '../../../src/modules/venues/domain/venue.js';
import type { IVenueRepository } from '../../../src/modules/venues/domain/venue-repository.js';

/** In-memory test doubles for the Venues ports (unit tests, no DB). */

function clone(v: Venue): Venue {
  return Venue.restore({
    id: v.id,
    name: v.name,
    address: v.address,
    normalizedAddress: v.normalizedAddress,
    capacity: v.capacity,
    createdAt: v.createdAt,
  });
}

export class InMemoryVenueRepository implements IVenueRepository {
  private readonly byId = new Map<string, Venue>();

  async findById(id: string) {
    const found = this.byId.get(id);
    return found ? clone(found) : null;
  }

  async findByNormalizedAddress(normalizedAddress: string) {
    const found = [...this.byId.values()].find((v) => v.normalizedAddress === normalizedAddress);
    return found ? clone(found) : null;
  }

  async list({ limit, offset }: { limit: number; offset: number }) {
    const sorted = [...this.byId.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || a.id.localeCompare(b.id))
      .map(clone);
    return { items: sorted.slice(offset, offset + limit), total: sorted.length };
  }

  async add(venue: Venue) {
    if (await this.findByNormalizedAddress(venue.normalizedAddress)) {
      throw new VenueAddressAlreadyTakenError();
    }
    this.byId.set(venue.id, clone(venue));
  }

  async save(venue: Venue) {
    const existing = await this.findByNormalizedAddress(venue.normalizedAddress);
    if (existing && existing.id !== venue.id) throw new VenueAddressAlreadyTakenError();
    this.byId.set(venue.id, clone(venue));
  }

  all() {
    return [...this.byId.values()].map(clone);
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
