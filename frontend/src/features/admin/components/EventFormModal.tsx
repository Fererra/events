import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { fieldErrors } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import {
  createEvent,
  updateEvent,
  type EventStatus,
  type EventWithVenue,
} from '../../events';
import type { Venue } from '../../venues';
import { fromDateTimeLocalValue, toDateTimeLocalValue } from '../utils/datetime';

interface EventFormModalProps {
  open: boolean;
  event: EventWithVenue | null;
  venues: Venue[];
  onClose: () => void;
  onSaved: (event: EventWithVenue, isEdit: boolean) => void;
}

interface EventFormValues {
  name: string;
  organisator: string;
  venueId: string;
  status: 'IN_PLANNING' | 'ACTIVE';
  startLocal: string;
  endLocal: string;
  description: string;
}

type EventFieldErrors = Partial<Record<keyof EventFormValues, string>>;

function validateEventForm(values: EventFormValues): EventFieldErrors {
  const errors: EventFieldErrors = {};
  const name = values.name.trim();
  const organisator = values.organisator.trim();
  const description = values.description.trim();

  if (!name) {
    errors.name = 'Enter an event name.';
  } else if (name.length > 150) {
    errors.name = 'Event name must be at most 150 characters.';
  }

  if (!organisator) {
    errors.organisator = 'Enter an organizer name.';
  } else if (organisator.length > 120) {
    errors.organisator = 'Organizer name must be at most 120 characters.';
  }

  if (!values.venueId) {
    errors.venueId = 'Select a venue.';
  }

  const startIso = fromDateTimeLocalValue(values.startLocal);
  const endIso = fromDateTimeLocalValue(values.endLocal);
  if (!startIso) {
    errors.startLocal = 'Enter a valid start date and time.';
  }
  if (!endIso) {
    errors.endLocal = 'Enter a valid end date and time.';
  } else if (startIso && Date.parse(endIso) <= Date.parse(startIso)) {
    errors.endLocal = 'End date and time must be later than start date and time.';
  }

  if (!description) {
    errors.description = 'Enter an event description.';
  } else if (description.length > 2000) {
    errors.description = 'Description must be at most 2000 characters.';
  }

  return errors;
}

function getInitialStatus(status?: EventStatus): 'IN_PLANNING' | 'ACTIVE' {
  if (status === 'ACTIVE') return status;
  return 'IN_PLANNING';
}

