import { useMemo, useRef, useState } from 'react';
import { CalendarClock, CreditCard, Images, Star, Upload, Trash2, ShoppingBag, BadgeCheck, Clock } from 'lucide-react';
import PageHeader from '../public/PageHeader';
import Loader from '../../components/common/Loader';
import StatusBadge from '../../components/common/StatusBadge';
import PlanCard from '../../components/cards/PlanCard';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { accountService } from '../../services/accountService';
import { planService } from '../../services/planService';
import { toast } from '../../utils/toast';
import { rs, formatDate, daysBetween } from '../../utils/format';

const TABS = [
  { key: 'overview', label: 'Overview', icon: CalendarClock },
  { key: 'orders', label: 'My Orders', icon: ShoppingBag },
  { key: 'photos', label: 'My Photos', icon: Images },
  { key: 'review', label: 'Leave a Review', icon: Star },
];

export default function AccountDashboard() {
  const { user } = useAuth();
  const { data, loading, refetch } = useFetch(() => accountService.summary(), []);
  const [tab, setTab] = useState('overview');

  if (loading) return <><PageHeader title="My Account" subtitle="Loading your dashboard…" /><Loader className="min-h-[40vh]" /></>;

  const s = data || {};
  const current = s.current_membership;

  return (
    <div>
      <PageHeader title={`Welcome, ${s.member?.full_name || user?.name || 'Member'}`} subtitle={s.member?.member_code ? `Member ID: ${s.member.member_code}` : 'Your member dashboard'} />
      <section className="container-x py-12">
        {/* Current plan banner */}
        <CurrentPlan current={current} onSubscribed={refetch} />

        {/* Tabs */}
        <div className="mt-10 flex flex-wrap gap-2 border-b border-ink-800">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${tab === t.key ? 'border-b-2 border-brand text-brand' : 'text-gray-400 hover:text-white'}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {tab === 'overview' && <Overview s={s} />}
          {tab === 'orders' && <Orders orders={s.orders} />}
          {tab === 'photos' && <Photos photos={s.photos} onChange={refetch} />}
          {tab === 'review' && <ReviewForm reviews={s.reviews} onSubmitted={refetch} />}
        </div>
      </section>
    </div>
  );
}

