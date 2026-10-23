import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGym } from '../../context/GymContext';
import { ProductCard } from './ProductCard';
import { ReceiptModal } from './ReceiptModal';
import { CashMovementsModal } from './CashMovementsModal';
import { ClientFormModal } from '../clients/ClientFormModal';
import posBanner from '../../assets/pos-banner.jpg';
import logoImg from '../../assets/logo.png';
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
  Zap,
  Package,
  X,
  Sparkles
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
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

    // Search product by barcode, SKU, ID, name, flavor or normalized digits
    const target = cleanCode.toLowerCase();
    const matched = products.find(p => {
      const pBarcode = (p.barcode || '').trim().toLowerCase();
      const pSku = (p.sku || '').trim().toLowerCase();
      const pId = (p.id || '').trim().toLowerCase();
      const pName = (p.name || '').trim().toLowerCase();
      const pFlavor = (p.flavor || '').trim().toLowerCase();

      if (pBarcode && pBarcode === target) return true;
      if (pSku && pSku === target) return true;
      if (pId === target) return true;
      if (pName === target) return true;
      if (pName.includes(target)) return true;
      if (pFlavor && pFlavor.includes(target)) return true;

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
        
        {/* LEFT COLUMN: Header, Branding Banner ("LEYENDS GYM - CLUB FITNESS") & Quick Actions */}
        <div className="lg:col-span-5 xl:col-span-4 2xl:col-span-4 flex flex-col gap-2.5 min-h-0 overflow-hidden">
          
          {/* 1. TOP SUB-HEADER BAR */}
          <div className="bg-gradient-to-r from-[#14151e] via-[#121319] to-[#14151e] rounded-2xl border border-white/[0.08] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md shrink-0">
            
            {/* Brand Logo & Subtitle */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-glow-gold/30 border border-amber-300/40 shrink-0">
                <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" />
              </div>
              <div className="leading-tight">
                <h2 className="font-black text-sm sm:text-base text-white tracking-tight">
                  Punto de Venta
                </h2>
                <p className="text-[10px] text-zinc-400 font-medium hidden sm:block">
                  Caja rápida mostrador y tickets
                </p>
              </div>
            </div>

            {/* Status Indicators Strip */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              
              {/* Sincronizado Pill */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold text-xs shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
                <span className="hidden sm:inline">Sincronizado</span>
              </div>

              {/* Real-time Clock */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] text-zinc-200 border border-white/[0.08] font-mono text-xs font-semibold shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentTime.toLocaleTimeString('es-MX')}</span>
              </div>

              {/* Cashier / User Card */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center font-black text-amber-400 text-xs shrink-0 shadow-sm">
                  {currentRole === 'admin' ? 'RG' : 'CR'}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <span className="font-extrabold text-xs text-white block">
                    {currentRole === 'admin' ? 'Don Roberto Garza' : 'Camila Herrera'}
                  </span>
                  <span className="text-[9px] font-black uppercase text-amber-400 tracking-wider block">
                    {currentRole === 'admin' ? 'DUEÑO / ADMIN' : 'RECEPCIÓN'}
                  </span>
                </div>
              </div>

            </div>

          </div>
          
          {/* 2. BRANDING SHOWCASE HERO BANNER: "LEYENDS GYM - CLUB FITNESS" */}
          <div className="flex-1 relative rounded-2xl border border-amber-500/30 overflow-hidden shadow-2xl group min-h-[200px] bg-[#0d0e14] flex flex-col justify-between">
            {/* Background High-End Banner Image */}
            <img 
              src={posBanner} 
              alt="LEYENDS GYM - CLUB FITNESS"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/pos-banner.jpg';
              }}
              className="absolute inset-0 w-full h-full object-cover object-center transform group-hover:scale-105 transition-transform duration-700"
            />
            {/* Vignette overlays for ultra-high contrast and readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/50 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(245,158,11,0.18)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />

            {/* Top Badge on Banner */}
            <div className="relative z-10 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/40 text-[10px] font-black uppercase tracking-wider text-amber-300 shadow-lg">
                <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>TERMINAL OFICIAL</span>
              </div>

              {/* Botón para ver/abrir catálogo de productos en modal si se desea */}
              <button
                type="button"
                onClick={() => setShowCatalogModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/65 hover:bg-black/85 backdrop-blur-md border border-white/20 hover:border-amber-400 text-xs font-bold text-white transition-all shadow-md group/btn"
                title="Explorar todos los productos por categoría"
              >
                <Package className="w-3.5 h-3.5 text-amber-400 group-hover/btn:rotate-6 transition-transform" />
                <span>Ver Catálogo</span>
              </button>
            </div>

            {/* Bottom Info on Banner */}
            <div className="relative z-10 p-3 sm:p-3.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    LEYENDS GYM
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">
                    Club Fitness • Don Toño Brito
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase block">Disponibles</span>
                  <span className="text-xs font-mono font-black text-amber-400">{products.length} productos</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. QUICK SEARCH & ACTIONS BAR */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Quick Product Search Input with Autocomplete Dropdown */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (search.trim()) {
                      handleProductScanned(search.trim());
                    }
                  }
                }}
                placeholder="Buscar producto o código rápido..."
                className="w-full pl-10 pr-9 py-2 bg-gradient-to-r from-[#14151d] to-[#111218] rounded-xl border border-white/[0.08] text-xs sm:text-sm text-white placeholder-zinc-500 shadow-inner focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/30 transition-all"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white transition-colors z-10"
                >
                  ✕
                </button>
              )}

              {/* Instant Search Suggestions Popover */}
              {isSearchFocused && search.trim().length >= 1 && (
                <div className="absolute bottom-full left-0 mb-1.5 w-full bg-[#14151d]/98 backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-2xl p-1.5 z-40 max-h-56 overflow-y-auto divide-y divide-white/[0.05]">
                  {products
                    .filter(p => 
                      p.name.toLowerCase().includes(search.toLowerCase()) || 
                      (p.flavor && p.flavor.toLowerCase().includes(search.toLowerCase())) ||
                      p.barcode.includes(search)
                    )
                    .slice(0, 6)
                    .map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => {
                          addToCart(p, 1);
                          setSearch('');
                          sounds.playBarcodeBeep();
                        }}
                        className="w-full text-left p-2 rounded-xl hover:bg-amber-400/10 flex items-center justify-between gap-2 transition-colors group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div className="truncate">
                            <span className="text-xs font-bold text-white group-hover:text-amber-400 block truncate">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {p.flavor ? `${p.flavor} • ` : ''}Stock: {p.stock}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono font-black text-xs text-amber-400 shrink-0">
                          ${p.price.toFixed(2)}
                        </span>
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Quick Actions Bar: Lector Activo, Movimientos, Cerrar Turno */}
            <div className="flex items-center justify-between gap-1.5">
              {/* Barcode Scanner Active Indicator Pill */}
              <div 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-sm shrink-0 cursor-default select-none ${
                  flashScanner 
                    ? 'bg-emerald-500 text-black border-emerald-300 scale-105 shadow-glow-gold' 
                    : 'bg-gradient-to-r from-[#14151d] to-[#111218] text-emerald-400 border-emerald-500/30'
                }`}
                title="Lector de código de barras USB/Bluetooth en línea. Escanea cualquier código en cualquier momento y se agregará directamente a la caja de cobro."
              >
                <ScanLine className={`w-3.5 h-3.5 ${flashScanner ? 'animate-bounce' : 'animate-pulse'}`} />
                <span>Lector Activo</span>
              </div>

              {/* Action Buttons Group */}
              <div className="flex items-center gap-1.5">
                {/* $ Movimientos Button */}
                <button
                  type="button"
                  onClick={() => setShowMovementsModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[10px]">
                    $
                  </span>
                  <span>Movimientos</span>
                </button>

                {/* 🔒 Cerrar Turno Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigateToCash) onNavigateToCash();
                    else alert('Usa el menú lateral "Corte de Caja" para cerrar tu turno formalmente.');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black shadow-md border border-amber-300/50 transition-all shrink-0 active:scale-[0.98]"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Cerrar Turno</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: "Caja de Cobro" (AMPLIADA Y ESPACIOSA) */}
        <div className="lg:col-span-7 xl:col-span-8 2xl:col-span-8 bg-gradient-to-b from-[#15161f] via-[#121319] to-[#0f1015] rounded-2xl border border-white/[0.08] p-3.5 sm:p-4 shadow-2xl flex flex-col justify-between min-h-0 h-full overflow-hidden">
          
          {/* Top section: Header + Client + Barcode */}
          <div className="space-y-2.5 shrink-0">
            {/* Header: Caja de Cobro + Counter Badge */}
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black font-black shadow-glow-gold/30 border border-amber-300/40 shrink-0">
                  <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="leading-snug">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-white tracking-tight">Caja de Cobro</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
                  </div>
                  <span className="text-xs text-amber-400 font-bold block">🏪 Sucursal Matriz</span>
                </div>
              </div>

              {/* Counter pill */}
              <span className="px-3 py-1 rounded-xl bg-white/[0.05] text-white border border-white/[0.1] text-xs sm:text-sm font-mono font-black shadow-inner">
                {cartItemsCount} pzs
              </span>
            </div>

            {/* Customer Selection Row: [Público en General] */}
            <div className="w-full flex items-center px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-semibold text-white">
              <div className="flex items-center gap-2 truncate">
                <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate text-zinc-300 font-bold">Público en General</span>
              </div>
            </div>

            {/* Barcode scanner input bar */}
            <form onSubmit={handleBarcodeSubmit} className="relative w-full">
              <Barcode className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Escanear o escribir código (Enter)..."
                className="w-full pl-9 pr-3 py-1.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/30 transition-all"
              />
            </form>
          </div>

          {/* Middle Tray Body / Items List */}
          <div className="flex-1 min-h-[90px] overflow-y-auto divide-y divide-white/[0.05] pr-0.5 my-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1 shadow-glow-gold/20">
                  <ShoppingBag className="w-8 h-8 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="font-black text-base text-white">Caja de Cobro Lista</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed mt-1 max-w-sm">
                    Escanea cualquier producto con el lector de código de barras o usa el buscador para añadirlo directamente a la cuenta.
                  </p>
                </div>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="py-2.5 px-3 flex items-center justify-between gap-3 rounded-2xl hover:bg-white/[0.03] transition-colors border border-transparent hover:border-white/[0.05]">
                  <img
                    src={item.product.image || '/logo.png'}
                    alt={item.product.name}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/logo.png';
                    }}
                    className="w-12 h-12 rounded-xl object-cover border border-white/[0.08] bg-[#1a1b24] shrink-0 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-extrabold text-xs sm:text-sm text-white truncate">{item.product.name}</h5>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-amber-400 font-mono font-bold">
                        ${item.unitPrice.toFixed(2)} c/u
                      </span>
                      {item.product.flavor && (
                        <span className="text-[11px] text-zinc-400 font-medium truncate">
                          • {item.product.flavor}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity control */}
                  <div className="flex items-center gap-1.5 bg-[#0b0c10] p-1 rounded-xl border border-white/[0.08] shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-black text-xs sm:text-sm px-2 text-white">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="text-right shrink-0 min-w-[75px]">
                    <span className="font-mono font-black text-xs sm:text-base text-white block tracking-tight">
                      ${item.subtotal.toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors inline-flex items-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 3. BOTTOM CHECKOUT PANEL */}
          <div className="bg-gradient-to-b from-[#0c0d12] to-[#08090c] rounded-2xl border border-white/[0.08] p-3.5 space-y-3 shrink-0 shadow-2xl">
            
            {/* Total Header */}
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                TOTAL A COBRAR ({cartItemsCount} PZS)
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tracking-tight drop-shadow-[0_2px_8px_rgba(245,158,11,0.25)]">
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
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-300 shadow-glow-gold/40 scale-[1.01]'
                    : 'bg-white/[0.03] text-zinc-400 border-white/[0.07] hover:text-white hover:bg-white/[0.06]'
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
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-300 shadow-glow-gold/40 scale-[1.01]'
                    : 'bg-white/[0.03] text-zinc-400 border-white/[0.07] hover:text-white hover:bg-white/[0.06]'
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
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-300 shadow-glow-gold/40 scale-[1.01]'
                    : 'bg-white/[0.03] text-zinc-400 border-white/[0.07] hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer</span>
              </button>
            </div>

            {/* Quick Cash Bills Row */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <button
                    type="button"
                    onClick={() => handleQuickCash('exact')}
                    className="px-2.5 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 font-extrabold text-[11px] border border-amber-400/35 flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <span>⚡ Exacto</span>
                  </button>
                  {[50, 100, 200, 500, 1000].map(bill => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => handleQuickCash(bill)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white font-bold font-mono text-[11px] border border-white/[0.08] hover:border-white/20 shrink-0 transition-all"
                    >
                      ${bill}
                    </button>
                  ))}
                </div>

                {/* Tender Input: Paga con... ($) */}
                <div className="flex items-center justify-between gap-2 bg-white/[0.03] px-3 py-2 rounded-xl border border-white/[0.08] focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20 transition-all">
                  <div className="flex items-center gap-2 flex-1">
                    <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
                    <input
                      type="number"
                      value={amountPaidStr}
                      onChange={(e) => setAmountPaidStr(e.target.value)}
                      placeholder="Paga con... ($)"
                      className="w-full bg-transparent text-sm font-mono font-bold text-white placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                  {cashGiven > 0 && (
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-zinc-400 mr-1.5 font-bold uppercase">Cambio:</span>
                      <span className="text-sm font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                        ${changeDue.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bottom Actions: [Cancelar Compra] [Cobrar & Ticket] */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="py-2.5 px-3 rounded-xl bg-white/[0.03] hover:bg-red-500/15 text-zinc-400 hover:text-red-400 border border-white/[0.08] hover:border-red-500/30 disabled:opacity-30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!canCheckout}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 disabled:opacity-35 text-black font-black text-xs sm:text-sm shadow-glow-gold border border-amber-300/60 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] disabled:cursor-not-allowed"
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

      {/* Product Catalog Browse Modal */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-[#12131a] border border-white/[0.12] rounded-3xl w-full max-w-5xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-gradient-to-r from-[#171822] via-[#14151e] to-[#12131a]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-black">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Catálogo de Productos</h3>
                  <p className="text-xs text-zinc-400">Toca cualquier producto para añadirlo directamente a la Caja de Cobro</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="p-3 border-b border-white/[0.06] flex items-center gap-2 overflow-x-auto bg-[#0e0f14]">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-amber-400 text-black shadow-glow-gold'
                      : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] border border-white/[0.08]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredProducts.map(prod => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-white/[0.08] bg-[#0c0d12] flex items-center justify-between">
              <span className="text-xs text-zinc-400">
                Mostrando {filteredProducts.length} productos
              </span>
              <button
                type="button"
                onClick={() => setShowCatalogModal(false)}
                className="px-4 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold transition-colors"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
