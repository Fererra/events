export const EVENT_STATUSES = ['DRAFT', 'ACTIVE', 'FINISHED', 'CANCELLED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** Projection of an event that Analytics needs (LR2: EventInfo). */
export interface EventSummary {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  status: EventStatus;
}

export interface EventCatalogFilter {
  /** Events starting at or after this moment. */
  from?: Date;
  /** Events starting at or before this moment. */
  to?: Date;
  status?: EventStatus;
}

/**
 * Port to the Events module (consumer-side port, LR2 §2.2).
 * The adapter in infrastructure calls the Events module's public index.ts.
 */
export interface IEventCatalog {
  list(filter: EventCatalogFilter): Promise<EventSummary[]>;
}
