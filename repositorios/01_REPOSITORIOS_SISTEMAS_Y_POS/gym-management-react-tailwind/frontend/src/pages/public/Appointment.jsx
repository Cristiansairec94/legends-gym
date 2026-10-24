import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import PageHeader from './PageHeader';
import { useFetch } from '../../hooks/useFetch';
import { trainerService, serviceService } from '../../services/trainerService';
import { appointmentService } from '../../services/appointmentService';
import { toast } from '../../utils/toast';

const today = new Date().toISOString().slice(0, 10);

export default function Appointment() {
  const { data: trainers } = useFetch(() => trainerService.list({ is_active: true }), []);
  const { data: services } = useFetch(() => serviceService.list({ is_active: true }), []);
  const [form, setForm] = useState({ customer_name: '', email: '', phone: '', service_id: '', trainer_id: '', appointment_date: '', appointment_time: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.appointment_date) e.appointment_date = 'Pick a date';
    else if (form.appointment_date < today) e.appointment_date = 'Date cannot be in the past';
    if (!form.appointment_time) e.appointment_time = 'Pick a time';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await appointmentService.book({
        ...form,
        trainer_id: form.trainer_id || undefined,
        service_id: form.service_id || undefined,
      });
      setDone(true);
      toast.success('Appointment requested!');
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
        <h1 className="mt-4 font-heading text-3xl uppercase text-white">Booking Received</h1>
        <p className="mt-2 text-gray-400">We'll confirm your appointment shortly via email or phone.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Book an Appointment" subtitle="Reserve a session with our expert trainers" />
      <section className="container-x max-w-2xl py-16">
        <div className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name</label>
              <input value={form.customer_name} onChange={set('customer_name')} className="input" />
              {errors.customer_name && <p className="mt-1 text-xs text-rose-400">{errors.customer_name}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={set('email')} className="input" />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Phone</label>
              <input value={form.phone} onChange={set('phone')} className="input" />
            </div>
            <div>
              <label className="label">Service</label>
              <select value={form.service_id} onChange={set('service_id')} className="input">
                <option value="">Any service</option>
                {services?.items?.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Trainer</label>
              <select value={form.trainer_id} onChange={set('trainer_id')} className="input">
                <option value="">Any trainer</option>
                {trainers?.items?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" min={today} value={form.appointment_date} onChange={set('appointment_date')} className="input" />
              {errors.appointment_date && <p className="mt-1 text-xs text-rose-400">{errors.appointment_date}</p>}
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" value={form.appointment_time} onChange={set('appointment_time')} className="input" />
              {errors.appointment_time && <p className="mt-1 text-xs text-rose-400">{errors.appointment_time}</p>}
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea value={form.notes} onChange={set('notes')} rows={3} className="input" />
          </div>
          <button onClick={submit} disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? 'Booking…' : 'Book Appointment'}
          </button>
        </div>
      </section>
    </div>
  );
}
