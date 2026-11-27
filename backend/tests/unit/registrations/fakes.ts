import type {
  IRegistrationContextLookup,
  LockedTicketInfo,
  RegistrationEventInfo,
} from '../../../src/modules/registrations/application/ports/registration-context-lookup.js';
import { Registration } from '../../../src/modules/registrations/domain/registration.js';
import type { IRegistrationRepository } from '../../../src/modules/registrations/domain/registration-repository.js';
import { FixedClock, immediateUow, SequentialIds } from '../auth/fakes.js';
import { FakeEventBus } from '../events/fakes.js';

function clone(r: Registration): Registration {
  return Registration.restore({
    id: r.id,
    userId: r.userId,
    eventId: r.eventId,
    ticketTypeId: r.ticketTypeId,
    status: r.status,
    registeredAt: r.registeredAt,
  });
}

export class InMemoryRegistrationRepository implements IRegistrationRepository {
  private readonly items = new Map<string, Registration>();

  async findByIdForUpdate(id: string) {
    const found = this.items.get(id);
    return found ? clone(found) : null;
  }

  async listByUser(userId: string) {
    return [...this.items.values()]
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.registeredAt.getTime() - a.registeredAt.getTime())
      .map(clone);
  }

  async countActiveByTicketType(ticketTypeId: string) {
    let total = 0;
    for (const r of this.items.values()) {
      if (r.ticketTypeId === ticketTypeId && r.status === 'ACTIVE') total++;
    }
    return total;
  }

  async countActiveByEventGroupedByTicketType(eventId: string) {
    const counts = new Map<string, number>();
    for (const r of this.items.values()) {
      if (r.eventId === eventId && r.status === 'ACTIVE') {
        counts.set(r.ticketTypeId, (counts.get(r.ticketTypeId) ?? 0) + 1);
      }
    }
    return counts;
  }

  async add(registration: Registration) {
    this.items.set(registration.id, clone(registration));
  }

  async save(registration: Registration) {
    this.items.set(registration.id, clone(registration));
  }

  all() {
    return [...this.items.values()].map(clone);
  }
}

export class FakeRegistrationContextLookup implements IRegistrationContextLookup {
  private readonly events = new Map<string, RegistrationEventInfo>();
  private readonly tickets = new Map<string, LockedTicketInfo>();

  seedEvent(event: RegistrationEventInfo) {
    this.events.set(event.id, event);
  }

  seedTicket(ticket: LockedTicketInfo) {
    this.tickets.set(ticket.id, ticket);
  }

  async findEventById(eventId: string) {
    return this.events.get(eventId) ?? null;
  }

  async findTicketByIdForUpdate(ticketTypeId: string) {
    return this.tickets.get(ticketTypeId) ?? null;
  }
}

export function fakeRegistrationDeps() {
  return {
    registrations: new InMemoryRegistrationRepository(),
    context: new FakeRegistrationContextLookup(),
    eventBus: new FakeEventBus(),
    uow: immediateUow,
    clock: new FixedClock(),
    ids: new SequentialIds(),
  };
}
