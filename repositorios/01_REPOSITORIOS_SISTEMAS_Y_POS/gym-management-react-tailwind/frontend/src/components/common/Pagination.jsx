import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, onChange }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-4 pt-4 text-sm text-gray-400">
      <span>Page {page} of {pages}{total != null ? ` · ${total} total` : ''}</span>
      <div className="flex items-center gap-1">
        <button className="btn-ghost px-2" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button className="btn-ghost px-2" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
