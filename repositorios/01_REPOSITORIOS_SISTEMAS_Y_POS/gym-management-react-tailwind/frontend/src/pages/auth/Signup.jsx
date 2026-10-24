import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { AuthShell, Field } from './Login';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (!form.name || !form.email || form.password.length < 6) return toast.error('Fill all fields (password 6+ chars)');
    setSubmitting(true);
    try {
      await register(form);
      toast.success('Account created!');
      navigate('/');
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <AuthShell title="Create Account" subtitle="Join the IBBC community">
      <Field label="Full Name" value={form.name} onChange={set('name')} />
      <Field label="Email" type="email" value={form.email} onChange={set('email')} />
      <Field label="Phone" value={form.phone} onChange={set('phone')} />
      <Field label="Password" type="password" value={form.password} onChange={set('password')} onEnter={submit} />
      <button onClick={submit} disabled={submitting} className="btn-primary mt-2 w-full py-3">
        <UserPlus className="h-4 w-4" />{submitting ? 'Creating…' : 'Create Account'}
      </button>
      <p className="text-center text-sm text-gray-400">Already a member? <Link to="/login" className="text-brand">Sign in</Link></p>
    </AuthShell>
  );
}
