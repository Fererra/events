import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { formatDateRange, formatDateTime, formatPrice } from '../../../shared/utils/format';
import { EventStatusBadge, fetchAllEvents, type EventWithVenue } from '../../events';
import {
  cancelRegistration,
  fetchAllRegistrations,
  type AdminRegistration,
  type RegistrationStatus,
} from '../../registrations';

type RegStatusFilter = 'ALL' | RegistrationStatus;

interface AdminRegistrationsTabProps {
  onDataChanged?: () => void;
}

export function AdminRegistrationsTab({ onDataChanged }: AdminRegistrationsTabProps) {
  const [registrations, setRegistrations] = useState<AdminRegistration[] | null>(null);
  const [events, setEvents] = useState<EventWithVenue[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<RegStatusFilter>('ACTIVE');
  const [eventFilter, setEventFilter] = useState<string>('ALL');

  const [pendingCancel, setPendingCancel] = useState<AdminRegistration | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<unknown>(null);

  const loadData = useCallback(async (signal?: AbortSignal) => {
    const [allRegs, allEvents] = await Promise.all([
      fetchAllRegistrations(signal),
      fetchAllEvents(signal),
    ]);
    setRegistrations(allRegs);
    setEvents(allEvents);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    loadData(controller.signal).catch((e) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e);
    });

    return () => controller.abort();
  }, [loadData]);

  const counts = useMemo(() => {
    const out = { ALL: 0, ACTIVE: 0, CANCELLED: 0 };
    if (!registrations) return out;
    const byEvent =
      eventFilter === 'ALL'
        ? registrations
        : registrations.filter((r) => r.event.id === eventFilter);
    out.ALL = byEvent.length;
    for (const reg of byEvent) {
      out[reg.status] += 1;
    }
    return out;
  }, [registrations, eventFilter]);

  const filteredRegistrations = useMemo(() => {
    if (!registrations) return [];
    return registrations.filter((reg) => {
      if (eventFilter !== 'ALL' && reg.event.id !== eventFilter) return false;
      if (statusFilter !== 'ALL' && reg.status !== statusFilter) return false;
      return true;
    });
  }, [registrations, eventFilter, statusFilter]);

  const openCancelDialog = (reg: AdminRegistration) => {
    setCancelError(null);
    setSuccessMessage(null);
    setPendingCancel(reg);
  };

  const closeCancelDialog = useCallback(() => {
    if (cancelling) return;
    setPendingCancel(null);
    setCancelError(null);
  }, [cancelling]);

  const handleConfirmCancel = async () => {
    if (!pendingCancel || cancelling) return;
    setCancelling(true);
    setCancelError(null);

    try {
      const target = pendingCancel;
      await cancelRegistration(target.id);
      setPendingCancel(null);
      setSuccessMessage(
        `Registration for ${target.user.fullName} on "${target.event.title}" has been cancelled.`,
      );
      await loadData();
      onDataChanged?.();
    } catch (e) {
      setCancelError(e);
    } finally {
      setCancelling(false);
    }
  };

  const statusTabs: { key: RegStatusFilter; label: string }[] = [
    { key: 'ACTIVE', label: 'Active' },
    { key: 'CANCELLED', label: 'Cancelled' },
    { key: 'ALL', label: 'All' },
  ];

  return (
    <section aria-label="Manage user registrations">
      <div className="admin-toolbar">
        <div className="admin-toolbar__filters">
          <div className="filter-tabs" role="group" aria-label="Filter registrations by status">
            {statusTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`filter-tab${statusFilter === tab.key ? ' filter-tab--active' : ''}`}
                aria-pressed={statusFilter === tab.key}
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label} ({counts[tab.key]})
              </button>
            ))}
          </div>

          <label htmlFor="admin-reg-event-filter" className="sr-only">
            Filter by event
          </label>
          <select
            id="admin-reg-event-filter"
            className="filter-select"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="ALL">All events</option>
            {events.map((ev) => (
              <option key={ev.id} value={String(ev.id)}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ErrorMessage error={error} />

      {successMessage && (
        <div className="alert alert--success" role="status" aria-live="polite">
          <p className="alert__title">{successMessage}</p>
        </div>
      )}

      {!registrations && !error && <p className="muted">Loading registrations…</p>}

      {registrations && filteredRegistrations.length === 0 && (
        <div className="card">
          <p className="muted">No registrations match the selected filters.</p>
        </div>
      )}

      {filteredRegistrations.length > 0 && (
        <div className="admin-list">
          {filteredRegistrations.map((reg) => {
            const canCancel = reg.status === 'ACTIVE' && reg.event.status !== 'FINISHED';
            return (
              <article key={reg.id} className="card admin-item">
                <div className="admin-item__head">
                  <h2 className="admin-item__title">
                    <Link to={`/events/${reg.event.id}`}>{reg.event.title}</Link>
                  </h2>
                  <div className="admin-item__badges">
                    {reg.event.status && <EventStatusBadge status={reg.event.status} />}
                    <span
                      className={`badge ${reg.status === 'ACTIVE' ? 'badge--active' : 'badge--cancelled'}`}
                    >
                      {reg.status === 'ACTIVE' ? 'Registered' : 'Cancelled'}
                    </span>
                  </div>
                </div>

                <dl className="admin-item__meta">
                  <div>
                    <dt>Attendee</dt>
                    <dd>
                      {reg.user.fullName} ({reg.user.email})
                    </dd>
                  </div>
                  <div>
                    <dt>Ticket</dt>
                    <dd>
                      {reg.ticket.type} · {formatPrice(reg.ticket.price)}
                    </dd>
                  </div>
                  <div>
                    <dt>Event schedule</dt>
                    <dd>{formatDateRange(reg.event.startsAt, reg.event.endsAt)}</dd>
                  </div>
                  <div>
                    <dt>Registered at</dt>
                    <dd>{formatDateTime(reg.registeredAt)}</dd>
                  </div>
                </dl>

                <div className="admin-item__footer">
                  <Link to={`/events/${reg.event.id}`} className="btn btn--ghost btn--sm">
                    View event
                  </Link>
                  {canCancel && (
                    <button
                      type="button"
                      className="btn btn--danger-outline btn--sm"
                      onClick={() => openCancelDialog(reg)}
                    >
                      Cancel registration
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingCancel !== null}
        title="Cancel user registration?"
        description={
          pendingCancel
            ? `Cancel ${pendingCancel.user.fullName}'s "${pendingCancel.ticket.type}" registration for "${pendingCancel.event.title}"? This frees up the ticket slot.`
            : ''
        }
        confirmLabel={cancelling ? 'Cancelling…' : 'Cancel registration'}
        cancelLabel="Keep registration"
        busy={cancelling}
        error={cancelError}
        onConfirm={handleConfirmCancel}
        onCancel={closeCancelDialog}
      />
    </section>
  );
}
