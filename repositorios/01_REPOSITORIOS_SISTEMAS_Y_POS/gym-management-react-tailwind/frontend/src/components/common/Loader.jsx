export default function Loader({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-gray-400 ${className}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-600 border-t-brand" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
