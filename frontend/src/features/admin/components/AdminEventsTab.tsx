import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { formatDateRange } from '../../../shared/utils/format';
import {
  ALLOWED_STATUS_TRANSITIONS,
  EVENT_FILTER_TABS,
  EVENT_STATUS_LABELS,
  EventStatusBadge,
  fetchAllEvents,
  isTerminalEventStatus,
  updateEventStatus,
  type EventFilter,
  type EventStatus,
  type EventWithVenue,
} from '../../events';
import { fetchTicketSummariesByEvent, type EventTicketSummary } from '../../registrations';
import { fetchAllVenues, type Venue } from '../../venues';
import { EventFormModal } from './EventFormModal';
import { EventTicketsModal } from './EventTicketsModal';

interface AdminEventsTabProps {
  onDataChanged?: () => void;
}

function getStatusChangeDescription(event: EventWithVenue, nextStatus: EventStatus): string {
  const base = `Change status of "${event.name}" from ${EVENT_STATUS_LABELS[event.status]} to ${EVENT_STATUS_LABELS[nextStatus]}?`;
  if (nextStatus === 'CANCELLED') {
    return `${base} Registration will be closed and this change cannot be undone.`;
  }
  if (nextStatus === 'FINISHED') {
    return `${base} Registration will be closed and the event can no longer be edited.`;
  }
  return base;
}

interface AdminEventCardProps {
  event: EventWithVenue;
  summary: EventTicketSummary | undefined;
  selectedStatus: EventStatus;
  updatingThisStatus: boolean;
  updatingStatus: boolean;
  onDraftStatusChange: (nextStatus: EventStatus) => void;
  onConfirmStatusOpen: () => void;
  onEditTickets: () => void;
  onEditEvent: () => void;
}

