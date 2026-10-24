import ResourceManager from '../../components/admin/ResourceManager';
import StatusBadge from '../../components/common/StatusBadge';
import { paymentService } from '../../services/planService';
import { memberService } from '../../services/memberService';
import { useFetch } from '../../hooks/useFetch';
import { rs, formatDate } from '../../utils/format';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'other', label: 'Other' },
];
const STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
];

export default function Payments() {
  const { data: memberData } = useFetch(() => memberService.list({ limit: 100 }), []);
  const memberOptions = (memberData?.items || []).map((m) => ({ value: String(m.id), label: `${m.full_name} (${m.member_code || m.email})` }));

  return (
    <ResourceManager
      title="Payments"
      subtitle="Record and track membership payments — no fake gateway, admin-managed"
      service={paymentService}
      createLabel="Record Payment"
      searchable={false}
      filters={[{ name: 'status', label: 'All statuses', options: STATUSES }]}
      defaultValues={{ method: 'cash', status: 'pending' }}
      columns={[
        { key: 'id', header: 'Ref', render: (r) => <span className="text-xs text-gray-500">#{r.id}{r.reference ? ` · ${r.reference}` : ''}</span> },
        { key: 'amount', header: 'Amount', render: (r) => <span className="font-medium text-white">{rs(r.amount)}</span> },
        { key: 'method', header: 'Method', render: (r) => <span className="capitalize">{String(r.method).replace('_', ' ')}</span> },
        { key: 'paid_at', header: 'Paid On', render: (r) => formatDate(r.paid_at) },
        { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
      ]}
      fields={[
        { name: 'member_id', label: 'Member', type: 'select', options: memberOptions, colSpan: 2 },
        { name: 'amount', label: 'Amount (Rs.)', type: 'number', required: true },
        { name: 'method', label: 'Method', type: 'select', options: METHODS },
        { name: 'status', label: 'Status', type: 'select', options: STATUSES },
        { name: 'paid_at', label: 'Paid On', type: 'date' },
        { name: 'reference', label: 'Reference / Transaction ID', colSpan: 2 },
        { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
      ]}
      beforeSubmit={(v) => ({
        member_id: v.member_id ? Number(v.member_id) : null,
        amount: Number(v.amount) || 0,
        method: v.method || 'cash',
        status: v.status || 'pending',
        paid_at: v.paid_at || null,
        reference: v.reference || null,
        notes: v.notes || null,
      })}
    />
  );
}
