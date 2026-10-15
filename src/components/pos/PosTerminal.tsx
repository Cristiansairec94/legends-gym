import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGym } from '../../context/GymContext';
import { ProductCard } from './ProductCard';
import { ReceiptModal } from './ReceiptModal';
import { CashMovementsModal } from './CashMovementsModal';
import { ClientFormModal } from '../clients/ClientFormModal';
import { Sale, PaymentMethod, Product } from '../../types';
import { sounds } from '../../services/audio';
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
  Check, 
  Receipt,
  UserPlus,
  ScanLine,
  AlertCircle,
  CheckCircle2,
  Zap
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

  // Tray Customer State
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidStr, setAmountPaidStr] = useState<string>('');
  
  // Modals
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Live Clock
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
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
  // Barcode Scanner & Real-time Feedback State
  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [flashScanner, setFlashScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    product?: Product;
    timestamp: number;
  } | null>(null);

  // Auto-dismiss scan feedback after 3.2 seconds
  useEffect(() => {
    if (!scanFeedback) return;
    const timer = setTimeout(() => {
      setScanFeedback(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [scanFeedback]);

  // Main Barcode Matcher & Cart Insertion
  const handleProductScanned = useCallback((rawCode: string, sourceInput?: HTMLInputElement | null) => {
    const cleanCode = rawCode.trim().replace(/^[\r\n\t]+|[\r\n\t]+$/g, '');
    if (!cleanCode) return;

    // Search product by barcode, SKU, ID, or normalized digits
    const matched = products.find(p => {
      const pBarcode = (p.barcode || '').trim();
      const pSku = (p.sku || '').trim();
      const pId = (p.id || '').trim();

      if (pBarcode && pBarcode.toLowerCase() === cleanCode.toLowerCase()) return true;
      if (pSku && pSku.toLowerCase() === cleanCode.toLowerCase()) return true;
      if (pId.toLowerCase() === cleanCode.toLowerCase()) return true;

      // Pure digits matching (for standard 12/13-digit EAN/UPC scanners)
      const cleanDigits = cleanCode.replace(/\D/g, '');
      const pDigits = pBarcode.replace(/\D/g, '');
      if (cleanDigits.length >= 6 && pDigits.length >= 6) {
        if (cleanDigits === pDigits || cleanDigits.endsWith(pDigits) || pDigits.endsWith(cleanDigits)) {
          return true;
        }
      }
      return false;
    });

    if (matched) {
      if (matched.stock <= 0) {
        sounds.playBarcodeError();
        setScanFeedback({
          type: 'warning',
          message: `"${matched.name}" está agotado (Stock 0 en almacén).`,
          product: matched,
          timestamp: Date.now()
        });
      } else {
        addToCart(matched, 1);
        sounds.playBarcodeBeep();
        setScanFeedback({
          type: 'success',
          message: `+1 ${matched.name} añadido a Caja de Cobro`,
          product: matched,
          timestamp: Date.now()
        });
      }

      if (sourceInput) {
        sourceInput.value = '';
      }
      setBarcodeInput('');
      setSearch('');
      setFlashScanner(true);
      setTimeout(() => setFlashScanner(false), 800);
    } else {
      sounds.playBarcodeError();
      setScanFeedback({
        type: 'error',
        message: `Código "${cleanCode}" no encontrado en el Catálogo de Productos.`,
        timestamp: Date.now()
      });
      if (sourceInput) {
        sourceInput.select();
      }
    }
  }, [products, addToCart]);

  // Global Hardware Barcode Listener (USB / Bluetooth Keyboards & Laser Scanners)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    let isRapidBurst = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if blocking modals are currently open
      if (showMovementsModal || showAddClientModal || completedSale) {
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.isContentEditable
      );

      const currentTime = performance.now();
      const timeDiff = currentTime - lastKeyTime;

      // Barcode scanners type at superhuman speeds (< 60ms between characters)
      if (timeDiff < 60) {
        isRapidBurst = true;
      } else if (timeDiff > 250) {
        // Reset if normal human typing pause
        buffer = '';
        isRapidBurst = false;
      }

      lastKeyTime = currentTime;

      // Handle barcode termination: Enter or NumpadEnter
      if (e.key === 'Enter' || e.key === 'NumpadEnter') {
        const candidate = buffer.trim();
        // If rapid burst OR if no input was active, it's definitely a barcode scan!
        if (candidate.length >= 3 && (isRapidBurst || !isInputFocused)) {
          e.preventDefault();
          e.stopPropagation();
          handleProductScanned(
            candidate, 
            isInputFocused && activeEl instanceof HTMLInputElement ? activeEl : null
          );
          buffer = '';
          isRapidBurst = false;
          return;
        }
        buffer = '';
        isRapidBurst = false;
        return;
      }

      // Buffer normal printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showMovementsModal, showAddClientModal, completedSale, handleProductScanned]);

  // Barcode handler from manual input or form submit
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleProductScanned(barcodeInput, barcodeInputRef.current);
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
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      
      {/* MAIN TWO-COLUMN POS WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2.5 min-h-0 overflow-hidden items-stretch">
        
        {/* LEFT COLUMN: Header, Search, Action Buttons & Products Grid */}
        <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex flex-col gap-2 min-h-0 overflow-hidden">
          
          {/* 1. TOP SUB-HEADER BAR (Integrated in Left Workspace) */}
          <div className="bg-gym-card rounded-xl border border-gym-border px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-sm shrink-0">
            
            {/* Brand Logo & Subtitle */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-glow-gold border border-amber-400/50 shrink-0">
                <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" />
              </div>
              <div className="leading-tight">
                <h2 className="font-black text-sm sm:text-base text-white tracking-wide">
                  Punto de Venta
                </h2>
                <p className="text-[10px] text-gym-muted font-medium hidden sm:block">
                  Caja rápida mostrador y tickets
                </p>
              </div>
            </div>

            {/* Status Indicators Strip */}
            <div className="flex items-center gap-2">
              
              {/* Sincronizado Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-xs shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">Sincronizado</span>
              </div>

              {/* Matriz Indicator Pill */}
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gym-surface text-gray-100 border border-gym-border font-bold text-xs shadow-sm">
                <span className="text-amber-400">🏪 Matriz</span>
              </div>

              {/* Real-time Clock */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gym-surface text-gray-200 border border-gym-border font-mono text-xs font-semibold shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentTime.toLocaleTimeString('es-MX')}</span>
              </div>

              {/* Cashier / User Card */}
              <div className="flex items-center gap-2 pl-2 border-l border-gym-border">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-black text-amber-400 text-xs shrink-0 shadow-sm">
                  {currentRole === 'admin' ? 'RG' : 'CR'}
                </div>
                <div className="hidden lg:block text-left leading-tight">
                  <span className="font-bold text-xs text-white block">
                    {currentRole === 'admin' ? 'Don Roberto Garza' : 'Camila Herrera'}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase text-amber-400 tracking-wider block">
                    {currentRole === 'admin' ? 'DUEÑO / ADMIN' : 'RECEPCIÓN'}
                  </span>
                </div>
              </div>

            </div>

          </div>
          
          {/* Integrated Search & Actions Toolbar */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-gym-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (search.trim()) {
                      handleProductScanned(search.trim());
                    }
                  }
                }}
                placeholder="Buscar suplemento, sabor o código..."
                className="w-full pl-10 pr-12 py-2.5 bg-gym-card rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted shadow-sm focus:outline-none focus:border-amber-400 transition-colors"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gym-muted hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Barcode Scanner Active Indicator Pill */}
            <div 
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-sm shrink-0 cursor-default select-none ${
                flashScanner 
                  ? 'bg-emerald-500 text-black border-emerald-300 scale-105 shadow-glow-gold' 
                  : 'bg-gym-card text-emerald-400 border-emerald-500/30'
              }`}
              title="Lector de código de barras USB/Bluetooth en línea. Escanea cualquier código en cualquier momento y se agregará directamente a la caja de cobro."
            >
              <ScanLine className={`w-4 h-4 ${flashScanner ? 'animate-bounce' : 'animate-pulse'}`} />
              <span className="hidden sm:inline">Lector Activo</span>
            </div>

            {/* Categorías Button with dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gym-card hover:bg-gym-surface border border-gym-border text-sm font-bold text-gray-200 transition-all shadow-sm shrink-0"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span className="truncate max-w-[140px]">
                  {categories.find(c => c.id === selectedCategory)?.label || 'Categorías'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-gym-muted" />
              </button>

              {/* Categorías Dropdown Menu */}
              {isCategoryOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-gym-card border border-gym-border rounded-xl shadow-2xl p-1.5 z-30 animate-fade-in">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setIsCategoryOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-between ${
                        selectedCategory === cat.id
                          ? 'bg-amber-500/20 text-amber-400 font-bold'
                          : 'text-gray-300 hover:bg-gym-surface'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {selectedCategory === cat.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* $ Movimientos Button */}
            <button
              onClick={() => setShowMovementsModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-sm font-bold transition-all shadow-sm shrink-0"
            >
              <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[10px]">
                $
              </span>
              <span>Movimientos</span>
            </button>

            {/* 🔒 Cerrar Turno Button */}
            <button
              onClick={() => {
                if (onNavigateToCash) onNavigateToCash();
                else alert('Usa el menú lateral "Corte de Caja" para cerrar tu turno formalmente.');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-extrabold shadow-sm transition-all shrink-0"
            >
              <Lock className="w-4 h-4" />
              <span>Cerrar Turno</span>
            </button>
          </div>

          {/* Product Cards Grid with internal scrolling */}
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 2xl:grid-cols-5 gap-2 pb-2">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-gym-card rounded-xl border border-gym-border text-gym-muted">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
                  <p className="text-xs font-bold text-white">No hay productos que coincidan</p>
                  <p className="text-[11px] mt-1">Busca otro término o selecciona "Todas las categorías".</p>
                </div>
              ) : (
                filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: "Caja de Cobro" */}
        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 bg-gym-card rounded-xl border border-gym-border p-3 shadow-xl flex flex-col justify-between min-h-0 h-full overflow-hidden">
          
          {/* Top section: Header + Client + Barcode */}
          <div className="space-y-2.5 shrink-0">
            {/* Header: Caja de Cobro + Counter Badge */}
            <div className="flex items-center justify-between gap-3 border-b border-gym-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-black shadow-md shrink-0">
                  <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="leading-snug">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-white tracking-wide">Caja de Cobro</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10B981]" />
                  </div>
                  <span className="text-xs text-amber-400 font-bold block">🏪 Sucursal Matriz</span>
                </div>
              </div>

              {/* Counter pill */}
              <span className="px-3.5 py-1.5 rounded-xl bg-gym-surface text-white border border-gym-border text-sm font-mono font-extrabold shadow-sm">
                {cartItemsCount} pzs
              </span>
            </div>

            {/* Customer Selection Row: [Público en General] */}
            <div className="w-full flex items-center px-3 py-1.5 rounded-lg bg-gym-surface border border-gym-border text-xs font-semibold text-white">
              <div className="flex items-center gap-2 truncate">
                <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate text-gray-200">Público en General</span>
              </div>
            </div>

            {/* Barcode scanner input bar */}
            <form onSubmit={handleBarcodeSubmit} className="relative w-full">
              <Barcode className="w-4 h-4 text-gym-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanear o escribir código (Enter)..."
                className="w-full pl-8 pr-3 py-1.5 bg-gym-surface rounded-lg border border-gym-border text-xs text-white placeholder-gym-muted font-mono focus:outline-none focus:border-amber-400"
              />
            </form>
          </div>

          {/* Middle Tray Body / Items List */}
          <div className="flex-1 min-h-[90px] overflow-y-auto divide-y divide-gym-border/40 pr-0.5 my-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-3 space-y-2">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Caja vacía</h4>
                  <p className="text-[11px] text-gym-muted leading-tight mt-0.5">
                    Toca un producto o escanea código para cobrar.
                  </p>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="py-2 flex items-center justify-between gap-2">
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-9 h-9 rounded-lg object-cover border border-gym-border shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs text-white truncate">{item.product.name}</h5>
                    <span className="text-[10px] text-amber-400 font-mono font-semibold">
                      ${item.unitPrice.toFixed(2)} c/u
                    </span>
                  </div>

                  {/* Quantity control */}
                  <div className="flex items-center gap-1 bg-gym-surface p-0.5 rounded border border-gym-border shrink-0">
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

          {/* 3. BOTTOM CHECKOUT PANEL */}
          <div className="bg-[#0E1119] rounded-xl border border-gym-border p-3 space-y-2.5 shrink-0">
            
            {/* Total Header */}
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-gym-muted">
                TOTAL A COBRAR ({cartItemsCount} PZS)
              </span>
              <span className="text-3xl font-black font-mono text-amber-400 tracking-tight">
                ${cartTotal.toFixed(2)}
              </span>
            </div>

            {/* Payment Method Pills ($ Efectivo, Tarjeta, Transferencia) */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
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
                className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
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
                className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'transfer'
                    ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
                    : 'bg-gym-surface text-gym-muted border-gym-border hover:text-white'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer</span>
              </button>
            </div>

            {/* Quick Cash Bills Row */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2 pt-1 border-t border-gym-border/60">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => handleQuickCash('exact')}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] border border-amber-500/40 flex items-center gap-0.5 shrink-0"
                  >
                    <span>⚡ Exacto</span>
                  </button>
                  {[50, 100, 200, 500, 1000].map(bill => (
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
                      placeholder="Paga con... ($)"
                      className="w-full bg-transparent text-sm font-mono font-bold text-white placeholder-gym-muted focus:outline-none"
                    />
                  </div>
                  {cashGiven > 0 && (
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-gym-muted mr-1">Cambio:</span>
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
                <span>Cancelar</span>
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

      {/* Floating Barcode Scan Toast Feedback */}
      {scanFeedback && (
        <div className={`fixed top-16 right-6 z-50 animate-bounce-short shadow-2xl rounded-2xl border px-4 py-3 flex items-center gap-3 backdrop-blur-md transition-all ${
          scanFeedback.type === 'success' 
            ? 'bg-gym-card/95 border-emerald-500/50 text-white shadow-emerald-500/10' 
            : scanFeedback.type === 'warning'
            ? 'bg-gym-card/95 border-amber-500/50 text-white shadow-amber-500/10'
            : 'bg-red-950/95 border-red-500/50 text-white shadow-red-500/20'
        }`}>
          {scanFeedback.type === 'success' ? (
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
          ) : scanFeedback.type === 'warning' ? (
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                scanFeedback.type === 'success' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : scanFeedback.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {scanFeedback.type === 'success' ? '⚡ Código Escaneado (+1)' : scanFeedback.type === 'warning' ? '⚠️ Stock Agotado' : '❌ Error de Lectura'}
              </span>
              {scanFeedback.product && (
                <span className="text-xs font-mono font-bold text-amber-400">
                  ${scanFeedback.product.price.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-gray-100 mt-0.5 max-w-xs truncate">
              {scanFeedback.message}
            </p>
          </div>
          <button 
            onClick={() => setScanFeedback(null)}
            className="text-gym-muted hover:text-white text-xs ml-2 p-1"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
};
