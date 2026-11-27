import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { fieldErrors } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { Modal } from '../../../shared/components/Modal';
import { TextField } from '../../../shared/components/TextField';
import { useForm, type FieldErrors } from '../../../shared/hooks/useForm';
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

type EventFormValues = {
  name: string;
  organisator: string;
  venueId: string;
  status: 'IN_PLANNING' | 'ACTIVE';
  startTimestamp: string;
  endTimestamp: string;
  description: string;
};

const EMPTY_VALUES: EventFormValues = {
  name: '',
  organisator: '',
  venueId: '',
  status: 'IN_PLANNING',
  startTimestamp: '',
  endTimestamp: '',
  description: '',
};

function validateEventForm(values: EventFormValues): FieldErrors<EventFormValues> {
  const errors: FieldErrors<EventFormValues> = {};
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

  const startIso = fromDateTimeLocalValue(values.startTimestamp);
  const endIso = fromDateTimeLocalValue(values.endTimestamp);
  if (!startIso) {
    errors.startTimestamp = 'Enter a valid start date and time.';
  }
  if (!endIso) {
    errors.endTimestamp = 'Enter a valid end date and time.';
  } else if (startIso && Date.parse(endIso) <= Date.parse(startIso)) {
    errors.endTimestamp = 'End date and time must be later than start date and time.';
  }

  if (!description) {
    errors.description = 'Enter an event description.';
  } else if (description.length > 2000) {
    errors.description = 'Description must be at most 2000 characters.';
  }

  return errors;
}

function getInitialStatus(status?: EventStatus): 'IN_PLANNING' | 'ACTIVE' {
  return status === 'ACTIVE' ? 'ACTIVE' : 'IN_PLANNING';
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
  const defaultVenueIdRef = useRef(venues[0]?.id ?? '');
  defaultVenueIdRef.current = venues[0]?.id ?? '';
  const isEdit = event !== null;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const clearError = useCallback(() => setError(null), []);
  const form = useForm(EMPTY_VALUES, validateEventForm, clearError);
  const { reset } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      name: event?.name ?? '',
      organisator: event?.organisator ?? '',
      venueId: event?.venueId ?? defaultVenueIdRef.current,
      status: getInitialStatus(event?.status),
      startTimestamp: event ? toDateTimeLocalValue(event.startTimestamp) : '',
      endTimestamp: event ? toDateTimeLocalValue(event.endTimestamp) : '',
      description: event?.description ?? '',
    });
    setError(null);
  }, [open, event, reset]);

  const serverFields = fieldErrors(error);
  const { error: venueError, ...venueControl } = form.bind('venueId');
  const { error: _statusError, ...statusControl } = form.bind('status');
  const { error: descriptionError, ...descriptionControl } = form.bind('description');

  const onSubmit = form.submit(async (values) => {
    if (busy) return;
    const startTimestamp = fromDateTimeLocalValue(values.startTimestamp);
    const endTimestamp = fromDateTimeLocalValue(values.endTimestamp);

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
            status: values.status as 'IN_PLANNING' | 'ACTIVE',
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
  });

  return (
    <Modal open={open} titleId={titleId} wide busy={busy} initialFocusRef={nameInputRef} onClose={onClose}>
      <div className="dialog__header">
        <h2 id={titleId} className="dialog__title">
          {isEdit ? 'Edit event' : 'Create event'}
        </h2>
      </div>

      <form className="form" onSubmit={onSubmit} noValidate>
        <ErrorMessage error={error} />

        {venues.length === 0 && (
          <p className="notice">
            No venues exist yet. Create a venue first before scheduling an event.
          </p>
        )}

        <TextField
          id="event-name"
          inputRef={nameInputRef}
          label="Event title"
          placeholder="e.g. KPI Software Engineering Summit 2026"
          invalid={!!serverFields.name}
          {...form.bind('name')}
        />

        <TextField
          id="event-organisator"
          label="Organizer"
          placeholder="e.g. KPI Student Council"
          invalid={!!serverFields.organisator}
          {...form.bind('organisator')}
        />

        <div className="field-row">
          <div className="field">
            <label htmlFor="event-venue">Venue</label>
            <select
              id="event-venue"
              aria-invalid={Boolean(venueError || serverFields.venueId)}
              aria-describedby={venueError ? 'event-venue-error' : undefined}
              {...venueControl}
            >
              {venues.length === 0 && <option value="">No venues available</option>}
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.address})
                </option>
              ))}
            </select>
            {venueError && (
              <p id="event-venue-error" className="field__error">
                {venueError}
              </p>
            )}
          </div>

          {!isEdit && (
            <div className="field">
              <label htmlFor="event-status">Initial status</label>
              <select id="event-status" {...statusControl}>
                <option value="IN_PLANNING">In planning</option>
                <option value="ACTIVE">Active</option>
              </select>
            </div>
          )}
        </div>

        <div className="field-row">
          <TextField
            id="event-start"
            label="Starts at"
            type="datetime-local"
            invalid={!!serverFields.startTimestamp}
            {...form.bind('startTimestamp')}
          />
          <TextField
            id="event-end"
            label="Ends at"
            type="datetime-local"
            invalid={!!serverFields.endTimestamp}
            {...form.bind('endTimestamp')}
          />
        </div>

        <div className="field">
          <label htmlFor="event-description">Description</label>
          <textarea
            id="event-description"
            placeholder="Describe the agenda, speakers, and target audience…"
            aria-invalid={Boolean(descriptionError || serverFields.description)}
            aria-describedby={descriptionError ? 'event-description-error' : undefined}
            {...descriptionControl}
          />
          {descriptionError && (
            <p id="event-description-error" className="field__error">
              {descriptionError}
            </p>
          )}
        </div>

        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={busy || venues.length === 0}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
