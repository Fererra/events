import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { fieldErrors } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { formatPrice } from '../../../shared/utils/format';
import { EventStatusBadge, type EventWithVenue } from '../../events';
import {
  createEventTicket,
  deleteEventTicket,
  fetchEventTickets,
  type TicketType,
} from '../../registrations';

interface EventTicketsModalProps {
  open: boolean;
  event: EventWithVenue | null;
  onClose: () => void;
  onChanged: () => void;
}

interface TicketFormValues {
  type: string;
  limit: string;
  price: string;
}

type TicketFieldErrors = Partial<Record<keyof TicketFormValues, string>>;

function validateTicketForm(values: TicketFormValues): TicketFieldErrors {
  const errors: TicketFieldErrors = {};
  const typeName = values.type.trim();

  if (!typeName) {
    errors.type = 'Enter a ticket type name.';
  } else if (typeName.length > 80) {
    errors.type = 'Ticket type must be at most 80 characters.';
  }

  const limitNum = Number(values.limit.trim());
  if (!values.limit.trim() || !Number.isInteger(limitNum) || limitNum < 1) {
    errors.limit = 'Ticket limit must be a positive whole number.';
  }

  const priceNum = Number(values.price.trim());
  if (values.price.trim() === '' || !Number.isFinite(priceNum) || priceNum < 0) {
    errors.price = 'Price must be zero or a positive number.';
  }

  return errors;
}

