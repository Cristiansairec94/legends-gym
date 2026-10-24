import ResourceManager from '../../components/admin/ResourceManager';
import StatusBadge from '../../components/common/StatusBadge';
import { bannerService } from '../../services/trainerService';

export default function Banners() {
  return (
    <ResourceManager
      title="Banners"
      subtitle="Promotional banners for the homepage and campaigns"
      service={bannerService}
      createLabel="Add Banner"
      searchable={false}
      defaultValues={{ is_active: true, position: 'home', sort_order: 0 }}
      columns={[
        { key: 'title', header: 'Title', render: (r) => (
          <div>
            <p className="font-medium text-white">{r.title}</p>
            <p className="max-w-xs truncate text-xs text-gray-500">{r.subtitle}</p>
          </div>
        ) },
        { key: 'position', header: 'Position' },
        { key: 'sort_order', header: 'Order' },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'expired'} /> },
      ]}
      fields={[
        { name: 'title', label: 'Title', required: true },
        { name: 'position', label: 'Position', placeholder: 'home' },
        { name: 'subtitle', label: 'Subtitle', colSpan: 2 },
        { name: 'image_url', label: 'Image URL', colSpan: 2 },
        { name: 'link_url', label: 'Link URL' },
        { name: 'sort_order', label: 'Sort Order', type: 'number' },
        { name: 'is_active', label: 'Active', type: 'checkbox', placeholder: 'Currently shown' },
      ]}
      beforeSubmit={(v) => ({
        title: v.title || '',
        subtitle: v.subtitle || '',
        image_url: v.image_url || '',
        link_url: v.link_url || '',
        position: v.position || 'home',
        sort_order: Number(v.sort_order) || 0,
        is_active: !!v.is_active,
      })}
    />
  );
}
