import PageHeader from './PageHeader';
import PlanCard from '../../components/cards/PlanCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import { useFetch } from '../../hooks/useFetch';
import { planService } from '../../services/planService';

export default function Plans() {
  const { data, loading } = useFetch(() => planService.list(), []);
  return (
    <div>
      <PageHeader title="Membership Plans" subtitle="Pick the plan that matches your ambition" />
      <section className="container-x py-16">
        {loading ? <Loader /> : !data?.items?.length ? <EmptyState title="No plans available" /> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.items.map((p) => <PlanCard key={p.id} plan={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
