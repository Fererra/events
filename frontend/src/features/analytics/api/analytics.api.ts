import { assertNotAborted } from '../../../shared/api/mock-helpers';
import { requireAdminUser } from '../../auth/store/auth.store';
import type { EventAnalyticsItem, FetchEventAnalyticsParams } from '../types';
import { getMockEventAnalytics } from './analytics.mock';

// Mock implementation of GET /analytics/events?from&to&status until
// backend events and registrations modules are connected.
export async function fetchEventAnalytics(
  params: FetchEventAnalyticsParams = {},
  signal?: AbortSignal,
): Promise<EventAnalyticsItem[]> {
  assertNotAborted(signal);
  requireAdminUser();
  return getMockEventAnalytics(params);
}
