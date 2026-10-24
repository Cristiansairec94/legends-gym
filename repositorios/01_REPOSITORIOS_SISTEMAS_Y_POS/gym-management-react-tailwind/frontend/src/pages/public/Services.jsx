import * as Icons from 'lucide-react';
import PageHeader from './PageHeader';
import Loader from '../../components/common/Loader';
import { useFetch } from '../../hooks/useFetch';
import { serviceService, facilityService } from '../../services/trainerService';

const Icon = ({ name, ...p }) => {
  const C = Icons[name] || Icons.Dumbbell;
  return <C {...p} />;
};

export default function Services() {
  const { data: services, loading } = useFetch(() => serviceService.list({ is_active: true }), []);
  const { data: facilities } = useFetch(() => facilityService.list({ is_active: true }), []);

  return (
    <div>
      <PageHeader title="Services & Facilities" subtitle="Everything you need to reach your goals" />
      <section className="container-x py-16">
        <h2 className="section-title mb-8">Our Services</h2>
        {loading ? <Loader /> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services?.items?.map((s) => (
              <div key={s.id} className="card p-6 transition hover:border-brand/50">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand/15 text-brand"><Icon name={s.icon} className="h-6 w-6" /></div>
                <h3 className="mt-4 font-display font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm text-gray-400">{s.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="bg-ink-900 py-16">
        <div className="container-x">
          <h2 className="section-title mb-8">Our Facilities</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {facilities?.items?.map((f) => (
              <div key={f.id} className="card overflow-hidden">
                {f.image_url && <img src={f.image_url} alt={f.title} className="h-44 w-full object-cover" loading="lazy" />}
                <div className="p-5">
                  <h3 className="font-display font-semibold text-white">{f.title}</h3>
                  <p className="mt-1 text-sm text-gray-400">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
