import type { Venue } from '../venues/types';

export type EventStatus = 'IN_PLANNING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';

export interface EventItem {
  id: number;
  name: string;
  ownerId: string;
  description: string;
  startTimestamp: string;
  endTimestamp: string;
  organisator: string;
  venueId: string;
  status: EventStatus;
  createdAt: string;
}

export interface EventWithVenue extends EventItem {
  venue: Venue | null;
}

export interface EventInput {
  name: string;
  description: string;
  startTimestamp: string;
  endTimestamp: string;
  organisator: string;
  venueId: string;
  status?: EventStatus;
}
