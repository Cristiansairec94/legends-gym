import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye } from 'lucide-react';
import PageHeading from '../../components/admin/PageHeading';
import DataTable from '../../components/admin/DataTable';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import { orderService } from '../../services/orderService';
import { toast } from '../../utils/toast';
import { rs, formatDate } from '../../utils/format';

const STATUSES = ['pending', 'confirmed', 'processing', 'completed', 'cancelled'];

export default function Orders() {
  const [data, setData] = useState({ items: [], pagination: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);
  const params = useMemo(() => ({ page, limit: 10, ...(debounced ? { search: debounced } : {}), ...(status ? { status } : {}) }), [page, debounced, status]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const res = await orderService.list(params); setData(res.data); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [params]);
  useEffect(() => { load(); }, [load]);

  const changeStatus = async (order, next) => {
    try { await orderService.updateStatus(order.id, next); toast.success(`Order ${order.order_code} → ${next}`); load(); }
    catch (err) { toast.error(err.message); }
  };

  const view = async (order) => {
    setDetail({ order }); setDetailLoading(true);
    try { const res = await orderService.get(order.id); setDetail(res.data); }
    catch (err) { toast.error(err.message); setDetail(null); }
    finally { setDetailLoading(false); }
  };

  const columns = [
    { key: 'order_code', header: 'Order', render: (r) => (
      <div><p className="font-mono text-xs text-gray-300">{r.order_code}</p><p className="text-xs text-gray-500">{formatDate(r.created_at)}</p></div>
    ) },
    { key: 'customer_name', header: 'Customer', render: (r) => (
      <div><p className="font-medium text-white">{r.customer_name}</p><p className="text-xs text-gray-500">{r.email}</p></div>
    ) },
    { key: 'total_amount', header: 'Total', render: (r) => <span className="font-medium text-white">{rs(r.total_amount)}</span> },
    { key: 'status', header: 'Status', render: (r) => (
      <select className="input py-1.5 text-xs" value={r.status} onChange={(e) => changeStatus(r, e.target.value)}>
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    ) },
    { key: '__a', header: '', className: 'text-right', render: (r) => (
      <button className="rounded-lg p-2 text-gray-400 hover:bg-ink-800 hover:text-emerald-400" onClick={() => view(r)} title="View items"><Eye className="h-4 w-4" /></button>
    ) },
  ];

  return (
    <div>
      <PageHeading title="Orders" subtitle="Store orders — cancelling an order automatically restocks products" />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} className="sm:max-w-xs" placeholder="Search code, name, email…" />
        <select className="input sm:max-w-[170px]" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable columns={columns} rows={data.items} loading={loading} error={error} onRetry={load}
        empty={{ title: 'No orders yet', subtitle: 'Orders placed in the store will appear here.' }} />
      <Pagination page={data.pagination?.page} pages={data.pagination?.pages} total={data.pagination?.total} onChange={setPage} />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Order ${detail?.order?.order_code || ''}`} maxWidth="max-w-2xl">
        {detailLoading ? <Loader /> : detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <p><span className="text-gray-500">Customer:</span> <span className="text-gray-200">{detail.order?.customer_name}</span></p>
              <p><span className="text-gray-500">Phone:</span> <span className="text-gray-200">{detail.order?.phone || '—'}</span></p>
              <p className="col-span-2"><span className="text-gray-500">Address:</span> <span className="text-gray-200">{detail.order?.address || '—'}</span></p>
            </div>
            <div className="overflow-hidden rounded-lg border border-ink-800">
              <table className="min-w-full text-sm">
                <thead className="bg-ink-900 text-xs uppercase text-gray-500">
                  <tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Unit</th><th className="px-3 py-2 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-ink-800">
                  {(detail.items || []).map((it) => (
                    <tr key={it.id}><td className="px-3 py-2 text-gray-200">{it.product_name}</td><td className="px-3 py-2 text-right">{it.quantity}</td><td className="px-3 py-2 text-right">{rs(it.unit_price)}</td><td className="px-3 py-2 text-right">{rs(it.line_total)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between border-t border-ink-800 pt-3">
              <StatusBadge status={detail.order?.status} />
              <span className="font-display text-lg font-semibold text-white">{rs(detail.order?.total_amount)}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
