import type { DbExecutorProvider } from '../../../shared/infrastructure/db/database.js';
import { createVenueReader, type VenueReader } from '../../venues/index.js';
import type { IVenueLookup, VenueInfo } from '../application/ports/venue-lookup.js';

/** Adapter: implements Events' IVenueLookup port through Venues' public index.ts. */
export class VenuesModuleLookup implements IVenueLookup {
  private readonly reader: VenueReader;

  constructor(db: DbExecutorProvider) {
    this.reader = createVenueReader(db);
  }

  findById(venueId: string): Promise<VenueInfo | null> {
    return this.reader.findById(venueId);
  }
}
