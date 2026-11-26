import type { EventStatus } from '../types';

const STATUS_CONFIG: Record<EventStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'badge badge--active' },
  IN_PLANNING: { label: 'In planning', className: 'badge badge--planning' },
  DRAFT: { label: 'Draft', className: 'badge badge--draft' },
  FINISHED: { label: 'Finished', className: 'badge badge--finished' },
  CANCELLED: { label: 'Cancelled', className: 'badge badge--cancelled' },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { label, className } = STATUS_CONFIG[status];
  return <span className={className}>{label}</span>;
}
