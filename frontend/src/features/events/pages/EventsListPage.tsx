import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PaginatedResponse } from '../../../shared/api/types';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { ClockIcon, MapPinIcon, OrganizerIcon, TicketIcon } from '../../../shared/components/Icons';
import { Pagination, parsePageParam } from '../../../shared/components/Pagination';
import { formatDateRange } from '../../../shared/utils/format';
import { fetchEventCountsByStatus, fetchEvents } from '../api/events.api';
import { EventStatusBadge } from '../components/EventStatusBadge';
import {
  EVENT_FILTER_TABS,
  isTerminalEventStatus,
  parseEventStatusFilter,
  type EventFilter,
  type EventWithVenue,
} from '../types';

const PAGE_LIMIT = 6;

export function EventsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get('page'));
  const status = parseEventStatusFilter(searchParams.get('status'));

  const [data, setData] = useState<PaginatedResponse<EventWithVenue> | null>(null);
  const [counts, setCounts] = useState<Record<EventFilter, number> | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    Promise.all([
      fetchEvents(
        { page, limit: PAGE_LIMIT, status: status === 'ALL' ? undefined : status },
        controller.signal,
      ),
      fetchEventCountsByStatus(controller.signal),
    ])
      .then(([res, statusCounts]) => {
        setData(res);
        setCounts(statusCounts);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e);
      });

    return () => controller.abort();
  }, [page, status]);

  const handleStatusChange = (nextStatus: EventFilter) => {
    if (nextStatus === status) return;
    setSearchParams(nextStatus === 'ALL' ? {} : { status: nextStatus });
  };

  const handlePageChange = (nextPage: number) => {
    const nextParams: Record<string, string> = {};
    if (status !== 'ALL') nextParams.status = status;
    if (nextPage > 1) nextParams.page = String(nextPage);
    setSearchParams(nextParams);
    window.scrollTo({ top: 0 });
  };

  return (
    <section>
      <div className="page-header">
        <h1 className="page-header__title">
          <TicketIcon size={26} />
          <span>Events</span>
        </h1>
        <p className="muted">Browse upcoming and past events across our venues.</p>
      </div>

      <div className="events-filters">
        <div className="filter-tabs" role="group" aria-label="Filter events by status">
          {EVENT_FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`filter-tab${status === tab.key ? ' filter-tab--active' : ''}`}
              aria-pressed={status === tab.key}
              onClick={() => handleStatusChange(tab.key)}
            >
              {counts ? `${tab.label} (${counts[tab.key]})` : tab.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorMessage error={error} />

      {!data && !error && <p className="muted">Loading events…</p>}

      {data && data.items.length === 0 && (
        <div className="card">
          <p className="muted">
            {status === 'ALL'
              ? 'No events are available yet.'
              : 'No events match the selected status filter.'}
          </p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="entity-grid">
            {data.items.map((event) => {
              const isMuted = isTerminalEventStatus(event.status);
              return (
                <article
                  key={event.id}
                  className={`card entity-card${isMuted ? ' entity-card--muted' : ''}`}
                >
                  <div className="entity-card__head">
                    <h2 className="entity-card__title">
                      <Link to={`/events/${event.id}`}>{event.name}</Link>
                    </h2>
                    <EventStatusBadge status={event.status} />
                  </div>

                  <dl className="entity-card__meta entity-card__meta--icons">
                    <div>
                      <dt title="When">
                        <ClockIcon size={16} />
                        <span className="sr-only">When</span>
                      </dt>
                      <dd>{formatDateRange(event.startTimestamp, event.endTimestamp)}</dd>
                    </div>
                    <div>
                      <dt title="Venue">
                        <MapPinIcon size={16} />
                        <span className="sr-only">Venue</span>
                      </dt>
                      <dd>
                        {event.venue ? (
                          <>
                            <Link to={`/venues/${event.venue.id}`}>{event.venue.name}</Link>
                            <span className="entity-card__sub"> · {event.venue.address}</span>
                          </>
                        ) : (
                          'Venue unavailable'
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt title="Organizer">
                        <OrganizerIcon size={16} />
                        <span className="sr-only">Organizer</span>
                      </dt>
                      <dd>by {event.organisator}</dd>
                    </div>
                  </dl>

                  <p className="entity-card__desc">{event.description}</p>

                  <div className="entity-card__footer">
                    <Link to={`/events/${event.id}`} className="btn btn--ghost">
                      View details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            limit={data.limit}
            itemLabel="events"
            onPageChange={handlePageChange}
          />
        </>
      )}
    </section>
  );
}
