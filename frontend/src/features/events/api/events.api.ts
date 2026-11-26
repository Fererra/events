import { ApiError } from '../../../shared/api/errors';
import type { PaginatedResponse } from '../../../shared/api/types';
import { getMockVenueById } from '../../venues/api/venues.api';
import type { EventItem, EventWithVenue } from '../types';
import { MOCK_EVENTS } from './events.mock';

export interface FetchEventsParams {
  page?: number;
  limit?: number;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

function withVenue(event: EventItem): EventWithVenue {
  return {
    ...event,
    venue: getMockVenueById(event.venueId),
  };
}

// Mock implementation until backend event endpoints (/events, /events/:id) are available.
export async function fetchEvents(
  { page = 1, limit = 6 }: FetchEventsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResponse<EventWithVenue>> {
  assertNotAborted(signal);

  const safeLimit = Math.max(1, Math.floor(limit));
  const total = MOCK_EVENTS.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safeLimit;

  return {
    items: MOCK_EVENTS.slice(start, start + safeLimit).map(withVenue),
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

export async function fetchEventById(id: number, signal?: AbortSignal): Promise<EventWithVenue> {
  assertNotAborted(signal);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  const event = MOCK_EVENTS.find((item) => item.id === id);
  if (!event) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }
  return withVenue(event);
}

export async function fetchEventsByVenue(
  venueId: string,
  signal?: AbortSignal,
): Promise<EventItem[]> {
  assertNotAborted(signal);

  return MOCK_EVENTS.filter((event) => event.venueId === venueId).sort((a, b) =>
    a.startTimestamp.localeCompare(b.startTimestamp),
  );
}

export async function fetchEventCountsByVenue(
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  assertNotAborted(signal);

  const counts: Record<string, number> = {};
  for (const event of MOCK_EVENTS) {
    counts[event.venueId] = (counts[event.venueId] ?? 0) + 1;
  }
  return counts;
}
