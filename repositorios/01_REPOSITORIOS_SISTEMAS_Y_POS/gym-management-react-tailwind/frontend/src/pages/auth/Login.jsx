import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dumbbell, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async () => {
    if (!form.email || !form.password) return toast.error('Enter email and password');
    setSubmitting(true);
    try {
      const user = await login(form);
      toast.success('Welcome back!');
      navigate(user.role === 'admin' ? '/admin' : (location.state?.from?.pathname || '/'));
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <AuthShell title="Member Login" subtitle="Sign in to your account">
      <Field label="Email" type="email" value={form.email} onChange={set('email')} onEnter={submit} />
      <Field label="Password" type="password" value={form.password} onChange={set('password')} onEnter={submit} />
      <button onClick={submit} disabled={submitting} className="btn-primary mt-2 w-full py-3">
        <LogIn className="h-4 w-4" />{submitting ? 'Signing in…' : 'Sign In'}
      </button>
      <p className="text-center text-sm text-gray-400">No account? <Link to="/signup" className="text-brand">Create one</Link></p>
      <p className="text-center text-xs text-gray-600">Admin? <Link to="/admin/login" className="text-gray-400 hover:text-brand">Admin login</Link></p>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand text-white"><Dumbbell className="h-5 w-5" /></span>
          <span className="font-heading text-xl text-white">INTERNATIONAL BBC</span>
        </Link>
        <div className="card p-8">
          <h1 className="font-heading text-2xl uppercase text-white">{title}</h1>
          <p className="mb-6 mt-1 text-sm text-gray-400">{subtitle}</p>
          <div className="space-y-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, onEnter, type, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (show ? 'text' : 'password') : type;
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input {...props} type={inputType} onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
          className={`input ${isPassword ? 'pr-11' : ''}`} />
        {isPassword && (
          <button type="button" onClick={() => setShow((s) => !s)} tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center text-gray-500 hover:text-brand">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
