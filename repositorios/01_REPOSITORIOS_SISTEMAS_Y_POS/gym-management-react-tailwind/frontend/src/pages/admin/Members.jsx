import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Trash2, RefreshCw } from 'lucide-react';
import PageHeading from '../../components/admin/PageHeading';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import FormField from '../../components/admin/FormField';
import Loader from '../../components/common/Loader';
import { memberService } from '../../services/memberService';
import { planService } from '../../services/planService';
import { useFetch } from '../../hooks/useFetch';
import { toast } from '../../utils/toast';
import { rs, formatDate } from '../../utils/format';

const STATUS_OPTS = ['active', 'pending', 'expired', 'cancelled'];

export default function Members() {
  const [data, setData] = useState({ items: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [planId, setPlanId] = useState('');

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: plans } = useFetch(() => planService.list({ limit: 100 }), []);
  const planOptions = (plans?.items || []).map((p) => ({ value: String(p.id), label: p.name }));

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(() => ({
    page, limit: 10,
    ...(debounced ? { search: debounced } : {}),
    ...(status ? { status } : {}),
    ...(planId ? { plan_id: planId } : {}),
  }), [page, debounced, status, planId]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await memberService.list(params); setData(res.data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [params]);

  useEffect(() => { load(); }, [load]);

  const openProfile = async (row) => {
    setProfile({ member: row }); setProfileLoading(true);
    try { const res = await memberService.get(row.id); setProfile(res.data); }
    catch (err) { toast.error(err.message); setProfile(null); }
    finally { setProfileLoading(false); }
  };

  const openEdit = (row) => { setEditing(row); setForm({ ...row }); };
  const setField = (n, v) => setForm((f) => ({ ...f, [n]: v }));

  const saveEdit = async () => {
    setSaving(true);
    try {
      await memberService.update(editing.id, {
        full_name: form.full_name, email: form.email, phone: form.phone,
        gender: form.gender || null, date_of_birth: form.date_of_birth || null,
        address: form.address, emergency_contact: form.emergency_contact,
        status: form.status, notes: form.notes,
      });
      toast.success('Member updated'); setEditing(null); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    setDeleting(true);
    try { await memberService.remove(confirm.id); toast.success('Member deleted'); setConfirm(null); load(); }
    catch (err) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  const refresh = async () => {
    setRefreshing(true);
    try { await memberService.refreshStatuses(); toast.success('Statuses recalculated from expiry dates'); load(); }
    catch (err) { toast.error(err.message); }
    finally { setRefreshing(false); }
  };

  const columns = [
    { key: 'member_code', header: 'Code', render: (r) => <span className="font-mono text-xs text-gray-400">{r.member_code || '—'}</span> },
    { key: 'full_name', header: 'Member', render: (r) => (
      <div><p className="font-medium text-white">{r.full_name}</p><p className="text-xs text-gray-500">{r.email}</p></div>
    ) },
    { key: 'phone', header: 'Phone' },
    { key: 'current_plan', header: 'Plan', render: (r) => r.current_plan || '—' },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: '__a', header: 'Actions', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        <button className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-emerald-400" onClick={() => openProfile(r)} title="View profile"><Eye className="h-4 w-4" /></button>
        <button className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-sky-400" onClick={() => openEdit(r)} title="Edit"><Pencil className="h-4 w-4" /></button>
        <button className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-rose-400" onClick={() => setConfirm(r)} title="Delete"><Trash2 className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeading title="Members" subtitle="All registered customers and their membership status">
        <button className="btn-outline" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh Statuses
        </button>
      </PageHeading>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} className="sm:max-w-xs" placeholder="Search name, email, phone, code…" />
        <select className="input sm:max-w-[160px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className="input sm:max-w-[180px]" value={planId} onChange={(e) => { setPlanId(e.target.value); setPage(1); }}>
          <option value="">All plans</option>
          {planOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={data.items} loading={loading} error={error} onRetry={load}
        empty={{ title: 'No members found', subtitle: 'Members appear here after they register on the website.' }} />
      <Pagination page={data.pagination?.page} pages={data.pagination?.pages} total={data.pagination?.total} onChange={setPage} />

      {/* Profile modal */}
      <Modal open={!!profile} onClose={() => setProfile(null)} title="Member Profile" maxWidth="max-w-3xl">
        {profileLoading ? <Loader label="Loading profile…" /> : profile && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Info label="Name" value={profile.member?.full_name} />
              <Info label="Code" value={profile.member?.member_code} />
              <Info label="Status" value={<StatusBadge status={profile.member?.status} />} />
              <Info label="Email" value={profile.member?.email} />
              <Info label="Phone" value={profile.member?.phone} />
              <Info label="Gender" value={profile.member?.gender} />
              <Info label="DOB" value={formatDate(profile.member?.date_of_birth)} />
              <Info label="Emergency" value={profile.member?.emergency_contact} />
              <Info label="Address" value={profile.member?.address} />
            </div>

            <HistoryBlock title="Memberships" rows={profile.memberships} render={(m) => (
              <span>{m.plan_name} · {rs(m.price)} · {formatDate(m.start_date)}→{formatDate(m.end_date)} <StatusBadge status={m.status} /></span>
            )} />
            <HistoryBlock title="Payments" rows={profile.payments} render={(p) => (
              <span>{rs(p.amount)} · {p.method} · <StatusBadge status={p.status} /></span>
            )} />
            <HistoryBlock title="Appointments" rows={profile.appointments} render={(a) => (
              <span>{formatDate(a.appointment_date)} {a.appointment_time?.slice(0,5)} · <StatusBadge status={a.status} /></span>
            )} />
            <HistoryBlock title="Orders" rows={profile.orders} render={(o) => (
              <span>{o.order_code} · {rs(o.total_amount)} · <StatusBadge status={o.status} /></span>
            )} />
          </div>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Member" maxWidth="max-w-2xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField field={{ name: 'full_name', label: 'Full Name', required: true }} value={form.full_name} onChange={setField} />
          <FormField field={{ name: 'email', label: 'Email', type: 'email', required: true }} value={form.email} onChange={setField} />
          <FormField field={{ name: 'phone', label: 'Phone' }} value={form.phone} onChange={setField} />
          <FormField field={{ name: 'gender', label: 'Gender', type: 'select', options: [{value:'male',label:'Male'},{value:'female',label:'Female'},{value:'other',label:'Other'}] }} value={form.gender} onChange={setField} />
          <FormField field={{ name: 'date_of_birth', label: 'Date of Birth', type: 'date' }} value={form.date_of_birth?.slice?.(0,10) || form.date_of_birth} onChange={setField} />
          <FormField field={{ name: 'status', label: 'Status', type: 'select', options: STATUS_OPTS.map((s)=>({value:s,label:s})) }} value={form.status} onChange={setField} />
          <FormField field={{ name: 'emergency_contact', label: 'Emergency Contact' }} value={form.emergency_contact} onChange={setField} />
          <div className="sm:col-span-2"><FormField field={{ name: 'address', label: 'Address', type: 'textarea' }} value={form.address} onChange={setField} /></div>
          <div className="sm:col-span-2"><FormField field={{ name: 'notes', label: 'Notes', type: 'textarea' }} value={form.notes} onChange={setField} /></div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete} loading={deleting}
        title="Delete member?" message={`Permanently remove ${confirm?.full_name}? Their memberships and history will be removed too.`} />
    </div>
  );
}

const Info = ({ label, value }) => (
  <div>
    <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    <p className="text-sm text-gray-200">{value || '—'}</p>
  </div>
);

const HistoryBlock = ({ title, rows, render }) => (
  <div>
    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
    {rows && rows.length ? (
      <ul className="space-y-1.5">
        {rows.map((r) => <li key={r.id} className="rounded-lg border border-ink-800 bg-ink-900 px-3 py-2 text-sm text-gray-300">{render(r)}</li>)}
      </ul>
    ) : <p className="text-sm text-gray-600">None yet.</p>}
  </div>
);
