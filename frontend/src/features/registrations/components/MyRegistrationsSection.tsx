import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { ClockIcon, TicketIcon } from '../../../shared/components/Icons';
import { formatDateRange, formatDateTime, formatPrice } from '../../../shared/utils/format';
import { cancelRegistration, fetchMyRegistrations } from '../api/registrations.api';
import type { MyRegistration } from '../types';

type DisplayStatus = 'ACTIVE' | 'FINISHED' | 'CANCELLED';
type FilterKey = 'ALL' | DisplayStatus;

interface StatusCounts {
  total: number;
  active: number;
  finished: number;
  cancelled: number;
}

const STATUS_BADGE: Record<DisplayStatus, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'badge badge--active' },
  FINISHED: { label: 'Finished', className: 'badge badge--finished' },
  CANCELLED: { label: 'Cancelled', className: 'badge badge--cancelled' },
};

const EMPTY_FILTER_MESSAGE: Record<Exclude<FilterKey, 'ALL'>, string> = {
  ACTIVE: 'No active registrations.',
  FINISHED: 'No finished event registrations.',
  CANCELLED: 'No cancelled registrations.',
};

function getDisplayStatus(reg: MyRegistration): DisplayStatus {
  if (reg.status === 'CANCELLED') return 'CANCELLED';
  if (reg.event.status === 'FINISHED') return 'FINISHED';
  const endsAtMs = Date.parse(reg.event.endsAt);
  if (!Number.isNaN(endsAtMs) && endsAtMs < Date.now()) return 'FINISHED';
  return 'ACTIVE';
}

function compareByEventDateAsc(a: MyRegistration, b: MyRegistration): number {
  return (
    Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt) ||
    Date.parse(a.registeredAt) - Date.parse(b.registeredAt)
  );
}

function computeCounts(items: MyRegistration[]): StatusCounts {
  let active = 0;
  let finished = 0;
  let cancelled = 0;
  for (const item of items) {
    const status = getDisplayStatus(item);
    if (status === 'ACTIVE') active += 1;
    else if (status === 'FINISHED') finished += 1;
    else cancelled += 1;
  }
  return { total: items.length, active, finished, cancelled };
}

export function MyRegistrationsSection() {
  const [registrations, setRegistrations] = useState<MyRegistration[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<FilterKey>('ACTIVE');
  const [pendingCancel, setPendingCancel] = useState<MyRegistration | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<unknown>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    fetchMyRegistrations(controller.signal)
      .then((items) => setRegistrations(items))
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e);
      });

    return () => controller.abort();
  }, []);

  const sortedRegistrations = useMemo(
    () => (registrations ? registrations.slice().sort(compareByEventDateAsc) : null),
    [registrations],
  );

  const counts = useMemo(
    () => (sortedRegistrations ? computeCounts(sortedRegistrations) : null),
    [sortedRegistrations],
  );

  const filteredRegistrations = useMemo(() => {
    if (!sortedRegistrations) return [];
    if (filter === 'ALL') return sortedRegistrations;
    return sortedRegistrations.filter((item) => getDisplayStatus(item) === filter);
  }, [sortedRegistrations, filter]);

  const openCancelDialog = (registration: MyRegistration) => {
    setCancelError(null);
    setSuccessMessage(null);
    setPendingCancel(registration);
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
      const updated = await fetchMyRegistrations();
      setRegistrations(updated);
      setSuccessMessage(`Registration for "${target.event.title}" has been cancelled.`);
      setPendingCancel(null);
    } catch (e) {
      setCancelError(e);
    } finally {
      setCancelling(false);
    }
  };

  const tabs: { key: FilterKey; label: string; count: number }[] = counts
    ? [
        { key: 'ACTIVE', label: 'Active', count: counts.active },
        { key: 'FINISHED', label: 'Finished', count: counts.finished },
        { key: 'CANCELLED', label: 'Cancelled', count: counts.cancelled },
        { key: 'ALL', label: 'All', count: counts.total },
      ]
    : [];

  return (
    <section className="registrations-panel" aria-labelledby="my-registrations-heading">
      <div className="registrations-panel__head">
        <h2 id="my-registrations-heading">My registrations</h2>
        {tabs.length > 0 && (
          <div className="filter-tabs" role="group" aria-label="Filter registrations by status">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`filter-tab${filter === tab.key ? ' filter-tab--active' : ''}`}
                aria-pressed={filter === tab.key}
                onClick={() => setFilter(tab.key)}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        )}
      </div>

      <ErrorMessage error={error} />

      {successMessage && (
        <div className="alert alert--success" role="status" aria-live="polite">
          <p className="alert__title">{successMessage}</p>
        </div>
      )}

      {!sortedRegistrations && !error && <p className="muted">Loading registrations…</p>}

      {sortedRegistrations && sortedRegistrations.length === 0 && (
        <div className="card registration-empty">
          <p className="muted">You have not registered for any events yet.</p>
          <Link to="/events" className="btn">
            Browse events
          </Link>
        </div>
      )}

      {sortedRegistrations &&
        sortedRegistrations.length > 0 &&
        filteredRegistrations.length === 0 &&
        filter !== 'ALL' && (
          <div className="card registration-empty">
            <p className="muted">{EMPTY_FILTER_MESSAGE[filter]}</p>
          </div>
        )}

      {filteredRegistrations.length > 0 && (
        <div className="registration-list">
          {filteredRegistrations.map((reg) => {
            const displayStatus = getDisplayStatus(reg);
            const badge = STATUS_BADGE[displayStatus];
            const isMuted = displayStatus !== 'ACTIVE';
            return (
              <article
                key={reg.id}
                className={`card registration-card${isMuted ? ' registration-card--muted' : ''}`}
              >
                <div className="registration-card__head">
                  <h3 className="registration-card__title">
                    <Link to={`/events/${reg.event.id}`}>{reg.event.title}</Link>
                  </h3>
                  <span className={badge.className}>{badge.label}</span>
                </div>

                <dl className="registration-card__meta">
                  <div>
                    <dt aria-label="Event date and time">
                      <ClockIcon size={16} />
                    </dt>
                    <dd>{formatDateRange(reg.event.startsAt, reg.event.endsAt)}</dd>
                  </div>
                  <div>
                    <dt aria-label="Ticket type and price">
                      <TicketIcon size={16} />
                    </dt>
                    <dd>
                      {reg.ticket.type} · {formatPrice(reg.ticket.price)}
                    </dd>
                  </div>
                </dl>

                <p className="registration-card__registered">
                  Registered on {formatDateTime(reg.registeredAt)}
                </p>

                <div className="registration-card__footer">
                  <Link to={`/events/${reg.event.id}`} className="btn btn--ghost btn--sm">
                    View event
                  </Link>
                  {displayStatus === 'ACTIVE' && (
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
        title="Cancel registration?"
        description={
          pendingCancel
            ? `Are you sure you want to cancel your "${pendingCancel.ticket.type}" ticket for "${pendingCancel.event.title}"? This action cannot be undone.`
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
