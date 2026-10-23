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
      
      {/* 1. TOP UNIFIED HEADER BAR (Punto de Venta & Caja de Cobro Fused) */}
      <div className="bg-gradient-to-r from-[#14151e] via-[#121319] to-[#14151e] rounded-2xl border border-white/[0.08] px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shadow-md shrink-0 mb-2.5">
        
        {/* Brand Logo & Subtitle */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-glow-gold/30 border border-amber-300/40 shrink-0">
            <ShoppingBag className="w-4 h-4 text-black stroke-[2.5]" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm sm:text-base text-white tracking-tight">
                Punto de Venta • Caja de Cobro
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            </div>
            <p className="text-[10px] text-amber-400 font-bold hidden sm:block">
              🏪 Sucursal Matriz • Don Toño Brito
            </p>
          </div>
        </div>

        {/* Quick Operations Strip & Status Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          
          {/* Lector Activo Pill */}
          <div 
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold transition-all shadow-sm shrink-0 cursor-default select-none ${
              flashScanner 
                ? 'bg-emerald-500 text-black border-emerald-300 scale-105 shadow-glow-gold' 
                : 'bg-gradient-to-r from-[#14151d] to-[#111218] text-emerald-400 border-emerald-500/30'
            }`}
            title="Lector de código de barras USB/Bluetooth en línea"
          >
            <ScanLine className={`w-3.5 h-3.5 ${flashScanner ? 'animate-bounce' : 'animate-pulse'}`} />
            <span className="hidden sm:inline">Lector Activo</span>
          </div>

          {/* $ Movimientos Button */}
          <button
            type="button"
            onClick={() => setShowMovementsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 text-xs font-bold transition-all shadow-sm shrink-0"
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
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black shadow-md border border-amber-300/50 transition-all shrink-0 active:scale-[0.98]"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Cerrar Turno</span>
          </button>

          {/* 📦 Ver Catálogo Modal Button */}
          <button
            type="button"
            onClick={() => setShowCatalogModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] hover:border-amber-400/50 text-xs font-bold text-zinc-200 hover:text-white transition-all shadow-sm shrink-0"
            title="Explorar productos por categoría"
          >
            <Package className="w-3.5 h-3.5 text-amber-400" />
            <span>Catálogo</span>
          </button>

          {/* Sincronizado Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            <span className="hidden lg:inline">Sincronizado</span>
          </div>


        </div>

      </div>

      {/* 2. UNIFIED FUSED POS & CAJA DE COBRO WORKSPACE WITH LOGO IN BACKGROUND */}
      <div className="flex-1 relative rounded-3xl border border-white/[0.1] overflow-hidden shadow-2xl bg-[#0b0c11] flex flex-col min-h-0">
        
        {/* BACKGROUND LOGO / BANNER ("LEYENDS GYM - CLUB FITNESS") */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <img 
            src={posBanner} 
            alt="LEYENDS GYM CLUB FITNESS"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/pos-banner.jpg';
            }}
            className="w-full h-full object-cover object-center opacity-30 filter brightness-75 contrast-125 scale-105"
          />
          {/* Radial gold spotlight and dark ambient overlays for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0e] via-[#090a0e]/80 to-[#0b0c12]/85" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(245,158,11,0.14)_0%,rgba(0,0,0,0)_65%)]" />
        </div>

        {/* FUSED CONTENT CONTAINER */}
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3.5 sm:p-4 min-h-0 overflow-hidden items-stretch">
          
          {/* LEFT SECTION: Search, Barcode & Ticket List (7-8 cols) */}
          <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex flex-col justify-between min-h-0 bg-black/40 backdrop-blur-md rounded-2xl border border-white/[0.08] p-3 shadow-inner relative">
            
            {/* Top Barcode / Search Box */}
            <div className="space-y-2 shrink-0 pb-2 border-b border-white/[0.06] relative z-20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-amber-400" />
                  Escanear o Buscar Producto
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded-lg border border-white/[0.08]">
                  {cartItemsCount} artículos en ticket
                </span>
              </div>

              {/* Input with Autocomplete */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setSearch(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleBarcodeSubmit();
                    }
                  }}
                  placeholder="Escanea el código de barras o escribe nombre del producto (Enter)..."
                  className="w-full pl-10 pr-9 py-2.5 bg-black/60 rounded-xl border border-white/[0.12] text-xs sm:text-sm text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/40 transition-all shadow-inner"
                />
                {barcodeInput && (
                  <button 
                    type="button"
                    onClick={() => {
                      setBarcodeInput('');
                      setSearch('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white transition-colors z-10 p-1"
                    title="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}

                {/* Large Instant Search Results Dropdown Overlay */}
                {barcodeInput.trim().length >= 1 && (
                  <div className="absolute top-full left-0 mt-2 w-full bg-[#12131d]/98 backdrop-blur-2xl border-2 border-amber-400/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2.5 sm:p-3 z-50 max-h-[460px] overflow-y-auto space-y-2 animate-fade-in">
                    
                    {/* Popover Header */}
                    <div className="flex items-center justify-between px-2 pb-2 border-b border-white/[0.08] text-xs">
                      <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>Resultados de búsqueda:</span>
                        <span className="text-amber-400 font-mono font-black">"{barcodeInput}"</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBarcodeInput('');
                          setSearch('');
                        }}
                        className="text-zinc-400 hover:text-white text-xs font-semibold px-2 py-0.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] transition-colors"
                      >
                        ✕ Cerrar
                      </button>
                    </div>

                    {/* Products List (Large Cards) */}
                    {products
                      .filter(p => 
                        p.name.toLowerCase().includes(barcodeInput.toLowerCase()) || 
                        (p.flavor && p.flavor.toLowerCase().includes(barcodeInput.toLowerCase())) ||
                        (p.brand && p.brand.toLowerCase().includes(barcodeInput.toLowerCase())) ||
                        p.barcode.includes(barcodeInput)
                      ).length === 0 ? (
                        <div className="p-6 text-center text-zinc-400 space-y-2">
                          <Package className="w-8 h-8 text-zinc-500 mx-auto opacity-50" />
                          <p className="text-sm font-bold text-white">No se encontró ningún producto</p>
                          <p className="text-xs text-zinc-400">Verifica la ortografía o intenta buscar por código de barras.</p>
                        </div>
                      ) : (
                        products
                          .filter(p => 
                            p.name.toLowerCase().includes(barcodeInput.toLowerCase()) || 
                            (p.flavor && p.flavor.toLowerCase().includes(barcodeInput.toLowerCase())) ||
                            (p.brand && p.brand.toLowerCase().includes(barcodeInput.toLowerCase())) ||
                            p.barcode.includes(barcodeInput)
                          )
                          .slice(0, 8)
                          .map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                addToCart(p, 1);
                                setBarcodeInput('');
                                setSearch('');
                                sounds.playBarcodeBeep();
                              }}
                              className="p-3 rounded-2xl bg-white/[0.03] hover:bg-amber-400/10 border border-white/[0.08] hover:border-amber-400/50 flex items-center justify-between gap-3.5 transition-all cursor-pointer group shadow-sm hover:shadow-lg active:scale-[0.99]"
                            >
                              {/* Large Product Image Thumbnail */}
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-white/[0.1] bg-[#161722] shrink-0 shadow-md relative">
                                <img
                                  src={p.image || '/logo.png'}
                                  alt={p.name}
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = '/logo.png';
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                {p.stock <= 0 && (
                                  <div className="absolute inset-0 bg-black/75 flex items-center justify-center text-[10px] font-black text-red-400 uppercase">
                                    Agotado
                                  </div>
                                )}
                              </div>

                              {/* Product Info (Large Title & Flavor) */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm sm:text-base font-black text-white group-hover:text-amber-400 transition-colors truncate">
                                    {p.name}
                                  </h4>
                                  {p.brand && (
                                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 font-semibold text-[10px] uppercase">
                                      {p.brand}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                  {p.flavor && (
                                    <span className="text-zinc-300 font-medium truncate">
                                      {p.flavor}
                                    </span>
                                  )}
                                  <span className="text-zinc-500">•</span>
                                  <span className="font-mono text-[11px] text-zinc-400">
                                    Cód: {p.barcode}
                                  </span>
                                  <span className="text-zinc-500">•</span>
                                  {p.stock > 5 ? (
                                    <span className="text-emerald-400 font-bold text-xs">
                                      Stock: {p.stock}
                                    </span>
                                  ) : p.stock > 0 ? (
                                    <span className="text-amber-400 font-bold text-xs animate-pulse">
                                      Pocas: {p.stock}
                                    </span>
                                  ) : (
                                    <span className="text-red-400 font-bold text-xs">
                                      Sin stock (0)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Price & Action Button */}
                              <div className="text-right shrink-0 flex items-center gap-3">
                                <div>
                                  <span className="text-base sm:text-2xl font-mono font-black text-amber-400 block tracking-tight">
                                    ${p.price.toFixed(2)}
                                  </span>
                                  <span className="text-[10px] text-zinc-400 font-semibold block">
                                    por pieza
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToCart(p, 1);
                                    setBarcodeInput('');
                                    setSearch('');
                                    sounds.playBarcodeBeep();
                                  }}
                                  disabled={p.stock <= 0}
                                  className="px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black text-xs sm:text-sm shadow-glow-gold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                                >
                                  <Plus className="w-4 h-4 stroke-[3]" />
                                  <span>Agregar</span>
                                </button>
                              </div>

                            </div>
                          ))
                      )}

                  </div>
                )}
              </div>
            </div>

            {/* Middle Ticket Items List */}
            <div className="flex-1 min-h-[120px] overflow-y-auto divide-y divide-white/[0.05] pr-1 my-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-1 shadow-glow-gold/20">
                    <img src="/logo.png" alt="LEYENDS GYM" className="w-14 h-14 object-contain filter drop-shadow" />
                  </div>
                  <div>
                    <h4 className="font-black text-lg text-white">Caja de Cobro Lista</h4>
                    <p className="text-xs text-amber-400 font-bold uppercase tracking-wider mt-0.5">LEYENDS GYM • CLUB FITNESS</p>
                    <p className="text-xs text-zinc-400 leading-relaxed mt-1 max-w-sm">
                      Escanea cualquier código de barras con el lector o escribe el nombre del producto para agregarlo al ticket.
                    </p>
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="py-2.5 px-3 flex items-center justify-between gap-3 rounded-2xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]">
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
                    <div className="flex items-center gap-1.5 bg-[#0b0c10]/80 p-1 rounded-xl border border-white/[0.08] shrink-0">
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

            {/* Quick footer alert if items exist */}
            {cart.length > 0 && (
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400">
                <span>Subtotal ({cartItemsCount} artículos)</span>
                <span className="font-mono font-bold text-white">${cartTotal.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* RIGHT SECTION: Client & Checkout Console (4-5 cols) */}
          <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col justify-between min-h-0 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/[0.1] p-4 shadow-2xl space-y-3">
            
            {/* Customer Selection Row */}
            <div className="space-y-1.5 shrink-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Cliente / Socio</span>
              <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-white">
                <div className="flex items-center gap-2 truncate">
                  <User className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate text-zinc-200 font-bold">Público en General</span>
                </div>
                <span className="text-[10px] text-amber-400 font-bold">Mostrador</span>
              </div>
            </div>

            {/* Bottom Checkout Panel Controls */}
            <div className="space-y-3">
              {/* Total Header */}
              <div className="bg-black/50 p-3.5 rounded-2xl border border-white/[0.08] flex items-baseline justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300">
                  TOTAL A COBRAR
                </span>
                <span className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-amber-400 tracking-tight drop-shadow-[0_2px_12px_rgba(245,158,11,0.35)]">
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
