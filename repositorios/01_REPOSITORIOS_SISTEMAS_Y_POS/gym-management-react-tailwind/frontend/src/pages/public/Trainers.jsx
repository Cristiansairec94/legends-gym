import PageHeader from './PageHeader';
import TrainerCard from '../../components/cards/TrainerCard';
import Loader from '../../components/common/Loader';
import { useFetch } from '../../hooks/useFetch';
import { trainerService } from '../../services/trainerService';

export default function Trainers() {
  const { data, loading } = useFetch(() => trainerService.list({ is_active: true }), []);

  return (
    <div>
      <PageHeader title="Our Trainers" subtitle="Certified professionals dedicated to your progress" />
      <section className="container-x py-16">
        {loading ? <Loader /> : !data?.items?.length ? (
          <p className="text-center text-gray-500">Trainers will appear here soon.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.items.map((t) => <TrainerCard key={t.id} trainer={t} />)}
          </div>
        )}
      </section>
    </div>
  );
}
