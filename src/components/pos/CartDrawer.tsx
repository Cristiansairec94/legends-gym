import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { PaymentMethod, Sale } from '../../types';
import { 
  X, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Banknote, 
  CreditCard, 
  ArrowRightLeft, 
  Receipt
} from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaleCompleted: (sale: Sale) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onSaleCompleted,
}) => {
  const { 
    cart, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart, 
    cartTotal, 
    cartSubtotal, 
    cartTax, 
    cartItemsCount, 
    processSale, 
    members 
  } = useGym();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [amountPaidStr, setAmountPaidStr] = useState<string>('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const cashAmount = parseFloat(amountPaidStr) || 0;
  const changeDue = paymentMethod === 'cash' ? Math.max(0, cashAmount - cartTotal) : 0;
  const canCheckout = cart.length > 0 && (paymentMethod !== 'cash' || cashAmount >= cartTotal || amountPaidStr === '');

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const finalAmountPaid = paymentMethod === 'cash' ? (cashAmount > 0 ? cashAmount : cartTotal) : cartTotal;
    const sale = processSale(paymentMethod, finalAmountPaid, selectedClientId || undefined, notes);
    onSaleCompleted(sale);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="w-full max-w-md bg-gym-card border-l border-gym-border h-full flex flex-col justify-between shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Carrito de Venta POS</h3>
              <p className="text-xs text-gym-muted">{cartItemsCount} artículos seleccionados</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-gym-muted hover:text-red-400 px-2 py-1 rounded transition-colors"
                title="Vaciar carrito"
              >
                Vaciar
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-gym-border/40">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gym-muted">
              <ShoppingCart className="w-12 h-12 stroke-[1.2] opacity-20 mb-3 text-amber-400" />
              <p className="text-sm font-semibold text-gray-300">El carrito está vacío</p>
              <p className="text-xs mt-1">Haz clic en "Agregar" en cualquiera de los suplementos del catálogo.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="py-3 flex items-center justify-between gap-3">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-12 h-12 rounded-xl object-cover border border-gym-border shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-white truncate">{item.product.name}</h4>
                  <span className="text-[11px] text-amber-400 font-mono font-semibold">
                    ${item.unitPrice} MXN c/u
                  </span>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 bg-gym-surface p-1 rounded-xl border border-gym-border shrink-0">
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                    className="p-1 rounded-lg text-gym-muted hover:text-white hover:bg-gym-card transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold text-white px-1.5 font-mono">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock}
                    className="p-1 rounded-lg text-gym-muted hover:text-white hover:bg-gym-card disabled:opacity-30 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-white block">
                    ${item.subtotal.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-gym-muted hover:text-red-400 p-0.5 mt-0.5"
                    title="Eliminar del carrito"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Checkout Controls */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-gym-border bg-gym-surface/40 space-y-3.5">
            
            {/* Associate Client */}
            <div>
              <label className="text-[11px] font-semibold text-gym-muted block mb-1">
                Asignar Compra a Socio (Opcional):
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gym-surface rounded-xl border border-gym-border text-xs text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">Público General / Venta Mostrador</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.fullName} ({m.membership.planName})
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="text-[11px] font-semibold text-gym-muted block mb-1">
                Método de Pago:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'cash', label: 'Efectivo', icon: <Banknote className="w-3.5 h-3.5" /> },
                  { id: 'card', label: 'Tarjeta', icon: <CreditCard className="w-3.5 h-3.5" /> },
                  { id: 'transfer', label: 'Transfer', icon: <ArrowRightLeft className="w-3.5 h-3.5" /> },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition-all ${
                      paymentMethod === m.id
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                        : 'bg-gym-surface text-gym-muted border-gym-border'
                    }`}
                  >
                    {m.icon}
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cash Input & Change */}
            {paymentMethod === 'cash' && (
              <div className="bg-gym-surface/60 p-2.5 rounded-xl border border-gym-border flex items-center justify-between gap-3">
                <div className="flex-1">
                  <label className="text-[10px] text-gym-muted block">Efectivo Recibido:</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-amber-400 font-mono">$</span>
                    <input
                      type="number"
                      value={amountPaidStr}
                      onChange={(e) => setAmountPaidStr(e.target.value)}
                      placeholder={cartTotal.toString()}
                      className="w-full bg-transparent text-sm font-mono font-bold text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gym-muted block">Cambio:</span>
                  <span className="text-sm font-mono font-black text-emerald-400">
                    ${changeDue.toFixed(2)} MXN
                  </span>
                </div>
              </div>
            )}

            {/* Optional Sale Notes */}
            <div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nota o referencia de venta (opcional)..."
                className="w-full px-2.5 py-1.5 bg-gym-surface rounded-xl border border-gym-border text-xs text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Summary Math */}
            <div className="pt-2 border-t border-gym-border/70 space-y-1 text-xs">
              <div className="flex justify-between text-gym-muted">
                <span>Subtotal (sin IVA):</span>
                <span className="font-mono">${cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gym-muted">
                <span>I.V.A. (16%):</span>
                <span className="font-mono">${cartTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-white pt-1">
                <span>Total a Cobrar:</span>
                <span className="text-amber-400 font-mono text-lg">${cartTotal.toFixed(2)} MXN</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={!canCheckout}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-extrabold text-sm shadow-glow-gold flex items-center justify-center gap-2 transition-all"
            >
              <Receipt className="w-4 h-4" />
              <span>Cobrar Venta e Imprimir Ticket (${cartTotal.toFixed(2)})</span>
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
