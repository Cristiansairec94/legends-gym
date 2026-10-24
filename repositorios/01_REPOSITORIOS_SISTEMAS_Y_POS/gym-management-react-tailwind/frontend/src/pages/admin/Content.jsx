import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import PageHeading from '../../components/admin/PageHeading';
import Loader from '../../components/common/Loader';
import { contentService, uploadService } from '../../services/adminService';
import { toast } from '../../utils/toast';

// Editable content keys grouped for a friendly form.
const GROUPS = [
  {
    title: 'Hero Section',
    fields: [
      { key: 'hero_eyebrow', label: 'Hero Eyebrow (small heading)', type: 'text' },
      { key: 'hero_title', label: 'Hero Title', type: 'text' },
      { key: 'hero_subtitle', label: 'Hero Subtitle', type: 'textarea' },
      { key: 'hero_image', label: 'Hero Background Image', type: 'image' },
    ],
  },
  {
    title: 'About',
    fields: [
      { key: 'about_title', label: 'About Title', type: 'text' },
      { key: 'about_content', label: 'About Body', type: 'textarea' },
      { key: 'about_image', label: 'About Image', type: 'image' },
      { key: 'mission', label: 'Mission', type: 'textarea' },
      { key: 'vision', label: 'Vision', type: 'textarea' },
    ],
  },
  {
    title: 'Contact & Social',
    fields: [
      { key: 'contact_address', label: 'Address', type: 'text' },
      { key: 'contact_phone', label: 'Phone', type: 'text' },
      { key: 'contact_email', label: 'Email', type: 'text' },
      { key: 'opening_hours', label: 'Opening Hours', type: 'text' },
      { key: 'social_facebook', label: 'Facebook URL', type: 'text' },
      { key: 'social_instagram', label: 'Instagram URL', type: 'text' },
      { key: 'social_youtube', label: 'YouTube URL', type: 'text' },
    ],
  },
  {
    title: 'Footer',
    fields: [{ key: 'footer_tagline', label: 'Footer Tagline', type: 'textarea' }],
  },
];

export default function Content() {
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    contentService.get()
      .then((res) => setContent(res.data || {}))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const setVal = (key, value) => setContent((c) => ({ ...c, [key]: value }));

  const save = async () => {
    setSaving(true);
    try { await contentService.update(content); toast.success('Website content saved'); }
    catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <Loader label="Loading content…" />;

  return (
    <div>
      <PageHeading title="Website Content" subtitle="Edit the text and images shown across the public site">
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save All'}</button>
      </PageHeading>

      <div className="space-y-6">
        {GROUPS.map((g) => (
          <div key={g.title} className="card p-5">
            <h3 className="mb-4 font-display text-lg font-semibold text-white">{g.title}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {g.fields.map((f) => (
                <div key={f.key} className={f.type !== 'text' ? 'sm:col-span-2' : ''}>
                  <label className="label">{f.label}</label>
                  {f.type === 'textarea' ? (
                    <textarea className="input min-h-[80px]" value={content[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)} />
                  ) : f.type === 'image' ? (
                    <ImageField value={content[f.key] || ''} onChange={(v) => setVal(f.key, v)} />
                  ) : (
                    <input className="input" value={content[f.key] || ''} onChange={(e) => setVal(f.key, e.target.value)} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageField({ value, onChange }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    try { const res = await uploadService.image(file); onChange(res.data.url); toast.success('Image uploaded'); }
    catch (err) { toast.error(err.message); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      {value ? <img src={value} alt="" className="h-20 w-32 shrink-0 rounded-lg border border-ink-700 object-cover" /> : <div className="grid h-20 w-32 shrink-0 place-items-center rounded-lg border border-dashed border-ink-700 text-xs text-gray-600">No image</div>}
      <div className="flex-1">
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste an image URL, or upload →" />
        <div className="mt-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="btn-outline py-2 text-xs"><Upload className="h-3.5 w-3.5" />{busy ? 'Uploading…' : 'Upload Image'}</button>
        </div>
      </div>
    </div>
  );
}
