import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { fieldErrors } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { createVenue, updateVenue, type Venue } from '../../venues';

interface VenueFormModalProps {
  open: boolean;
  venue: Venue | null;
  onClose: () => void;
  onSaved: (venue: Venue, isEdit: boolean) => void;
}

interface VenueFormValues {
  name: string;
  address: string;
  capacity: string;
}

type VenueFieldErrors = Partial<Record<keyof VenueFormValues, string>>;

function validateVenueForm(values: VenueFormValues): VenueFieldErrors {
  const errors: VenueFieldErrors = {};
  const name = values.name.trim();
  const address = values.address.trim();
  const cap = values.capacity.trim();

  if (!name) {
    errors.name = 'Enter a venue name.';
  } else if (name.length > 120) {
    errors.name = 'Venue name must be at most 120 characters.';
  }

  if (!address) {
    errors.address = 'Enter a venue address.';
  } else if (address.length > 200) {
    errors.address = 'Venue address must be at most 200 characters.';
  }

  if (cap) {
    const parsed = Number(cap);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.capacity = 'Capacity must be a positive whole number.';
    }
  }

  return errors;
}

export function VenueFormModal({ open, venue, onClose, onSaved }: VenueFormModalProps) {
  const titleId = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const isEdit = venue !== null;

  const [values, setValues] = useState<VenueFormValues>({
    name: '',
    address: '',
    capacity: '',
  });
  const [touched, setTouched] = useState<Partial<Record<keyof VenueFormValues, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!open) return;
    setValues({
      name: venue?.name ?? '',
      address: venue?.address ?? '',
      capacity: venue?.capacity !== null && venue ? String(venue.capacity) : '',
    });
    setTouched({});
    setError(null);
  }, [open, venue]);

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

  const clientErrors = validateVenueForm(values);
  const serverFields = fieldErrors(error);

  const handleFieldChange = (field: keyof VenueFormValues, nextValue: string) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;

    setTouched({ name: true, address: true, capacity: true });
    if (clientErrors.name || clientErrors.address || clientErrors.capacity) {
      return;
    }

    const parsedCapacity = values.capacity.trim() ? Number(values.capacity.trim()) : null;

    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: values.name,
        address: values.address,
        capacity: parsedCapacity,
      };
      const saved = isEdit ? await updateVenue(venue.id, payload) : await createVenue(payload);
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
            {isEdit ? 'Edit venue' : 'Add venue'}
          </h2>
        </div>

        <form className="form" onSubmit={handleSubmit} noValidate>
          <ErrorMessage error={error} />

          <div className="field">
            <label htmlFor="venue-name">Name</label>
            <input
              ref={nameInputRef}
              id="venue-name"
              name="name"
              type="text"
              value={values.name}
              placeholder="e.g. Building 18 Conference Hall"
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
            <label htmlFor="venue-address">Address</label>
            <input
              id="venue-address"
              name="address"
              type="text"
              value={values.address}
              placeholder="e.g. 14 Politekhnichna St, Building 18, Kyiv"
              aria-invalid={Boolean(
                (touched.address && clientErrors.address) || serverFields.address,
              )}
              onChange={(e) => handleFieldChange('address', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, address: true }))}
            />
            <p className="field__hint">Each venue must have a unique address.</p>
            {touched.address && clientErrors.address && (
              <p className="field__error">{clientErrors.address}</p>
            )}
          </div>

          <div className="field">
            <label htmlFor="venue-capacity">Capacity (optional)</label>
            <input
              id="venue-capacity"
              name="capacity"
              type="number"
              min="1"
              step="1"
              value={values.capacity}
              placeholder="Leave blank if unlimited or unspecified"
              aria-invalid={Boolean(
                (touched.capacity && clientErrors.capacity) || serverFields.capacity,
              )}
              onChange={(e) => handleFieldChange('capacity', e.target.value)}
              onBlur={() => setTouched((prev) => ({ ...prev, capacity: true }))}
            />
            {touched.capacity && clientErrors.capacity && (
              <p className="field__error">{clientErrors.capacity}</p>
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
            <button type="submit" className="btn" disabled={busy}>
              {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create venue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
