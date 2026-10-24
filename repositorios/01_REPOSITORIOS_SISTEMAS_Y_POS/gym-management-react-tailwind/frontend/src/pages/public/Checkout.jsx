import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import { useCart } from '../../context/CartContext';
import { orderService } from '../../services/orderService';
import { toast } from '../../utils/toast';
import { rs } from '../../utils/format';

export default function Checkout() {
  const { items, total, clear } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ customer_name: '', email: '', phone: '', address: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (!form.customer_name.trim()) e.customer_name = 'Name is required';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Valid email required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    if (!form.address.trim()) e.address = 'Delivery address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await orderService.checkout({
        ...form,
        items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      });
      clear();
      setDone(res.data.order);
      toast.success('Order placed!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="container-x py-24 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
        <h1 className="mt-4 font-heading text-3xl uppercase text-white">Order Confirmed</h1>
        <p className="mt-2 text-gray-400">Your order <span className="text-brand">{done.order_code}</span> has been placed. Total {rs(done.total_amount)}.</p>
        <p className="mt-1 text-sm text-gray-500">We'll contact you shortly to arrange payment and delivery.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/products" className="btn-outline">Continue Shopping</Link>
          <Link to="/" className="btn-primary">Back Home</Link>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="container-x py-16">
        <EmptyState title="Nothing to check out" subtitle="Your cart is empty."
          action={<Link to="/products" className="btn-primary mt-2">Go to Store</Link>} />
      </div>
    );
  }

  return (
    <div className="container-x py-12">
      <h1 className="mb-8 font-heading text-3xl uppercase text-white">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="card space-y-4 p-6 lg:col-span-2">
          <h3 className="font-display font-semibold text-white">Delivery Details</h3>
          {[
            { k: 'customer_name', label: 'Full Name' },
            { k: 'email', label: 'Email', type: 'email' },
            { k: 'phone', label: 'Phone' },
          ].map((f) => (
            <div key={f.k}>
              <label className="label">{f.label}</label>
              <input type={f.type || 'text'} value={form[f.k]} onChange={set(f.k)} className="input" />
              {errors[f.k] && <p className="mt-1 text-xs text-rose-400">{errors[f.k]}</p>}
            </div>
          ))}
          <div>
            <label className="label">Delivery Address</label>
            <textarea value={form.address} onChange={set('address')} rows={2} className="input" />
            {errors.address && <p className="mt-1 text-xs text-rose-400">{errors.address}</p>}
          </div>
          <div>
            <label className="label">Order Notes (optional)</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} className="input" />
          </div>
          <p className="rounded-lg bg-ink-800 p-3 text-xs text-gray-400">
            Payment is arranged manually by our team after you place the order — no card details are collected here.
          </p>
        </div>

        <div className="card h-fit p-6">
          <h3 className="font-display font-semibold text-white">Your Order</h3>
          <div className="mt-4 space-y-2 text-sm">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-gray-400">
                <span className="truncate">{i.name} × {i.quantity}</span>
                <span className="text-white">{rs(i.price * i.quantity)}</span>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-ink-700 pt-3 text-base font-semibold">
              <span className="text-white">Total</span><span className="text-brand">{rs(total)}</span>
            </div>
          </div>
          <button onClick={submit} disabled={submitting} className="btn-primary mt-6 w-full py-3">
            {submitting ? 'Placing order…' : 'Place Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
