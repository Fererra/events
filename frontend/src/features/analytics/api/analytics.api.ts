import { ApiError } from '../../../shared/api/errors';
import { useAuthStore } from '../../auth/store/auth.store';
import type { EventAnalyticsItem, FetchEventAnalyticsParams } from '../types';
import { getMockEventAnalytics } from './analytics.mock';

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

// Mock implementation of GET /analytics/events?from&to&status until
// backend events and registrations modules are connected.
export async function fetchEventAnalytics(
  params: FetchEventAnalyticsParams = {},
  signal?: AbortSignal,
): Promise<EventAnalyticsItem[]> {
  assertNotAborted(signal);
  requireAdmin();
  return getMockEventAnalytics(params);
}
