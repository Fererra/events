import type { IEventLifecycleRepository } from '../application/ports/event-lifecycle-repository.js';
import type { Event, EventStatus } from './event.js';

export interface EventPage {
  items: Event[];
  total: number;
}

export interface EventListFilter {
  limit: number;
  offset: number;
  venueId?: string;
  status?: EventStatus;
}

export interface EventCatalogRangeFilter {
  from?: Date;
  to?: Date;
  status?: EventStatus;
}

/** Persistence port for events (implemented in infrastructure). */
export interface IEventRepository extends IEventLifecycleRepository {
  findById(id: string): Promise<Event | null>;
  list(filter: EventListFilter): Promise<EventPage>;
  listForCatalog(filter: EventCatalogRangeFilter): Promise<Event[]>;
  hasScheduledForVenue(venueId: string): Promise<boolean>;
  add(event: Event): Promise<void>;
  save(event: Event): Promise<void>;
  findActiveEndedBefore(now: Date): Promise<Event[]>;
}
