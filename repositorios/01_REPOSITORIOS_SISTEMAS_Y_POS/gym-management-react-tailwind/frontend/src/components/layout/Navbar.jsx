import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, Dumbbell, User, LayoutDashboard, LogOut, ChevronDown } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/format';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/plans', label: 'Plans' },
  { to: '/trainers', label: 'Trainers' },
  { to: '/products', label: 'Store' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isMember = user && !isAdmin;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/80 backdrop-blur-md">
      <nav className="container-x flex h-16 items-center justify-between">
        <Link to="/" className="group flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white transition group-hover:scale-105"><Dumbbell className="h-5 w-5" /></span>
          <span className="font-heading text-lg leading-none text-white">INTERNATIONAL<br /><span className="text-[11px] font-normal tracking-widest text-brand">BODY BUILDING CLUB</span></span>
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.to === '/'}
                className={({ isActive }) => `relative rounded-lg px-3 py-2 text-sm font-medium transition after:absolute after:bottom-1 after:left-3 after:h-0.5 after:bg-brand after:transition-all hover:text-white ${isActive ? 'text-brand after:w-[calc(100%-1.5rem)]' : 'text-gray-300 after:w-0 hover:after:w-[calc(100%-1.5rem)]'}`}>
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          {/* Cart only appears once logged in */}
          {user && (
            <Link to="/cart" className="relative rounded-lg p-2 text-gray-200 transition hover:bg-ink-800">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{count}</span>}
            </Link>
          )}

          {user ? (
            <ProfileMenu user={user} isAdmin={isAdmin} onLogout={() => { logout(); navigate('/'); }} />
          ) : (
            <>
              <Link to="/login" className="hidden rounded-lg p-2 text-gray-200 hover:bg-ink-800 sm:block" title="Login"><User className="h-5 w-5" /></Link>
              <Link to="/register" className="hidden btn-primary py-2 sm:inline-flex">Join Now</Link>
            </>
          )}

          <button className="rounded-lg p-2 text-gray-200 hover:bg-ink-800 lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-ink-800 bg-ink-950/95 lg:hidden">
          <ul className="container-x flex flex-col py-3">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} end={l.to === '/'} onClick={() => setOpen(false)}
                  className={({ isActive }) => `block rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'text-brand' : 'text-gray-300'}`}>
                  {l.label}
                </NavLink>
              </li>
            ))}
            {isMember && <li><Link to="/account" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300">My Account</Link></li>}
            {isAdmin && <li><Link to="/admin" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300">Admin Dashboard</Link></li>}
            <li className="mt-2 flex gap-2 px-3">
              {!user && <Link to="/register" onClick={() => setOpen(false)} className="btn-primary flex-1">Join Now</Link>}
              {user
                ? <button onClick={() => { logout(); setOpen(false); navigate('/'); }} className="btn-outline flex-1">Logout</button>
                : <Link to="/login" onClick={() => setOpen(false)} className="btn-outline flex-1">Login</Link>}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

/* Circular avatar with dropdown — the user profile icon */
function ProfileMenu({ user, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-ink-700 py-1 pl-1 pr-2 transition hover:border-brand">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand text-xs font-bold text-white">{initials(user.name) || <User className="h-4 w-4" />}</span>
        <ChevronDown className={`hidden h-4 w-4 text-gray-400 transition sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-card animate-fade-in">
          <div className="border-b border-ink-800 px-4 py-3">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
            <span className="mt-1 inline-block rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand">{isAdmin ? 'Admin' : 'Member'}</span>
          </div>
          <div className="p-1.5">
            {isAdmin ? (
              <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-ink-800"><LayoutDashboard className="h-4 w-4 text-brand" />Admin Dashboard</Link>
            ) : (
              <Link to="/account" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-ink-800"><User className="h-4 w-4 text-brand" />My Account</Link>
            )}
            <button onClick={() => { setOpen(false); onLogout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-ink-800"><LogOut className="h-4 w-4 text-brand" />Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}
