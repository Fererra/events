import type { IEventBus } from '../../../../shared/application/event-bus.js';
import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { ForbiddenError, NotFoundError } from '../../../../shared/domain/errors.js';
import { EventRegistrationClosedError } from '../../domain/errors.js';
import type { RegistrationCancelled } from '../../domain/registration-events.js';
import type { IRegistrationRepository } from '../../domain/registration-repository.js';
import type { IClock } from '../ports/clock.js';
import type { IRegistrationContextLookup } from '../ports/registration-context-lookup.js';

export interface CancelRegistrationCommand {
  registrationId: string;
  actorId: string;
}

/**
 * Command: cancels the caller's own active registration, freeing the ticket seat
 * and publishing RegistrationCancelled after COMMIT.
 */
export class CancelRegistrationUseCase {
  constructor(
    private readonly registrations: IRegistrationRepository,
    private readonly context: IRegistrationContextLookup,
    private readonly uow: IUnitOfWork,
    private readonly eventBus: IEventBus,
    private readonly clock: IClock,
  ) {}

  async execute(cmd: CancelRegistrationCommand): Promise<void> {
    await this.uow.run(async () => {
      const registration = await this.registrations.findByIdForUpdate(cmd.registrationId);
      if (!registration) throw new NotFoundError('Registration', cmd.registrationId);

      if (registration.userId !== cmd.actorId) {
        throw new ForbiddenError('FORBIDDEN', 'Only the registration owner can cancel it');
      }

      const event = await this.context.findEventById(registration.eventId);
      if (event?.status === 'FINISHED') {
        throw new EventRegistrationClosedError('Cannot cancel a registration for a finished event');
      }

      registration.cancel();
      await this.registrations.save(registration);

      const cancelled: RegistrationCancelled = {
        type: 'RegistrationCancelled',
        occurredAt: this.clock.now(),
        registrationId: registration.id,
        eventId: registration.eventId,
        userId: registration.userId,
        cancelledBy: 'owner',
      };
      this.eventBus.publish(cancelled);
    });
  }
}
