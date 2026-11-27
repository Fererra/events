export interface EventCapacityInfo {
  id: string;
  status: string;
  venueCapacity: number;
}

/** Consumer-side port: checks event existence or resolves event + venue capacity (locked). */
export interface IEventCapacityLookup {
  eventExists(eventId: string): Promise<boolean>;
  findEventWithCapacityForUpdate(eventId: string): Promise<EventCapacityInfo | null>;
}
