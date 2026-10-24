import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGym } from '../../context/GymContext';
import { ProductCard } from './ProductCard';
import { ReceiptModal } from './ReceiptModal';
import { CashMovementsModal } from './CashMovementsModal';
import { ClientFormModal } from '../clients/ClientFormModal';
import posBanner from '../../assets/pos-banner.jpg';
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
  Receipt,
  UserPlus,
  ScanLine,
  AlertCircle,
  Package,
  X,
  Sparkles,
  Flame,
  BadgeCheck,
  Tag,
  Phone,
  Layers,
  CheckCircle2
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

  // Customer State (ActioLift pattern)
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const clientSearchRef = useRef<HTMLDivElement>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidStr, setAmountPaidStr] = useState<string>('');
  
  // Modals
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

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

  // Categories list with touch icons
  const categories = [
    { id: 'all', label: 'Todos', icon: '🔥' },
    { id: 'protein', label: 'Proteínas', icon: '🥛' },
    { id: 'creatine', label: 'Creatinas', icon: '💊' },
    { id: 'preworkout', label: 'Pre-Entreno', icon: '⚡' },
    { id: 'aminoacids', label: 'Aminoácidos', icon: '🧪' },
    { id: 'beverage', label: 'Bebidas', icon: '🥤' },
    { id: 'snack', label: 'Snacks', icon: '🍫' },
    { id: 'gear', label: 'Accesorios', icon: '🎒' },
  ];

  // Auto-dismiss scan feedback after 3.2 seconds
  useEffect(() => {
    if (!scanFeedback) return;
    const timer = setTimeout(() => {
      setScanFeedback(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [scanFeedback]);

  // Click outside listener for Client Search Dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) {
        setIsClientSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered members list based on search query (ActioLift style)
  const filteredMembers = useMemo(() => {
    if (!clientSearchQuery.trim()) return members.slice(0, 8);
    const q = clientSearchQuery.toLowerCase();
    return members.filter(m => 
      m.fullName.toLowerCase().includes(q) ||
      (m.phone && m.phone.includes(q)) ||
      (m.documentId && m.documentId.toLowerCase().includes(q)) ||
      (m.membership && m.membership.planName.toLowerCase().includes(q))
    ).slice(0, 12);
  }, [members, clientSearchQuery]);

  // Filtered products list for Catalog Grid
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = search.trim().toLowerCase();
      if (!q) return matchesCat;
      const matchesQuery = 
        p.name.toLowerCase().includes(q) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.includes(q)) ||
        (p.flavor && p.flavor.toLowerCase().includes(q));

      return matchesCat && matchesQuery;
    });
  }, [products, selectedCategory, search]);

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
          message: `+1 ${matched.name} añadido al ticket`,
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
        message: `Código "${cleanCode}" no encontrado en el Catálogo.`,
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
        buffer = '';
        isRapidBurst = false;
      }

      lastKeyTime = currentTime;

      // Handle barcode termination: Enter or NumpadEnter
      if (e.key === 'Enter' || e.key === 'NumpadEnter') {
        const candidate = buffer.trim();
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

  // Checkout process with client association
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
      
      {/* 1. TOP UNIFIED HEADER BAR */}
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
              🏪 Sucursal Matriz
            </p>
          </div>
        </div>

        {/* Quick Operations Strip */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          
          {/* Lector Activo Pill */}
          <div 
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-bold transition-all shadow-sm shrink-0 cursor-default select-none ${
              flashScanner 
                ? 'bg-emerald-500 text-black border-emerald-300 scale-105 shadow-glow-gold' 
                : 'bg-gradient-to-r from-[#14151d] to-[#111218] text-emerald-400 border-emerald-500/30'
            }`}
            title="Lector de código de barras USB/Bluetooth en línea"
          >
            <ScanLine className={`w-4 h-4 ${flashScanner ? 'animate-bounce' : 'animate-pulse'}`} />
            <span className="hidden sm:inline">Lector Activo</span>
          </div>

          {/* $ Movimientos Button */}
          <button
            type="button"
            onClick={() => setShowMovementsModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 hover:border-amber-500/60 text-amber-300 hover:text-amber-200 text-xs sm:text-sm font-extrabold transition-all shadow-sm shrink-0 active:scale-95"
          >
            <span className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-xs shadow-sm">
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs sm:text-sm font-black shadow-md hover:shadow-glow-gold/40 border border-amber-300/60 transition-all shrink-0 active:scale-[0.98]"
          >
            <Lock className="w-4 h-4 stroke-[2.5]" />
            <span>Cerrar Turno</span>
          </button>

          {/* Sincronizado Pill */}
          <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold text-xs sm:text-sm shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            <span className="hidden lg:inline">Sincronizado</span>
          </div>

        </div>

      </div>

      {/* 2. UNIFIED WORKSPACE (Catálogo a la Izquierda + Ticket y Cobro a la Derecha) */}
      <div className="flex-1 relative rounded-3xl border border-white/[0.1] overflow-hidden shadow-2xl bg-[#0b0c11] flex flex-col min-h-0">
        
        {/* Ambient 3D Gold Logo Watermark ("LEYENDS GYM • CLUB FITNESS") */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
          <img 
            src={posBanner} 
            alt="LEYENDS GYM CLUB FITNESS"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/pos-banner.jpg';
            }}
            className="w-full h-full object-cover object-center opacity-25 filter brightness-75 contrast-125 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090a0e] via-[#090a0e]/85 to-[#0b0c12]/90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(245,158,11,0.12)_0%,rgba(0,0,0,0)_65%)]" />
        </div>

        {/* TWO-COLUMN GRID WORKSPACE */}
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 sm:p-3.5 min-h-0 overflow-hidden items-stretch">
          
          {/* ============================================================== */}
          {/* LEFT COLUMN: Catálogo Visual & Escáner (Touch POS) (7 de 12)   */}
          {/* ============================================================== */}
          <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 flex flex-col min-h-0 bg-black/45 backdrop-blur-md rounded-2xl border border-white/[0.08] p-3 shadow-inner relative overflow-hidden">
            
            {/* Top Toolbar: Barcode & Product Search */}
            <div className="space-y-2 shrink-0 pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-amber-400" />
                  Escanear o Buscar Producto
                </span>
                <span className="text-[11px] font-mono font-bold text-zinc-400 bg-white/[0.05] px-2.5 py-0.5 rounded-lg border border-white/[0.08]">
                  {filteredProducts.length} productos
                </span>
              </div>

              {/* Search Bar Input */}
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
                  placeholder="Escanea código de barras o escribe producto, marca o sabor (Enter)..."
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
              </div>

              {/* Category Filter Pills (Horizontal Touch Strip) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                {categories.map(cat => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black shadow-glow-gold border border-amber-300'
                          : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white border border-white/[0.08]'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Grid (Interactive Touch POS) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 my-2">
              {filteredProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400">
                    <Package className="w-8 h-8 opacity-40" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">No se encontraron productos</h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                      No hay artículos que coincidan con "{search}". Prueba con otra categoría o código.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setBarcodeInput('');
                      setSelectedCategory('all');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors"
                  >
                    Restablecer Filtros
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer Quick Hint */}
            <div className="shrink-0 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Haz clic en cualquier tarjeta para añadir al ticket</span>
              </span>
              <span className="font-mono text-zinc-500 hidden sm:inline">
                {products.length} productos en almacén
              </span>
            </div>

          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN: Ticket de Venta & Caja de Cobro (5 de 12)        */}
          {/* ============================================================== */}
          <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 flex flex-col justify-between min-h-0 bg-black/65 backdrop-blur-xl rounded-2xl border border-white/[0.1] p-3.5 sm:p-4 shadow-2xl relative overflow-hidden">
            
            {/* Top: Customer Selection Dropdown (ActioLift Pattern) */}
            <div ref={clientSearchRef} className="relative shrink-0 space-y-1 z-30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Cliente / Socio
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(true)}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ Nuevo Socio</span>
                </button>
              </div>

              {/* Selected Customer Box (Clickable to switch/search) */}
              <div 
                onClick={() => setIsClientSearchOpen(!isClientSearchOpen)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                  selectedMember 
                    ? 'bg-amber-500/10 border-amber-500/40 hover:border-amber-400 text-white' 
                    : 'bg-white/[0.04] border-white/[0.08] hover:border-white/20 text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  {selectedMember ? (
                    selectedMember.avatarUrl ? (
                      <img 
                        src={selectedMember.avatarUrl} 
                        alt={selectedMember.fullName} 
                        className="w-6 h-6 rounded-full object-cover border border-amber-400/50 shrink-0" 
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[10px] shrink-0">
                        {selectedMember.fullName.charAt(0)}
                      </div>
                    )
                  ) : (
                    <User className="w-4 h-4 text-amber-400 shrink-0" />
                  )}

                  <div className="truncate text-left leading-tight">
                    <span className="font-bold block truncate">
                      {selectedMember ? selectedMember.fullName : 'Público en General'}
                    </span>
                    <span className="text-[10px] text-zinc-400 block truncate font-normal">
                      {selectedMember 
                        ? `${selectedMember.membership?.planName || 'Socio'} • ${selectedMember.phone || selectedMember.documentId}`
                        : 'Venta de mostrador directa'
                      }
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedMember && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClientId('');
                      }}
                      className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.1] transition-colors"
                      title="Quitar socio y volver a Público General"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${isClientSearchOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {/* Dropdown Popover for Searching Members */}
              {isClientSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#141520] border border-amber-500/40 rounded-2xl shadow-[0_15px_40px_rgba(0,0,0,0.8)] p-2 z-40 space-y-1.5 animate-fade-in">
                  
                  {/* Search input inside dropdown */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      autoFocus
                      value={clientSearchQuery}
                      onChange={(e) => setClientSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre, teléfono o DNI..."
                      className="w-full pl-8 pr-3 py-1.5 bg-black/60 rounded-lg border border-white/[0.1] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/80"
                    />
                  </div>

                  {/* Options List */}
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-white/[0.04]">
                    {/* Option: Público en General */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientId('');
                        setIsClientSearchOpen(false);
                        setClientSearchQuery('');
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                        !selectedClientId ? 'bg-amber-400/15 text-amber-300 font-bold' : 'text-zinc-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-amber-400" />
                        <span>Público en General (Mostrador)</span>
                      </div>
                      {!selectedClientId && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                    </button>

                    {/* Filtered Members List */}
                    {filteredMembers.map(member => {
                      const isSelected = selectedClientId === member.id;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => {
                            setSelectedClientId(member.id);
                            setIsClientSearchOpen(false);
                            setClientSearchQuery('');
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs transition-colors ${
                            isSelected ? 'bg-amber-400/15 text-amber-300 font-bold' : 'text-zinc-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate text-left">
                            <div className="w-5 h-5 rounded-full bg-white/[0.1] flex items-center justify-center text-[9px] font-bold shrink-0">
                              {member.fullName.charAt(0)}
                            </div>
                            <div className="truncate">
                              <span className="block truncate font-semibold">{member.fullName}</span>
                              <span className="text-[10px] text-zinc-400 block font-mono">
                                {member.phone || member.documentId || 'Socio'}
                              </span>
                            </div>
                          </div>
                          {member.membership?.status === 'active' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0 font-bold">
                              Activo
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Create New Client Action in footer */}
                  <div className="pt-1.5 border-t border-white/[0.08] text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsClientSearchOpen(false);
                        setShowAddClientModal(true);
                      }}
                      className="w-full py-1 text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center justify-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>+ Registrar Nuevo Socio</span>
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Middle: Live Ticket Items List */}
            <div className="flex-1 min-h-[140px] flex flex-col justify-between my-2 overflow-hidden">
              
              {/* Ticket Sub-header */}
              <div className="flex items-center justify-between pb-1.5 border-b border-white/[0.06] text-xs">
                <span className="font-extrabold text-zinc-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ticket de Venta</span>
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                    {cartItemsCount} artículos
                  </span>
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[11px] text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                    title="Vaciar ticket"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Vaciar</span>
                  </button>
                )}
              </div>

              {/* Ticket Items Scroll Area */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.05] pr-1 py-1">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-glow-gold/15">
                      <img src="/logo.png" alt="LEYENDS GYM" className="w-10 h-10 object-contain filter drop-shadow" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-white">Ticket Listo para Cobro</h4>
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-0.5">
                        LEYENDS GYM • CLUB FITNESS
                      </p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mt-1 max-w-[240px]">
                        Toca los productos del catálogo o escanea con el lector para agregarlos al ticket.
                      </p>
                    </div>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="py-2 flex items-center justify-between gap-2.5 rounded-xl hover:bg-white/[0.03] transition-colors px-1.5">
                      
                      {/* Product Thumbnail */}
                      <img
                        src={item.product.image || '/logo.png'}
                        alt={item.product.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/logo.png';
                        }}
                        className="w-10 h-10 rounded-lg object-cover border border-white/[0.08] bg-[#1a1b24] shrink-0 shadow-sm"
                      />
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0 leading-snug">
                        <h5 className="font-extrabold text-xs text-white truncate">{item.product.name}</h5>
                        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <span className="font-mono font-bold text-amber-400">${item.unitPrice.toFixed(2)} c/u</span>
                          {item.product.flavor && (
                            <span className="truncate max-w-[100px] text-zinc-500">• {item.product.flavor}</span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-[#0b0c10]/90 p-0.5 rounded-lg border border-white/[0.08] shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-black text-xs px-1.5 text-white">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Subtotal & Delete */}
                      <div className="text-right shrink-0 min-w-[65px]">
                        <span className="font-mono font-black text-xs sm:text-sm text-white block">
                          ${item.subtotal.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-0.5 text-zinc-500 hover:text-red-400 transition-colors inline-flex items-center"
                          title="Eliminar artículo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>

            {/* Bottom: Payment Console & Checkout Controls */}
            <div className="space-y-2.5 pt-2 border-t border-white/[0.08] shrink-0">
              
              {/* Total Display */}
              <div className="bg-black/60 p-3 rounded-2xl border border-white/[0.08] flex items-baseline justify-between shadow-inner">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                    TOTAL A COBRAR
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {cartItemsCount} {cartItemsCount === 1 ? 'artículo' : 'artículos'}
                  </span>
                </div>
                <span className="text-3xl sm:text-4xl lg:text-4xl 2xl:text-5xl font-black font-mono text-amber-400 tracking-tight drop-shadow-[0_2px_10px_rgba(245,158,11,0.35)]">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>

              {/* Payment Methods (Pills) */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
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
                  className={`py-2 px-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
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
                  className={`py-2 px-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                    paymentMethod === 'transfer'
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-300 shadow-glow-gold/40 scale-[1.01]'
                      : 'bg-white/[0.03] text-zinc-400 border-white/[0.07] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              </div>

              {/* Cash Denominations & Change Due */}
              {paymentMethod === 'cash' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                    <button
                      type="button"
                      onClick={() => handleQuickCash('exact')}
                      className="px-2 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 font-extrabold text-[10px] border border-amber-400/35 flex items-center gap-1 shrink-0 transition-colors"
                    >
                      <span>⚡ Exacto</span>
                    </button>
                    {[50, 100, 200, 500, 1000].map(bill => (
                      <button
                        key={bill}
                        type="button"
                        onClick={() => handleQuickCash(bill)}
                        className="px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white font-bold font-mono text-[10px] border border-white/[0.08] hover:border-white/20 shrink-0 transition-all"
                      >
                        ${bill}
                      </button>
                    ))}
                  </div>

                  {/* Tender Input */}
                  <div className="flex items-center justify-between gap-2 bg-white/[0.03] px-3 py-1.5 rounded-xl border border-white/[0.08] focus-within:border-emerald-500/50 transition-all">
                    <div className="flex items-center gap-2 flex-1">
                      <Banknote className="w-4 h-4 text-emerald-400 shrink-0" />
                      <input
                        type="number"
                        value={amountPaidStr}
                        onChange={(e) => setAmountPaidStr(e.target.value)}
                        placeholder="Paga con... ($)"
                        className="w-full bg-transparent text-xs sm:text-sm font-mono font-bold text-white placeholder-zinc-500 focus:outline-none"
                      />
                    </div>
                    {cashGiven > 0 && (
                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-zinc-400 mr-1.5 font-bold uppercase">Cambio:</span>
                        <span className="text-xs sm:text-sm font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                          ${changeDue.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons: [Cancelar] [Cobrar & Ticket] */}
              <div className="grid grid-cols-2 gap-2 pt-1">
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

    </div>
  );
};
