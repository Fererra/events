import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { formatDateTime, formatPrice } from '../../../shared/utils/format';
import { useIsAuthed } from '../../auth/store/auth.store';
import type { EventStatus } from '../../events';
import { fetchEventTickets, registerForEvent } from '../api/registrations.api';
import type { EventRegistration, TicketType } from '../types';

interface Props {
  eventId: number;
  eventStatus: EventStatus;
}

interface RegistrationConfirmation {
  registration: EventRegistration;
  ticketType: string;
  price: number;
}

function getClosedNotice(status: EventStatus): string | null {
  switch (status) {
    case 'IN_PLANNING':
    case 'DRAFT':
      return 'Registration is not open yet while this event is still in preparation.';
    case 'FINISHED':
      return 'This event has already finished, so registration is closed.';
    case 'CANCELLED':
      return 'This event has been cancelled, so registration is closed.';
    default:
      return null;
  }
}

function pickInitialTicketId(tickets: TicketType[], queryTicket: string | null): number | null {
  if (tickets.length === 0) return null;
  if (queryTicket) {
    const parsed = Number(queryTicket);
    if (Number.isInteger(parsed) && tickets.some((t) => t.id === parsed)) {
      return parsed;
    }
  }
  const available = tickets.find((t) => t.remaining > 0);
  return (available ?? tickets[0]).id;
}

export function EventRegistrationPanel({ eventId, eventStatus }: Props) {
  const isAuthed = useIsAuthed();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryTicket = searchParams.get('ticket');

  const [tickets, setTickets] = useState<TicketType[] | null>(null);
  const [ticketsError, setTicketsError] = useState<unknown>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [lastRegistration, setLastRegistration] = useState<RegistrationConfirmation | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setTickets(null);
    setTicketsError(null);
    setSelectedTicketId(null);
    setSubmitError(null);
    setLastRegistration(null);

    fetchEventTickets(eventId, controller.signal)
      .then((loaded) => {
        setTickets(loaded);
        setSelectedTicketId(pickInitialTicketId(loaded, queryTicket));
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setTicketsError(e);
      });

    return () => controller.abort();
  }, [eventId, queryTicket]);

  const isOpen = eventStatus === 'ACTIVE';
  const closedNotice = getClosedNotice(eventStatus);

  const buildLoginReturnPath = (): string => {
    const params = new URLSearchParams(location.search);
    if (selectedTicketId !== null) {
      params.set('ticket', String(selectedTicketId));
    }
    const qs = params.toString();
    return `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
  };

  const refreshTickets = async () => {
    try {
      const updated = await fetchEventTickets(eventId);
      setTickets(updated);
    } catch {
      // Keep existing ticket list if background refresh fails
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isOpen || selectedTicketId === null) return;

    if (!isAuthed) {
      navigate('/login', { state: { from: buildLoginReturnPath() } });
      return;
    }

    if (submitting) return;
    const chosenTicket = tickets?.find((t) => t.id === selectedTicketId) ?? null;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const registration = await registerForEvent(eventId, selectedTicketId);
      setLastRegistration({
        registration,
        ticketType: chosenTicket?.type ?? 'Ticket',
        price: chosenTicket?.price ?? 0,
      });
      await refreshTickets();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        navigate('/login', { state: { from: buildLoginReturnPath() } });
        return;
      }
      setSubmitError(err);
      if (err instanceof ApiError && err.code === 'TICKETS_SOLD_OUT') {
        await refreshTickets();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card detail-section">
      <h2>Tickets &amp; registration</h2>

      <ErrorMessage error={ticketsError} />

      {!tickets && !ticketsError && <p className="muted">Loading ticket types…</p>}

      {tickets && tickets.length === 0 && (
        <p className="muted">No ticket types are configured for this event yet.</p>
      )}

      {tickets && tickets.length > 0 && (
        <>
          {closedNotice && (
            <p className="ticket-notice" role="status">
              {closedNotice}
            </p>
          )}

          {lastRegistration && (
            <div className="alert alert--success registration-summary" role="status" aria-live="polite">
              <p className="alert__title">Registration confirmed</p>
              <dl className="kv registration-summary__details">
                <dt>Ticket type</dt>
                <dd>
                  {lastRegistration.ticketType} ({formatPrice(lastRegistration.price)})
                </dd>
                <dt>Registered at</dt>
                <dd>{formatDateTime(lastRegistration.registration.registrationTimestamp)}</dd>
                <dt>Confirmation ID</dt>
                <dd className="registration-summary__id">{lastRegistration.registration.id}</dd>
              </dl>
              <p className="registration-summary__link">
                <Link to="/profile">View in my registrations</Link>
              </p>
            </div>
          )}

          {isOpen ? (
            <form onSubmit={handleSubmit}>
              <fieldset className="ticket-fieldset">
                <legend className="sr-only">Choose a ticket type</legend>
                <div className="ticket-list">
                  {tickets.map((ticket) => {
                    const selected = selectedTicketId === ticket.id;
                    const soldOut = ticket.remaining <= 0;
                    const lowStock = ticket.remaining > 0 && ticket.remaining <= 5;
                    const optionClasses = [
                      'ticket-option',
                      selected ? 'ticket-option--selected' : '',
                      soldOut ? 'ticket-option--sold-out' : '',
                    ]
                      .filter(Boolean)
                      .join(' ');

                    return (
                      <label key={ticket.id} className={optionClasses}>
                        <input
                          type="radio"
                          name="ticketType"
                          value={ticket.id}
                          checked={selected}
                          onChange={() => {
                            setSelectedTicketId(ticket.id);
                            setSubmitError(null);
                          }}
                          className="ticket-option__radio"
                        />
                        <div className="ticket-option__body">
                          <div className="ticket-option__head">
                            <span className="ticket-option__name">{ticket.type}</span>
                            {soldOut && <span className="badge badge--cancelled">Sold out</span>}
                            {lowStock && (
                              <span className="badge badge--warning">
                                Only {ticket.remaining} left
                              </span>
                            )}
                          </div>
                          <p className="ticket-option__meta">
                            {ticket.remaining} of {ticket.limit} left
                          </p>
                        </div>
                        <span className="ticket-option__price">{formatPrice(ticket.price)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="ticket-actions">
                <ErrorMessage error={submitError} />
                <div className="ticket-actions__row">
                  <button
                    type="submit"
                    className="btn ticket-submit"
                    disabled={submitting || selectedTicketId === null}
                  >
                    {submitting ? 'Registering…' : 'Register for event'}
                  </button>
                  {!isAuthed && (
                    <span className="muted ticket-actions__hint">
                      Sign in is required to complete registration.
                    </span>
                  )}
                </div>
              </div>
            </form>
          ) : (
            <div className="ticket-list">
              {tickets.map((ticket) => {
                const soldOut = ticket.remaining <= 0;
                return (
                  <div
                    key={ticket.id}
                    className={`ticket-option ticket-option--readonly${soldOut ? ' ticket-option--sold-out' : ''}`}
                  >
                    <div className="ticket-option__body">
                      <div className="ticket-option__head">
                        <span className="ticket-option__name">{ticket.type}</span>
                        {soldOut && <span className="badge badge--cancelled">Sold out</span>}
                      </div>
                      <p className="ticket-option__meta">
                        {ticket.remaining} of {ticket.limit} left
                      </p>
                    </div>
                    <span className="ticket-option__price">{formatPrice(ticket.price)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
