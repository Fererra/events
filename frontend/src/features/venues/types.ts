export interface Venue {
  id: string;
  name: string;
  address: string;
  capacity: number | null;
  createdAt: string;
}

export interface VenueInput {
  name: string;
  address: string;
  capacity: number | null;
}
