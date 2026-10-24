// A short brand bar sits between the small (eyebrow) and large (title) heading — used site-wide.
export function HeadingBar({ center }) {
  return <span className={`mb-4 mt-3 block h-[3px] w-12 rounded-full bg-brand ${center ? 'mx-auto' : ''}`} />;
}

export default function SectionTitle({ eyebrow, title, subtitle, center, className = '' }) {
  return (
    <div className={`${center ? 'mx-auto max-w-2xl text-center' : ''} ${className}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <HeadingBar center={center} />
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="mt-3 text-gray-400">{subtitle}</p>}
    </div>
  );
}
