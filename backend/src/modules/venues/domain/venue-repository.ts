import type { Venue } from './venue.js';

export interface VenuePage {
  items: Venue[];
  total: number;
}

/** Persistence port for venues (implemented in infrastructure). */
export interface IVenueRepository {
  findById(id: string): Promise<Venue | null>;
  findByNormalizedAddress(normalizedAddress: string): Promise<Venue | null>;
  list(params: { limit: number; offset: number }): Promise<VenuePage>;
  /** Inserts a new venue. Throws VenueAddressAlreadyTakenError on a duplicate address. */
  add(venue: Venue): Promise<void>;
  /** Persists edits to an existing venue. Throws VenueAddressAlreadyTakenError on duplicate address. */
  save(venue: Venue): Promise<void>;
  delete(id: string): Promise<void>;
}
