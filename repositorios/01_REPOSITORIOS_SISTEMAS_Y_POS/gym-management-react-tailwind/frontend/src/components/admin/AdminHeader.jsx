import { useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';

export default function AdminHeader({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-ink-800 bg-ink-950/85 px-4 backdrop-blur-md">
      <button className="rounded-lg p-2 text-gray-300 hover:bg-ink-800 lg:hidden" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block">
        <p className="text-sm text-gray-500">Control Panel</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white">
          {initials(user?.name || 'A')}
        </span>
        <button
          onClick={() => { logout(); navigate('/admin/login'); }}
          className="btn-ghost px-3 py-2 text-gray-300"
          title="Logout"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
