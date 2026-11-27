import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { AnalyticsIcon } from '../../../shared/components/Icons';
import { formatDateRange, formatDateTime, formatNumber } from '../../../shared/utils/format';
import {
  EVENT_FILTER_TABS,
  EventStatusBadge,
  parseEventStatusFilter,
  type EventFilter,
  type EventStatus,
} from '../../events';
import { fetchEventAnalytics } from '../api/analytics.api';
import type { EventAnalyticsItem } from '../types';

type SortKey = 'newest' | 'registrations' | 'activity';

const ROW_STATUS_CLASS: Record<EventStatus, string> = {
  ACTIVE: 'analytics-table__row--active',
  IN_PLANNING: 'analytics-table__row--planning',
  FINISHED: 'analytics-table__row--finished',
  CANCELLED: 'analytics-table__row--cancelled',
};

function parseDateParam(raw: string | null): string {
  if (!raw) return '';
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
}

function fromDateToIso(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function toDateToIso(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

export function AnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseEventStatusFilter(searchParams.get('status'));
  const from = parseDateParam(searchParams.get('from'));
  const to = parseDateParam(searchParams.get('to'));

  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [items, setItems] = useState<EventAnalyticsItem[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    setItems(null);

    fetchEventAnalytics(
      {
        status: status === 'ALL' ? undefined : status,
        from: fromDateToIso(from),
        to: toDateToIso(to),
      },
      controller.signal,
    )
      .then((res) => setItems(res))
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e);
      });

    return () => controller.abort();
  }, [status, from, to]);

  const updateFilterParams = (next: { status?: EventFilter; from?: string; to?: string }) => {
    const resolvedStatus = next.status ?? status;
    const resolvedFrom = next.from ?? from;
    const resolvedTo = next.to ?? to;

    const params: Record<string, string> = {};
    if (resolvedStatus !== 'ALL') params.status = resolvedStatus;
    if (resolvedFrom) params.from = resolvedFrom;
    if (resolvedTo) params.to = resolvedTo;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const hasFilters = status !== 'ALL' || from !== '' || to !== '';

  const summary = useMemo(() => {
    if (!items) return null;
    let totalRegistrations = 0;
    let activeCount = 0;
    let cancelledCount = 0;

    for (const item of items) {
      totalRegistrations += item.registrationsCount;
      if (item.event.status === 'ACTIVE') activeCount += 1;
      if (item.isCancelled) cancelledCount += 1;
    }

    return {
      eventsCount: items.length,
      totalRegistrations,
      activeCount,
      cancelledCount,
    };
  }, [items]);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    const copy = items.slice();
    if (sortBy === 'registrations') {
      return copy.sort(
        (a, b) =>
          b.registrationsCount - a.registrationsCount ||
          Date.parse(b.event.startsAt) - Date.parse(a.event.startsAt),
      );
    }
    if (sortBy === 'activity') {
      return copy.sort((a, b) => {
        const aMs = a.lastActivityAt ? Date.parse(a.lastActivityAt) : -Infinity;
        const bMs = b.lastActivityAt ? Date.parse(b.lastActivityAt) : -Infinity;
        if (bMs !== aMs) return bMs - aMs;
        return Date.parse(b.event.startsAt) - Date.parse(a.event.startsAt);
      });
    }
    return copy;
  }, [items, sortBy]);

  return (
    <section>
      <div className="page-header">
        <h1 className="page-header__title">
          <AnalyticsIcon size={26} />
          <span>Event analytics</span>
        </h1>
        <p className="muted">
          Track attendance statistics, cancellation flags, and recent activity across events.
        </p>
      </div>

      <div className="analytics-stats" aria-label="Analytics summary">
        <div className="card stat-card">
          <span className="stat-card__label">Events</span>
          <span className="stat-card__value">
            {summary ? formatNumber(summary.eventsCount) : '—'}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-card__label">Total registrations</span>
          <span className="stat-card__value">
            {summary ? formatNumber(summary.totalRegistrations) : '—'}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-card__label">Active events</span>
          <span className="stat-card__value">
            {summary ? formatNumber(summary.activeCount) : '—'}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-card__label">Cancelled events</span>
          <span className="stat-card__value">
            {summary ? formatNumber(summary.cancelledCount) : '—'}
          </span>
        </div>
      </div>

      <div className="card analytics-filters">
        <div className="filter-tabs" role="group" aria-label="Filter analytics by event status">
          {EVENT_FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`filter-tab${status === tab.key ? ' filter-tab--active' : ''}`}
              aria-pressed={status === tab.key}
              onClick={() => updateFilterParams({ status: tab.key })}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="analytics-filters__controls">
          <label className="analytics-filter-field">
            <span>From</span>
            <input
              type="date"
              className="filter-select"
              value={from}
              onChange={(e) => updateFilterParams({ from: e.target.value })}
            />
          </label>
          <label className="analytics-filter-field">
            <span>To</span>
            <input
              type="date"
              className="filter-select"
              value={to}
              onChange={(e) => updateFilterParams({ to: e.target.value })}
            />
          </label>
          <label className="analytics-filter-field">
            <span>Sort by</span>
            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
            >
              <option value="newest">Newest events first</option>
              <option value="registrations">Most registrations</option>
              <option value="activity">Latest activity</option>
            </select>
          </label>
          {hasFilters && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      </div>

      <ErrorMessage error={error} />

      {!items && !error && <p className="muted">Loading analytics…</p>}

      {items && sortedItems.length === 0 && (
        <div className="card analytics-empty">
          <p className="muted">No events match the selected filters.</p>
          {hasFilters && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {items && sortedItems.length > 0 && (
        <div className="card analytics-table-card">
          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th scope="col">Event</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="analytics-table__num-col">
                    Registrations
                  </th>
                  <th scope="col">Cancelled</th>
                  <th scope="col">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item) => (
                  <tr
                    key={item.event.id}
                    className={
                      item.isCancelled
                        ? ROW_STATUS_CLASS.CANCELLED
                        : ROW_STATUS_CLASS[item.event.status]
                    }
                  >
                    <td>
                      <Link to={`/events/${item.event.id}`} className="analytics-table__event-link">
                        {item.event.title}
                      </Link>
                      <div className="analytics-table__sub">
                        {formatDateRange(item.event.startsAt, item.event.endsAt)}
                      </div>
                    </td>
                    <td>
                      <EventStatusBadge status={item.event.status} />
                    </td>
                    <td className="analytics-table__num">
                      {formatNumber(item.registrationsCount)}
                    </td>
                    <td>
                      {item.isCancelled ? (
                        <span className="badge badge--cancelled">Yes</span>
                      ) : (
                        <span className="muted">No</span>
                      )}
                    </td>
                    <td>
                      {item.lastActivityAt ? (
                        formatDateTime(item.lastActivityAt)
                      ) : (
                        <span className="muted">No activity yet</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
