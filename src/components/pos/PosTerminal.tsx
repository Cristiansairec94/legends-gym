import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useGym } from '../../context/GymContext';
import { ProductCard } from './ProductCard';
import { ReceiptModal } from './ReceiptModal';
import { CashMovementsModal } from './CashMovementsModal';
import { PosSalesHistoryModal } from './PosSalesHistoryModal';
import { ClientFormModal } from '../clients/ClientFormModal';
import { Sale, PaymentMethod, Product } from '../../types';
import { sounds } from '../../services/audio';
import {
  ShoppingBag,
  Search,
  Barcode,
  Lock,
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
  RotateCcw
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
    todaySalesCount
  } = useGym();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Optional Customer Association (via + Nuevo Socio)
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaidStr, setAmountPaidStr] = useState<string>('');

  // Modals
  const [showMovementsModal, setShowMovementsModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [salesHistoryModalTab, setSalesHistoryModalTab] = useState<'today' | 'returns' | null>(null);
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
  const handleProductScanned = useCallback(
    (rawCode: string, sourceInput?: HTMLInputElement | null) => {
      const cleanCode = rawCode.trim().replace(/^[\r\n\t]+|[\r\n\t]+$/g, '');
      if (!cleanCode) return;

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
    },
    [products, addToCart]
  );

  // Global Hardware Barcode Listener (USB / Bluetooth Keyboards & Laser Scanners)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;
    let isRapidBurst = false;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (showMovementsModal || showAddClientModal || completedSale || salesHistoryModalTab !== null) {
        return;
      }

      const activeEl = document.activeElement as HTMLElement | null;
      const isInputFocused =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      const currentTime = performance.now();
      const timeDiff = currentTime - lastKeyTime;

      if (timeDiff < 60) {
        isRapidBurst = true;
      } else if (timeDiff > 250) {
        buffer = '';
        isRapidBurst = false;
      }

      lastKeyTime = currentTime;

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

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showMovementsModal, showAddClientModal, completedSale, salesHistoryModalTab, handleProductScanned]);

  // Barcode handler from manual input or form submit
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcodeInput.trim()) return;
    handleProductScanned(barcodeInput, barcodeInputRef.current);
  };

  // Calculations
  const cashGiven = parseFloat(amountPaidStr) || 0;
  const changeDue = paymentMethod === 'cash' ? Math.max(0, cashGiven - cartTotal) : 0;
  const canCheckout =
    cart.length > 0 && (paymentMethod !== 'cash' || cashGiven >= cartTotal || amountPaidStr === '');

  // Quick cash bill handler
  const handleQuickCash = (val: number | 'exact') => {
    if (val === 'exact') {
      setAmountPaidStr(cartTotal.toFixed(2));
    } else {
      setAmountPaidStr(val.toString());
    }
  };

  // Checkout process with optional newly registered client association
  const handleCheckout = () => {
    if (cart.length === 0) return;
    const finalAmountPaid =
      paymentMethod === 'cash' ? (cashGiven > 0 ? cashGiven : cartTotal) : cartTotal;
    const sale = processSale(paymentMethod, finalAmountPaid, selectedClientId || undefined);
    setCompletedSale(sale);
    setAmountPaidStr('');
    setSelectedClientId('');
  };

  const selectedMember = members.find(m => m.id === selectedClientId);

  return (
    <div className="h-full min-h-0 relative rounded-3xl border border-white/15 bg-[#090c14] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.65)] flex flex-col p-2.5 sm:p-3 gap-2.5">

      {/* ===================================================================== */}
      {/* 1. TOP UNIFIED COMMAND HEADER BAR                                     */}
      {/* ===================================================================== */}
      <div className="relative z-20 bg-[#181f30]/85 backdrop-blur-xl rounded-2xl border border-white/15 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.4)] shrink-0">
        {/* Top Specular Hairline */}
        <div className="absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/70 to-transparent pointer-events-none" />

        {/* Brand Logo & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-200/75 shrink-0">
            <ShoppingBag className="w-4.5 h-4.5 text-black stroke-[2.5]" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm sm:text-[15px] text-white tracking-tight drop-shadow-sm">
                Punto de Venta • Caja de Cobro
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            </div>
            <p className="text-[10px] text-amber-300 font-extrabold tracking-wide hidden sm:block">
              🏪 Sucursal Matriz
            </p>
          </div>
        </div>

        {/* Quick Operations Strip (Uniform h-9 Precision Pills) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Lector Activo Pill */}
          <div
            className={`h-9 flex items-center gap-2 px-3 rounded-xl border text-xs font-extrabold transition-all shrink-0 cursor-default select-none ${
              flashScanner
                ? 'bg-emerald-500 text-black border-emerald-300 scale-105 shadow-glow-gold'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/45 shadow-sm'
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
            className="h-9 flex items-center gap-2 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 hover:border-amber-300 text-amber-200 hover:text-white text-xs font-extrabold transition-all shadow-sm shrink-0 active:scale-95"
          >
            <span className="w-4.5 h-4.5 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[11px] shadow-sm">
              $
            </span>
            <span>Movimientos</span>
          </button>

          {/* 🔄 Tickets / Devoluciones Button */}
          <button
            type="button"
            onClick={() => setSalesHistoryModalTab('today')}
            className="h-9 flex items-center gap-2 px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 hover:border-amber-300 text-amber-200 hover:text-white text-xs font-extrabold transition-all shadow-sm shrink-0 active:scale-95"
            title="Ver tickets cobrados hoy, reimprimir recibos o procesar devoluciones con restauración de stock"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-300 stroke-[2.5]" />
            <span>Tickets / Devoluciones</span>
            {todaySalesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-mono font-black text-[10px] leading-none shadow-sm">
                {todaySalesCount}
              </span>
            )}
          </button>

          {/* 🔒 Cerrar Turno Button */}
          <button
            type="button"
            onClick={() => {
              if (onNavigateToCash) onNavigateToCash();
              else alert('Usa el menú lateral "Corte de Caja" para cerrar tu turno formalmente.');
            }}
            className="h-9 flex items-center gap-2 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-black shadow-[0_0_20px_rgba(245,158,11,0.35)] border border-amber-200/80 transition-all shrink-0 active:scale-[0.98]"
          >
            <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Cerrar Turno</span>
          </button>

          {/* Sincronizado Pill */}
          <div className="hidden xl:flex h-9 items-center gap-2 px-3 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-400/45 font-extrabold text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            <span>Sincronizado</span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. TWO-COLUMN KIOSK WORKSPACE (Catálogo + Consola de Ticket/Cobro)    */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden items-stretch">
        
        {/* ================================================================ */}
        {/* LEFT COLUMN: Catálogo Visual & Escáner (7 / 8 de 12)             */}
        {/* ================================================================ */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0 bg-[#131826]/90 backdrop-blur-md rounded-2xl border border-white/15 p-3 sm:p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] relative overflow-hidden">
          {/* Subtle Top Specular Hairline */}
          <div className="absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          {/* Top Toolbar: Barcode & Product Search */}
          <div className="space-y-2 shrink-0 pb-2.5 border-b border-white/15">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-2 drop-shadow-sm">
                <Barcode className="w-4 h-4 text-amber-400" />
                Escanear o Buscar Producto
              </span>
              <span className="text-[11px] font-mono font-extrabold text-zinc-100 bg-white/[0.12] px-2.5 py-0.5 rounded-full border border-white/25">
                {filteredProducts.length} {filteredProducts.length === 1 ? 'producto' : 'productos'}
              </span>
            </div>

            {/* Luminous Frosted Search Input */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2 z-10" />
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
                placeholder="Escanea código de barras o escribe producto, marca o sabor..."
                className="w-full h-10 pl-10 pr-16 bg-[#1f2638]/75 rounded-xl border border-white/25 text-xs sm:text-sm text-white placeholder-zinc-200/75 font-mono focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all shadow-inner"
              />
              {barcodeInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setBarcodeInput('');
                    setSearch('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-300 hover:text-white transition-colors z-10 p-1"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              ) : (
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.12] border border-white/20 text-[9.5px] font-mono font-bold text-zinc-100 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  ENTER
                </span>
              )}
            </div>

            {/* Category Filter Pills (Clean No-Scrollbar Touch Strip) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
              {categories.map(cat => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black shadow-[0_0_18px_rgba(245,158,11,0.42)] border border-amber-200/80'
                        : 'bg-[#1f2638]/70 text-zinc-100 hover:bg-[#283147]/85 hover:text-white border border-white/20 hover:border-amber-400/50'
                    }`}
                  >
                    <span className="text-xs leading-none">{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Grid (Smooth Custom Scrollbar, Full Breathing Room) */}
          <div className="flex-1 min-h-0 overflow-y-auto pos-scroll pr-1 pt-2.5 pb-1">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.08] border border-white/20 flex items-center justify-center text-amber-300">
                  <Package className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-white">No se encontraron productos</h4>
                  <p className="text-xs text-zinc-300 mt-1 max-w-xs">
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
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/50 text-xs font-extrabold transition-colors"
                >
                  Restablecer Filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================ */}
        {/* RIGHT COLUMN: Ticket de Venta & Caja de Cobro (5 / 4 de 12)      */}
        {/* ================================================================ */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between min-h-0 bg-gradient-to-b from-[#1a2133]/95 via-[#151b2a]/95 to-[#111623]/95 backdrop-blur-xl rounded-2xl border border-amber-400/45 p-3 sm:p-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.5),0_0_24px_rgba(245,158,11,0.12)] relative overflow-hidden">
          {/* Kiosk Gold Top Specular Highlight */}
          <div className="absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/80 to-transparent pointer-events-none" />

          {/* 1. Customer Quick Header (+ Nuevo Socio, without search selector/dropdown) */}
          <div className="relative shrink-0 flex items-center justify-between gap-2 pb-1">
            {selectedMember ? (
              <div className="flex items-center gap-1.5 min-w-0 bg-amber-400/15 border border-amber-400/45 rounded-lg px-2 py-0.5">
                <span className="text-[10.5px] font-extrabold text-amber-200 truncate">
                  Socio: {selectedMember.fullName}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedClientId('')}
                  className="p-0.5 text-amber-200/80 hover:text-white rounded hover:bg-white/[0.12] transition-colors shrink-0"
                  title="Volver a Público General"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-200">
                Público en General
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowAddClientModal(true)}
              className="text-[10.5px] text-amber-300 hover:text-amber-200 font-extrabold flex items-center gap-1 hover:underline shrink-0"
            >
              <UserPlus className="w-3 h-3" />
              <span>+ Nuevo Socio</span>
            </button>
          </div>

          {/* 2. Middle: Live Ticket Items List (Flex-1 with Zero-Clip Proportions) */}
          <div className="flex-1 min-h-0 flex flex-col mt-1 mb-2 overflow-hidden">
            {/* Ticket Sub-header */}
            <div className="flex items-center justify-between pb-1.5 border-b border-white/15 text-xs shrink-0">
              <span className="font-black text-white flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-400" />
                <span>Ticket de Venta</span>
                <span className="text-[10px] font-mono font-black text-amber-200 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/40">
                  {cartItemsCount} {cartItemsCount === 1 ? 'artículo' : 'artículos'}
                </span>
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-[11px] text-zinc-300 hover:text-red-300 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-lg hover:bg-red-500/15 font-bold"
                  title="Vaciar ticket"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Vaciar</span>
                </button>
              )}
            </div>

            {/* Ticket Items Scroll Area */}
            <div className="flex-1 min-h-0 overflow-y-auto pos-scroll pr-1 py-1.5">
              {cart.length === 0 ? (
                <div className="h-full min-h-[110px] flex flex-col items-center justify-center text-center px-3 py-2 rounded-2xl bg-white/[0.07] border border-dashed border-white/25">
                  <div className="w-11 h-11 rounded-2xl bg-[#161a26] border border-amber-400/50 flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(245,158,11,0.25)] shrink-0 mb-2">
                    <img
                      src="/logo.png"
                      alt="LEYENDS GYM"
                      className="w-full h-full object-contain drop-shadow"
                    />
                  </div>
                  <h4 className="font-black text-xs sm:text-sm text-white leading-tight">
                    Ticket Listo para Cobro
                  </h4>
                  <p className="text-[9.5px] text-amber-300 font-black uppercase tracking-widest mt-0.5">
                    LEYENDS GYM • CLUB FITNESS
                  </p>
                  <p className="text-[10.5px] text-zinc-200 leading-snug mt-1 max-w-[230px]">
                    Selecciona artículos del catálogo o escanea un código para iniciar la orden.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-2 flex items-center justify-between gap-2.5 rounded-xl bg-white/[0.09] hover:bg-white/[0.14] border border-white/20 transition-colors"
                    >
                      {/* Product Thumbnail */}
                      <img
                        src={item.product.image || '/logo.png'}
                        alt={item.product.name}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/logo.png';
                        }}
                        className="w-10 h-10 rounded-lg object-cover border border-white/20 bg-[#1a1f2e] shrink-0"
                      />

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 leading-tight">
                        <h5 className="font-extrabold text-xs text-white truncate">
                          {item.product.name}
                        </h5>
                        <div className="flex items-center gap-1.5 text-[10.5px] text-zinc-300 mt-0.5">
                          <span className="font-mono font-bold text-amber-300">
                            ${item.unitPrice.toFixed(2)}
                          </span>
                          {item.product.flavor && (
                            <span className="truncate max-w-[90px] text-zinc-200/80">
                              • {item.product.flavor}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-0.5 bg-[#151926]/90 p-0.5 rounded-lg border border-white/20 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 rounded-md text-zinc-300 hover:text-white hover:bg-white/[0.12] transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-black text-xs px-1.5 text-white">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="p-1 rounded-md text-zinc-300 hover:text-white hover:bg-white/[0.12] disabled:opacity-25 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line Subtotal & Delete */}
                      <div className="text-right shrink-0 min-w-[64px] flex items-center justify-end gap-1.5">
                        <span className="font-mono font-black text-xs text-white">
                          ${item.subtotal.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-zinc-300 hover:text-red-300 rounded-md hover:bg-red-500/15 transition-colors"
                          title="Eliminar artículo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Bottom: Precision Payment Console & Checkout Controls (Zero Clipping) */}
          <div className="space-y-2 pt-2.5 border-t border-white/15 shrink-0">
            
            {/* Digital Total Readout */}
            <div className="bg-gradient-to-r from-[#141824]/85 via-[#1c2234]/85 to-[#141824]/85 px-3.5 py-2.5 rounded-xl border border-amber-400/45 shadow-inner flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-100 block">
                  TOTAL A COBRAR
                </span>
                <span className="text-[10px] text-zinc-300 font-mono block">
                  {cartItemsCount} {cartItemsCount === 1 ? 'artículo en orden' : 'artículos en orden'}
                </span>
              </div>
              <span className="text-3xl sm:text-4xl font-black font-mono text-amber-400 tracking-tight leading-none drop-shadow-[0_2px_16px_rgba(245,158,11,0.45)]">
                ${cartTotal.toFixed(2)}
              </span>
            </div>

            {/* Payment Methods (3 Precision Pills) */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`h-9 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-200/80 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                    : 'bg-white/[0.09] text-zinc-100 border-white/20 hover:bg-white/[0.15] hover:text-white hover:border-white/30'
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>$ Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`h-9 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-200/80 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                    : 'bg-white/[0.09] text-zinc-100 border-white/20 hover:bg-white/[0.15] hover:text-white hover:border-white/30'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`h-9 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'transfer'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black border-amber-200/80 shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                    : 'bg-white/[0.09] text-zinc-100 border-white/20 hover:bg-white/[0.15] hover:text-white hover:border-white/30'
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Transfer</span>
              </button>
            </div>

            {/* Cash Denominations & Tender Input */}
            {paymentMethod === 'cash' && (
              <div className="space-y-1.5">
                <div className="grid grid-cols-6 gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickCash('exact')}
                    className="h-7 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 font-black text-[10px] border border-amber-400/50 flex items-center justify-center transition-colors"
                    title="Pago exacto"
                  >
                    ⚡ Exacto
                  </button>
                  {[50, 100, 200, 500, 1000].map(bill => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => handleQuickCash(bill)}
                      className="h-7 rounded-lg bg-white/[0.1] hover:bg-white/[0.18] text-zinc-100 hover:text-white font-bold font-mono text-[10.5px] border border-white/20 hover:border-amber-400/50 transition-all"
                    >
                      ${bill}
                    </button>
                  ))}
                </div>

                {/* Tender Input */}
                <div className="h-9 flex items-center justify-between gap-2 bg-[#1c2233]/85 px-3 rounded-xl border border-white/20 focus-within:border-emerald-400/70 transition-all shadow-inner">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Banknote className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <input
                      type="number"
                      value={amountPaidStr}
                      onChange={(e) => setAmountPaidStr(e.target.value)}
                      placeholder="Paga con... ($)"
                      className="w-full bg-transparent text-xs sm:text-sm font-mono font-bold text-white placeholder-zinc-300/80 focus:outline-none"
                    />
                  </div>
                  {cashGiven > 0 && (
                    <div className="text-right shrink-0 flex items-center gap-1.5">
                      <span className="text-[9.5px] text-zinc-300 font-black uppercase">Cambio:</span>
                      <span className="text-xs font-mono font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-400/45">
                        ${changeDue.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Primary Action Buttons: [Cancelar] [Cobrar & Ticket] */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="h-10 sm:h-11 px-3 rounded-xl bg-white/[0.1] hover:bg-red-500/20 text-zinc-100 hover:text-red-300 border border-white/20 hover:border-red-400/50 disabled:opacity-40 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!canCheckout}
                className="h-10 sm:h-11 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 disabled:opacity-45 text-black font-black text-xs sm:text-sm shadow-[0_0_22px_rgba(245,158,11,0.4)] border border-amber-200/80 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] disabled:cursor-not-allowed"
              >
                <Receipt className="w-4 h-4 stroke-[2.5]" />
                <span>Cobrar &amp; Ticket</span>
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Cash Movements Modal */}
      {showMovementsModal && (
        <CashMovementsModal onClose={() => setShowMovementsModal(false)} />
      )}

      {/* Sales History & Returns Modal (TemploGym + gym-operations-suite) */}
      {salesHistoryModalTab !== null && (
        <PosSalesHistoryModal
          initialTab={salesHistoryModalTab}
          onClose={() => setSalesHistoryModalTab(null)}
          onReprintSale={(sale) => {
            setSalesHistoryModalTab(null);
            setCompletedSale(sale);
          }}
        />
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
        <div
          className={`fixed top-16 right-6 z-50 animate-bounce-short shadow-2xl rounded-2xl border px-4 py-3 flex items-center gap-3 backdrop-blur-xl transition-all ${
            scanFeedback.type === 'success'
              ? 'bg-[#181d2c]/95 border-emerald-400/50 text-white shadow-emerald-500/15'
              : scanFeedback.type === 'warning'
              ? 'bg-[#181d2c]/95 border-amber-400/50 text-white shadow-amber-500/15'
              : 'bg-red-950/95 border-red-400/50 text-white shadow-red-500/20'
          }`}
        >
          {scanFeedback.type === 'success' ? (
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
              <ScanLine className="w-5 h-5 animate-pulse" />
            </div>
          ) : scanFeedback.type === 'warning' ? (
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-300 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  scanFeedback.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : scanFeedback.type === 'warning'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                {scanFeedback.type === 'success'
                  ? '⚡ Código Escaneado (+1)'
                  : scanFeedback.type === 'warning'
                  ? '⚠️ Stock Agotado'
                  : '❌ Error de Lectura'}
              </span>
              {scanFeedback.product && (
                <span className="text-xs font-mono font-bold text-amber-300">
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
