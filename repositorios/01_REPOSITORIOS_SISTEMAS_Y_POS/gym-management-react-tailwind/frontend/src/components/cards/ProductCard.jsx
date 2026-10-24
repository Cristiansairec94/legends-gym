import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Lock } from 'lucide-react';
import { rs } from '../../utils/format';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../../utils/toast';

export default function ProductCard({ product }) {
  const { add } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const onSale = product.sale_price != null && Number(product.sale_price) < Number(product.price);
  const soldOut = product.stock <= 0;

  const handleAdd = (e) => {
    e.preventDefault();
    if (soldOut) return;
    if (!user) {
      toast.info('Please login to add items to your cart');
      navigate('/login');
      return;
    }
    add(product, 1);
    toast.success(`${product.name} added to cart`);
  };

  return (
    <div className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-brand/50 hover:shadow-glow">
      <Link to={`/products/${product.id}`} className="relative block aspect-square overflow-hidden bg-ink-850">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
        ) : (
          <div className="grid h-full w-full place-items-center text-ink-600"><Package className="h-12 w-12" /></div>
        )}
        {onSale && <span className="absolute left-3 top-3 rounded bg-brand px-2 py-0.5 text-[10px] font-bold text-white">SALE</span>}
        {soldOut && <span className="absolute right-3 top-3 rounded bg-ink-700 px-2 py-0.5 text-[10px] font-bold text-gray-300">SOLD OUT</span>}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        {product.brand && <span className="text-[11px] uppercase tracking-wide text-gray-500">{product.brand}</span>}
        <Link to={`/products/${product.id}`} className="mt-0.5 line-clamp-2 min-h-[2.75rem] font-medium leading-snug text-white transition hover:text-brand">{product.name}</Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-display text-lg text-brand">{rs(product.sale_price ?? product.price)}</span>
          {onSale && <span className="text-sm text-gray-500 line-through">{rs(product.price)}</span>}
        </div>
        <button onClick={handleAdd} disabled={soldOut} className="btn-primary mt-4 w-full whitespace-nowrap">
          {soldOut ? <>Sold Out</> : !user ? <><Lock className="h-4 w-4" />Login to Buy</> : <><ShoppingCart className="h-4 w-4" />Add to Cart</>}
        </button>
      </div>
    </div>
  );
}
