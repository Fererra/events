import type { DomainEvent, IEventBus } from '../../../src/shared/application/event-bus.js';
import type { IUnitOfWork } from '../../../src/shared/application/unit-of-work.js';
import type { IClock, IIdGenerator } from '../../../src/modules/events/application/ports/clock.js';
import type { IEventTicketChecker } from '../../../src/modules/events/application/ports/event-ticket-checker.js';
import type {
  IVenueLookup,
  VenueInfo,
} from '../../../src/modules/events/application/ports/venue-lookup.js';
import { Event } from '../../../src/modules/events/domain/event.js';
import { EventPeriod } from '../../../src/modules/events/domain/event-period.js';
import type {
  EventCatalogRangeFilter,
  EventListFilter,
  IEventRepository,
} from '../../../src/modules/events/domain/event-repository.js';

function clone(e: Event): Event {
  return Event.restore({
    id: e.id,
    title: e.title,
    description: e.description,
    period: EventPeriod.create(e.startsAt, e.endsAt),
    organizer: e.organizer,
    venueId: e.venueId,
    status: e.status,
    createdAt: e.createdAt,
  });
}

export class InMemoryEventRepository implements IEventRepository {
  private readonly byId = new Map<string, Event>();

  async findById(id: string) {
    const found = this.byId.get(id);
    return found ? clone(found) : null;
  }

  async findByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.byId.get(id))
      .filter((e): e is Event => e !== undefined)
      .map(clone);
  }

  async findByIdForUpdate(id: string) {
    return this.findById(id);
  }

  async list(filter: EventListFilter) {
    const matched = [...this.byId.values()]
      .filter(
        (e) =>
          (!filter.venueId || e.venueId === filter.venueId) &&
          (!filter.status || e.status === filter.status),
      )
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime() || a.id.localeCompare(b.id))
      .map(clone);
    return {
      items: matched.slice(filter.offset, filter.offset + filter.limit),
      total: matched.length,
    };
  }

  async listForCatalog(filter: EventCatalogRangeFilter) {
    return [...this.byId.values()]
      .filter(
        (e) =>
          (!filter.from || e.startsAt >= filter.from) &&
          (!filter.to || e.startsAt <= filter.to) &&
          (!filter.status || e.status === filter.status),
      )
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      .map(clone);
  }

  async hasScheduledForVenue(venueId: string) {
    return [...this.byId.values()].some((e) => e.venueId === venueId && e.isScheduled());
  }

  async add(event: Event) {
    this.byId.set(event.id, clone(event));
  }

  async save(event: Event) {
    this.byId.set(event.id, clone(event));
  }

  async delete(id: string) {
    this.byId.delete(id);
  }

  async findActiveEndedBefore(now: Date) {
    return [...this.byId.values()]
      .filter((e) => e.status === 'ACTIVE' && e.period.hasEnded(now))
      .map(clone);
  }

  all() {
    return [...this.byId.values()].map(clone);
  }
}

export class FakeVenueLookup implements IVenueLookup {
  private readonly venues = new Map<string, VenueInfo>();

  seed(venue: VenueInfo) {
    this.venues.set(venue.id, venue);
  }

  async findById(venueId: string) {
    return this.venues.get(venueId) ?? null;
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
    return `event-${++this.n}`;
  }
}

export class FakeEventTicketChecker implements IEventTicketChecker {
  private readonly withTickets = new Set<string>();

  markHasTickets(eventId: string) {
    this.withTickets.add(eventId);
  }

  async hasAnyForEvent(eventId: string) {
    return this.withTickets.has(eventId);
  }
}

export class FakeEventBus implements IEventBus {
  readonly published: DomainEvent[] = [];

  publish(event: DomainEvent): void {
    this.published.push(event);
  }

  subscribe(): void {}
}

export function fakeEventDeps() {
  return {
    events: new InMemoryEventRepository(),
    venues: new FakeVenueLookup(),
    tickets: new FakeEventTicketChecker(),
    eventBus: new FakeEventBus(),
    uow: immediateUow,
    clock: new FixedClock(),
    ids: new SequentialIds(),
  };
}
