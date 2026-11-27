import { useId, useRef } from 'react';
import { ErrorMessage } from './ErrorMessage';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  busy?: boolean;
  error?: unknown;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open={open}
      titleId={titleId}
      describedById={descriptionId}
      busy={busy}
      initialFocusRef={cancelRef}
      onClose={onCancel}
    >
      <h2 id={titleId} className="dialog__title">
        {title}
      </h2>
      <p id={descriptionId} className="dialog__desc">
        {description}
      </p>

      <ErrorMessage error={error} />

      <div className="dialog__actions">
        <button
          ref={cancelRef}
          type="button"
          className="btn btn--ghost"
          disabled={busy}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={confirmVariant === 'danger' ? 'btn btn--danger' : 'btn'}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
