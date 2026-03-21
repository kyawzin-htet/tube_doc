import type { ReactNode } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  heading?: string;
  message?: string;
  detail?: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  confirmTitle?: string;
  confirmVariant?: 'danger' | 'primary' | 'ghost';
  confirmIcon?: ReactNode;
}

export function ConfirmationModal({
  isOpen,
  heading = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  detail,
  onConfirm,
  onClose,
  isLoading,
  confirmLabel = 'Confirm',
  confirmTitle = 'Confirm',
  confirmVariant = 'danger',
  confirmIcon,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const confirmClassName =
    confirmVariant === 'primary'
      ? 'primary-btn'
      : confirmVariant === 'ghost'
        ? 'ghost-btn'
        : 'danger-btn';

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content compact-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>{heading}</h3>
          <button className="ghost-btn icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-copy">{message}</p>
          {detail ? <p className="muted small">{detail}</p> : null}
        </div>
        <div className="modal-footer">
          <button className="ghost-btn" onClick={onClose} aria-label="Cancel" title="Cancel">
            <X size={16} />
            <span>Cancel</span>
          </button>
          <button
            className={confirmClassName}
            onClick={onConfirm}
            disabled={isLoading}
            aria-label={confirmLabel}
            title={confirmTitle}
          >
            {isLoading ? <Loader2 className="spinning" size={16} /> : (confirmIcon ?? <Trash2 size={16} />)}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