export function EventTicketsModal({
  open,
  event,
  onClose,
  onChanged,
}: EventTicketsModalProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [tickets, setTickets] = useState<TicketType[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [values, setValues] = useState<TicketFormValues>({
    type: '',
    limit: '',
    price: '0',
  });
  const [touched, setTouched] = useState<Partial<Record<keyof TicketFormValues, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingTicketId, setDeletingTicketId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadTickets = useCallback(async (eventId: number, signal?: AbortSignal) => {
    const items = await fetchEventTickets(eventId, signal);
    setTickets(items);
  }, []);

  useEffect(() => {
    if (!open || !event) return;
    const controller = new AbortController();
    setTickets(null);
    setLoadError(null);
    setActionError(null);
    setSuccessMessage(null);
    setValues({ type: '', limit: '', price: '0' });
    setTouched({});

    loadTickets(event.id, controller.signal).catch((e) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setLoadError(e);
    });

    return () => controller.abort();
  }, [open, event, loadTickets]);

  useEffect(() => {
    if (!open) return;
    const previousFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting && deletingTicketId === null) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocused?.focus();
    };
  }, [open, submitting, deletingTicketId, onClose]);

  if (!open || !event) return null;

  const isTerminal = event.status === 'FINISHED' || event.status === 'CANCELLED';
  const busy = submitting || deletingTicketId !== null;
  const clientErrors = validateTicketForm(values);
  const serverFields = fieldErrors(actionError);

  const totalLimit = tickets ? tickets.reduce((sum, t) => sum + t.limit, 0) : 0;
  const totalRemaining = tickets ? tickets.reduce((sum, t) => sum + t.remaining, 0) : 0;

  const handleFieldChange = (field: keyof TicketFormValues, nextValue: string) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    setActionError(null);
    setSuccessMessage(null);
  };

  const handleAddTicket = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy || isTerminal) return;

    setTouched({ type: true, limit: true, price: true });
    if (clientErrors.type || clientErrors.limit || clientErrors.price) {
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setSuccessMessage(null);

    try {
      const created = await createEventTicket(event.id, {
        type: values.type,
        limit: Number(values.limit.trim()),
        price: Number(values.price.trim()),
      });
      await loadTickets(event.id);
      setValues({ type: '', limit: '', price: '0' });
      setTouched({});
      setSuccessMessage(`Ticket type "${created.type}" added.`);
      onChanged();
    } catch (err) {
      setActionError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTicket = async (ticket: TicketType) => {
    if (busy) return;
    setDeletingTicketId(ticket.id);
    setActionError(null);
    setSuccessMessage(null);

    try {
      await deleteEventTicket(event.id, ticket.id);
      await loadTickets(event.id);
      setSuccessMessage(`Ticket type "${ticket.type}" removed.`);
      onChanged();
    } catch (err) {
      setActionError(err);
    } finally {
      setDeletingTicketId(null);
    }
  };

  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        className="card dialog dialog--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="dialog__header">
          <h2 id={titleId} className="dialog__title">
            Tickets · {event.name}
          </h2>
          <EventStatusBadge status={event.status} />
        </div>

        <p className="ticket-admin-summary">
          {tickets
            ? `${tickets.length} ${tickets.length === 1 ? 'type' : 'types'} configured · ${totalRemaining} of ${totalLimit} tickets remaining`
            : 'Loading ticket types…'}
          {event.venue?.capacity !== null && event.venue?.capacity !== undefined
            ? ` · Venue capacity: ${event.venue.capacity}`
            : ''}
        </p>

        <ErrorMessage error={loadError} />
        <ErrorMessage error={actionError} />

        {successMessage && (
          <div className="alert alert--success" role="status" aria-live="polite">
            <p className="alert__title">{successMessage}</p>
          </div>
        )}

        {tickets && tickets.length === 0 && (
          <p className="ticket-notice">No ticket types configured for this event yet.</p>
        )}

        {tickets && tickets.length > 0 && (
          <div className="ticket-admin-list">
            {tickets.map((ticket) => {
              const sold = ticket.limit - ticket.remaining;
              const isDeletingThis = deletingTicketId === ticket.id;
              return (
                <div key={ticket.id} className="ticket-admin-row">
                  <div className="ticket-admin-row__info">
                    <span className="ticket-admin-row__name">{ticket.type}</span>
                    <span className="ticket-admin-row__meta">
                      {ticket.remaining} of {ticket.limit} left ({sold} sold)
                    </span>
                  </div>
                  <div className="ticket-admin-row__right">
                    <span className="ticket-admin-row__price">{formatPrice(ticket.price)}</span>
                    <button
                      type="button"
                      className="btn btn--danger-outline btn--sm"
                      disabled={busy}
                      onClick={() => handleDeleteTicket(ticket)}
                      title={
                        sold > 0
                          ? 'Cannot remove a ticket type that already has registrations'
                          : 'Remove ticket type'
                      }
                    >
                      {isDeletingThis ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="ticket-admin-form">
          <h3>Add ticket type</h3>
          {isTerminal ? (
            <p className="muted">
              New ticket types cannot be added to finished or cancelled events.
            </p>
          ) : (
            <form className="form" onSubmit={handleAddTicket} noValidate>
              <div className="field">
                <label htmlFor="ticket-type-name">Ticket type</label>
                <input
                  id="ticket-type-name"
                  name="type"
                  type="text"
                  value={values.type}
                  placeholder="e.g. Early Bird, Student, VIP"
                  aria-invalid={Boolean(
                    (touched.type && clientErrors.type) || serverFields.type,
                  )}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, type: true }))}
                />
                {touched.type && clientErrors.type && (
                  <p className="field__error">{clientErrors.type}</p>
                )}
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="ticket-limit">Quantity limit</label>
                  <input
                    id="ticket-limit"
                    name="limit"
                    type="number"
                    min="1"
                    step="1"
                    value={values.limit}
                    placeholder="e.g. 100"
                    aria-invalid={Boolean(
                      (touched.limit && clientErrors.limit) || serverFields.limit,
                    )}
                    onChange={(e) => handleFieldChange('limit', e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, limit: true }))}
                  />
                  {touched.limit && clientErrors.limit && (
                    <p className="field__error">{clientErrors.limit}</p>
                  )}
                </div>

                <div className="field">
                  <label htmlFor="ticket-price">Price (UAH)</label>
                  <input
                    id="ticket-price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.price}
                    placeholder="0 for free"
                    aria-invalid={Boolean(
                      (touched.price && clientErrors.price) || serverFields.price,
                    )}
                    onChange={(e) => handleFieldChange('price', e.target.value)}
                    onBlur={() => setTouched((prev) => ({ ...prev, price: true }))}
                  />
                  {touched.price && clientErrors.price && (
                    <p className="field__error">{clientErrors.price}</p>
                  )}
                </div>
              </div>

              <div className="dialog__actions">
                <button
                  ref={closeButtonRef}
                  type="button"
                  className="btn btn--ghost"
                  disabled={busy}
                  onClick={onClose}
                >
                  Close
                </button>
                <button type="submit" className="btn" disabled={busy}>
                  {submitting ? 'Adding…' : 'Add ticket type'}
                </button>
              </div>
            </form>
          )}
        </div>

        {isTerminal && (
          <div className="dialog__actions" style={{ marginTop: 16 }}>
            <button
              ref={closeButtonRef}
              type="button"
              className="btn btn--ghost"
              disabled={busy}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
