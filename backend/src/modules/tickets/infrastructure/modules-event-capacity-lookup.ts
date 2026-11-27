import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { createEventReader, type EventReader } from '../../events/index.js';
import { createVenueReader, type VenueReader } from '../../venues/index.js';
import type {
  EventCapacityInfo,
  IEventCapacityLookup,
} from '../application/ports/event-capacity-lookup.js';

/** Adapter: resolves an event (FOR UPDATE) and its venue capacity via public module APIs. */
export class ModulesEventCapacityLookup implements IEventCapacityLookup {
  private readonly events: EventReader;
  private readonly venues: VenueReader;

  constructor(db: DbExecutorProvider) {
    this.events = createEventReader(db);
    this.venues = createVenueReader(db);
  }

  async eventExists(eventId: string): Promise<boolean> {
    return (await this.events.findById(eventId)) !== null;
  }

  async findEventWithCapacityForUpdate(eventId: string): Promise<EventCapacityInfo | null> {
    const event = await this.events.findByIdForUpdate(eventId);
    if (!event) return null;
    const venue = await this.venues.findById(event.venueId);
    if (!venue) return null;
    return { id: event.id, status: event.status, venueCapacity: venue.capacity };
  }
}
