import type {
  EventCatalogFilter,
  EventSummary,
  IEventCatalog,
} from '../application/ports/event-catalog.js';

/**
 * TEMPORARY stand-in until the Events module exposes an event listing in its
 * index.ts (ES-17, ES-19). Replace with an adapter that calls it and maps
 * results to EventSummary.
 */
export class StubEventCatalog implements IEventCatalog {
  async list(_filter: EventCatalogFilter): Promise<EventSummary[]> {
    return [];
  }
}
