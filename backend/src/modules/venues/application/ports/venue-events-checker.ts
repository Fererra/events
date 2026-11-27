/** Consumer-side port to Events: checks whether a venue still has scheduled events (ES-16). */
export interface IVenueEventsChecker {
  hasScheduledEvents(venueId: string): Promise<boolean>;
}
