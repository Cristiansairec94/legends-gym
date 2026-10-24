import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import PageHeader from './PageHeader';
import Loader from '../../components/common/Loader';
import { useFetch } from '../../hooks/useFetch';
import { planService } from '../../services/planService';
import { memberService } from '../../services/memberService';
import { toast } from '../../utils/toast';
import { rs } from '../../utils/format';

const today = new Date().toISOString().slice(0, 10);

export default function MembershipRegister() {
  const [params] = useSearchParams();
  const { data: plans, loading } = useFetch(() => planService.list(), []);
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', date_of_birth: '', gender: '',
    address: '', emergency_contact: '', plan_id: '', start_date: today, notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    const pid = params.get('plan');
    if (pid) setForm((f) => ({ ...f, plan_id: pid }));
  }, [params]);

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.plan_id) e.plan_id = 'Select a plan';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await memberService.registerMembership(form);
      setDone(res.data);
      toast.success('Registration submitted!');
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
        <h1 className="mt-4 font-heading text-3xl uppercase text-white">Welcome to IBBC!</h1>
        <p className="mt-2 text-gray-400">Your member ID is <span className="text-brand">{done.member.member_code}</span>.</p>
        <p className="mt-1 text-sm text-gray-500">Our team will confirm your payment to activate the membership.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Become a Member" subtitle="Start your transformation today" />
      <section className="container-x max-w-3xl py-16">
        {loading ? <Loader /> : (
          <div className="card space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Full Name *</label><input value={form.full_name} onChange={set('full_name')} className="input" />{errors.full_name && <p className="mt-1 text-xs text-rose-400">{errors.full_name}</p>}</div>
              <div><label className="label">Email *</label><input type="email" value={form.email} onChange={set('email')} className="input" />{errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label">Phone *</label><input value={form.phone} onChange={set('phone')} className="input" />{errors.phone && <p className="mt-1 text-xs text-rose-400">{errors.phone}</p>}</div>
              <div><label className="label">Date of Birth</label><input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} className="input" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Gender</label>
                <select value={form.gender} onChange={set('gender')} className="input">
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div><label className="label">Emergency Contact</label><input value={form.emergency_contact} onChange={set('emergency_contact')} className="input" /></div>
            </div>
            <div><label className="label">Address</label><textarea value={form.address} onChange={set('address')} rows={2} className="input" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Membership Plan *</label>
                <select value={form.plan_id} onChange={set('plan_id')} className="input">
                  <option value="">Choose a plan</option>
                  {plans?.items?.map((p) => <option key={p.id} value={p.id}>{p.name} — {rs(p.price)} / {p.duration_months}mo</option>)}
                </select>
                {errors.plan_id && <p className="mt-1 text-xs text-rose-400">{errors.plan_id}</p>}
              </div>
              <div><label className="label">Start Date</label><input type="date" min={today} value={form.start_date} onChange={set('start_date')} className="input" /></div>
            </div>
            <div><label className="label">Additional Notes</label><textarea value={form.notes} onChange={set('notes')} rows={2} className="input" /></div>
            <p className="rounded-lg bg-ink-800 p-3 text-xs text-gray-400">Payment is recorded and confirmed by our staff — no online card payment is taken here.</p>
            <button onClick={submit} disabled={submitting} className="btn-primary w-full py-3">{submitting ? 'Submitting…' : 'Submit Registration'}</button>
          </div>
        )}
      </section>
    </div>
  );
}
