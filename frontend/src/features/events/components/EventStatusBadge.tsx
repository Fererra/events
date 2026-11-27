import { EVENT_STATUS_LABELS, type EventStatus } from '../types';

const STATUS_BADGE_CLASSES: Record<EventStatus, string> = {
  ACTIVE: 'badge badge--active',
  IN_PLANNING: 'badge badge--planning',
  FINISHED: 'badge badge--finished',
  CANCELLED: 'badge badge--cancelled',
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return <span className={STATUS_BADGE_CLASSES[status]}>{EVENT_STATUS_LABELS[status]}</span>;
}
