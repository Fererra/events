import type {
  EventCapacityInfo,
  IEventCapacityLookup,
} from '../../../src/modules/tickets/application/ports/event-capacity-lookup.js';
import type { ISoldTicketsCounter } from '../../../src/modules/tickets/application/ports/sold-tickets-counter.js';
import { TicketTypeAlreadyExistsError } from '../../../src/modules/tickets/domain/errors.js';
import type { TicketType } from '../../../src/modules/tickets/domain/ticket-type.js';
import type { ITicketTypeRepository } from '../../../src/modules/tickets/domain/ticket-type-repository.js';
import { FixedClock, immediateUow, SequentialIds } from '../auth/fakes.js';

export class InMemoryTicketTypeRepository implements ITicketTypeRepository {
  private readonly items: TicketType[] = [];

  async findByIdForUpdate(id: string) {
    return this.items.find((t) => t.id === id) ?? null;
  }

  async findByIds(ids: readonly string[]) {
    const idSet = new Set(ids);
    return this.items.filter((t) => idSet.has(t.id));
  }

  async listByEvent(eventId: string) {
    return this.items
      .filter((t) => t.eventId === eventId)
      .sort((a, b) => a.price - b.price || a.id.localeCompare(b.id));
  }

  async hasAnyForEvent(eventId: string) {
    return this.items.some((t) => t.eventId === eventId);
  }

  async sumLimitsByEvent(eventId: string) {
    return this.items.filter((t) => t.eventId === eventId).reduce((acc, t) => acc + t.limit, 0);
  }

  async findByEventAndNormalizedType(eventId: string, normalizedType: string) {
    return (
      this.items.find((t) => t.eventId === eventId && t.normalizedType === normalizedType) ?? null
    );
  }

  async add(ticket: TicketType) {
    if (await this.findByEventAndNormalizedType(ticket.eventId, ticket.normalizedType)) {
      throw new TicketTypeAlreadyExistsError();
    }
    this.items.push(ticket);
  }

  all() {
    return [...this.items];
  }
}

export class FakeEventCapacityLookup implements IEventCapacityLookup {
  private readonly events = new Map<string, EventCapacityInfo>();

  seed(info: EventCapacityInfo) {
    this.events.set(info.id, info);
  }

  async eventExists(eventId: string) {
    return this.events.has(eventId);
  }

  async findEventWithCapacityForUpdate(eventId: string) {
    return this.events.get(eventId) ?? null;
  }
}

export class FakeSoldTicketsCounter implements ISoldTicketsCounter {
  private readonly counts = new Map<string, number>();

  setSold(ticketTypeId: string, count: number) {
    this.counts.set(ticketTypeId, count);
  }

  async countActiveByEvent() {
    return new Map(this.counts);
  }
}

export function fakeTicketDeps() {
  return {
    tickets: new InMemoryTicketTypeRepository(),
    eventCapacity: new FakeEventCapacityLookup(),
    soldCounter: new FakeSoldTicketsCounter(),
    uow: immediateUow,
    clock: new FixedClock(),
    ids: new SequentialIds(),
  };
}
