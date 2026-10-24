import ResourceManager from '../../components/admin/ResourceManager';
import StatusBadge from '../../components/common/StatusBadge';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/trainerService';
import { useFetch } from '../../hooks/useFetch';
import { rs } from '../../utils/format';

export default function Products() {
  const { data: catData } = useFetch(() => categoryService.list({ limit: 100 }), []);
  const categoryOptions = (catData?.items || []).map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <ResourceManager
      title="Products"
      subtitle="Supplements & store inventory"
      service={productService}
      createLabel="Add Product"
      filters={[
        { name: 'category_id', label: 'All categories', options: categoryOptions },
        { name: 'is_active', label: 'All statuses', options: [
          { value: 'true', label: 'Active' },
          { value: 'false', label: 'Inactive' },
        ] },
      ]}
      defaultValues={{ is_active: true, is_featured: false, stock: 0 }}
      columns={[
        { key: 'name', header: 'Product', render: (r) => (
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-lg bg-ink-800 text-xs text-gray-500">
              {r.image_url ? <img src={r.image_url} alt="" className="h-full w-full object-cover" /> : (r.name?.[0] || 'P')}
            </span>
            <div>
              <p className="font-medium text-white">{r.name}</p>
              <p className="text-xs text-gray-500">{r.brand} · {r.sku || 'no SKU'}</p>
            </div>
          </div>
        ) },
        { key: 'price', header: 'Price', render: (r) => (
          <div>
            {r.sale_price ? (
              <span><span className="text-emerald-400">{rs(r.sale_price)}</span> <span className="text-xs text-gray-500 line-through">{rs(r.price)}</span></span>
            ) : rs(r.price)}
          </div>
        ) },
        { key: 'stock', header: 'Stock', render: (r) => (
          <span className={r.stock <= 5 ? 'text-rose-400' : 'text-gray-200'}>{r.stock}</span>
        ) },
        { key: 'is_active', header: 'Status', render: (r) => <StatusBadge status={r.is_active ? 'active' : 'expired'} /> },
      ]}
      fields={[
        { name: 'name', label: 'Product Name', required: true },
        { name: 'brand', label: 'Brand' },
        { name: 'category_id', label: 'Category', type: 'select', options: categoryOptions },
        { name: 'sku', label: 'SKU' },
        { name: 'price', label: 'Price (Rs.)', type: 'number', required: true },
        { name: 'sale_price', label: 'Sale Price (Rs.)', type: 'number' },
        { name: 'stock', label: 'Stock Quantity', type: 'number' },
        { name: 'image_url', label: 'Image URL' },
        { name: 'description', label: 'Description', type: 'textarea', colSpan: 2 },
        { name: 'is_featured', label: 'Featured', type: 'checkbox', placeholder: 'Show in featured section' },
        { name: 'is_active', label: 'Active', type: 'checkbox', placeholder: 'Visible in store' },
      ]}
      beforeSubmit={(v) => ({
        name: v.name,
        brand: v.brand || '',
        category_id: v.category_id ? Number(v.category_id) : null,
        sku: v.sku || null,
        price: Number(v.price) || 0,
        sale_price: v.sale_price ? Number(v.sale_price) : null,
        stock: Number(v.stock) || 0,
        image_url: v.image_url || '',
        description: v.description || '',
        is_featured: !!v.is_featured,
        is_active: !!v.is_active,
      })}
    />
  );
}
