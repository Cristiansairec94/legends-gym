import { Link } from 'react-router-dom';
import {
  Users, UserCheck, CalendarClock, ShoppingBag, Wallet,
  Clock, AlertTriangle, PackageX,
} from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import { dashboardService } from '../../services/adminService';
import StatsCard from '../../components/cards/StatsCard';
import StatusBadge from '../../components/common/StatusBadge';
import Loader from '../../components/common/Loader';
import PageHeading from '../../components/admin/PageHeading';
import { rs, formatDate } from '../../utils/format';

export default function Dashboard() {
  const { data, loading, error } = useFetch(() => dashboardService.stats(), []);

  if (loading) return <Loader label="Loading dashboard…" />;
  if (error) return <p className="rounded-xl border border-rose-500/30 p-6 text-rose-300">{error}</p>;

  const t = data?.totals || {};
  const cards = [
    { icon: Users, label: 'Total Members', value: t.members ?? 0, tone: 'brand' },
    { icon: UserCheck, label: 'Active Members', value: t.active_members ?? 0, tone: 'emerald' },
    { icon: Clock, label: 'Pending Memberships', value: t.pending_memberships ?? 0, tone: 'amber' },
    { icon: AlertTriangle, label: 'Expired Memberships', value: t.expired_memberships ?? 0, tone: 'rose' },
    { icon: ShoppingBag, label: 'Total Orders', value: t.total_orders ?? 0, tone: 'sky' },
    { icon: Clock, label: 'Pending Orders', value: t.pending_orders ?? 0, tone: 'amber' },
    { icon: Wallet, label: 'Monthly Revenue', value: rs(t.monthly_revenue), tone: 'violet' },
    { icon: CalendarClock, label: 'Upcoming Appointments', value: t.upcoming_appointments ?? 0, tone: 'sky' },
  ];

  const trend = data?.order_trend || [];
  const maxTrend = Math.max(1, ...trend.map((d) => d.value));

  return (
    <div>
      <PageHeading title="Dashboard" subtitle="Live overview pulled from the database" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => <StatsCard key={c.label} {...c} />)}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Order trend */}
        <div className="card p-5 lg:col-span-1">
          <h3 className="mb-1 font-display text-lg font-semibold text-white">Orders — last 7 days</h3>
          <p className="mb-4 text-xs text-gray-500">{t.low_stock_products ?? 0} products low on stock</p>
          <div className="flex h-40 items-end gap-2">
            {trend.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-brand/70 transition-all"
                  style={{ height: `${(d.value / maxTrend) * 100}%`, minHeight: d.value ? '6px' : '2px' }}
                  title={`${d.value} orders`}
                />
                <span className="text-[10px] text-gray-500">{d.label.split(' ')[1]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent members */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-white">Recent Members</h3>
            <Link to="/admin/members" className="text-xs text-brand hover:underline">View all</Link>
          </div>
          <ul className="space-y-3">
            {(data?.recent_members || []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{m.full_name}</p>
                  <p className="truncate text-xs text-gray-500">{m.member_code} · {formatDate(m.created_at)}</p>
                </div>
                <StatusBadge status={m.status} />
              </li>
            ))}
            {(!data?.recent_members || data.recent_members.length === 0) && (
              <li className="text-sm text-gray-500">No members yet.</li>
            )}
          </ul>
        </div>

        {/* Recent orders */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-white">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs text-brand hover:underline">View all</Link>
          </div>
          <ul className="space-y-3">
            {(data?.recent_orders || []).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{o.customer_name}</p>
                  <p className="truncate text-xs text-gray-500">{o.order_code} · {rs(o.total_amount)}</p>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
            {(!data?.recent_orders || data.recent_orders.length === 0) && (
              <li className="text-sm text-gray-500">No orders yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
