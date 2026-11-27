import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { fieldErrors } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { Modal } from '../../../shared/components/Modal';
import { TextField } from '../../../shared/components/TextField';
import { useForm, type FieldErrors } from '../../../shared/hooks/useForm';
import { formatPrice } from '../../../shared/utils/format';
import { EventStatusBadge, isTerminalEventStatus, type EventWithVenue } from '../../events';
import {
  createEventTicket,
  deleteEventTicket,
  fetchEventTickets,
  type CreateTicketTypeInput,
  type TicketType,
} from '../../registrations';

interface EventTicketsModalProps {
  open: boolean;
  event: EventWithVenue | null;
  onClose: () => void;
  onChanged: () => void;
}

type TicketFormValues = {
  type: string;
  limit: string;
  price: string;
};

const EMPTY_TICKET_VALUES: TicketFormValues = { type: '', limit: '', price: '0' };

function validateTicketForm(values: TicketFormValues): FieldErrors<TicketFormValues> {
  const errors: FieldErrors<TicketFormValues> = {};
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

function TicketTypesList({
  tickets,
  busy,
  deletingTicketId,
  onDelete,
}: {
  tickets: TicketType[];
  busy: boolean;
  deletingTicketId: number | null;
  onDelete: (ticket: TicketType) => void;
}) {
  if (tickets.length === 0) {
    return <p className="notice">No ticket types configured for this event yet.</p>;
  }

  return (
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
                onClick={() => onDelete(ticket)}
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
  );
}

function AddTicketTypeForm({
  eventId,
  busy,
  submitting,
  actionError,
  closeButtonRef,
  onFieldInteraction,
  onAdd,
  onClose,
}: {
  eventId: number;
  busy: boolean;
  submitting: boolean;
  actionError: unknown;
  closeButtonRef: RefObject<HTMLButtonElement>;
  onFieldInteraction: () => void;
  onAdd: (input: CreateTicketTypeInput) => Promise<boolean>;
  onClose: () => void;
}) {
  const form = useForm(EMPTY_TICKET_VALUES, validateTicketForm, onFieldInteraction);
  const { reset } = form;
  const serverFields = fieldErrors(actionError);

  useEffect(() => {
    reset(EMPTY_TICKET_VALUES);
  }, [eventId, reset]);

  const onSubmit = form.submit(async (values) => {
    if (busy) return;
    const ok = await onAdd({
      type: values.type,
      limit: Number(values.limit.trim()),
      price: Number(values.price.trim()),
    });
    if (ok) {
      reset(EMPTY_TICKET_VALUES);
    }
  });

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <TextField
        id="ticket-type-name"
        label="Ticket type"
        placeholder="e.g. Early Bird, Student, VIP"
        invalid={!!serverFields.type}
        {...form.bind('type')}
      />

      <div className="field-row">
        <TextField
          id="ticket-limit"
          label="Quantity limit"
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 100"
          invalid={!!serverFields.limit}
          {...form.bind('limit')}
        />
        <TextField
          id="ticket-price"
          label="Price (UAH)"
          type="number"
          min="0"
          step="0.01"
          placeholder="0 for free"
          invalid={!!serverFields.price}
          {...form.bind('price')}
        />
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
  );
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

    loadTickets(event.id, controller.signal).catch((e) => {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setLoadError(e);
    });

    return () => controller.abort();
  }, [open, event, loadTickets]);

  const busy = submitting || deletingTicketId !== null;
  const clearFeedback = useCallback(() => {
    setActionError(null);
    setSuccessMessage(null);
  }, []);

  if (!open || !event) return null;

  const isTerminal = isTerminalEventStatus(event.status);
  const totalLimit = tickets ? tickets.reduce((sum, t) => sum + t.limit, 0) : 0;
  const totalRemaining = tickets ? tickets.reduce((sum, t) => sum + t.remaining, 0) : 0;

  const handleAddTicket = async (input: CreateTicketTypeInput): Promise<boolean> => {
    if (busy || isTerminal) return false;
    setSubmitting(true);
    clearFeedback();

    try {
      const created = await createEventTicket(event.id, input);
      await loadTickets(event.id);
      setSuccessMessage(`Ticket type "${created.type}" added.`);
      onChanged();
      return true;
    } catch (err) {
      setActionError(err);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTicket = async (ticket: TicketType) => {
    if (busy) return;
    setDeletingTicketId(ticket.id);
    clearFeedback();

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
    <Modal open={open} titleId={titleId} wide busy={busy} initialFocusRef={closeButtonRef} onClose={onClose}>
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

      {tickets && (
        <TicketTypesList
          tickets={tickets}
          busy={busy}
          deletingTicketId={deletingTicketId}
          onDelete={handleDeleteTicket}
        />
      )}

      <div className="ticket-admin-form">
        <h3>Add ticket type</h3>
        {isTerminal ? (
          <p className="muted">
            New ticket types cannot be added to finished or cancelled events.
          </p>
        ) : (
          <AddTicketTypeForm
            eventId={event.id}
            busy={busy}
            submitting={submitting}
            actionError={actionError}
            closeButtonRef={closeButtonRef}
            onFieldInteraction={clearFeedback}
            onAdd={handleAddTicket}
            onClose={onClose}
          />
        )}
      </div>

      {isTerminal && (
        <div className="dialog__actions dialog__actions--spaced">
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
    </Modal>
  );
}
