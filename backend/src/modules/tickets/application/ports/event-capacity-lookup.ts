export interface EventCapacityInfo {
  id: string;
  status: string;
  venueCapacity: number;
}

/** Consumer-side port: looks up an event (locked for update) and its venue's capacity. */
export interface IEventCapacityLookup {
  findEventWithCapacityForUpdate(eventId: string): Promise<EventCapacityInfo | null>;
}
