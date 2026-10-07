import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { ProductCard } from './ProductCard';
import { ReceiptModal } from './ReceiptModal';
import { CashMovementsModal } from './CashMovementsModal';
import { ClientFormModal } from '../clients/ClientFormModal';
import { Sale, PaymentMethod, Product } from '../../types';
import { 
  ShoppingBag, 
  Search, 
  Barcode, 
  ShoppingCart, 
  DollarSign, 
  Lock, 
  ChevronDown, 
  User, 
  Plus, 
  Minus, 
  Trash2, 
  Banknote, 
  CreditCard, 
  ArrowRightLeft, 
  Clock, 
  Bell, 
  Check, 
  Sparkles, 
  Receipt,
  UserPlus
} from 'lucide-react';

interface PosTerminalProps {
  isCartOpen?: boolean;
  setIsCartOpen?: (open: boolean) => void;
  onNavigateToCash?: () => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({ onNavigateToCash }) => {
  const { 
    products, 
    cart, 
    addToCart, 
    removeFromCart, 
    updateCartQuantity, 
    clearCart, 
    cartTotal, 
    cartItemsCount, 
    processSale, 
    members, 
    currentRole 
  } = useGym();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  
  // Tray Customer State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidStr, setAmountPaidStr] = useState<string>('');
  
  // Modals
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const categories = [
    { id: 'all', label: 'Todas las Categorías' },
    { id: 'protein', label: 'Proteínas' },
    { id: 'creatine', label: 'Creatinas' },
    { id: 'preworkout', label: 'Pre-Entreno' },
    { id: 'aminoacids', label: 'Aminoácidos' },
    { id: 'beverage', label: 'Bebidas & Hidratación' },
    { id: 'snack', label: 'Snacks Proteicos' },
    { id: 'gear', label: 'Accesorios & Gym Gear' },
  ];

  // Filtering products
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesQuery = 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      (p.flavor && p.flavor.toLowerCase().includes(search.toLowerCase()));

    return matchesCat && matchesQuery;
  });

  // Barcode handler
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;

    const matched = products.find(p => p.barcode === barcodeInput.trim() || p.id.toLowerCase() === barcodeInput.trim().toLowerCase());
    if (matched) {
      addToCart(matched, 1);
      setBarcodeInput('');
    } else {
      alert(`Código de barras "${barcodeInput}" no encontrado en el catálogo.`);
    }
  };

  // Calculations
  const cashGiven = parseFloat(amountPaidStr) || 0;
  const changeDue = paymentMethod === 'cash' ? Math.max(0, cashGiven - cartTotal) : 0;
  const canCheckout = cart.length > 0 && (paymentMethod !== 'cash' || cashGiven >= cartTotal || amountPaidStr === '');

  // Quick cash bill handler
  const handleQuickCash = (val: number | 'exact') => {
    if (val === 'exact') {
      setAmountPaidStr(cartTotal.toFixed(2));
    } else {
      setAmountPaidStr(val.toString());
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const finalAmountPaid = paymentMethod === 'cash' ? (cashGiven > 0 ? cashGiven : cartTotal) : cartTotal;
    const sale = processSale(paymentMethod, finalAmountPaid, selectedClientId || undefined);
    setCompletedSale(sale);
    setAmountPaidStr('');
  };

  const selectedMember = members.find(m => m.id === selectedClientId);

  return (
    <div className="space-y-4">
      
      {/* 1. TOP SUB-HEADER BAR (Exactly as in screenshot) */}
      <div className="bg-gym-card rounded-2xl border border-gym-border p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
        
        {/* Brand Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-glow-gold border border-amber-400/50">
            <ShoppingBag className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-black text-base text-white tracking-wide">
                Punto de Venta (POS)
              </h2>
            </div>
            <p className="text-[11px] text-gym-muted font-medium">
              Caja rápida mostrador y tickets de venta
            </p>
          </div>
        </div>

        {/* Status Indicators Strip */}
        <div className="flex items-center gap-2 text-xs">
          
          {/* Sincronizado Pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sincronizado</span>
          </div>

          {/* Matriz Dropdown Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gym-surface text-gray-200 border border-gym-border font-semibold">
            <span className="text-amber-400 font-bold">🏪 Matriz</span>
            <ChevronDown className="w-3.5 h-3.5 text-gym-muted" />
          </div>

          {/* Real-time Clock */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gym-surface text-gym-muted border border-gym-border font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentTime.toLocaleTimeString('es-MX')}</span>
          </div>

          {/* Bell Notification */}
          <div className="relative p-2 rounded-full bg-gym-surface border border-gym-border text-gym-muted hover:text-white cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-500" />
          </div>

          {/* Cashier / User Card */}
          <div className="flex items-center gap-2 pl-2 border-l border-gym-border">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400 text-xs">
              {currentRole === 'admin' ? 'RG' : 'CR'}
            </div>
            <div className="hidden md:block text-left leading-tight">
              <span className="font-bold text-xs text-white block">
                {currentRole === 'admin' ? 'Don Roberto Garza' : 'Camila Herrera'}
              </span>
              <span className="text-[9px] font-extrabold uppercase text-amber-400">
                {currentRole === 'admin' ? 'DUEÑO / ADMINISTRADOR' : 'RECEPCIÓN / CAJERA'}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* 2. MAIN TWO-COLUMN POS WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Search, Action Buttons & Products Grid (approx 65%) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Search Bar matching screenshot */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar proteína $1,450, creatina, pre-entreno, bebidas o escanea código..."
              className="w-full px-5 py-3.5 bg-gym-card rounded-2xl border border-gym-border text-sm text-white placeholder-gym-muted shadow-sm focus:outline-none focus:border-amber-400 transition-colors"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gym-muted hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Action Buttons Row (Categorías ⌄, $ Movimientos, 🔒 Cerrar Turno) */}
          <div className="flex items-center gap-3 relative">
            
            {/* Categorías Button with dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gym-card hover:bg-gym-surface border border-gym-border text-xs font-bold text-gray-200 transition-all shadow-sm"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>
                  {categories.find(c => c.id === selectedCategory)?.label || 'Categorías'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gym-muted" />
              </button>

              {/* Categorías Dropdown Menu */}
              {isCategoryOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-56 bg-gym-card border border-gym-border rounded-2xl shadow-2xl p-1.5 z-30 animate-fade-in">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between ${
                        selectedCategory === cat.id
                          ? 'bg-amber-500/20 text-amber-400 font-bold'
                          : 'text-gray-300 hover:bg-gym-surface'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {selectedCategory === cat.id && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* $ Movimientos Button (Warm Yellow/Gold as in screenshot) */}
            <button
              onClick={() => setShowMovementsModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-black transition-all shadow-sm"
            >
              <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center font-bold text-[10px]">
                $
              </span>
              <span>Movimientos</span>
            </button>

            {/* 🔒 Cerrar Turno Button (Orange/Amber gradient as in screenshot) */}
            <button
              onClick={() => {
                if (onNavigateToCash) onNavigateToCash();
                else alert('Usa el menú lateral "Corte de Caja" para cerrar tu turno formalmente.');
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-extrabold shadow-sm transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Cerrar Turno</span>
            </button>

          </div>

          {/* Product Cards Grid matching the screenshot */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full p-12 text-center bg-gym-card rounded-2xl border border-gym-border text-gym-muted">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-30 text-amber-400" />
                <p className="text-sm font-bold text-white">No hay productos que coincidan</p>
                <p className="text-xs mt-1">Busca otro término o selecciona "Todas las categorías".</p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: "Charola de Cobro" (approx 35%) */}
        <div className="lg:col-span-4 bg-gym-card rounded-2xl border border-gym-border p-4 shadow-xl space-y-4 sticky top-20">
          
          {/* Header: Charola de Cobro + Counter Badge */}
          <div className="flex items-start justify-between gap-2 border-b border-gym-border pb-3">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-black shadow-sm shrink-0 mt-0.5">
                <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-black text-sm text-white">Charola de Cobro</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-400/90 font-semibold mt-0.5">
                  <span>🏪 Sucursal Matriz (Centro)</span>
                  <ChevronDown className="w-3 h-3 text-gym-muted" />
                </div>
                <p className="text-[10px] text-gym-muted">
                  {currentRole === 'admin' ? 'Roberto Garza' : 'Cajera Turno'} • Mostrador
                </p>
              </div>
            </div>

            {/* Counter pill */}
            <span className="px-3 py-1 rounded-full bg-[#1B2030] text-gray-200 border border-gym-border text-xs font-mono font-bold">
              {cartItemsCount} piezas
            </span>
          </div>

          {/* Customer Selection Row: [Público en General] [Buscar cli...] [+ Nuevo] */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsClientSearchOpen(!isClientSearchOpen)}
              className="flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-white truncate"
              title="Asignar socio a la compra"
            >
              <div className="flex items-center gap-1.5 truncate">
                <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  {selectedMember ? selectedMember.fullName : 'Público en General'}
                </span>
              </div>
              <ChevronDown className="w-3 h-3 text-gym-muted shrink-0" />
            </button>

            <button
              onClick={() => setShowAddClientModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold flex items-center gap-1 shrink-0 transition-all"
              title="Registrar nuevo socio"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Nuevo</span>
            </button>
          </div>

          {/* Client Search dropdown if open */}
          {isClientSearchOpen && (
            <div className="p-2 rounded-xl bg-gym-surface border border-gym-border space-y-1.5 animate-fade-in text-xs">
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Buscar socio por nombre o ID..."
                className="w-full px-2.5 py-1 bg-gym-card rounded-lg border border-gym-border text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <div className="max-h-36 overflow-y-auto divide-y divide-gym-border/40">
                <div
                  onClick={() => {
                    setSelectedClientId('');
                    setIsClientSearchOpen(false);
                  }}
                  className="p-1.5 hover:bg-gym-card cursor-pointer rounded font-bold text-gray-200"
                >
                  Público en General (Sin registro)
                </div>
                {members
                  .filter(m => m.fullName.toLowerCase().includes(clientSearch.toLowerCase()) || m.id.toLowerCase().includes(clientSearch.toLowerCase()))
                  .map(m => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedClientId(m.id);
                        setIsClientSearchOpen(false);
                      }}
                      className="p-1.5 hover:bg-gym-card cursor-pointer rounded flex justify-between items-center"
                    >
                      <span className="font-semibold text-white truncate">{m.fullName}</span>
                      <span className="text-[10px] text-amber-400 font-mono">{m.membership.planName}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Barcode scanner input bar: [|||| Escanear código...] [+ Cobrar] [🟢 Lector Activo] */}
          <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-gym-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanear código de barras..."
                className="w-full pl-8 pr-2 py-1.5 bg-gym-surface rounded-xl border border-gym-border text-xs text-white placeholder-gym-muted font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <button
              type="submit"
              className="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/30"
            >
              + Agregar
            </button>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Lector Activo
            </span>
          </form>

          {/* Tray Body / Items List */}
          <div className="max-h-[260px] min-h-[160px] overflow-y-auto divide-y divide-gym-border/40">
            {cart.length === 0 ? (
              /* Empty Tray State exactly matching the screenshot */
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  MOSTRADOR LISTO
                </span>
                <h4 className="font-bold text-sm text-white">Charola vacía</h4>
                <p className="text-[11px] text-gym-muted leading-relaxed max-w-[220px]">
                  Escanea el código de barras o toca cualquier suplemento del mostrador para agregarlo al cobro.
                </p>

                {/* Special Action button matching screenshot */}
                <button
                  onClick={() => {
                    // Quick add a shaker or energy drink
                    const promo = products.find(p => p.id === 'PROD-008') || products[0];
                    if (promo) addToCart(promo, 1);
                  }}
                  className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-red-950 via-rose-900 to-red-950 hover:from-red-900 hover:to-rose-800 text-rose-200 text-xs font-bold border border-rose-500/40 shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cobro Rápido de Bebida / Suplemento ⚡</span>
                </button>
              </div>
            ) : (
              /* Filled Tray Items */
              cart.map((item) => (
                <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-10 h-10 rounded-xl object-cover border border-gym-border shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-white truncate">{item.product.name}</h5>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      ${item.unitPrice.toFixed(2)} c/u
                    </span>
                  </div>

                  {/* Quantity control */}
                  <div className="flex items-center gap-1 bg-gym-surface p-0.5 rounded-lg border border-gym-border shrink-0">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 rounded text-gym-muted hover:text-white hover:bg-gym-card"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-xs px-1 text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-1 rounded text-gym-muted hover:text-white hover:bg-gym-card disabled:opacity-30"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-xs text-white block">
                      ${item.subtotal.toFixed(2)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-gym-muted hover:text-red-400 text-[10px]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 3. BOTTOM CHECKOUT PANEL (Dark box with Total, Cash denominations, and Cobrar & Ticket) */}
          <div className="bg-[#0E1119] rounded-2xl border border-gym-border p-3.5 space-y-3">
            
            {/* Total Header */}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gym-muted block">
                TOTAL A COBRAR ({cartItemsCount} PZS)
              </span>
              <span className="text-3xl font-black font-mono text-amber-400 tracking-tight block">
                ${cartTotal.toFixed(2)}
              </span>
            </div>

            {/* Payment Method Pills ($ Efectivo, Tarjeta, Transferencia) */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 border transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
                    : 'bg-gym-surface text-gym-muted border-gym-border hover:text-white'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>$ Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 border transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
                    : 'bg-gym-surface text-gym-muted border-gym-border hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-1.5 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1 border transition-all ${
                  paymentMethod === 'transfer'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
                    : 'bg-gym-surface text-gym-muted border-gym-border hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer</span>
              </button>
            </div>

            {/* Quick Cash Bills Row: [Exacto] [$20] [$50] [$100] [$200] [$500] */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2 pt-1 border-t border-gym-border/60">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => handleQuickCash('exact')}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] border border-amber-500/40 flex items-center gap-0.5 shrink-0"
                  >
                    <span>⚡ Exacto</span>
                  </button>
                  {[50, 100, 200, 500, 1000, 2000].map(bill => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => handleQuickCash(bill)}
                      className="px-2 py-1 rounded-lg bg-gym-surface hover:bg-gym-surface/80 text-gray-200 font-bold text-[11px] border border-gym-border shrink-0"
                    >
                      ${bill}
                    </button>
                  ))}
                </div>

                {/* Tender Input: Paga con... ($) */}
                <div className="flex items-center justify-between gap-2 bg-gym-surface/80 px-3 py-1.5 rounded-xl border border-gym-border">
                  <div className="flex items-center gap-2 flex-1">
                    <Banknote className="w-4 h-4 text-emerald-400" />
                    <input
                      type="number"
                      value={amountPaidStr}
                      onChange={(e) => setAmountPaidStr(e.target.value)}
                      placeholder={`Paga con... ($)`}
                      className="w-full bg-transparent text-sm font-mono font-bold text-white placeholder-gym-muted focus:outline-none"
                    />
                  </div>
                  {cashGiven > 0 && (
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gym-muted block leading-none">Cambio:</span>
                      <span className="text-sm font-mono font-black text-emerald-400">
                        ${changeDue.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Actions: [Cancelar Compra] [Cobrar & Ticket] */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gym-border/60">
              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="py-2.5 px-3 rounded-xl bg-gym-surface hover:bg-red-500/20 text-gym-muted hover:text-red-400 border border-gym-border disabled:opacity-30 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancelar Compra</span>
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!canCheckout}
                className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-35 text-black font-black text-xs shadow-glow-gold flex items-center justify-center gap-1.5 transition-all"
              >
                <Receipt className="w-4 h-4" />
                <span>Cobrar & Ticket</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Cash Movements Modal */}
      {showMovementsModal && (
        <CashMovementsModal onClose={() => setShowMovementsModal(false)} />
      )}

      {/* Quick Add Client Modal */}
      {showAddClientModal && (
        <ClientFormModal
          onClose={() => setShowAddClientModal(false)}
          onClientCreated={(client) => {
            setSelectedClientId(client.id);
            setShowAddClientModal(false);
          }}
        />
      )}

      {/* Receipt Thermal Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}

    </div>
  );
};