function AdminEventCard({
  event,
  summary,
  selectedStatus,
  updatingThisStatus,
  updatingStatus,
  onDraftStatusChange,
  onConfirmStatusOpen,
  onEditTickets,
  onEditEvent,
}: AdminEventCardProps) {
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[event.status];
  const isTerminal = isTerminalEventStatus(event.status);
  const statusOptions: EventStatus[] = [event.status, ...allowedNext];

  return (
    <article className="card admin-item">
      <div className="admin-item__head">
        <h2 className="admin-item__title">
          <Link to={`/events/${event.id}`}>{event.name}</Link>
        </h2>
        <EventStatusBadge status={event.status} />
      </div>

      <dl className="admin-item__meta">
        <div>
          <dt>Schedule</dt>
          <dd>{formatDateRange(event.startTimestamp, event.endTimestamp)}</dd>
        </div>
        <div>
          <dt>Venue</dt>
          <dd>
            {event.venue ? `${event.venue.name} · ${event.venue.address}` : 'Venue unavailable'}
          </dd>
        </div>
        <div>
          <dt>Organizer</dt>
          <dd>{event.organisator}</dd>
        </div>
        <div>
          <dt>Tickets</dt>
          <dd>
            {summary
              ? `${summary.typesCount} ${summary.typesCount === 1 ? 'type' : 'types'} · ${summary.totalRemaining} / ${summary.totalLimit} left`
              : 'No ticket types configured'}
          </dd>
        </div>
      </dl>

      <div className="admin-item__footer">
        {allowedNext.length > 0 ? (
          <div className="admin-status-control">
            <label htmlFor={`event-status-${event.id}`} className="admin-status-control__label">
              Status
            </label>
            <select
              id={`event-status-${event.id}`}
              className="filter-select"
              value={selectedStatus}
              disabled={updatingThisStatus}
              onChange={(e) => onDraftStatusChange(e.target.value as EventStatus)}
            >
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {EVENT_STATUS_LABELS[st]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--sm"
              disabled={selectedStatus === event.status || updatingStatus}
              onClick={onConfirmStatusOpen}
            >
              Update status
            </button>
          </div>
        ) : (
          <span className="muted">Final status ({EVENT_STATUS_LABELS[event.status]})</span>
        )}

        <div className="admin-item__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onEditTickets}>
            Edit tickets ({summary?.typesCount ?? 0})
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={isTerminal}
            onClick={onEditEvent}
            title={
              isTerminal
                ? 'Finished or cancelled events cannot be edited'
                : 'Edit event details'
            }
          >
            Edit event
          </button>
        </div>
      </div>
    </article>
  );
}

export function AdminEventsTab({ onDataChanged }: AdminEventsTabProps) {
  const [events, setEvents] = useState<EventWithVenue[] | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [ticketSummaries, setTicketSummaries] = useState<Record<number, EventTicketSummary>>({});
  const [error, setError] = useState<unknown>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [filter, setFilter] = useState<EventFilter>('ALL');
  const [statusDrafts, setStatusDrafts] = useState<Record<number, EventStatus>>({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithVenue | null>(null);
  const [ticketsEvent, setTicketsEvent] = useState<EventWithVenue | null>(null);

  const [pendingStatusChange, setPendingStatusChange] = useState<{
    event: EventWithVenue;
    nextStatus: EventStatus;
  } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusChangeError, setStatusChangeError] = useState<unknown>(null);

  const loadEventsData = useCallback(async (signal?: AbortSignal) => {
    const [allEvents, allVenues, summaries] = await Promise.all([
      fetchAllEvents(signal),
      fetchAllVenues(signal),
      fetchTicketSummariesByEvent(signal),
    ]);
    setEvents(allEvents);
    setVenues(allVenues);
    setTicketSummaries(summaries);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    loadEventsData(controller.signal).catch((e) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e);
    });

    return () => controller.abort();
  }, [loadEventsData]);

  const counts = useMemo(() => {
    const out: Record<EventFilter, number> = {
      ALL: 0,
      ACTIVE: 0,
      IN_PLANNING: 0,
      FINISHED: 0,
      CANCELLED: 0,
    };
    if (!events) return out;
    out.ALL = events.length;
    for (const ev of events) {
      out[ev.status] += 1;
    }
    return out;
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (filter === 'ALL') return events;
    return events.filter((ev) => ev.status === filter);
  }, [events, filter]);

  const openCreateModal = () => {
    setSuccessMessage(null);
    setError(null);
    setEditingEvent(null);
    setFormOpen(true);
  };

  const openEditModal = (event: EventWithVenue) => {
    setSuccessMessage(null);
    setError(null);
    setEditingEvent(event);
    setFormOpen(true);
  };

  const closeFormModal = useCallback(() => {
    setFormOpen(false);
    setEditingEvent(null);
  }, []);

  const closeTicketsModal = useCallback(() => {
    setTicketsEvent(null);
  }, []);

  const handleEventSaved = async (saved: EventWithVenue, isEdit: boolean) => {
    setFormOpen(false);
    setEditingEvent(null);
    setSuccessMessage(
      isEdit
        ? `Event "${saved.name}" has been updated.`
        : `Event "${saved.name}" has been created.`,
    );
    try {
      await loadEventsData();
    } catch (e) {
      setError(e);
    }
    onDataChanged?.();
  };

  const openStatusConfirmDialog = (event: EventWithVenue) => {
    const nextStatus = statusDrafts[event.id] ?? event.status;
    if (nextStatus === event.status || updatingStatus) return;

    setStatusChangeError(null);
    setSuccessMessage(null);
    setPendingStatusChange({ event, nextStatus });
  };

  const closeStatusConfirmDialog = useCallback(() => {
    if (updatingStatus) return;
    setPendingStatusChange(null);
    setStatusChangeError(null);
  }, [updatingStatus]);

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusChange || updatingStatus) return;
    setUpdatingStatus(true);
    setStatusChangeError(null);

    try {
      const { event, nextStatus } = pendingStatusChange;
      await updateEventStatus(event.id, nextStatus);
      setPendingStatusChange(null);
      setStatusDrafts((prev) => {
        const next = { ...prev };
        delete next[event.id];
        return next;
      });
      setSuccessMessage(`Status of "${event.name}" updated to ${EVENT_STATUS_LABELS[nextStatus]}.`);
      await loadEventsData();
      onDataChanged?.();
    } catch (e) {
      setStatusChangeError(e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTicketsChanged = async () => {
    try {
      await loadEventsData();
    } catch (e) {
      setError(e);
    }
    onDataChanged?.();
  };

  return (
    <section aria-label="Manage events">
      <div className="admin-toolbar">
        <div className="filter-tabs" role="group" aria-label="Filter events by status">
          {EVENT_FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`filter-tab${filter === tab.key ? ' filter-tab--active' : ''}`}
              aria-pressed={filter === tab.key}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>

        <button type="button" className="btn" onClick={openCreateModal}>
          + Create event
        </button>
      </div>

      <ErrorMessage error={error} />

      {successMessage && (
        <div className="alert alert--success" role="status" aria-live="polite">
          <p className="alert__title">{successMessage}</p>
        </div>
      )}

      {!events && !error && <p className="muted">Loading events…</p>}

      {events && filteredEvents.length === 0 && (
        <div className="card">
          <p className="muted">No events match the selected status filter.</p>
        </div>
      )}

      {filteredEvents.length > 0 && (
        <div className="admin-list">
          {filteredEvents.map((event) => (
            <AdminEventCard
              key={event.id}
              event={event}
              summary={ticketSummaries[event.id]}
              selectedStatus={statusDrafts[event.id] ?? event.status}
              updatingThisStatus={updatingStatus && pendingStatusChange?.event.id === event.id}
              updatingStatus={updatingStatus}
              onDraftStatusChange={(nextStatus) =>
                setStatusDrafts((prev) => ({ ...prev, [event.id]: nextStatus }))
              }
              onConfirmStatusOpen={() => openStatusConfirmDialog(event)}
              onEditTickets={() => setTicketsEvent(event)}
              onEditEvent={() => openEditModal(event)}
            />
          ))}
        </div>
      )}

      <EventFormModal
        open={formOpen}
        event={editingEvent}
        venues={venues}
        onClose={closeFormModal}
        onSaved={handleEventSaved}
      />

      <EventTicketsModal
        open={ticketsEvent !== null}
        event={ticketsEvent}
        onClose={closeTicketsModal}
        onChanged={handleTicketsChanged}
      />

      <ConfirmDialog
        open={pendingStatusChange !== null}
        title={
          pendingStatusChange?.nextStatus === 'CANCELLED' ? 'Cancel event?' : 'Change event status?'
        }
        description={
          pendingStatusChange
            ? getStatusChangeDescription(pendingStatusChange.event, pendingStatusChange.nextStatus)
            : ''
        }
        confirmLabel={
          updatingStatus
            ? 'Updating…'
            : pendingStatusChange?.nextStatus === 'CANCELLED'
              ? 'Cancel event'
              : 'Confirm change'
        }
        cancelLabel="Keep current status"
        confirmVariant={pendingStatusChange?.nextStatus === 'CANCELLED' ? 'danger' : 'primary'}
        busy={updatingStatus}
        error={statusChangeError}
        onConfirm={handleConfirmStatusChange}
        onCancel={closeStatusConfirmDialog}
      />
    </section>
  );
}
