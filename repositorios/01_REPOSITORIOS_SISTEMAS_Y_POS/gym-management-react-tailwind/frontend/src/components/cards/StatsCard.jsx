export default function StatsCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand/15 text-brand',
    emerald: 'bg-emerald-500/15 text-emerald-400',
    amber: 'bg-amber-500/15 text-amber-400',
    sky: 'bg-sky-500/15 text-sky-400',
    violet: 'bg-violet-500/15 text-violet-400',
    rose: 'bg-rose-500/15 text-rose-400',
  };
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${tones[tone] || tones.brand}`}>
        {Icon && <Icon className="h-6 w-6" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-gray-400">{label}</p>
        <p className="font-display text-2xl font-semibold text-white">{value}</p>
        {hint && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    </div>
  );
}
