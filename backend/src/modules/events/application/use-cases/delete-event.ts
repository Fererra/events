import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import type { IEventRepository } from '../../domain/event-repository.js';

/**
 * Command: deletes a FINISHED or CANCELLED event (LR2 §4.2).
 * Rejects IN_PLANNING or ACTIVE events with 409 INVALID_STATUS_TRANSITION.
 */
export class DeleteEventUseCase {
  constructor(
    private readonly events: IEventRepository,
    private readonly uow: IUnitOfWork,
  ) {}

  async execute(eventId: string): Promise<void> {
    await this.uow.run(async () => {
      const event = await this.events.findByIdForUpdate(eventId);
      if (!event) throw new NotFoundError('Event', eventId);

      event.delete();
      await this.events.delete(eventId);
    });
  }
}
