import { Link } from 'react-router-dom';
import { Dumbbell, Facebook, Instagram, Youtube, MapPin, Phone, Mail } from 'lucide-react';
import { useContent } from '../../hooks/useContent';
import { externalUrl } from '../../utils/format';

export default function Footer() {
  const { content } = useContent();
  return (
    <footer className="border-t border-ink-800 bg-ink-950">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white"><Dumbbell className="h-5 w-5" /></span>
            <span className="font-heading text-white">INTERNATIONAL BBC</span>
          </div>
          <p className="mt-4 text-sm text-gray-400">We are committed to helping you achieve your fitness goals with the best equipment, expert trainers and premium services.</p>
          <div className="mt-4 flex gap-3">
            {externalUrl(content.social_facebook) && (
              <a href={externalUrl(content.social_facebook)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-ink-800 p-2 text-gray-300 transition hover:bg-brand hover:text-white"><Facebook className="h-4 w-4" /></a>
            )}
            {externalUrl(content.social_instagram) && (
              <a href={externalUrl(content.social_instagram)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-ink-800 p-2 text-gray-300 transition hover:bg-brand hover:text-white"><Instagram className="h-4 w-4" /></a>
            )}
            {externalUrl(content.social_youtube) && (
              <a href={externalUrl(content.social_youtube)} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-ink-800 p-2 text-gray-300 transition hover:bg-brand hover:text-white"><Youtube className="h-4 w-4" /></a>
            )}
          </div>
        </div>

        <div>
          <h4 className="mb-4 font-display font-semibold uppercase tracking-wide text-white">Quick Links</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            {['Home','About','Services','Plans','Trainers','Gallery','Contact'].map((x) => (
              <li key={x}><Link to={`/${x === 'Home' ? '' : x.toLowerCase()}`} className="hover:text-brand">{x}</Link></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display font-semibold uppercase tracking-wide text-white">Membership</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link to="/plans" className="hover:text-brand">All Plans</Link></li>
            <li><Link to="/register" className="hover:text-brand">Become a Member</Link></li>
            <li><Link to="/products" className="hover:text-brand">Supplements</Link></li>
            <li><Link to="/appointment" className="hover:text-brand">Book a Session</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-display font-semibold uppercase tracking-wide text-white">Contact</h4>
          <ul className="space-y-3 text-sm text-gray-400">
            <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-brand" />{content.contact_address || 'Karachi, Pakistan'}</li>
            <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-brand" />{content.contact_phone || '0312-3456789'}</li>
            <li className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-brand" />{content.contact_email || 'info@ibbclub.com'}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-800 py-5 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} International Body Building Club. All Rights Reserved.
      </div>
    </footer>
  );
}
