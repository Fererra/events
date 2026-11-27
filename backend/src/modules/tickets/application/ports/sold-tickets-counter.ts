/** Consumer-side port to Registrations: counts active registrations per ticket type of an event. */
export interface ISoldTicketsCounter {
  countActiveByEvent(eventId: string): Promise<Map<string, number>>;
}
