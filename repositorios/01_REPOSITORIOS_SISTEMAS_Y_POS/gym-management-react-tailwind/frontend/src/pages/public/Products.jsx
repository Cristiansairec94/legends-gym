import { useState, useEffect } from 'react';
import PageHeader from './PageHeader';
import ProductCard from '../../components/cards/ProductCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/trainerService';

export default function Products() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { categoryService.list({ is_active: true }).then((r) => setCategories(r.data.items)).catch(() => {}); }, []);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      productService.list({ search, category_id: category || undefined, page, limit: 12 })
        .then((r) => { setProducts(r.data.items); setPagination(r.data.pagination); })
        .catch(() => setProducts([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, category, page]);

  return (
    <div>
      <PageHeader title="Supplement Store" subtitle="Fuel your gains with premium supplements" />
      <section className="container-x py-16">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products…" className="sm:w-72" />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { setCategory(''); setPage(1); }} className={`btn ${!category ? 'btn-primary' : 'btn-outline'} py-2`}>All</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => { setCategory(String(c.id)); setPage(1); }}
                className={`btn ${category === String(c.id) ? 'btn-primary' : 'btn-outline'} py-2`}>{c.name}</button>
            ))}
          </div>
        </div>

        {loading ? <Loader /> : !products?.length ? <EmptyState title="No products found" subtitle="Try a different search or category" /> : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            <Pagination page={pagination.page} pages={pagination.pages} total={pagination.total} onChange={setPage} />
          </>
        )}
      </section>
    </div>
  );
}
