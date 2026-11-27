import type { Venue } from '../domain/venue.js';

/** Public view of a venue. */
export interface VenueDto {
  id: string;
  name: string;
  address: string;
  capacity: number;
  createdAt: string;
}

export function toVenueDto(venue: Venue): VenueDto {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address,
    capacity: venue.capacity,
    createdAt: venue.createdAt.toISOString(),
  };
}
