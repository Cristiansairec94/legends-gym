import { Link } from 'react-router-dom';
import { ShieldCheck, FileText, GalleryHorizontalEnd, Wallet } from 'lucide-react';
import PageHeading from '../../components/admin/PageHeading';
import { useAuth } from '../../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeading title="Settings" subtitle="Account and configuration overview" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand"><ShieldCheck className="h-5 w-5" /></span>
            <h3 className="font-display text-lg font-semibold text-white">Admin Account</h3>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-ink-800 pb-2"><dt className="text-gray-500">Name</dt><dd className="text-gray-200">{user?.name}</dd></div>
            <div className="flex justify-between border-b border-ink-800 pb-2"><dt className="text-gray-500">Email</dt><dd className="text-gray-200">{user?.email}</dd></div>
            <div className="flex justify-between"><dt className="text-gray-500">Role</dt><dd className="capitalize text-gray-200">{user?.role}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-gray-500">
            Passwords are hashed with bcrypt and never stored in plain text. To change credentials, update the
            <code className="mx-1 rounded bg-ink-800 px-1 py-0.5">users</code> table or add a change-password endpoint.
          </p>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 font-display text-lg font-semibold text-white">Quick Links</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link to="/admin/content" className="flex items-center gap-3 rounded-lg border border-ink-800 p-3 hover:border-brand"><FileText className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-200">Website Content</span></Link>
            <Link to="/admin/banners" className="flex items-center gap-3 rounded-lg border border-ink-800 p-3 hover:border-brand"><GalleryHorizontalEnd className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-200">Banners</span></Link>
            <Link to="/admin/payments" className="flex items-center gap-3 rounded-lg border border-ink-800 p-3 hover:border-brand"><Wallet className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-200">Payments</span></Link>
            <Link to="/" className="flex items-center gap-3 rounded-lg border border-ink-800 p-3 hover:border-brand"><ShieldCheck className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-200">View Website</span></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
