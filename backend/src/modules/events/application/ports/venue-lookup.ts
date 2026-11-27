/** Projection of a venue that the Events module needs (consumer-side port, LR2 §2.2). */
export interface VenueInfo {
  id: string;
  name: string;
  address: string;
  capacity: number;
}

/** Port to the Venues module (implemented in infrastructure via venues/index.ts). */
export interface IVenueLookup {
  findById(venueId: string): Promise<VenueInfo | null>;
}
