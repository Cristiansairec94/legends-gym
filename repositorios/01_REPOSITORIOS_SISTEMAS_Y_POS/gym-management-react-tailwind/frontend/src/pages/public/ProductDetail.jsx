import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, ArrowLeft, Package } from 'lucide-react';
import Loader from '../../components/common/Loader';
import { useFetch } from '../../hooks/useFetch';
import { productService } from '../../services/productService';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';
import { rs } from '../../utils/format';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();
  const { user } = useAuth();
  const [qty, setQty] = useState(1);

  const requireLoginThen = (fn) => {
    if (!user) { toast.info('Please login to add items to your cart'); navigate('/login'); return; }
    fn();
  };
  const { data: product, loading, error } = useFetch(() => productService.get(id), [id]);

  if (loading) return <Loader className="min-h-[60vh]" />;
  if (error || !product) return <div className="container-x py-24 text-center text-gray-400">Product not found. <Link to="/products" className="text-brand">Back to store</Link></div>;

  const soldOut = product.stock <= 0;
  const price = product.sale_price ?? product.price;

  return (
    <div className="container-x py-12">
      <Link to="/products" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-brand"><ArrowLeft className="h-4 w-4" />Back to store</Link>
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-850">
          {product.image_url ? <img src={product.image_url} alt={product.name} className="aspect-square w-full object-cover" />
            : <div className="grid aspect-square place-items-center text-ink-600"><Package className="h-20 w-20" /></div>}
        </div>
        <div>
          {product.brand && <p className="text-sm uppercase tracking-wide text-gray-500">{product.brand}</p>}
          <h1 className="mt-1 font-heading text-3xl uppercase text-white">{product.name}</h1>
          {product.category_name && <span className="mt-2 inline-block rounded-full bg-ink-800 px-3 py-1 text-xs text-gray-300">{product.category_name}</span>}
          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-3xl text-brand">{rs(price)}</span>
            {product.sale_price != null && <span className="text-lg text-gray-500 line-through">{rs(product.price)}</span>}
          </div>
          <p className="mt-4 text-gray-400">{product.description}</p>
          <p className="mt-4 text-sm text-gray-400">{soldOut ? <span className="text-rose-400">Out of stock</span> : `${product.stock} in stock`}</p>

          {!soldOut && (
            <div className="mt-6 flex items-center gap-4">
              <div className="flex items-center rounded-lg border border-ink-700">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3 text-gray-300 hover:text-white"><Minus className="h-4 w-4" /></button>
                <span className="w-10 text-center text-white">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(product.stock, q + 1))} className="p-3 text-gray-300 hover:text-white"><Plus className="h-4 w-4" /></button>
              </div>
              <button onClick={() => requireLoginThen(() => { add(product, qty); toast.success('Added to cart'); })} className="btn-primary flex-1 py-3">
                <ShoppingCart className="h-4 w-4" />{user ? 'Add to Cart' : 'Login to Buy'}
              </button>
            </div>
          )}
          <button onClick={() => requireLoginThen(() => { add(product, qty); navigate('/cart'); })} disabled={soldOut} className="btn-outline mt-3 w-full py-3">Buy Now</button>
        </div>
      </div>
    </div>
  );
}
