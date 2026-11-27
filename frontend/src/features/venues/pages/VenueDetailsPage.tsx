import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { formatCapacity, formatDateRange } from '../../../shared/utils/format';
import { EventStatusBadge, fetchEventsByVenue, type EventItem } from '../../events';
import { fetchVenueById } from '../api/venues.api';
import type { Venue } from '../types';

export function VenueDetailsPage() {
  const { id } = useParams();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!id) {
      setVenue(null);
      setEvents([]);
      setError(new ApiError(404, 'VENUE_NOT_FOUND', 'Venue not found'));
      return;
    }

    const controller = new AbortController();
    setError(null);
    setVenue(null);

    Promise.all([fetchVenueById(id, controller.signal), fetchEventsByVenue(id, controller.signal)])
      .then(([venueData, venueEvents]) => {
        setVenue(venueData);
        setEvents(venueEvents);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e);
      });

    return () => controller.abort();
  }, [id]);

  return (
    <section>
      <Link to="/venues" className="back-link">
        ← Back to venues
      </Link>

      <ErrorMessage error={error} />

      {!venue && !error && <p className="muted">Loading venue…</p>}

      {venue && (
        <>
          <div className="detail-header">
            <h1>{venue.name}</h1>
          </div>

          <div className="detail-stack">
            <section className="card detail-section">
              <h2>Venue details</h2>
              <dl className="kv">
                <dt>Address</dt>
                <dd>{venue.address}</dd>
                <dt>Capacity</dt>
                <dd>{formatCapacity(venue.capacity)}</dd>
              </dl>
            </section>

            <section className="detail-section">
              <h2>Events at this venue</h2>
              {events.length === 0 ? (
                <div className="card">
                  <p className="muted">No events are scheduled at this venue yet.</p>
                </div>
              ) : (
                <div className="venue-events-list">
                  {events.map((event) => (
                    <article key={event.id} className="card venue-event-item">
                      <div className="entity-card__head">
                        <h3 className="entity-card__title">
                          <Link to={`/events/${event.id}`}>{event.name}</Link>
                        </h3>
                        <EventStatusBadge status={event.status} />
                      </div>
                      <p className="venue-event-item__meta">
                        {formatDateRange(event.startTimestamp, event.endTimestamp)} ·{' '}
                        {event.organisator}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
