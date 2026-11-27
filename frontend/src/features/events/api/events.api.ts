import { ApiError } from '../../../shared/api/errors';
import type { PaginatedResponse } from '../../../shared/api/types';
import { useAuthStore, type User } from '../../auth/store/auth.store';
import { getMockVenueById } from '../../venues/api/venues.api';
import type { EventInput, EventItem, EventStatus, EventWithVenue } from '../types';
import {
  findMockEventById,
  getScheduledEventCountsByVenue,
  loadMockEvents,
  saveMockEvents,
} from './events.mock';

export interface FetchEventsParams {
  page?: number;
  limit?: number;
  status?: EventStatus;
}

export const ALLOWED_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  IN_PLANNING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['FINISHED', 'CANCELLED'],
  FINISHED: [],
  CANCELLED: [],
};

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

function requireAdmin(): User {
  const { user, refreshToken } = useAuthStore.getState();
  if (!user || !refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in to continue');
  }
  if (user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admin role is required');
  }
  return user;
}

function withVenue(event: EventItem): EventWithVenue {
  return {
    ...event,
    venue: getMockVenueById(event.venueId),
  };
}

function validateEventInput(input: Omit<EventInput, 'status'>): {
  name: string;
  description: string;
  startTimestamp: string;
  endTimestamp: string;
  organisator: string;
  venueId: string;
} {
  const name = input.name.trim();
  const description = input.description.trim();
  const organisator = input.organisator.trim();
  const venueId = input.venueId.trim();
  const details: { field: string; message: string }[] = [];

  if (!name) {
    details.push({ field: 'name', message: 'Enter an event name.' });
  } else if (name.length > 150) {
    details.push({ field: 'name', message: 'Event name must be at most 150 characters.' });
  }

  if (!description) {
    details.push({ field: 'description', message: 'Enter an event description.' });
  } else if (description.length > 2000) {
    details.push({
      field: 'description',
      message: 'Description must be at most 2000 characters.',
    });
  }

  if (!organisator) {
    details.push({ field: 'organisator', message: 'Enter an organizer name.' });
  } else if (organisator.length > 120) {
    details.push({
      field: 'organisator',
      message: 'Organizer name must be at most 120 characters.',
    });
  }

  if (!venueId) {
    details.push({ field: 'venueId', message: 'Select a venue.' });
  }

  const startMs = Date.parse(input.startTimestamp);
  const endMs = Date.parse(input.endTimestamp);
  if (Number.isNaN(startMs)) {
    details.push({ field: 'startTimestamp', message: 'Enter a valid start date and time.' });
  }
  if (Number.isNaN(endMs)) {
    details.push({ field: 'endTimestamp', message: 'Enter a valid end date and time.' });
  }

  if (details.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details);
  }

  if (endMs <= startMs) {
    throw new ApiError(
      400,
      'PERIOD_INVALID',
      'End date and time must be later than start date and time',
    );
  }

  if (!getMockVenueById(venueId)) {
    throw new ApiError(404, 'VENUE_NOT_FOUND', 'Selected venue not found');
  }

  return {
    name,
    description,
    startTimestamp: new Date(startMs).toISOString(),
    endTimestamp: new Date(endMs).toISOString(),
    organisator,
    venueId,
  };
}

