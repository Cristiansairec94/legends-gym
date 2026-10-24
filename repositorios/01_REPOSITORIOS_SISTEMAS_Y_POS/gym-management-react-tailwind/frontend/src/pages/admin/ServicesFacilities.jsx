import { useState } from 'react';
import ResourceManager from '../../components/admin/ResourceManager';
import StatusBadge from '../../components/common/StatusBadge';
import { serviceService, facilityService, categoryService } from '../../services/trainerService';

const TABS = [
  { key: 'services', label: 'Services' },
  { key: 'facilities', label: 'Facilities' },
  { key: 'categories', label: 'Product Categories' },
];

function ServicesManager() {
  return (
    <ResourceManager
      title="Services"
      subtitle="Training services shown on the Services page"
      service={serviceService}
      createLabel="Add Service"
      defaultValues={{ is_active: true }}
      columns={[
        { key: 'title', header: 'Title', render: (r) => (
          <div>
            <p className="font-medium text-white">{r.title}</p>
            <p className="max-w-md truncate text-xs text-gray-500">{r.description}</p>
          </div>
        ) },
        { key: 'icon', header: 'Icon' },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'expired'} /> },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'icon', label: 'Icon name (lucide)', placeholder: 'Dumbbell' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
        { name: 'is_active', label: 'Active', type: 'checkbox', placeholder: 'Visible on website' },
      ]}
      beforeSubmit={(v) => ({ title: v.title, icon: v.icon || '', description: v.description || '', is_active: !!v.is_active })}
    />
  );
}

function FacilitiesManager() {
  return (
    <ResourceManager
      title="Facilities"
      subtitle="Gym facilities and amenities"
      service={facilityService}
      createLabel="Add Facility"
      defaultValues={{ is_active: true }}
      columns={[
        { key: 'title', header: 'Title', render: (r) => (
          <div>
            <p className="font-medium text-white">{r.title}</p>
            <p className="max-w-md truncate text-xs text-gray-500">{r.description}</p>
          </div>
        ) },
        { key: 'icon', header: 'Icon' },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'expired'} /> },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'icon', label: 'Icon name (lucide)', placeholder: 'ShowerHead' },
        { name: 'image_url', label: 'Image URL' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
        { name: 'is_active', label: 'Active', type: 'checkbox', placeholder: 'Visible on website' },
      ]}
      beforeSubmit={(v) => ({ title: v.title, icon: v.icon || '', image_url: v.image_url || '', description: v.description || '', is_active: !!v.is_active })}
    />
  );
}

function CategoriesManager() {
  return (
    <ResourceManager
      title="Product Categories"
      subtitle="Store categories used to organise products"
      service={categoryService}
      createLabel="Add Category"
      searchable
      defaultValues={{ is_active: true }}
      columns={[
        { key: 'name', header: 'Name' },
        { key: 'slug', header: 'Slug' },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'expired'} /> },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'slug', label: 'Slug', required: true, help: 'lowercase-with-dashes' },
        { name: 'is_active', label: 'Active', type: 'checkbox', placeholder: 'Available' },
      ]}
      beforeSubmit={(v) => ({
        name: v.name,
        slug: (v.slug || v.name || '').toLowerCase().replace(/\s+/g, '-'),
        is_active: !!v.is_active,
      })}
    />
  );
}

export default function ServicesFacilities() {
  const [tab, setTab] = useState('services');
  return (
    <div>
      <div className="mb-6 inline-flex rounded-lg border border-ink-800 bg-ink-900 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${tab === t.key ? 'bg-brand text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'services' && <ServicesManager />}
      {tab === 'facilities' && <FacilitiesManager />}
      {tab === 'categories' && <CategoriesManager />}
    </div>
  );
}
