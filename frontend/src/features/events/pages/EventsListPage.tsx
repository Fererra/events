import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { PaginatedResponse } from '../../../shared/api/types';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { Pagination, parsePageParam } from '../../../shared/components/Pagination';
import { formatDateRange } from '../../../shared/utils/format';
import { fetchEvents } from '../api/events.api';
import { EventStatusBadge } from '../components/EventStatusBadge';
import type { EventWithVenue } from '../types';

const PAGE_LIMIT = 6;

export function EventsListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get('page'));

  const [data, setData] = useState<PaginatedResponse<EventWithVenue> | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    fetchEvents({ page, limit: PAGE_LIMIT }, controller.signal)
      .then((res) => setData(res))
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e);
      });

    return () => controller.abort();
  }, [page]);

  const handlePageChange = (nextPage: number) => {
    setSearchParams(nextPage <= 1 ? {} : { page: String(nextPage) });
    window.scrollTo({ top: 0 });
  };

  return (
    <section>
      <div className="page-header">
        <h1>Events</h1>
        <p className="muted">Browse upcoming and past events across our venues.</p>
      </div>

      <ErrorMessage error={error} />

      {!data && !error && <p className="muted">Loading events…</p>}

      {data && data.items.length === 0 && (
        <div className="card">
          <p className="muted">No events are available yet.</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="entity-grid">
            {data.items.map((event) => (
              <article key={event.id} className="card entity-card">
                <div className="entity-card__head">
                  <h2 className="entity-card__title">
                    <Link to={`/events/${event.id}`}>{event.name}</Link>
                  </h2>
                  <EventStatusBadge status={event.status} />
                </div>

                <dl className="entity-card__meta">
                  <div>
                    <dt>When</dt>
                    <dd>{formatDateRange(event.startTimestamp, event.endTimestamp)}</dd>
                  </div>
                  <div>
                    <dt>Venue</dt>
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
                    <dt>Organizer</dt>
                    <dd>{event.organisator}</dd>
                  </div>
                </dl>

                <p className="entity-card__desc">{event.description}</p>

                <div className="entity-card__footer">
                  <Link to={`/events/${event.id}`} className="btn btn--ghost">
                    View details
                  </Link>
                </div>
              </article>
            ))}
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