export function EventFormModal({
  open,
  event,
  venues,
  onClose,
  onSaved,
}: EventFormModalProps) {
  const titleId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isEdit = event !== null;

  const [values, setValues] = useState<EventFormValues>({
    name: '',
    organisator: '',
    venueId: '',
    status: 'IN_PLANNING',
    startLocal: '',
    endLocal: '',
    description: '',
  });
  const [touched, setTouched] = useState<Partial<Record<keyof EventFormValues, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!open) return;
    setValues({
      name: event?.name ?? '',
      organisator: event?.organisator ?? '',
      venueId: event?.venueId ?? venues[0]?.id ?? '',
      status: getInitialStatus(event?.status),
      startLocal: event ? toDateTimeLocalValue(event.startTimestamp) : '',
      endLocal: event ? toDateTimeLocalValue(event.endTimestamp) : '',
      description: event?.description ?? '',
    });
    setTouched({});
    setError(null);
  }, [open, event, venues]);

  useEffect(() => {
    if (!open) return;
    const previousFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    nameInputRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocused?.focus();
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  const clientErrors = validateEventForm(values);
  const serverFields = fieldErrors(error);

  const handleFieldChange = <K extends keyof EventFormValues>(
    field: K,
    nextValue: EventFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;

    setTouched({
      name: true,
      organisator: true,
      venueId: true,
      startLocal: true,
      endLocal: true,
      description: true,
    });

    if (
      clientErrors.name ||
      clientErrors.organisator ||
      clientErrors.venueId ||
      clientErrors.startLocal ||
      clientErrors.endLocal ||
      clientErrors.description
    ) {
      return;
    }

    const startTimestamp = fromDateTimeLocalValue(values.startLocal);
    const endTimestamp = fromDateTimeLocalValue(values.endLocal);

    setBusy(true);
    setError(null);
    try {
      const saved = isEdit
        ? await updateEvent(event.id, {
            name: values.name,
            organisator: values.organisator,
            venueId: values.venueId,
            startTimestamp,
            endTimestamp,
            description: values.description,
          })
        : await createEvent({
            name: values.name,
            organisator: values.organisator,
            venueId: values.venueId,
            status: values.status,
            startTimestamp,
            endTimestamp,
            description: values.description,
          });
      onSaved(saved, isEdit);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
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
            {isEdit ? 'Edit event' : 'Create event'}
          </h2>
        </div>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <ErrorMessage error={error} />

          {venues.length === 0 && (
            <p className="ticket-notice">
              No venues exist yet. Create a venue first before scheduling an event.
            </p>
          )}

          <div className="field">
            <label htmlFor="event-name">Event title</label>
            <input
              ref={nameInputRef}
              id="event-name"
              name="name"
              type="text"
              value={values.name}
              placeholder="e.g. KPI Software Engineering Summit 2026"
              aria-invalid={Boolean(
                (touched.name && clientErrors.name) || serverFields.name,
              )}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
            />
            {touched.name && clientErrors.name && (
              <p className="field__error">{clientErrors.name}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="event-organisator">Organizer</label>
            <input
              id="event-organisator"
              name="organisator"
              type="text"
              value={values.organisator}
              placeholder="e.g. KPI Student Council"
              aria-invalid={Boolean(
                (touched.organisator && clientErrors.organisator) || serverFields.organisator,
              )}
              onChange={(e) => handleFieldChange('organisator', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, organisator: true }))}
            />
            {touched.organisator && clientErrors.organisator && (
              <p className="field__error">{clientErrors.organisator}</p>
            )}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="event-venue">Venue</label>
              <select
                id="event-venue"
                name="venueId"
                value={values.venueId}
                aria-invalid={Boolean(
                  (touched.venueId && clientErrors.venueId) || serverFields.venueId,
                )}
                onChange={(e) => handleFieldChange('venueId', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, venueId: true }))}
              >
                {venues.length === 0 && <option value="">No venues available</option>}
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.address})
                  </option>
                ))}
              </select>
              {touched.venueId && clientErrors.venueId && (
                <p className="field__error">{clientErrors.venueId}</p>
              )}
            </div>

            {!isEdit && (
              <div className="field">
                <label htmlFor="event-status">Initial status</label>
                <select
                  id="event-status"
                  name="status"
                  value={values.status}
                  onChange={(e) =>
                    handleFieldChange('status', e.target.value as 'IN_PLANNING' | 'ACTIVE')
                  }
                >
                  <option value="IN_PLANNING">In planning</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>
            )}
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="event-start">Starts at</label>
              <input
                id="event-start"
                name="startTimestamp"
                type="datetime-local"
                value={values.startLocal}
                aria-invalid={Boolean(
                  (touched.startLocal && clientErrors.startLocal) || serverFields.startTimestamp,
                )}
                onChange={(e) => handleFieldChange('startLocal', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, startLocal: true }))}
              />
              {touched.startLocal && clientErrors.startLocal && (
                <p className="field__error">{clientErrors.startLocal}</p>
              )}
            </div>

            <div className="field">
              <label htmlFor="event-end">Ends at</label>
              <input
                id="event-end"
                name="endTimestamp"
                type="datetime-local"
                value={values.endLocal}
                aria-invalid={Boolean(
                  (touched.endLocal && clientErrors.endLocal) || serverFields.endTimestamp,
                )}
                onChange={(e) => handleFieldChange('endLocal', e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, endLocal: true }))}
              />
              {touched.endLocal && clientErrors.endLocal && (
                <p className="field__error">{clientErrors.endLocal}</p>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="event-description">Description</label>
            <textarea
              id="event-description"
              name="description"
              value={values.description}
              placeholder="Describe the agenda, speakers, and target audience…"
              aria-invalid={Boolean(
                (touched.description && clientErrors.description) || serverFields.description,
              )}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
            />
            {touched.description && clientErrors.description && (
              <p className="field__error">{clientErrors.description}</p>
            )}
          </div>

          <div className="dialog__actions">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn" disabled={busy || venues.length === 0}>
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
