import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import PageHeader from './PageHeader';
import { useContent } from '../../hooks/useContent';
import { enquiryService } from '../../services/adminService';
import { toast } from '../../utils/toast';

export default function Contact() {
  const { content } = useContent();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.message.trim()) e.message = 'Message is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await enquiryService.submit(form);
      toast.success('Message sent! We will get back to you soon.');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const info = [
    { icon: MapPin, label: 'Address', value: content.contact_address },
    { icon: Phone, label: 'Phone', value: content.contact_phone },
    { icon: Mail, label: 'Email', value: content.contact_email },
    { icon: Clock, label: 'Hours', value: content.opening_hours },
  ];

  return (
    <div>
      <PageHeader title="Contact Us" subtitle="We'd love to hear from you" />
      <section className="container-x grid gap-10 py-16 lg:grid-cols-2">
        <div>
          <div className="grid gap-4 sm:grid-cols-2">
            {info.map((i) => (
              <div key={i.label} className="card p-5">
                <i.icon className="h-6 w-6 text-brand" />
                <p className="mt-3 text-xs uppercase tracking-wide text-gray-500">{i.label}</p>
                <p className="mt-1 text-sm text-gray-200">{i.value || '—'}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-ink-700">
            <iframe title="map" className="h-64 w-full grayscale"
              src="https://www.google.com/maps?q=Karachi&output=embed" loading="lazy" />
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h3 className="font-display text-lg font-semibold text-white">Send a Message</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input value={form.name} onChange={set('name')} className="input" />
              {errors.name && <p className="mt-1 text-xs text-rose-400">{errors.name}</p>}
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" value={form.email} onChange={set('email')} className="input" />
              {errors.email && <p className="mt-1 text-xs text-rose-400">{errors.email}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Phone</label><input value={form.phone} onChange={set('phone')} className="input" /></div>
            <div><label className="label">Subject</label><input value={form.subject} onChange={set('subject')} className="input" /></div>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea value={form.message} onChange={set('message')} rows={4} className="input" />
            {errors.message && <p className="mt-1 text-xs text-rose-400">{errors.message}</p>}
          </div>
          <button onClick={submit} disabled={submitting} className="btn-primary w-full py-3">
            <Send className="h-4 w-4" />{submitting ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </section>
    </div>
  );
}
