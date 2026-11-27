import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { createEventReader, type EventReader } from '../../events/index.js';
import { createTicketReader, type TicketReader } from '../../tickets/index.js';
import type {
  IMyRegistrationsReadModel,
  MyRegistrationView,
} from '../application/ports/my-registrations-read-model.js';
import type { IRegistrationRepository } from '../domain/registration-repository.js';

/**
 * Live read model for GET /me/registrations: fetches the user's registrations and
 * batch-loads event/ticket summaries through their public index.ts readers (no N+1,
 * no cross-module schema imports).
 */
export class DrizzleMyRegistrationsReadModel implements IMyRegistrationsReadModel {
  private readonly events: EventReader;
  private readonly tickets: TicketReader;

  constructor(
    private readonly registrations: IRegistrationRepository,
    db: DbExecutorProvider,
  ) {
    this.events = createEventReader(db);
    this.tickets = createTicketReader(db);
  }

  async listByUser(userId: string): Promise<MyRegistrationView[]> {
    const list = await this.registrations.listByUser(userId);
    if (list.length === 0) return [];

    const eventIds = [...new Set(list.map((r) => r.eventId))];
    const ticketIds = [...new Set(list.map((r) => r.ticketTypeId))];

    const [eventsById, ticketsById] = await Promise.all([
      this.events.findSummariesByIds(eventIds),
      this.tickets.findByIds(ticketIds),
    ]);

    const views: MyRegistrationView[] = [];
    for (const reg of list) {
      const event = eventsById.get(reg.eventId);
      const ticket = ticketsById.get(reg.ticketTypeId);
      if (!event || !ticket) continue;
      views.push({
        id: reg.id,
        eventId: reg.eventId,
        eventTitle: event.title,
        eventStartsAt: event.startsAt,
        eventEndsAt: event.endsAt,
        ticketType: ticket.type,
        ticketPrice: ticket.price,
        status: reg.status,
        registeredAt: reg.registeredAt,
      });
    }
    return views;
  }
}
