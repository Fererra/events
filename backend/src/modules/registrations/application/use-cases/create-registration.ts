import type { IEventBus } from '../../../../shared/application/event-bus.js';
import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import type { RegistrationCreated } from '../../domain/registration-events.js';
import { RegistrationFactory } from '../../domain/registration-factory.js';
import type { IRegistrationRepository } from '../../domain/registration-repository.js';
import type { IClock, IIdGenerator } from '../ports/clock.js';
import type { IRegistrationContextLookup } from '../ports/registration-context-lookup.js';
import { toRegistrationDto, type RegistrationDto } from '../registration-dto.js';

export interface CreateRegistrationCommand {
  userId: string;
  eventId: string;
  ticketTypeId: string;
}

/**
 * Command: registers a user for an active event with atomic ticket-limit check.
 * Locks the ticket_types row (`SELECT ... FOR UPDATE`) inside IUnitOfWork so
 * concurrent requests can never oversell, then publishes RegistrationCreated after COMMIT.
 */
export class CreateRegistrationUseCase {
  constructor(
    private readonly registrations: IRegistrationRepository,
    private readonly context: IRegistrationContextLookup,
    private readonly uow: IUnitOfWork,
    private readonly eventBus: IEventBus,
    private readonly clock: IClock,
    private readonly ids: IIdGenerator,
  ) {}

  async execute(cmd: CreateRegistrationCommand): Promise<RegistrationDto> {
    return this.uow.run(async () => {
      const event = await this.context.findEventById(cmd.eventId);
      if (!event) throw new NotFoundError('Event', cmd.eventId);

      const ticket = await this.context.findTicketByIdForUpdate(cmd.ticketTypeId);
      if (!ticket || ticket.eventId !== cmd.eventId) {
        throw new NotFoundError('Ticket', cmd.ticketTypeId);
      }

      const activeCount = await this.registrations.countActiveByTicketType(ticket.id);
      const registration = RegistrationFactory.create({
        id: this.ids.next(),
        userId: cmd.userId,
        eventId: event.id,
        eventAcceptsRegistrations: event.status === 'ACTIVE',
        ticketTypeId: ticket.id,
        ticketLimit: ticket.limit,
        activeCount,
        now: this.clock.now(),
      });

      await this.registrations.add(registration);

      const created: RegistrationCreated = {
        type: 'RegistrationCreated',
        occurredAt: registration.registeredAt,
        registrationId: registration.id,
        eventId: registration.eventId,
        userId: registration.userId,
        ticketTypeId: registration.ticketTypeId,
      };
      this.eventBus.publish(created);

      return toRegistrationDto(registration);
    });
  }
}
