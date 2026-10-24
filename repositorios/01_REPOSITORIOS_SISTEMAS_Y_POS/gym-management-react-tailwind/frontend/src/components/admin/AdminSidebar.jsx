import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, BadgeCheck, Wallet, CalendarClock,
  Dumbbell, Package, ShoppingBag, Sparkles, Star, Images, Mail,
  FileText, GalleryHorizontalEnd, Settings, X, Dumbbell as Logo,
} from 'lucide-react';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/memberships', label: 'Memberships', icon: BadgeCheck },
  { to: '/admin/plans', label: 'Plans & Packages', icon: CreditCard },
  { to: '/admin/payments', label: 'Payments', icon: Wallet },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarClock },
  { to: '/admin/trainers', label: 'Trainers', icon: Dumbbell },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/services', label: 'Services & Facilities', icon: Sparkles },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/gallery', label: 'Gallery', icon: Images },
  { to: '/admin/enquiries', label: 'Enquiries', icon: Mail },
  { to: '/admin/content', label: 'Website Content', icon: FileText },
  { to: '/admin/banners', label: 'Banners', icon: GalleryHorizontalEnd },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-ink-800 bg-ink-950 transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-ink-800 px-4">
          <Link to="/admin" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
              <Logo className="h-4 w-4" />
            </span>
            <span className="font-heading text-sm uppercase tracking-wide text-white">IBBC Admin</span>
          </Link>
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-ink-800 lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand/15 text-brand'
                    : 'text-gray-400 hover:bg-ink-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-800 p-3">
          <Link to="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-500 hover:text-white">
            ← Back to website
          </Link>
        </div>
      </aside>
    </>
  );
}
