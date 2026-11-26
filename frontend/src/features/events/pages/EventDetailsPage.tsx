import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { formatDateTime } from '../../../shared/utils/format';
import { fetchEventById } from '../api/events.api';
import { EventStatusBadge } from '../components/EventStatusBadge';
import type { EventWithVenue } from '../types';
import { EventRegistrationPanel } from '../../registrations';

export function EventDetailsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventWithVenue | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const numId = Number(id);
    if (!id || !Number.isInteger(numId) || numId <= 0) {
      setEvent(null);
      setError(new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found'));
      return;
    }

    const controller = new AbortController();
    setError(null);
    setEvent(null);

    fetchEventById(numId, controller.signal)
      .then((res) => setEvent(res))
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setError(e);
      });

    return () => controller.abort();
  }, [id]);

  return (
    <section>
      <Link to="/events" className="back-link">
        ← Back to events
      </Link>

      <ErrorMessage error={error} />

      {!event && !error && <p className="muted">Loading event…</p>}

      {event && (
        <>
          <div className="detail-header">
            <h1>{event.name}</h1>
            <EventStatusBadge status={event.status} />
          </div>

          <div className="detail-layout">
            <div className="detail-stack">
              <section className="card detail-section">
                <h2>About this event</h2>
                <p className="detail-description">{event.description}</p>
              </section>

              <EventRegistrationPanel eventId={event.id} eventStatus={event.status} />

              <section className="card detail-section">
                <h2>Schedule &amp; organizer</h2>
                <dl className="kv">
                  <dt>Starts</dt>
                  <dd>{formatDateTime(event.startTimestamp)}</dd>
                  <dt>Ends</dt>
                  <dd>{formatDateTime(event.endTimestamp)}</dd>
                  <dt>Organizer</dt>
                  <dd>{event.organisator}</dd>
                  <dt>Status</dt>
                  <dd>
                    <EventStatusBadge status={event.status} />
                  </dd>
                </dl>
              </section>
            </div>

            <aside>
              <section className="card detail-section">
                <h2>Venue</h2>
                {event.venue ? (
                  <>
                    <dl className="kv">
                      <dt>Name</dt>
                      <dd>
                        <Link to={`/venues/${event.venue.id}`}>{event.venue.name}</Link>
                      </dd>
                      <dt>Address</dt>
                      <dd>{event.venue.address}</dd>
                      <dt>Capacity</dt>
                      <dd>
                        {event.venue.capacity !== null
                          ? `${event.venue.capacity} people`
                          : 'Not specified'}
                      </dd>
                    </dl>
                    <div className="detail-actions">
                      <Link to={`/venues/${event.venue.id}`} className="btn">
                        View venue details
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="muted">Venue details are unavailable.</p>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
    </section>
  );
}
