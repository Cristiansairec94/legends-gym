const STYLES = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  paid: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  confirmed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  replied: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  processing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  in_progress: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  new: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  expired: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  failed: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  cancelled: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  refunded: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  closed: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export default function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  const cls = STYLES[key] || 'bg-ink-700 text-gray-300 border-ink-600';
  const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label || '—'}
    </span>
  );
}
