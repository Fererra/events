import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { createVenueEventsChecker, type VenueEventsChecker } from '../../events/index.js';
import type { IVenueEventsChecker } from '../application/ports/venue-events-checker.js';

/** Adapter: implements Venues' IVenueEventsChecker port through Events' public index.ts. */
export class EventsModuleChecker implements IVenueEventsChecker {
  private readonly checker: VenueEventsChecker;

  constructor(db: DbExecutorProvider) {
    this.checker = createVenueEventsChecker(db);
  }

  hasScheduledEvents(venueId: string): Promise<boolean> {
    return this.checker.hasScheduledEvents(venueId);
  }
}
