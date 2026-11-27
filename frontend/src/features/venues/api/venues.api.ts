import { ApiError } from '../../../shared/api/errors';
import type { PaginatedResponse } from '../../../shared/api/types';
import { useAuthStore } from '../../auth/store/auth.store';
import { hasScheduledEventsAtVenue } from '../../events/api/events.mock';
import type { Venue, VenueInput } from '../types';
import { loadMockVenues, saveMockVenues } from './venues.mock';

export interface FetchVenuesParams {
  page?: number;
  limit?: number;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

function requireAdmin(): void {
  const { user, refreshToken } = useAuthStore.getState();
  if (!user || !refreshToken) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in to continue');
  }
  if (user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Admin role is required');
  }
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeAddress(address: string): string {
  return address.trim().replace(/\s+/g, ' ').toLowerCase();
}

function validateVenueInput(input: VenueInput): {
  name: string;
  address: string;
  capacity: number | null;
} {
  const name = input.name.trim();
  const address = input.address.trim();
  const details: { field: string; message: string }[] = [];

  if (!name) {
    details.push({ field: 'name', message: 'Enter a venue name.' });
  } else if (name.length > 120) {
    details.push({ field: 'name', message: 'Venue name must be at most 120 characters.' });
  }

  if (!address) {
    details.push({ field: 'address', message: 'Enter a venue address.' });
  } else if (address.length > 200) {
    details.push({ field: 'address', message: 'Venue address must be at most 200 characters.' });
  }

  if (details.length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Validation failed', details);
  }

  if (
    input.capacity !== null &&
    (!Number.isInteger(input.capacity) || input.capacity < 1)
  ) {
    throw new ApiError(400, 'CAPACITY_INVALID', 'Capacity must be a positive whole number');
  }

  return { name, address, capacity: input.capacity };
}

export function getMockVenueById(id: string): Venue | null {
  return loadMockVenues().find((v) => v.id === id) ?? null;
}

// Mock implementation until backend venue endpoints (/venues, /venues/:id) are available.
export async function fetchVenues(
  { page = 1, limit = 6 }: FetchVenuesParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResponse<Venue>> {
  assertNotAborted(signal);

  const venues = loadMockVenues();
  const safeLimit = Math.max(1, Math.floor(limit));
  const total = venues.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safeLimit;

  return {
    items: venues.slice(start, start + safeLimit),
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

export async function fetchAllVenues(signal?: AbortSignal): Promise<Venue[]> {
  assertNotAborted(signal);
  return loadMockVenues();
}

export async function fetchVenueById(id: string, signal?: AbortSignal): Promise<Venue> {
  assertNotAborted(signal);

  const venue = getMockVenueById(id);
  if (!venue) {
    throw new ApiError(404, 'VENUE_NOT_FOUND', 'Venue not found');
  }
  return venue;
}

export async function createVenue(input: VenueInput, signal?: AbortSignal): Promise<Venue> {
  assertNotAborted(signal);
  requireAdmin();

  const normalized = validateVenueInput(input);
  const venues = loadMockVenues();
  const targetAddr = normalizeAddress(normalized.address);

  if (venues.some((v) => normalizeAddress(v.address) === targetAddr)) {
    throw new ApiError(409, 'ADDRESS_TAKEN', 'A venue with this address already exists');
  }

  const created: Venue = {
    id: generateUuid(),
    name: normalized.name,
    address: normalized.address,
    capacity: normalized.capacity,
    createdAt: new Date().toISOString(),
  };

  saveMockVenues([created, ...venues]);
  return created;
}

export async function updateVenue(
  id: string,
  input: VenueInput,
  signal?: AbortSignal,
): Promise<Venue> {
  assertNotAborted(signal);
  requireAdmin();

  const venues = loadMockVenues();
  const index = venues.findIndex((v) => v.id === id);
  if (index === -1) {
    throw new ApiError(404, 'VENUE_NOT_FOUND', 'Venue not found');
  }

  const normalized = validateVenueInput(input);
  const targetAddr = normalizeAddress(normalized.address);
  if (venues.some((v) => v.id !== id && normalizeAddress(v.address) === targetAddr)) {
    throw new ApiError(409, 'ADDRESS_TAKEN', 'A venue with this address already exists');
  }

  const updated: Venue = {
    ...venues[index],
    name: normalized.name,
    address: normalized.address,
    capacity: normalized.capacity,
  };

  const next = venues.slice();
  next[index] = updated;
  saveMockVenues(next);
  return updated;
}

export async function deleteVenue(id: string, signal?: AbortSignal): Promise<void> {
  assertNotAborted(signal);
  requireAdmin();

  const venues = loadMockVenues();
  if (!venues.some((v) => v.id === id)) {
    throw new ApiError(404, 'VENUE_NOT_FOUND', 'Venue not found');
  }

  if (hasScheduledEventsAtVenue(id)) {
    throw new ApiError(
      409,
      'VENUE_HAS_SCHEDULED_EVENTS',
      'This venue cannot be deleted because it has scheduled events',
    );
  }

  saveMockVenues(venues.filter((v) => v.id !== id));
}
