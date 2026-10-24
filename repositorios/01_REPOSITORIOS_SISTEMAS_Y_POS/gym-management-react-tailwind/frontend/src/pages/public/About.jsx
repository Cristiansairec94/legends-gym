import { Target, Eye, Heart, Check } from 'lucide-react';
import PageHeader from './PageHeader';
import SectionTitle from '../../components/common/SectionTitle';
import { useContent } from '../../hooks/useContent';

export default function About() {
  const { content } = useContent();
  const values = [
    { icon: Target, title: 'Our Mission', text: content.mission || 'Make premium, results-driven fitness accessible to everyone.' },
    { icon: Eye, title: 'Our Vision', text: content.vision || 'Become the most trusted fitness community in Pakistan.' },
    { icon: Heart, title: 'Our Values', text: 'Discipline, community, and relentless improvement in everything we do.' },
  ];
  return (
    <div>
      <PageHeader title="About Us" subtitle="The story behind International Body Building Club" />
      <section className="container-x grid items-center gap-10 py-16 lg:grid-cols-2">
        <img src="https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800" alt="Gym interior" className="h-80 w-full rounded-xl object-cover" loading="lazy" />
        <div>
          <SectionTitle eyebrow="Who We Are" title="Excellence In Every Rep" />
          <p className="mt-4 text-gray-400">{content.about_content}</p>
          <ul className="mt-6 space-y-3">
            {['Modern & Clean Environment','Advanced Training Equipment','Personal Training Programs','Nutrition & Diet Support','100% Satisfaction Guarantee'].map((x) => (
              <li key={x} className="flex items-center gap-2 text-sm text-gray-200"><Check className="h-4 w-4 text-brand" />{x}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="bg-ink-900 py-16">
        <div className="container-x grid gap-6 md:grid-cols-3">
          {values.map((v) => (
            <div key={v.title} className="card p-6">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-brand"><v.icon className="h-6 w-6" /></div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">{v.title}</h3>
              <p className="mt-2 text-sm text-gray-400">{v.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
