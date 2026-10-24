import Loader from '../common/Loader';
import EmptyState from '../common/EmptyState';
import { AlertCircle } from 'lucide-react';

/**
 * Generic table.
 * columns: [{ key, header, render?(row), className? }]
 * rows: array of records
 */
export default function DataTable({ columns, rows, loading, error, empty, onRetry }) {
  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-rose-500/30 py-14 text-center">
        <AlertCircle className="h-9 w-9 text-rose-400" />
        <p className="text-sm text-rose-300">{error}</p>
        {onRetry && <button className="btn-outline" onClick={onRetry}>Try again</button>}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState title={empty?.title || 'No records found'} subtitle={empty?.subtitle} icon={empty?.icon} />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-ink-800">
      <table className="min-w-full divide-y divide-ink-800 text-sm">
        <thead className="bg-ink-900">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 ${c.className || ''}`}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-800 bg-ink-950">
          {rows.map((row) => (
            <tr key={row.id} className="transition hover:bg-ink-900/60">
              {columns.map((c) => (
                <td key={c.key} className={`whitespace-nowrap px-4 py-3 text-gray-200 ${c.className || ''}`}>
                  {c.render ? c.render(row) : (row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
