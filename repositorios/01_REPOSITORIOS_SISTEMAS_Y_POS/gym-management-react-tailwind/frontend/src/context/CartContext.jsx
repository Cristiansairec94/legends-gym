import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { accountService } from '../services/accountService';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const loadedFor = useRef(null);   // userId whose cart is currently loaded
  const saveTimer = useRef(null);

  // Load the cart whenever the logged-in user changes.
  useEffect(() => {
    let alive = true;
    async function load() {
      if (!user) { setItems([]); setReady(true); loadedFor.current = null; return; }
      setReady(false);
      const cached = localStorage.getItem(`ibbc_cart_${user.id}`);
      if (cached) { try { setItems(JSON.parse(cached)); } catch { /* ignore */ } }
      try {
        const res = await accountService.getCart();
        if (alive) setItems(res.data.items || []);
      } catch { /* offline: keep cache */ }
      finally { if (alive) { loadedFor.current = user.id; setReady(true); } }
    }
    load();
    return () => { alive = false; };
  }, [user]);

  // Persist to backend + local cache (debounced) after the cart is loaded.
  useEffect(() => {
    if (!user || !ready || loadedFor.current !== user.id) return;
    localStorage.setItem(`ibbc_cart_${user.id}`, JSON.stringify(items));
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      accountService.saveCart(items).catch(() => { /* best-effort */ });
    }, 500);
    return () => clearTimeout(saveTimer.current);
  }, [items, user, ready]);

  const add = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === product.id);
      const price = Number(product.sale_price ?? product.price);
      if (found) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock ?? 999) }
            : i
        );
      }
      return [...prev, { id: product.id, name: product.name, price, image_url: product.image_url, stock: product.stock, quantity }];
    });
  }, []);

  const setQuantity = useCallback((id, quantity) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i))), []);
  const remove = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  const { count, total } = useMemo(() => ({
    count: items.reduce((s, i) => s + i.quantity, 0),
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
  }), [items]);

  return (
    <CartContext.Provider value={{ items, add, setQuantity, remove, clear, count, total, ready, canShop: !!user }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
