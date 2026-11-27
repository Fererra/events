import type { EventStatus } from '../events/types';

export interface EventAnalyticsItem {
  event: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    status: EventStatus;
  };
  registrationsCount: number;
  isCancelled: boolean;
  lastActivityAt: string | null;
}

export interface FetchEventAnalyticsParams {
  from?: string;
  to?: string;
  status?: EventStatus;
}
