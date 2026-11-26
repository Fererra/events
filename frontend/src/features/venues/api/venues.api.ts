import { ApiError } from '../../../shared/api/errors';
import type { PaginatedResponse } from '../../../shared/api/types';
import type { Venue } from '../types';
import { MOCK_VENUES } from './venues.mock';

export interface FetchVenuesParams {
  page?: number;
  limit?: number;
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
}

export function getMockVenueById(id: string): Venue | null {
  return MOCK_VENUES.find((v) => v.id === id) ?? null;
}

// Mock implementation until backend venue endpoints (/venues, /venues/:id) are available.
export async function fetchVenues(
  { page = 1, limit = 6 }: FetchVenuesParams = {},
  signal?: AbortSignal,
): Promise<PaginatedResponse<Venue>> {
  assertNotAborted(signal);

  const safeLimit = Math.max(1, Math.floor(limit));
  const total = MOCK_VENUES.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const safePage = Math.min(Math.max(1, Math.floor(page)), totalPages);
  const start = (safePage - 1) * safeLimit;

  return {
    items: MOCK_VENUES.slice(start, start + safeLimit),
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };
}

export async function fetchVenueById(id: string, signal?: AbortSignal): Promise<Venue> {
  assertNotAborted(signal);

  const venue = getMockVenueById(id);
  if (!venue) {
    throw new ApiError(404, 'VENUE_NOT_FOUND', 'Venue not found');
  }
  return venue;
}
