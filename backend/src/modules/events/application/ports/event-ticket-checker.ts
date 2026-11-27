/** Port: checks whether an event has at least one ticket type (required before publishing). */
export interface IEventTicketChecker {
  hasAnyForEvent(eventId: string): Promise<boolean>;
}
