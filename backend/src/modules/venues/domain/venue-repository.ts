import type { Venue } from './venue.js';

/** Persistence port for venues (implemented in infrastructure). */
export interface IVenueRepository {
  findByNormalizedAddress(normalizedAddress: string): Promise<Venue | null>;
  /** Inserts a new venue. Throws VenueAddressAlreadyTakenError on a duplicate address. */
  add(venue: Venue): Promise<void>;
}
