import { useState } from 'react';
import PageHeader from './PageHeader';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import { useFetch } from '../../hooks/useFetch';
import { galleryService } from '../../services/trainerService';

export default function Gallery() {
  const { data, loading } = useFetch(() => galleryService.list({ is_active: true }), []);
  const [filter, setFilter] = useState('All');
  const [lightbox, setLightbox] = useState(null);

  const images = data?.items || [];
  const categories = ['All', ...new Set(images.map((i) => i.category).filter(Boolean))];
  const shown = filter === 'All' ? images : images.filter((i) => i.category === filter);

  return (
    <div>
      <PageHeader title="Gallery" subtitle="Inside International Body Building Club" />
      <section className="container-x py-16">
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`btn ${filter === c ? 'btn-primary' : 'btn-outline'} py-2`}>{c}</button>
          ))}
        </div>
        {loading ? <Loader /> : (
          <div className="masonry">
            {shown.map((img) => (
              <button key={img.id} onClick={() => setLightbox(img)} className="block w-full overflow-hidden rounded-xl border border-ink-700">
                <img src={img.image_url} alt={img.title || 'Gallery'} loading="lazy" className="w-full transition duration-500 hover:scale-105" />
              </button>
            ))}
          </div>
        )}
      </section>
      <Modal open={!!lightbox} onClose={() => setLightbox(null)} title={lightbox?.title || 'Preview'} maxWidth="max-w-3xl">
        {lightbox && <img src={lightbox.image_url} alt={lightbox.title} className="w-full rounded-lg" />}
      </Modal>
    </div>
  );
}
