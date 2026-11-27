import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { fieldErrors } from '../../../shared/api/errors';
import { ErrorMessage } from '../../../shared/components/ErrorMessage';
import { Modal } from '../../../shared/components/Modal';
import { TextField } from '../../../shared/components/TextField';
import { useForm, type FieldErrors } from '../../../shared/hooks/useForm';
import { createVenue, updateVenue, type Venue } from '../../venues';

interface VenueFormModalProps {
  open: boolean;
  venue: Venue | null;
  onClose: () => void;
  onSaved: (venue: Venue, isEdit: boolean) => void;
}

type VenueFormValues = {
  name: string;
  address: string;
  capacity: string;
};

const EMPTY_VALUES: VenueFormValues = { name: '', address: '', capacity: '' };

function validateVenueForm(values: VenueFormValues): FieldErrors<VenueFormValues> {
  const errors: FieldErrors<VenueFormValues> = {};
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

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const clearError = useCallback(() => setError(null), []);
  const form = useForm(EMPTY_VALUES, validateVenueForm, clearError);
  const { reset } = form;

  useEffect(() => {
    if (!open) return;
    reset({
      name: venue?.name ?? '',
      address: venue?.address ?? '',
      capacity: venue?.capacity !== null && venue ? String(venue.capacity) : '',
    });
    setError(null);
  }, [open, venue, reset]);

  const serverFields = fieldErrors(error);

  const onSubmit = form.submit(async (values) => {
    if (busy) return;
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
  });

  return (
    <Modal open={open} titleId={titleId} wide busy={busy} initialFocusRef={nameInputRef} onClose={onClose}>
      <div className="dialog__header">
        <h2 id={titleId} className="dialog__title">
          {isEdit ? 'Edit venue' : 'Add venue'}
        </h2>
      </div>

      <form className="form" onSubmit={onSubmit} noValidate>
        <ErrorMessage error={error} />

        <TextField
          id="venue-name"
          inputRef={nameInputRef}
          label="Name"
          placeholder="e.g. Building 18 Conference Hall"
          invalid={!!serverFields.name}
          {...form.bind('name')}
        />

        <TextField
          id="venue-address"
          label="Address"
          placeholder="e.g. 14 Politekhnichna St, Building 18, Kyiv"
          hint="Each venue must have a unique address."
          invalid={!!serverFields.address}
          {...form.bind('address')}
        />

        <TextField
          id="venue-capacity"
          label="Capacity (optional)"
          type="number"
          min="1"
          step="1"
          placeholder="Leave blank if unlimited or unspecified"
          invalid={!!serverFields.capacity}
          {...form.bind('capacity')}
        />

        <div className="dialog__actions">
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create venue'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
