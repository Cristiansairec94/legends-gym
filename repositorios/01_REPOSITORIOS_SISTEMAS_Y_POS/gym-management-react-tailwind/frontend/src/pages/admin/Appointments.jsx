import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import PageHeading from '../../components/admin/PageHeading';
import DataTable from '../../components/admin/DataTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import { appointmentService } from '../../services/appointmentService';
import { toast } from '../../utils/toast';
import { formatDate } from '../../utils/format';

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

export default function Appointments() {
  const [data, setData] = useState({ items: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const params = useMemo(() => ({ page, limit: 10, ...(debounced ? { search: debounced } : {}), ...(status ? { status } : {}) }), [page, debounced, status]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await appointmentService.list(params); setData(res.data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [params]);
  useEffect(() => { load(); }, [load]);

  const changeStatus = async (appt, next) => {
    try { await appointmentService.updateStatus(appt.id, next); toast.success(`Appointment → ${next}`); load(); }
    catch (err) { toast.error(err.message); }
  };
  const doDelete = async () => {
    setDeleting(true);
    try { await appointmentService.remove(confirm.id); toast.success('Appointment deleted'); setConfirm(null); load(); }
    catch (err) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  const columns = [
    { key: 'customer_name', header: 'Customer', render: (r) => (
      <div><p className="font-medium text-white">{r.customer_name}</p><p className="text-xs text-gray-500">{r.email}{r.phone ? ` · ${r.phone}` : ''}</p></div>
    ) },
    { key: 'appointment_date', header: 'When', render: (r) => (
      <div><p className="text-gray-200">{formatDate(r.appointment_date)}</p><p className="text-xs text-gray-500">{r.appointment_time?.slice(0,5)}</p></div>
    ) },
    { key: 'service_title', header: 'Service', render: (r) => r.service_title || '—' },
    { key: 'trainer_name', header: 'Trainer', render: (r) => r.trainer_name || '—' },
    { key: 'status', header: 'Status', render: (r) => (
      <select className="input py-1.5 text-xs" value={r.status} onChange={(e) => changeStatus(r, e.target.value)}>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    ) },
    { key: '__a', header: '', className: 'text-right', render: (r) => (
      <button className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-rose-400" onClick={() => setConfirm(r)}><Trash2 className="h-4 w-4" /></button>
    ) },
  ];

  return (
    <div>
      <PageHeading title="Appointments" subtitle="Bookings made from the website" />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} className="sm:max-w-xs" placeholder="Search name or email…" />
        <select className="input sm:max-w-[170px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <DataTable columns={columns} rows={data.items} loading={loading} error={error} onRetry={load}
        empty={{ title: 'No appointments', subtitle: 'Bookings from the website appear here.' }} />
      <Pagination page={data.pagination?.page} pages={data.pagination?.pages} total={data.pagination?.total} onChange={setPage} />
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete} loading={deleting}
        title="Delete appointment?" message={`Remove the booking for ${confirm?.customer_name}?`} />
    </div>
  );
}
