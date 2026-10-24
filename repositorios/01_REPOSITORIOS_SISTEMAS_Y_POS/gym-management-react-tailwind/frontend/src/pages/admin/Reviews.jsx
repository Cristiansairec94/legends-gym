import { useCallback, useEffect, useState } from 'react';
import { Check, X, Pencil, Trash2, Star } from 'lucide-react';
import PageHeading from '../../components/admin/PageHeading';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FormField from '../../components/admin/FormField';
import StatusBadge from '../../components/common/StatusBadge';
import { reviewService } from '../../services/adminService';
import { toast } from '../../utils/toast';
import { formatDate } from '../../utils/format';

export default function Reviews() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await reviewService.list({ all: true }); setRows(res.data.items || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = async (r) => {
    try { await reviewService.setApproval(r.id, !r.is_approved); toast.success(r.is_approved ? 'Unpublished' : 'Approved & published'); load(); }
    catch (err) { toast.error(err.message); }
  };
  const setField = (n, v) => setForm((f) => ({ ...f, [n]: v }));
  const saveEdit = async () => {
    setSaving(true);
    try {
      await reviewService.update(editing.id, { customer_name: form.customer_name, role_label: form.role_label, rating: Number(form.rating) || 5, message: form.message });
      toast.success('Review updated'); setEditing(null); load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };
  const doDelete = async () => {
    setDeleting(true);
    try { await reviewService.remove(confirm.id); toast.success('Review deleted'); setConfirm(null); load(); }
    catch (err) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  const columns = [
    { key: 'customer_name', header: 'Customer', render: (r) => (
      <div><p className="font-medium text-white">{r.customer_name}</p><p className="text-xs text-gray-500">{r.role_label || '—'}</p></div>
    ) },
    { key: 'rating', header: 'Rating', render: (r) => (
      <span className="inline-flex items-center gap-0.5 text-amber-400">{Array.from({length: r.rating}).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</span>
    ) },
    { key: 'message', header: 'Review', render: (r) => <p className="max-w-sm truncate text-gray-300">{r.message}</p> },
    { key: 'is_approved', header: 'Published', render: (r) => <StatusBadge status={r.is_approved ? 'approved' : 'pending'} /> },
    { key: '__a', header: 'Actions', className: 'text-right', render: (r) => (
      <div className="flex items-center justify-end gap-1">
        <button className={`rounded-lg p-2 hover:bg-ink-800 ${r.is_approved ? 'text-amber-400' : 'text-emerald-400'}`} onClick={() => toggle(r)} title={r.is_approved ? 'Unpublish' : 'Approve'}>
          {r.is_approved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        </button>
        <button className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-sky-400" onClick={() => { setEditing(r); setForm({ ...r }); }}><Pencil className="h-4 w-4" /></button>
        <button className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-rose-400" onClick={() => setConfirm(r)}><Trash2 className="h-4 w-4" /></button>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeading title="Reviews & Testimonials" subtitle="Only approved reviews appear on the public website" />
      <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={load}
        empty={{ title: 'No reviews yet', subtitle: 'Submitted testimonials will appear here for approval.' }} />

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Review" maxWidth="max-w-lg">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField field={{ name: 'customer_name', label: 'Customer Name', required: true }} value={form.customer_name} onChange={setField} />
          <FormField field={{ name: 'role_label', label: 'Role Label', placeholder: 'Gold Member' }} value={form.role_label} onChange={setField} />
          <FormField field={{ name: 'rating', label: 'Rating (1–5)', type: 'number' }} value={form.rating} onChange={setField} />
          <div className="sm:col-span-2"><FormField field={{ name: 'message', label: 'Message', type: 'textarea' }} value={form.message} onChange={setField} /></div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)} onConfirm={doDelete} loading={deleting}
        title="Delete review?" message={`Remove the review by ${confirm?.customer_name}?`} />
    </div>
  );
}
