import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { createEventCatalogReader, type EventCatalogReader } from '../../events/index.js';
import type {
  EventCatalogFilter,
  EventSummary,
  IEventCatalog,
} from '../application/ports/event-catalog.js';

/** Adapter: implements Analytics' IEventCatalog port through Events' public index.ts. */
export class EventsModuleCatalog implements IEventCatalog {
  private readonly reader: EventCatalogReader;

  constructor(db: DbExecutorProvider) {
    this.reader = createEventCatalogReader(db);
  }

  list(filter: EventCatalogFilter): Promise<EventSummary[]> {
    return this.reader.list(filter);
  }
}
