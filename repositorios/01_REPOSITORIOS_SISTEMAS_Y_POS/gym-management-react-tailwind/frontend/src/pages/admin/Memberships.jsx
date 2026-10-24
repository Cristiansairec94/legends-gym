import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import PageHeading from '../../components/admin/PageHeading';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import FormField from '../../components/admin/FormField';
import { membershipService, planService } from '../../services/planService';
import { memberService } from '../../services/memberService';
import { useFetch } from '../../hooks/useFetch';
import { toast } from '../../utils/toast';
import { rs, formatDate } from '../../utils/format';

const STATUSES = ['pending', 'active', 'expired', 'cancelled'];

export default function Memberships() {
  const [data, setData] = useState({ items: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ status: 'active' });
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data: members } = useFetch(() => memberService.list({ limit: 100 }), []);
  const { data: plans } = useFetch(() => planService.list({ limit: 100 }), []);
  const memberOptions = (members?.items || []).map((m) => ({ value: String(m.id), label: `${m.full_name} (${m.member_code || m.email})` }));
  const planOptions = (plans?.items || []).map((p) => ({ value: String(p.id), label: `${p.name} — ${rs(p.price)}` }));

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const params = useMemo(() => ({ page, limit: 10, ...(debounced ? { search: debounced } : {}), ...(status ? { status } : {}) }), [page, debounced, status]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await membershipService.list(params); setData(res.data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [params]);
  useEffect(() => { load(); }, [load]);

  const setField = (n, v) => setForm((f) => ({ ...f, [n]: v }));
  const create = async () => {
    if (!form.member_id || !form.plan_id) { toast.error('Select a member and plan'); return; }
    setSaving(true);
    try {
      await membershipService.create({ member_id: Number(form.member_id), plan_id: Number(form.plan_id), start_date: form.start_date || null, status: form.status });
      toast.success('Membership created'); setModal(false); setForm({ status: 'active' }); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };
  const changeStatus = async (m, next) => {
    try { await membershipService.updateStatus(m.id, next); toast.success(`Membership → ${next}`); load(); }
    catch (err) { toast.error(err.message); }
  };
  const doDelete = async () => {
    setDeleting(true);
    try { await membershipService.remove(confirm.id); toast.success('Membership deleted'); setConfirm(null); load(); }
    catch (err) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  const columns = [
    { key: 'member_name', header: 'Member', render: (r) => (
      <div><p className="font-medium text-white">{r.member_name}</p><p className="text-xs text-gray-500">{r.member_code}</p></div>
    ) },
    { key: 'plan_name', header: 'Plan' },
    { key: 'price', header: 'Price', render: (r) => rs(r.price) },
    { key: 'period', header: 'Period', render: (r) => <span className="text-xs text-gray-400">{formatDate(r.start_date)} → {formatDate(r.end_date)}</span> },
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
      <PageHeading title="Memberships" subtitle="Active and historical plan subscriptions">
        <button className="btn-primary" onClick={() => setModal(true)}><Plus className="h-4 w-4" /> New Membership</button>
      </PageHeading>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} className="sm:max-w-xs" placeholder="Search member…" />
        <select className="input sm:max-w-[170px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <DataTable columns={columns} rows={data.items} loading={loading} error={error} onRetry={load}
        empty={{ title: 'No memberships', subtitle: 'Create one or wait for website registrations.' }} />
      <Pagination page={data.pagination?.page} pages={data.pagination?.pages} total={data.pagination?.total} onChange={setPage} />

      <Modal open={modal} onClose={() => setModal(false)} title="New Membership" maxWidth="max-w-lg">
        <div className="grid grid-cols-1 gap-4">
          <FormField field={{ name: 'member_id', label: 'Member', type: 'select', options: memberOptions, required: true }} value={form.member_id} onChange={setField} />
          <FormField field={{ name: 'plan_id', label: 'Plan', type: 'select', options: planOptions, required: true }} value={form.plan_id} onChange={setField} />
          <div className="grid grid-cols-2 gap-4">
            <FormField field={{ name: 'start_date', label: 'Start Date', type: 'date' }} value={form.start_date} onChange={setField} />
            <FormField field={{ name: 'status', label: 'Status', type: 'select', options: STATUSES.map((s)=>({value:s,label:s})) }} value={form.status} onChange={setField} />
          </div>
          <p className="text-xs text-gray-500">End date is calculated automatically from the plan duration.</p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-outline" onClick={() => setModal(false)} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete} loading={deleting}
        title="Delete membership?" message={`Remove ${confirm?.member_name}'s ${confirm?.plan_name} membership?`} />
    </div>
  );
}
