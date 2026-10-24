import { Star, Quote } from 'lucide-react';
import { initials } from '../../utils/format';

export default function ReviewCard({ review }) {
  return (
    <div className="card flex h-full flex-col p-6 ">
      <Quote className="h-7 w-7 text-brand/40" />
      <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-300">"{review.message}"</p>
      <div className="mt-4 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-brand/20 text-sm font-semibold text-brand">
          {initials(review.customer_name)}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{review.customer_name}</p>
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3 w-3 ${i < review.rating ? 'fill-brand text-brand' : 'text-ink-600'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