/* ---------------- Current plan / subscribe ---------------- */
function CurrentPlan({ current, onSubscribed }) {
  const { data: plans } = useFetch(() => planService.list(), []);
  const [busy, setBusy] = useState(null);

  const subscribe = async (plan_id) => {
    setBusy(plan_id);
    try { await accountService.subscribe({ plan_id }); toast.success('Plan requested! Awaiting payment confirmation.'); onSubscribed(); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(null); }
  };

  if (current) {
    const total = daysBetween(current.start_date, current.end_date);
    const left = Math.max(0, daysBetween(new Date(), current.end_date));
    const pct = Math.min(100, Math.max(0, Math.round(((total - left) / (total || 1)) * 100)));
    return (
      <div className="card overflow-hidden">
        <div className="grid gap-6 p-6 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/15 text-brand"><BadgeCheck className="h-6 w-6" /></span>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Current Plan</p>
                <h3 className="font-display text-xl font-semibold text-white">{current.plan_name}</h3>
              </div>
              <span className="ml-auto"><StatusBadge status={current.status} /></span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <Info label="Price" value={rs(current.price)} />
              <Info label="Start Date" value={formatDate(current.start_date)} />
              <Info label="End Date" value={formatDate(current.end_date)} />
            </div>
            {current.status === 'pending' && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-300"><Clock className="h-4 w-4" />Awaiting payment confirmation from our team to activate this plan.</p>
            )}
          </div>
          <div className="flex flex-col justify-center rounded-xl border border-ink-800 bg-ink-950/50 p-5 text-center">
            <p className="font-heading text-4xl text-white">{left}</p>
            <p className="text-xs text-gray-400">days remaining</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-800">
              <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No plan yet — let the member pick one
  return (
    <div className="card p-6">
      <h3 className="font-display text-lg font-semibold text-white">You don't have an active plan yet</h3>
      <p className="mt-1 text-sm text-gray-400">Choose a membership below — our team confirms your payment to activate it.</p>
      {!plans ? <Loader /> : !plans.items.length ? (
        <p className="mt-6 text-sm text-gray-500">No plans available right now. Please check back soon.</p>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.items.map((p) => (
            <div key={p.id} className="relative">
              <PlanCardSubscribe plan={p} busy={busy === p.id} onSubscribe={() => subscribe(p.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCardSubscribe({ plan, busy, onSubscribe }) {
  const features = Array.isArray(plan.features) ? plan.features : [];
  return (
    <div className={`flex h-full flex-col rounded-xl border p-6 transition ${plan.is_featured ? 'border-brand bg-gradient-to-b from-brand/15 to-ink-900' : 'border-ink-700 bg-ink-900 hover:border-ink-600'}`}>
      <h3 className="font-display text-lg font-semibold uppercase text-white">{plan.name}</h3>
      <p className="mt-2 font-heading text-3xl text-white">{rs(plan.price)}</p>
      <p className="text-xs text-gray-500">{plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}</p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-300">
        {features.slice(0, 4).map((f, i) => <li key={i}>• {f}</li>)}
      </ul>
      <button onClick={onSubscribe} disabled={busy} className="btn-primary mt-5 w-full">{busy ? 'Requesting…' : 'Choose Plan'}</button>
    </div>
  );
}

function Info({ label, value }) {
  return <div><p className="text-xs uppercase tracking-wide text-gray-500">{label}</p><p className="mt-0.5 font-medium text-gray-100">{value}</p></div>;
}

/* ---------------- Overview: history + payments ---------------- */
function Overview({ s }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="card p-5">
        <h4 className="mb-4 flex items-center gap-2 font-display font-semibold text-white"><CalendarClock className="h-4 w-4 text-brand" />Membership History</h4>
        {s.memberships?.length ? (
          <div className="space-y-3">
            {s.memberships.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-ink-800 p-3">
                <div><p className="text-sm font-medium text-white">{m.plan_name}</p><p className="text-xs text-gray-500">{formatDate(m.start_date)} → {formatDate(m.end_date)}</p></div>
                <StatusBadge status={m.status} />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No memberships yet.</p>}
      </div>
      <div className="card p-5">
        <h4 className="mb-4 flex items-center gap-2 font-display font-semibold text-white"><CreditCard className="h-4 w-4 text-brand" />Payments</h4>
        {s.payments?.length ? (
          <div className="space-y-3">
            {s.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-ink-800 p-3">
                <div><p className="text-sm font-medium text-white">{rs(p.amount)}</p><p className="text-xs text-gray-500">{p.method} · {formatDate(p.created_at)}</p></div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No payments yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- Orders ---------------- */
function Orders({ orders }) {
  if (!orders?.length) return <p className="text-sm text-gray-500">You haven't placed any orders yet.</p>;
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="card flex items-center justify-between p-4">
          <div><p className="font-medium text-white">{o.order_code}</p><p className="text-xs text-gray-500">{formatDate(o.created_at)}</p></div>
          <div className="text-right"><p className="font-display text-brand">{rs(o.total_amount)}</p><StatusBadge status={o.status} /></div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Photos: upload + list ---------------- */
function Photos({ photos, onChange }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    if (!file) { toast.error('Choose an image first'); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      if (title) fd.append('title', title);
      await accountService.uploadPhoto(fd);
      toast.success('Photo uploaded! It appears in the gallery once approved.');
      setFile(null); setTitle(''); if (fileRef.current) fileRef.current.value = '';
      onChange();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    try { await accountService.deletePhoto(id); toast.success('Photo removed'); onChange(); }
    catch (err) { toast.error(err.message); }
  };

  return (
    <div>
      <div className="card p-5">
        <h4 className="mb-4 flex items-center gap-2 font-display font-semibold text-white"><Upload className="h-4 w-4 text-brand" />Upload a Gym Photo</h4>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Caption (optional)" className="input" />
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-800 file:px-4 file:py-2.5 file:text-sm file:text-gray-200 hover:file:bg-ink-700" />
        </div>
        <button onClick={upload} disabled={busy} className="btn-primary mt-4"><Upload className="h-4 w-4" />{busy ? 'Uploading…' : 'Upload Photo'}</button>
        <p className="mt-2 text-xs text-gray-500">Photos are reviewed by our team before appearing in the public gallery.</p>
      </div>

      <div className="mt-6">
        {photos?.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl border border-ink-700">
                <img src={p.image_url} alt={p.title || 'Photo'} className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink-950/80 px-2 py-1.5">
                  <StatusBadge status={p.is_active ? 'approved' : 'pending'} />
                  {!p.is_active && <button onClick={() => del(p.id)} className="rounded p-1 text-gray-400 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">No photos uploaded yet.</p>}
      </div>
    </div>
  );
}

/* ---------------- Review form ---------------- */
function ReviewForm({ reviews, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!message.trim()) { toast.error('Write a short message'); return; }
    setBusy(true);
    try { await accountService.submitReview({ rating, message }); toast.success('Thanks! Your review will appear after approval.'); setMessage(''); setRating(5); onSubmitted(); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="card p-5">
        <h4 className="mb-4 font-display font-semibold text-white">Share Your Experience</h4>
        <label className="label">Rating</label>
        <div className="mb-4 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} onClick={() => setRating(i + 1)}>
              <Star className={`h-7 w-7 transition ${i < rating ? 'fill-brand text-brand' : 'text-ink-600 hover:text-ink-500'}`} />
            </button>
          ))}
        </div>
        <label className="label">Your Review</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="input min-h-[120px]" placeholder="Tell us about your journey at IBBC…" />
        <button onClick={submit} disabled={busy} className="btn-primary mt-4">{busy ? 'Submitting…' : 'Submit Review'}</button>
      </div>
      <div>
        <h4 className="mb-4 font-display font-semibold text-white">Your Reviews</h4>
        {reviews?.length ? (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? 'fill-brand text-brand' : 'text-ink-600'}`} />)}</div>
                  <StatusBadge status={r.is_approved ? 'approved' : 'pending'} />
                </div>
                <p className="text-sm text-gray-300">"{r.message}"</p>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-500">You haven't written a review yet.</p>}
      </div>
    </div>
  );
}
