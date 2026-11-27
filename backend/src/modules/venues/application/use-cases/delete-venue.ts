import type { IUnitOfWork } from '../../../../shared/application/unit-of-work.js';
import { NotFoundError } from '../../../../shared/domain/errors.js';
import { VenueHasScheduledEventsError } from '../../domain/errors.js';
import type { IVenueRepository } from '../../domain/venue-repository.js';
import type { IVenueEventsChecker } from '../ports/venue-events-checker.js';

/** Command: deletes a venue only if no scheduled (IN_PLANNING / ACTIVE) events exist on it. */
export class DeleteVenueUseCase {
  constructor(
    private readonly venues: IVenueRepository,
    private readonly events: IVenueEventsChecker,
    private readonly uow: IUnitOfWork,
  ) {}

  async execute(id: string): Promise<void> {
    await this.uow.run(async () => {
      const venue = await this.venues.findById(id);
      if (!venue) throw new NotFoundError('Venue', id);
      if (await this.events.hasScheduledEvents(id)) throw new VenueHasScheduledEventsError();
      await this.venues.delete(id);
    });
  }
}
