import ResourceManager from '../../components/admin/ResourceManager';
import StatusBadge from '../../components/common/StatusBadge';
import { trainerService } from '../../services/trainerService';

export default function Trainers() {
  return (
    <ResourceManager
      title="Trainers"
      subtitle="Manage coaching staff shown on the Trainers page"
      service={trainerService}
      createLabel="Add Trainer"
      filters={[
        { name: 'is_active', label: 'All', options: [
          { value: 'true', label: 'Active' },
          { value: 'false', label: 'Inactive' },
        ] },
      ]}
      defaultValues={{ is_active: true, experience_years: 0 }}
      columns={[
        { key: 'name', header: 'Trainer', render: (r) => (
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-ink-800 text-xs text-gray-400">
              {r.photo_url ? <img src={r.photo_url} alt="" className="h-full w-full object-cover" /> : (r.name?.[0] || 'T')}
            </span>
            <div>
              <p className="font-medium text-white">{r.name}</p>
              <p className="text-xs text-gray-500">{r.role}</p>
            </div>
          </div>
        ) },
        { key: 'specialization', header: 'Specialization' },
        { key: 'experience_years', header: 'Experience', render: (r) => `${r.experience_years || 0} yrs` },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'expired'} /> },
      ]}
      fields={[
        { name: 'name', label: 'Full Name', required: true },
        { name: 'role', label: 'Role / Title', placeholder: 'Head Coach' },
        { name: 'specialization', label: 'Specialization', placeholder: 'Strength & Conditioning' },
        { name: 'experience_years', label: 'Experience (years)', type: 'number' },
        { name: 'availability', label: 'Availability', placeholder: 'Mon–Sat, 6am–2pm' },
        { name: 'certifications', label: 'Certifications', placeholder: 'NASM-CPT, ISSA' },
        { name: 'photo_url', label: 'Photo URL', colSpan: 2 },
        { name: 'bio', label: 'Biography', type: 'textarea', colSpan: 2 },
        { name: 'instagram_url', label: 'Instagram URL' },
        { name: 'facebook_url', label: 'Facebook URL' },
        { name: 'is_active', label: 'Active', type: 'checkbox', placeholder: 'Visible on website' },
      ]}
      beforeSubmit={(v) => ({
        name: v.name,
        role: v.role || '',
        specialization: v.specialization || '',
        experience_years: Number(v.experience_years) || 0,
        availability: v.availability || '',
        certifications: v.certifications || '',
        photo_url: v.photo_url || '',
        bio: v.bio || '',
        instagram_url: v.instagram_url || '',
        facebook_url: v.facebook_url || '',
        is_active: !!v.is_active,
      })}
    />
  );
}
