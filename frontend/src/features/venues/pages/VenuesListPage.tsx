import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { MapPinIcon } from '../../../shared/components/Icons';
import { Pagination, parsePageParam } from '../../../shared/components/Pagination';
import type { PaginatedResponse } from '../../../shared/api/types';
import { formatCapacity } from '../../../shared/utils/format';
import { fetchEventCountsByVenue } from '../../events';
import { fetchVenues } from '../api/venues.api';
import type { Venue } from '../types';

const PAGE_LIMIT = 6;

export function VenuesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams.get('page'));

  const [data, setData] = useState<PaginatedResponse<Venue> | null>(null);
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);

    Promise.all([
      fetchVenues({ page, limit: PAGE_LIMIT }, controller.signal),
      fetchEventCountsByVenue(controller.signal),
    ])
      .then(([venuesPage, counts]) => {
        setData(venuesPage);
        setEventCounts(counts);
      })
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
        <h1 className="page-header__title">
          <MapPinIcon size={26} />
          <span>Venues</span>
        </h1>
        <p className="muted">Explore campus and partner locations hosting upcoming events.</p>
      </div>

      <ErrorMessage error={error} />

      {!data && !error && <p className="muted">Loading venues…</p>}

      {data && data.items.length === 0 && (
        <div className="card">
          <p className="muted">No venues are available yet.</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <>
          <div className="entity-grid">
            {data.items.map((venue) => {
              const count = eventCounts[venue.id] ?? 0;
              return (
                <article key={venue.id} className="card entity-card">
                  <div className="entity-card__head">
                    <h2 className="entity-card__title">
                      <Link to={`/venues/${venue.id}`}>{venue.name}</Link>
                    </h2>
                    <span className="badge badge--neutral">
                      {count} {count === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  <dl className="entity-card__meta">
                    <div>
                      <dt>Address</dt>
                      <dd>{venue.address}</dd>
                    </div>
                    <div>
                      <dt>Capacity</dt>
                      <dd>{formatCapacity(venue.capacity, 'Capacity not specified')}</dd>
                    </div>
                  </dl>

                  <div className="entity-card__footer">
                    <Link to={`/venues/${venue.id}`} className="btn btn--ghost">
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
            itemLabel="venues"
            onPageChange={handlePageChange}
          />
        </>
      )}
    </section>
  );
}
