import { Link } from 'react-router-dom';
import { Check, Star } from 'lucide-react';
import { rs } from '../../utils/format';

export default function PlanCard({ plan }) {
  const features = Array.isArray(plan.features) ? plan.features : [];
  const featured = plan.is_featured;
  return (
    <div className={`relative flex flex-col rounded-xl border p-6 transition ${featured ? 'border-brand bg-gradient-to-b from-brand/15 to-ink-900 shadow-glow' : 'border-ink-700 bg-ink-900 hover:border-ink-600'}`}>
      {featured && (
        <span className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-glow">
          <Star className="h-3 w-3" />Most Popular
        </span>
      )}
      <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-white">{plan.name}</h3>
      <div className="mt-3 flex items-end gap-1">
        <span className="font-heading text-4xl text-white">{rs(plan.sale_price ?? plan.price)}</span>
      </div>
      <p className="mt-0.5 text-xs text-gray-500">{plan.duration_months} month{plan.duration_months > 1 ? 's' : ''}</p>
      {plan.description && <p className="mt-3 text-sm text-gray-400">{plan.description}</p>}
      <ul className="mt-5 flex-1 space-y-2.5">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{f}
          </li>
        ))}
      </ul>
      <Link to={`/register?plan=${plan.id}`} className={`mt-6 ${featured ? 'btn-primary' : 'btn-outline'} w-full`}>
        Choose Plan
      </Link>
    </div>
  );
}
