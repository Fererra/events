import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

interface ModalProps {
  open: boolean;
  titleId: string;
  describedById?: string;
  wide?: boolean;
  busy?: boolean;
  initialFocusRef?: RefObject<HTMLElement>;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({
  open,
  titleId,
  describedById,
  wide = false,
  busy = false,
  initialFocusRef,
  onClose,
  children,
}: ModalProps) {
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);
  busyRef.current = busy;
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previousFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    initialFocusRef?.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocused?.focus();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

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
        className={`card dialog${wide ? ' dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
      >
        {children}
      </div>
    </div>
  );
}
