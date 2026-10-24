import ResourceManager from '../../components/admin/ResourceManager';
import StatusBadge from '../../components/common/StatusBadge';
import { galleryService } from '../../services/trainerService';

export default function Gallery() {
  return (
    <ResourceManager
      title="Gallery Images"
      subtitle="Photos shown on the public gallery"
      service={galleryService}
      createLabel="Add Image"
      defaultValues={{ is_active: true }}
      columns={[
        { key: 'image_url', header: 'Preview', render: (r) => (
          <span className="grid h-12 w-16 place-items-center overflow-hidden rounded-lg bg-ink-800 text-[10px] text-gray-500">
            {r.image_url ? <img src={r.image_url} alt="" className="h-full w-full object-cover" /> : 'no image'}
          </span>
        ) },
        { key: 'title', header: 'Title' },
        { key: 'category', header: 'Category' },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'expired'} /> },
      ]}
      fields={[
        { name: 'title', label: 'Title' },
        { name: 'category', label: 'Category', placeholder: 'Equipment, Training, Facility…' },
        { name: 'image_url', label: 'Image URL', required: true, colSpan: 2 },
        { name: 'is_active', label: 'Active', type: 'checkbox', placeholder: 'Visible on website' },
      ]}
      beforeSubmit={(v) => ({
        title: v.title || '',
        category: v.category || '',
        image_url: v.image_url || '',
        is_active: !!v.is_active,
      })}
    />
  );
}
