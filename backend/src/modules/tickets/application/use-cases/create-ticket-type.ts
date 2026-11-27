import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import {
  EventNotEditableForTicketsError,
  TicketCapacityExceededError,
  TicketTypeAlreadyExistsError,
} from '../../domain/errors.js';
import { TicketType } from '../../domain/ticket-type.js';
import type { ITicketTypeRepository } from '../../domain/ticket-type-repository.js';
import type { IClock, IIdGenerator } from '../ports/clock.js';
import type { IEventCapacityLookup } from '../ports/event-capacity-lookup.js';
import { toTicketTypeDto, type TicketTypeDto } from '../ticket-dto.js';

export interface CreateTicketTypeCommand {
  eventId: string;
  type: string;
  limit: number;
  price: number;
}

/**
 * Command: adds a ticket type to an event, atomically verifying that
 * the sum of all ticket type limits for the event does not exceed venue capacity.
 */
export class CreateTicketTypeUseCase {
  constructor(
    private readonly tickets: ITicketTypeRepository,
    private readonly eventCapacity: IEventCapacityLookup,
    private readonly uow: IUnitOfWork,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(cmd: CreateTicketTypeCommand): Promise<TicketTypeDto> {
    const ticket = TicketType.create({
      id: this.ids.next(),
      eventId: cmd.eventId,
      type: cmd.type,
      limit: cmd.limit,
      price: cmd.price,
      now: this.clock.now(),
    });

    await this.uow.run(async () => {
      const event = await this.eventCapacity.findEventWithCapacityForUpdate(cmd.eventId);
      if (!event) throw new NotFoundError('Event', cmd.eventId);

      if (event.status !== 'IN_PLANNING' && event.status !== 'ACTIVE') {
        throw new EventNotEditableForTicketsError(event.status);
      }

      const duplicate = await this.tickets.findByEventAndNormalizedType(
        cmd.eventId,
        ticket.normalizedType,
      );
      if (duplicate) throw new TicketTypeAlreadyExistsError();

      const allocated = await this.tickets.sumLimitsByEvent(cmd.eventId);
      if (allocated + ticket.limit > event.venueCapacity) {
        throw new TicketCapacityExceededError();
      }

      await this.tickets.add(ticket);
    });

    return toTicketTypeDto(ticket);
  }
}
