import type {
  EventCapacityInfo,
  IEventCapacityLookup,
} from '../../../src/modules/tickets/application/ports/event-capacity-lookup.js';
import { TicketTypeAlreadyExistsError } from '../../../src/modules/tickets/domain/errors.js';
import { TicketType } from '../../../src/modules/tickets/domain/ticket-type.js';
import type { ITicketTypeRepository } from '../../../src/modules/tickets/domain/ticket-type-repository.js';
import { FixedClock, immediateUow, SequentialIds } from '../auth/fakes.js';

export class InMemoryTicketTypeRepository implements ITicketTypeRepository {
  private readonly items: TicketType[] = [];

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

  async findEventWithCapacityForUpdate(eventId: string) {
    return this.events.get(eventId) ?? null;
  }
}

export function fakeTicketDeps() {
  return {
    tickets: new InMemoryTicketTypeRepository(),
    eventCapacity: new FakeEventCapacityLookup(),
    uow: immediateUow,
    clock: new FixedClock(),
    ids: new SequentialIds(),
  };
}
