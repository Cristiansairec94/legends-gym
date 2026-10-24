import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AuthShell, Field } from './Login';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';

export default function AdminLogin() {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (!form.email || !form.password) return toast.error('Enter credentials');
    setSubmitting(true);
    try {
      await adminLogin(form);
      toast.success('Welcome, Admin');
      navigate('/admin');
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <AuthShell title="Admin Login" subtitle="Restricted access">
      <Field label="Email" type="email" value={form.email} onChange={set('email')} onEnter={submit} />
      <Field label="Password" type="password" value={form.password} onChange={set('password')} onEnter={submit} />
      <button onClick={submit} disabled={submitting} className="btn-primary mt-2 w-full py-3">
        <ShieldCheck className="h-4 w-4" />{submitting ? 'Signing in…' : 'Sign In'}
      </button>
      
    </AuthShell>
  );
}
