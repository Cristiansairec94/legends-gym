import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import { useCart } from '../../context/CartContext';
import { rs } from '../../utils/format';

export default function Cart() {
  const { items, setQuantity, remove, total } = useCart();

  return (
    <div className="container-x py-12">
      <h1 className="mb-8 font-heading text-3xl uppercase text-white">Your Cart</h1>
      {!items.length ? (
        <EmptyState icon={ShoppingBag} title="Your cart is empty" subtitle="Browse the store and add some supplements."
          action={<Link to="/products" className="btn-primary mt-2">Go to Store</Link>} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((i) => (
              <div key={i.id} className="card flex items-center gap-4 p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-850">
                  {i.image_url && <img src={i.image_url} alt={i.name} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{i.name}</p>
                  <p className="text-sm text-brand">{rs(i.price)}</p>
                </div>
                <div className="flex items-center rounded-lg border border-ink-700">
                  <button onClick={() => setQuantity(i.id, i.quantity - 1)} className="p-2 text-gray-300 hover:text-white"><Minus className="h-4 w-4" /></button>
                  <span className="w-8 text-center text-sm text-white">{i.quantity}</span>
                  <button onClick={() => setQuantity(i.id, i.quantity + 1)} className="p-2 text-gray-300 hover:text-white"><Plus className="h-4 w-4" /></button>
                </div>
                <p className="w-24 text-right font-medium text-white">{rs(i.price * i.quantity)}</p>
                <button onClick={() => remove(i.id)} className="rounded-lg p-2 text-gray-500 hover:text-rose-400"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="card h-fit p-6">
            <h3 className="font-display text-lg font-semibold text-white">Order Summary</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span className="text-white">{rs(total)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Delivery</span><span className="text-white">Free</span></div>
              <div className="mt-2 flex justify-between border-t border-ink-700 pt-3 text-base font-semibold">
                <span className="text-white">Total</span><span className="text-brand">{rs(total)}</span>
              </div>
            </div>
            <Link to="/checkout" className="btn-primary mt-6 w-full py-3">Proceed to Checkout</Link>
          </div>
        </div>
      )}
    </div>
  );
}
