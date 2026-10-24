import { Link, useParams } from 'react-router-dom';
import { Award, Clock, Facebook, Instagram, ArrowLeft, Dumbbell, CheckCircle2 } from 'lucide-react';
import Loader from '../../components/common/Loader';
import { HeadingBar } from '../../components/common/SectionTitle';
import { useFetch } from '../../hooks/useFetch';
import { trainerService } from '../../services/trainerService';
import { initials, externalUrl } from '../../utils/format';

export default function TrainerDetail() {
  const { id } = useParams();
  const { data: trainer, loading, error } = useFetch(() => trainerService.get(id), [id]);

  if (loading) return <Loader className="min-h-[60vh]" />;
  if (error || !trainer) {
    return (
      <div className="container-x py-24 text-center">
        <p className="text-gray-400">Trainer not found.</p>
        <Link to="/trainers" className="btn-outline mt-6">Back to Trainers</Link>
      </div>
    );
  }

  const fb = externalUrl(trainer.facebook_url);
  const ig = externalUrl(trainer.instagram_url);
  const certs = (trainer.certifications || '').split(',').map((c) => c.trim()).filter(Boolean);

  return (
    <div>
      {/* Header strip */}
      <div className="relative border-b border-ink-800 bg-ink-900/70 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(225,29,42,0.15),transparent_50%)]" />
        <div className="container-x relative py-8">
          <Link to="/trainers" className="inline-flex items-center gap-2 text-sm text-gray-400 transition hover:text-brand">
            <ArrowLeft className="h-4 w-4" />Back to Trainers
          </Link>
        </div>
      </div>

      <section className="container-x grid gap-10 py-14 lg:grid-cols-[380px_1fr]">
        {/* Photo + socials */}
        <div>
          <div className="overflow-hidden rounded-2xl border border-ink-800 bg-ink-800">
            {trainer.photo_url ? (
              <img src={trainer.photo_url} alt={trainer.name} className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/5] w-full place-items-center font-heading text-6xl text-ink-600">{initials(trainer.name)}</div>
            )}
          </div>

          {(fb || ig) && (
            <div className="mt-5">
              <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Follow</p>
              <div className="flex gap-3">
                {fb && (
                  <a href={fb} target="_blank" rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-ink-700 bg-ink-900 py-2.5 text-sm text-gray-200 transition hover:border-brand hover:bg-brand hover:text-white">
                    <Facebook className="h-4 w-4" />Facebook
                  </a>
                )}
                {ig && (
                  <a href={ig} target="_blank" rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-ink-700 bg-ink-900 py-2.5 text-sm text-gray-200 transition hover:border-brand hover:bg-brand hover:text-white">
                    <Instagram className="h-4 w-4" />Instagram
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="eyebrow">{trainer.role}</p>
          <HeadingBar />
          <h1 className="font-heading text-4xl uppercase text-white sm:text-5xl">{trainer.name}</h1>

          <div className="mt-5 flex flex-wrap gap-3">
            {trainer.specialization && (
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-4 py-1.5 text-sm text-gray-200">
                <Dumbbell className="h-4 w-4 text-brand" />{trainer.specialization}
              </span>
            )}
            {trainer.experience_years != null && (
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-4 py-1.5 text-sm text-gray-200">
                <Award className="h-4 w-4 text-brand" />{trainer.experience_years} yrs experience
              </span>
            )}
            {trainer.availability && (
              <span className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900 px-4 py-1.5 text-sm text-gray-200">
                <Clock className="h-4 w-4 text-brand" />{trainer.availability}
              </span>
            )}
          </div>

          {trainer.bio && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-white">About</h2>
              <p className="mt-2 leading-relaxed text-gray-300">{trainer.bio}</p>
            </div>
          )}

          {certs.length > 0 && (
            <div className="mt-8">
              <h2 className="font-display text-lg font-semibold text-white">Certifications</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {certs.map((c, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2 text-sm text-gray-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/contact" className="btn-primary px-7 py-3">Book a Session</Link>
            <Link to="/plans" className="btn-outline px-7 py-3">View Plans</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
