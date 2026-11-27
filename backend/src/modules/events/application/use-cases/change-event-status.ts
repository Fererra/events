import type { IEventBus } from '../../../../shared/application/event-bus.js';
import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import { InvalidEventStatusTransitionError } from '../../domain/errors.js';
import type { EventStatus } from '../../domain/event.js';
import type { EventCancelled } from '../../domain/event-events.js';
import type { IEventRepository } from '../../domain/event-repository.js';
import { toEventDto, type EventDto } from '../event-dto.js';
import type { IClock } from '../ports/clock.js';
import type { IEventTicketChecker } from '../ports/event-ticket-checker.js';

export interface ChangeEventStatusCommand {
  eventId: string;
  status: EventStatus;
}

/**
 * Command: transitions an event's status via Event's state machine methods.
 * Publishes EventCancelled after COMMIT when cancelling an event.
 */
export class ChangeEventStatusUseCase {
  constructor(
    private readonly events: IEventRepository,
    private readonly tickets: IEventTicketChecker,
    private readonly uow: IUnitOfWork,
    private readonly eventBus: IEventBus,
    private readonly clock: IClock,
  ) {}

  async execute(cmd: ChangeEventStatusCommand): Promise<EventDto> {
    return this.uow.run(async () => {
      const event = await this.events.findByIdForUpdate(cmd.eventId);
      if (!event) throw new NotFoundError('Event', cmd.eventId);

      switch (cmd.status) {
        case 'ACTIVE': {
          const hasTickets = await this.tickets.hasAnyForEvent(event.id);
          event.publish(hasTickets);
          break;
        }
        case 'CANCELLED': {
          event.cancel();
          break;
        }
        case 'FINISHED': {
          event.finish(this.clock.now());
          break;
        }
        case 'IN_PLANNING': {
          throw new InvalidEventStatusTransitionError(
            `Cannot transition an event from ${event.status} to IN_PLANNING`,
          );
        }
      }

      await this.events.save(event);

      if (cmd.status === 'CANCELLED') {
        const cancelled: EventCancelled = {
          type: 'EventCancelled',
          occurredAt: this.clock.now(),
          eventId: event.id,
        };
        this.eventBus.publish(cancelled);
      }

      return toEventDto(event);
    });
  }
}
