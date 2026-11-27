import type { Venue } from '../venues/types';

export type EventStatus = 'IN_PLANNING' | 'ACTIVE' | 'FINISHED' | 'CANCELLED';
export type EventFilter = 'ALL' | EventStatus;

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  IN_PLANNING: 'In planning',
  ACTIVE: 'Active',
  FINISHED: 'Finished',
  CANCELLED: 'Cancelled',
};

export const EVENT_FILTER_TABS: readonly { key: EventFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'IN_PLANNING', label: 'In planning' },
  { key: 'FINISHED', label: 'Finished' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export function isEventStatus(value: unknown): value is EventStatus {
  return (
    value === 'IN_PLANNING' ||
    value === 'ACTIVE' ||
    value === 'FINISHED' ||
    value === 'CANCELLED'
  );
}

export function parseEventStatusFilter(raw: string | null): EventFilter {
  return isEventStatus(raw) ? raw : 'ALL';
}

export function isTerminalEventStatus(status: EventStatus): boolean {
  return status === 'FINISHED' || status === 'CANCELLED';
}

export interface EventItem {
  id: number;
  name: string;
  ownerId: string;
  description: string;
  startTimestamp: string;
  endTimestamp: string;
  organisator: string;
  venueId: string;
  status: EventStatus;
  createdAt: string;
}

export interface EventWithVenue extends EventItem {
  venue: Venue | null;
}

export interface EventInput {
  name: string;
  description: string;
  startTimestamp: string;
  endTimestamp: string;
  organisator: string;
  venueId: string;
  status?: EventStatus;
}
