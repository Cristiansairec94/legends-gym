import { HeadingBar } from '../../components/common/SectionTitle';

export default function PageHeader({ title, subtitle, eyebrow = 'International Body Building Club' }) {
  return (
    <div className="relative border-b border-ink-800 bg-ink-900/70 backdrop-blur-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(225,29,42,0.15),transparent_50%)]" />
      <div className="container-x relative py-14 text-center">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <HeadingBar center />
        <h1 className="font-heading text-4xl uppercase text-white sm:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-3 max-w-2xl text-gray-400">{subtitle}</p>}
      </div>
    </div>
  );
}
