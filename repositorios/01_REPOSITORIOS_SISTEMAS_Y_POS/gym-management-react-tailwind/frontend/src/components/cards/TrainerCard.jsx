import { Link } from 'react-router-dom';
import { Facebook, Instagram } from 'lucide-react';
import { initials, externalUrl } from '../../utils/format';

export default function TrainerCard({ trainer }) {
  const fb = externalUrl(trainer.facebook_url);
  const ig = externalUrl(trainer.instagram_url);

  return (
    <div className="group card hover-lift overflow-hidden text-left hover:border-brand/50">
      <Link to={`/trainers/${trainer.id}`} className="relative block aspect-[4/5] overflow-hidden bg-ink-800">
        {trainer.photo_url ? (
          <img src={trainer.photo_url} alt={trainer.name} loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center font-heading text-4xl text-ink-600">{initials(trainer.name)}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 to-transparent p-4">
          <h3 className="font-display text-lg font-semibold text-white transition group-hover:text-brand">{trainer.name}</h3>
          <p className="text-xs text-brand">{trainer.role}</p>
        </div>
      </Link>
      <div className="flex items-center justify-between p-4">
        <Link to={`/trainers/${trainer.id}`} className="text-xs text-gray-400 transition hover:text-brand">{trainer.specialization}</Link>
        <div className="flex gap-1.5">
          {fb && (
            <a href={fb} target="_blank" rel="noopener noreferrer"
              aria-label={`${trainer.name} on Facebook`}
              className="rounded bg-ink-800 p-1.5 text-gray-400 transition hover:bg-brand hover:text-white">
              <Facebook className="h-3.5 w-3.5" />
            </a>
          )}
          {ig && (
            <a href={ig} target="_blank" rel="noopener noreferrer"
              aria-label={`${trainer.name} on Instagram`}
              className="rounded bg-ink-800 p-1.5 text-gray-400 transition hover:bg-brand hover:text-white">
              <Instagram className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
