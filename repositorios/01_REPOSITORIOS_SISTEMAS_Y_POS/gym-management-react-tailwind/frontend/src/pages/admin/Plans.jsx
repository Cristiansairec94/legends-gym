import ResourceManager from '../../components/admin/ResourceManager';
import StatusBadge from '../../components/common/StatusBadge';
import { planService } from '../../services/planService';
import { rs } from '../../utils/format';

export default function Plans() {
  return (
    <ResourceManager
      title="Membership Plans"
      subtitle="Create and manage the packages shown on the website"
      service={planService}
      createLabel="Add Plan"
      filters={[
        { name: 'is_active', label: 'All statuses', options: [
          { value: 'true', label: 'Active' },
          { value: 'false', label: 'Inactive' },
        ] },
      ]}
      defaultValues={{ features: [], is_active: true, is_featured: false, duration_months: 1 }}
      columns={[
        { key: 'name', header: 'Plan', render: (r) => (
          <div>
            <p className="font-medium text-white">{r.name}{r.is_featured && <span className="ml-2 rounded bg-brand/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand">POPULAR</span>}</p>
            <p className="max-w-xs truncate text-xs text-gray-500">{r.description}</p>
          </div>
        ) },
        { key: 'price', header: 'Price', render: (r) => rs(r.price) },
        { key: 'duration_months', header: 'Duration', render: (r) => `${r.duration_months} mo` },
        { key: 'features', header: 'Features', render: (r) => (Array.isArray(r.features) ? r.features.length : 0) + ' items' },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'expired'} /> },
      ]}
      fields={[
        { name: 'name', label: 'Plan Name', required: true },
        { name: 'price', label: 'Price (Rs.)', type: 'number', required: true },
        { name: 'duration_months', label: 'Duration (months)', type: 'number', required: true },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
        { name: 'features', label: 'Features (comma separated)', type: 'tags', colSpan: 2, help: 'e.g. Gym Access, Personal Trainer, Diet Plan' },
        { name: 'is_featured', label: 'Featured', type: 'checkbox', placeholder: 'Mark as popular / featured' },
        { name: 'is_active', label: 'Active', type: 'checkbox', placeholder: 'Visible on website' },
      ]}
      beforeSubmit={(v) => ({
        name: v.name,
        description: v.description || '',
        price: Number(v.price) || 0,
        duration_months: Number(v.duration_months) || 1,
        features: Array.isArray(v.features) ? v.features : [],
        is_featured: !!v.is_featured,
        is_active: !!v.is_active,
      })}
    />
  );
}