// Mock implementation until backend event endpoints (/events, /events/:id) are available.
export async function fetchEvents(
  { page = 1, limit = 6, status }: FetchEventsParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResponse<EventWithVenue>> {
  assertNotAborted(signal);

  const allEvents = loadMockEvents();
  const events = status ? allEvents.filter((event) => event.status === status) : allEvents;
  const safeLimit = Math.max(1, Math.floor(limit));
  const total = events.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safeLimit;

  return {
    items: events.slice(start, start + safeLimit).map(withVenue),
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

export async function fetchEventCountsByStatus(
  signal?: AbortSignal,
): Promise<Record<'ALL' | EventStatus, number>> {
  assertNotAborted(signal);

  const counts: Record<'ALL' | EventStatus, number> = {
    ALL: 0,
    ACTIVE: 0,
    IN_PLANNING: 0,
    FINISHED: 0,
    CANCELLED: 0,
  };
  for (const event of loadMockEvents()) {
    counts.ALL += 1;
    counts[event.status] += 1;
  }
  return counts;
}

export async function fetchAllEvents(signal?: AbortSignal): Promise<EventWithVenue[]> {
  assertNotAborted(signal);
  return loadMockEvents().map(withVenue);
}

export async function fetchEventById(id: number, signal?: AbortSignal): Promise<EventWithVenue> {
  assertNotAborted(signal);

  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  const event = findMockEventById(id);
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

  return loadMockEvents()
    .filter((event) => event.venueId === venueId)
    .sort((a, b) => a.startTimestamp.localeCompare(b.startTimestamp));
}

export async function fetchEventCountsByVenue(
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  assertNotAborted(signal);

  const counts: Record<string, number> = {};
  for (const event of loadMockEvents()) {
    counts[event.venueId] = (counts[event.venueId] ?? 0) + 1;
  }
  return counts;
}

export async function fetchScheduledEventCountsByVenue(
  signal?: AbortSignal,
): Promise<Record<string, number>> {
  assertNotAborted(signal);
  return getScheduledEventCountsByVenue();
}

export async function createEvent(
  input: EventInput,
  signal?: AbortSignal,
): Promise<EventWithVenue> {
  assertNotAborted(signal);
  const admin = requireAdmin();

  const normalized = validateEventInput(input);
  const status: EventStatus = input.status ?? 'IN_PLANNING';
  if (status !== 'IN_PLANNING' && status !== 'ACTIVE') {
    throw new ApiError(
      409,
      'INVALID_STATUS_TRANSITION',
      'New events must start as In planning or Active',
    );
  }

  const events = loadMockEvents();
  const maxId = events.reduce((max, item) => (item.id > max ? item.id : max), 0);
  const created: EventItem = {
    id: maxId + 1,
    name: normalized.name,
    ownerId: admin.id,
    description: normalized.description,
    startTimestamp: normalized.startTimestamp,
    endTimestamp: normalized.endTimestamp,
    organisator: normalized.organisator,
    venueId: normalized.venueId,
    status,
    createdAt: new Date().toISOString(),
  };

  saveMockEvents([created, ...events]);
  return withVenue(created);
}

export async function updateEvent(
  id: number,
  input: Omit<EventInput, 'status'>,
  signal?: AbortSignal,
): Promise<EventWithVenue> {
  assertNotAborted(signal);
  requireAdmin();

  const events = loadMockEvents();
  const index = events.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  const existing = events[index];
  if (existing.status === 'FINISHED' || existing.status === 'CANCELLED') {
    throw new ApiError(
      409,
      'EVENT_NOT_EDITABLE',
      'Finished or cancelled events cannot be edited',
    );
  }

  const normalized = validateEventInput(input);
  const updated: EventItem = {
    ...existing,
    name: normalized.name,
    description: normalized.description,
    startTimestamp: normalized.startTimestamp,
    endTimestamp: normalized.endTimestamp,
    organisator: normalized.organisator,
    venueId: normalized.venueId,
  };

  const next = events.slice();
  next[index] = updated;
  saveMockEvents(next);
  return withVenue(updated);
}

export async function updateEventStatus(
  id: number,
  nextStatus: EventStatus,
  signal?: AbortSignal,
): Promise<EventWithVenue> {
  assertNotAborted(signal);
  requireAdmin();

  const events = loadMockEvents();
  const index = events.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
  }

  const existing = events[index];
  if (existing.status === nextStatus) {
    return withVenue(existing);
  }

  if (!ALLOWED_STATUS_TRANSITIONS[existing.status].includes(nextStatus)) {
    throw new ApiError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot change status from ${existing.status} to ${nextStatus}`,
    );
  }

  const updated: EventItem = {
    ...existing,
    status: nextStatus,
  };

  const next = events.slice();
  next[index] = updated;
  saveMockEvents(next);
  return withVenue(updated);
}
