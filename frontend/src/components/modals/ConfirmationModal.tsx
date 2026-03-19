import { Loader2, Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  onConfirm: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  title,
  onConfirm,
  onClose,
  isLoading,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content compact-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3>Confirm Deletion</h3>
          <button className="ghost-btn icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p className="modal-copy">Delete this record permanently?</p>
          <p className="muted small">{title}</p>
        </div>
        <div className="modal-footer">
          <button className="ghost-btn icon-btn" onClick={onClose} aria-label="Cancel" title="Cancel">
            <X size={16} />
          </button>
          <button
            className="danger-btn icon-btn"
            onClick={onConfirm}
            disabled={isLoading}
            aria-label="Delete"
            title="Delete"
          >
            {isLoading ? <Loader2 className="spinning" size={16} /> : <Trash2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
