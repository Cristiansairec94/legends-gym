import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', message, confirmLabel = 'Delete', loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex gap-3">
        <div className="mt-0.5 rounded-lg bg-rose-500/15 p-2 text-rose-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-gray-300">{message || 'This action cannot be undone.'}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-outline" onClick={onClose} disabled={loading}>Cancel</button>
        <button className="btn bg-rose-600 text-white hover:bg-rose-700" onClick={onConfirm} disabled={loading}>
          {loading ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
