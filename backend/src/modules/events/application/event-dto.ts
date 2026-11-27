import type { Event, EventStatus } from '../domain/event.js';

/** Public view of an event. */
export interface EventDto {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  organizer: string;
  venueId: string;
  status: EventStatus;
  createdAt: string;
}

export function toEventDto(event: Event): EventDto {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt.toISOString(),
    organizer: event.organizer,
    venueId: event.venueId,
    status: event.status,
    createdAt: event.createdAt.toISOString(),
  };
}
