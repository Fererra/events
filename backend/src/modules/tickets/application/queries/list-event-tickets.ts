import { NotFoundError } from '../../../../shared/domain/errors.js';
import type { ITicketTypeRepository } from '../../domain/ticket-type-repository.js';
import type { IEventCapacityLookup } from '../ports/event-capacity-lookup.js';
import type { ISoldTicketsCounter } from '../ports/sold-tickets-counter.js';
import { toTicketTypeDto, type TicketTypeDto } from '../ticket-dto.js';

export interface TicketTypeWithRemainingDto extends TicketTypeDto {
  remaining: number;
}

/** Query (CQS): lists ticket types for an event with price, limit and remaining seats. */
export class ListEventTicketsQuery {
  constructor(
    private readonly tickets: ITicketTypeRepository,
    private readonly events: IEventCapacityLookup,
    private readonly soldCounter: ISoldTicketsCounter,
  ) {}

  async execute(eventId: string): Promise<TicketTypeWithRemainingDto[]> {
    if (!(await this.events.eventExists(eventId))) {
      throw new NotFoundError('Event', eventId);
    }

    const [items, soldByTicket] = await Promise.all([
      this.tickets.listByEvent(eventId),
      this.soldCounter.countActiveByEvent(eventId),
    ]);

    return items.map((t) => {
      const sold = soldByTicket.get(t.id) ?? 0;
      return {
        ...toTicketTypeDto(t),
        remaining: Math.max(0, t.limit - sold),
      };
    });
  }
}
