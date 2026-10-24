import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import PageHeading from '../../components/admin/PageHeading';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import { enquiryService } from '../../services/adminService';
import { toast } from '../../utils/toast';
import { formatDate } from '../../utils/format';

const STATUSES = ['new', 'in_progress', 'replied', 'closed'];

export default function Enquiries() {
  const [data, setData] = useState({ items: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const params = useMemo(() => ({ page, limit: 10, ...(debounced ? { search: debounced } : {}), ...(status ? { status } : {}) }), [page, debounced, status]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await enquiryService.list(params); setData(res.data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [params]);
  useEffect(() => { load(); }, [load]);

  const changeStatus = async (e, next) => {
    try { await enquiryService.updateStatus(e.id, next); toast.success(`Enquiry → ${next.replace('_',' ')}`); load(); }
    catch (err) { toast.error(err.message); }
  };
  const doDelete = async () => {
    setDeleting(true);
    try { await enquiryService.remove(confirm.id); toast.success('Enquiry deleted'); setConfirm(null); load(); }
    catch (err) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  const columns = [
    { key: 'name', header: 'From', render: (r) => (
      <div><p className="font-medium text-white">{r.name}</p><p className="text-xs text-gray-500">{r.email}</p></div>
    ) },
    { key: 'subject', header: 'Subject', render: (r) => r.subject || '—' },
    { key: 'created_at', header: 'Received', render: (r) => formatDate(r.created_at) },
    { key: 'status', header: 'Status', render: (r) => (
      <select className="input py-1.5 text-xs" value={r.status} onChange={(e) => changeStatus(r, e.target.value)}>
        {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
      </select>
    ) },
    { key: '__a', header: '', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        <button className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-emerald-400" onClick={() => setView(r)}><Eye className="h-4 w-4" /></button>
        <button className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-rose-400" onClick={() => setConfirm(r)}><Trash2 className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeading title="Contact Enquiries" subtitle="Messages submitted through the contact form" />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} className="sm:max-w-xs" placeholder="Search name, email…" />
        <select className="input sm:max-w-[170px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>
      <DataTable columns={columns} rows={data.items} loading={loading} error={error} onRetry={load}
        empty={{ title: 'No enquiries', subtitle: 'Contact form submissions appear here.' }} />
      <Pagination page={data.pagination?.page} pages={data.pagination?.pages} total={data.pagination?.total} onChange={setPage} />

      <Modal open={!!view} onClose={() => setView(null)} title="Enquiry" maxWidth="max-w-lg">
        {view && (
          <div className="space-y-3 text-sm">
            <p><span className="text-gray-500">Name:</span> <span className="text-gray-200">{view.name}</span></p>
            <p><span className="text-gray-500">Email:</span> <span className="text-gray-200">{view.email}</span></p>
            <p><span className="text-gray-500">Phone:</span> <span className="text-gray-200">{view.phone || '—'}</span></p>
            <p><span className="text-gray-500">Subject:</span> <span className="text-gray-200">{view.subject || '—'}</span></p>
            <div className="rounded-lg border border-ink-800 bg-ink-900 p-3 text-gray-300">{view.message}</div>
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete} loading={deleting}
        title="Delete enquiry?" message={`Remove the message from ${confirm?.name}?`} />
    </div>
  );
}
