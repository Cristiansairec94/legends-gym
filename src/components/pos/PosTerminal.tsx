import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGym } from '../../context/GymContext';
import { ProductCard } from './ProductCard';
import { ReceiptModal } from './ReceiptModal';
import { CashMovementsModal } from './CashMovementsModal';
import { ClientFormModal } from '../clients/ClientFormModal';
import { BiometricEnrollModal } from '../clients/BiometricEnrollModal';
import { Sale, PaymentMethod, Product, Client } from '../../types';
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
  Fingerprint,
  UserCheck,
  Sparkles,
  Layers
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
    currentRole,
    catalogPlans
  } = useGym();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Tray Customer & Biometric State
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [showSearchClientModal, setShowSearchClientModal] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientToEnroll, setClientToEnroll] = useState<Client | null>(null);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<string | undefined>(undefined);

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
    { id: 'plans', label: '⭐ Membresías & Pases' },
    { id: 'protein', label: 'Proteínas' },
    { id: 'creatine', label: 'Creatinas' },
    { id: 'preworkout', label: 'Pre-Entreno' },
    { id: 'aminoacids', label: 'Aminoácidos' },
    { id: 'beverage', label: 'Bebidas & Hidratación' },
    { id: 'snack', label: 'Snacks Proteicos' },
    { id: 'gear', label: 'Accesorios & Gym Gear' },
  ];

  // Default plans fallback
  const DEFAULT_PLANS = [
    { id: 'CAT-PLAN-001', type: 'daily', name: 'Pase por Día (Day Pass)', price: 150, duration: '1 día', durationDays: 1, benefits: ['Acceso total por 1 día', 'Uso de regaderas', 'Área de pesas y cardio'] },
    { id: 'CAT-PLAN-002', type: 'monthly', name: 'Mensualidad Estándar', price: 850, duration: '30 días', durationDays: 30, benefits: ['Acceso 30 días', 'Acceso biométrico con huella', 'Rutina de inducción', 'Clases grupales'] },
    { id: 'CAT-PLAN-003', type: 'quarterly', name: 'Plan Trimestral Fuerza', price: 2300, duration: '90 días', durationDays: 90, benefits: ['Acceso 90 días', '10% descuento en tienda', 'Evaluación InBody inicial', 'Acceso rápido con huella'] },
    { id: 'CAT-PLAN-004', type: 'annual', name: 'Membresía Black VIP Anual', price: 9500, duration: '365 días', durationDays: 365, benefits: ['Acceso 365 días', 'Acceso VIP ilimitado', '15% descuento en tienda', 'Acceso a todas las sucursales'] },
  ];

  const availablePlans = (catalogPlans && catalogPlans.length > 0)
    ? catalogPlans.map(p => ({
        id: p.id,
        type: p.type,
        name: p.name,
        price: p.price,
        duration: `${p.durationDays} días`,
        durationDays: p.durationDays,
        benefits: p.benefits || ['Acceso con huella digital', 'Acceso ilimitado'],
      }))
    : DEFAULT_PLANS;

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

  // Filter plans if searching or category === 'plans'
  const filteredPlans = availablePlans.filter(p => {
    if (selectedCategory === 'plans') return true;
    if (search.trim().length > 1) {
      return p.name.toLowerCase().includes(search.toLowerCase()) || 'membresia'.includes(search.toLowerCase()) || 'pase'.includes(search.toLowerCase());
    }
    return false;
  });

  // Filter members for search modal
  const filteredMembersForSearch = members.filter(m => {
    if (!clientSearchQuery.trim()) return true;
    const q = clientSearchQuery.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.documentId.toLowerCase().includes(q) ||
      m.phone.includes(q)
    );
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
          message: `¡Agotado! "${matched.name}" sin existencia disponible.`,
          product: matched,
          timestamp: Date.now(),
        });
      } else {
        addToCart(matched);
        sounds.playBarcodeBeep();
        setScanFeedback({
          type: 'success',
          message: `Agregado: ${matched.name} ($${matched.price.toFixed(2)})`,
          product: matched,
          timestamp: Date.now(),
        });
      }
    } else {
      // Check if scanned code is a member ID/badge
      const matchedMember = members.find(m => 
        m.id.toLowerCase() === cleanCode.toLowerCase() || 
        m.documentId === cleanCode
      );
      if (matchedMember) {
        setSelectedClientId(matchedMember.id);
        sounds.playBarcodeBeep();
        setScanFeedback({
          type: 'success',
          message: `Socio identificado: ${matchedMember.fullName}`,
          timestamp: Date.now(),
        });
      } else {
        sounds.playBarcodeError();
        setScanFeedback({
          type: 'error',
          message: `Código no reconocido: "${cleanCode}". Verifica catálogo.`,
          timestamp: Date.now(),
        });
      }
    }

    // Trigger visual scanner flash
    setFlashScanner(true);
    setTimeout(() => setFlashScanner(false), 350);

    // Reset scanner input
    setBarcodeInput('');
    if (sourceInput) {
      sourceInput.value = '';
    }
  }, [products, members, addToCart]);

  // Global Hardware Barcode Scanner Listener (USB / Bluetooth Wedge Scanners)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside a regular text input or modal
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === 'INPUT' || activeEl?.tagName === 'TEXTAREA' || activeEl?.tagName === 'SELECT';
      
      // If modal is open, ignore global listener
      if (showMovementsModal || showAddClientModal || showSearchClientModal || clientToEnroll || completedSale) {
        return;
      }

      // If active element is barcodeInput itself, let the input's own form submit handle it
      if (activeEl === barcodeInputRef.current) {
        return;
      }

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTime;
      lastKeyTime = currentTime;

      // Barcode scanners type characters extremely fast (< 45ms apart)
      if (diff > 80) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          handleProductScanned(buffer);
          buffer = '';
          return;
        }
        buffer = '';
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [showMovementsModal, showAddClientModal, showSearchClientModal, clientToEnroll, completedSale, handleProductScanned]);

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
                  Caja rápida mostrador, membresías y huella
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
                placeholder="Buscar producto, sabor o código..."
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
              title="Lector de código de barras USB/Bluetooth en línea. Escanea cualquier código en cualquier momento."
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
                <Layers className="w-4 h-4 text-amber-400" />
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

            {/* Botón Principal: + Registrar Socio con Huella */}
            <button
              onClick={() => {
                setSelectedPlanForModal(undefined);
                setShowAddClientModal(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-sm font-black transition-all shadow-md shrink-0 cursor-pointer"
              title="Registrar nuevo socio con membresía y captura biométrica de huella"
            >
              <Fingerprint className="w-4 h-4 text-black stroke-[2.5]" />
              <span className="hidden sm:inline">+ Registrar Socio con Huella</span>
              <span className="sm:hidden">+ Huella</span>
            </button>

            {/* $ Movimientos Button */}
            <button
              onClick={() => setShowMovementsModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-sm font-bold transition-all shadow-sm shrink-0"
            >
              <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[10px]">
                $
              </span>
              <span className="hidden md:inline">Movimientos</span>
            </button>

            {/* 🔒 Cerrar Turno Button */}
            <button
              onClick={() => {
                if (onNavigateToCash) onNavigateToCash();
                else alert('Usa el menú lateral "Corte de Caja" para cerrar tu turno formalmente.');
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-600 hover:to-zinc-700 text-white text-sm font-bold shadow-sm transition-all shrink-0 border border-zinc-600"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Cerrar Turno</span>
            </button>
          </div>

          {/* Product & Plans Cards Grid with internal scrolling */}
          <div className="flex-1 overflow-y-auto pr-1">
            {selectedCategory === 'plans' ? (
              /* Membership Plans Grid in POS */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 pb-2">
                {availablePlans.map((plan) => (
                  <div 
                    key={plan.id}
                    className="bg-gym-card rounded-2xl border border-gym-border p-4 flex flex-col justify-between hover:border-amber-400/60 transition-all shadow-lg group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                    
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {plan.duration}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                          <Fingerprint className="w-4 h-4" />
                        </div>
                      </div>

                      <h4 className="font-black text-base text-white group-hover:text-amber-400 transition-colors">
                        {plan.name}
                      </h4>

                      <div className="my-2.5">
                        <span className="text-2xl font-black font-mono text-white">
                          ${plan.price.toLocaleString('es-MX')}
                        </span>
                        <span className="text-xs text-gym-muted ml-1 font-semibold">MXN</span>
                      </div>

                      <div className="space-y-1.5 mb-4">
                        {plan.benefits.slice(0, 3).map((benefit, i) => (
                          <div key={i} className="text-xs text-gray-300 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="truncate">{benefit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanForModal(plan.id);
                        setShowAddClientModal(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      <Fingerprint className="w-4 h-4 stroke-[2.5]" />
                      <span>Inscribir con Huella</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              /* Regular Products Grid */
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
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: "Caja de Cobro" */}
        <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 bg-gym-card rounded-xl border border-gym-border p-3 shadow-xl flex flex-col justify-between min-h-0 h-full overflow-hidden">
          
          {/* Top section: Header + Customer Selection + Barcode */}
          <div className="space-y-2 shrink-0">
            {/* Header: Caja de Cobro + Counter Badge */}
            <div className="flex items-center justify-between gap-3 border-b border-gym-border pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-black font-black shadow-md shrink-0">
                  <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="leading-snug">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm sm:text-base text-white tracking-wide">Caja de Cobro</h3>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10B981]" />
                  </div>
                  <span className="text-[11px] text-amber-400 font-bold block">🏪 Sucursal Matriz</span>
                </div>
              </div>

              {/* Counter pill */}
              <span className="px-3 py-1 rounded-xl bg-gym-surface text-white border border-gym-border text-xs font-mono font-extrabold shadow-sm">
                {cartItemsCount} pzs
              </span>
            </div>

            {/* Customer & Biometric Selection Box */}
            {!selectedMember ? (
              <div className="w-full p-2.5 rounded-xl bg-gym-surface border border-gym-border space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold text-gray-200 block leading-tight">Público en General</span>
                      <span className="text-[10px] text-gym-muted block">Venta sin cliente asociado</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Buscar Socio */}
                    <button
                      type="button"
                      onClick={() => setShowSearchClientModal(true)}
                      className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[11px] font-bold text-gray-200 hover:text-white flex items-center gap-1 transition-all"
                      title="Buscar socio para asociarlo a esta venta"
                    >
                      <Search className="w-3 h-3 text-amber-400" />
                      <span>Buscar</span>
                    </button>

                    {/* + Registrar Socio con Huella */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanForModal(undefined);
                        setShowAddClientModal(true);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black flex items-center gap-1 transition-all shadow-sm"
                      title="Registrar nuevo socio con membresía y captura biométrica de huella"
                    >
                      <Fingerprint className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>+ Huella</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Selected Member Card with Biometric Status */
              <div className="w-full p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={selectedMember.avatarUrl}
                      alt={selectedMember.fullName}
                      className="w-8 h-8 rounded-full object-cover border border-amber-500/40 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-white truncate block">
                          {selectedMember.fullName}
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold shrink-0">
                          {selectedMember.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className={`px-1.5 py-0.2 rounded font-bold ${
                          selectedMember.membership.status === 'active' 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {selectedMember.membership.planName || 'Plan General'} • {selectedMember.membership.daysRemaining}d
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedClientId('')}
                    className="w-6 h-6 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-gym-muted hover:text-white flex items-center justify-center shrink-0 transition-all text-xs"
                    title="Desvincular socio y volver a Público en General"
                  >
                    ✕
                  </button>
                </div>

                {/* Biometric Status Row */}
                <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[10px]">
                  {selectedMember.biometricRegistered ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Huella digital activa</span>
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sin huella registrada</span>
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setClientToEnroll(selectedMember)}
                    className="px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold flex items-center gap-1 border border-amber-500/30 transition-all"
                    title="Capturar o actualizar huella digital del socio"
                  >
                    <Fingerprint className="w-3 h-3 text-amber-400" />
                    <span>{selectedMember.biometricRegistered ? 'Re-enrolar' : 'Capturar Huella'}</span>
                  </button>
                </div>
              </div>
            )}

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
                      className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-xs text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-mono font-bold text-xs text-white w-14 text-right shrink-0">
                    ${item.subtotal.toFixed(2)}
                  </span>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-gym-muted hover:text-red-400 p-1 shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Bottom section: Totals, Quick Cash, Payment Method & Cobrar */}
          <div className="border-t border-gym-border pt-2 space-y-2 shrink-0">
            {/* Totals Breakdown */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gym-muted">
                <span>Subtotal ({cartItemsCount} pzs)</span>
                <span className="font-mono font-semibold text-gray-200">${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1 border-t border-gym-border/40">
                <span className="font-bold text-sm text-white">Total a Cobrar</span>
                <span className="text-xl sm:text-2xl font-black font-mono text-amber-400">
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'cash', label: 'Efectivo', icon: Banknote },
                { id: 'card', label: 'Tarjeta', icon: CreditCard },
                { id: 'transfer', label: 'Transf.', icon: ArrowRightLeft },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id as PaymentMethod)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    paymentMethod === id
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-glow-gold'
                      : 'bg-gym-surface text-gym-muted border-gym-border hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Cash Tendered Input & Quick Denominations */}
            {paymentMethod === 'cash' && cart.length > 0 && (
              <div className="space-y-1.5 bg-gym-surface/40 p-2 rounded-lg border border-gym-border">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gym-muted font-semibold shrink-0">Efectivo Recibido:</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gym-muted">$</span>
                    <input
                      type="number"
                      step="1"
                      value={amountPaidStr}
                      onChange={(e) => setAmountPaidStr(e.target.value)}
                      placeholder={cartTotal.toFixed(2)}
                      className="w-full pl-6 pr-2 py-1 bg-gym-card rounded border border-gym-border text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Quick denomination buttons */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickCash('exact')}
                    className="flex-1 py-1 rounded bg-gym-card hover:bg-gym-border text-[10px] font-bold text-gray-200 border border-gym-border"
                  >
                    Exacto
                  </button>
                  {[50, 100, 200, 500].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickCash(val)}
                      className="flex-1 py-1 rounded bg-gym-card hover:bg-gym-border text-[10px] font-mono font-bold text-gray-200 border border-gym-border"
                    >
                      ${val}
                    </button>
                  ))}
                </div>

                {/* Change calculation */}
                {cashGiven > cartTotal && (
                  <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-gym-border/40 text-emerald-400">
                    <span>Cambio a Devolver:</span>
                    <span className="font-mono text-sm">${changeDue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons: Limpiar + Cobrar */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearCart}
                disabled={cart.length === 0}
                className="px-3 py-2.5 rounded-xl bg-gym-surface text-gym-muted hover:text-white border border-gym-border text-xs font-semibold disabled:opacity-40 disabled:pointer-events-none transition-all"
                title="Vaciar carrito"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={!canCheckout}
                className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  canCheckout
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-glow-gold active:scale-98 cursor-pointer'
                    : 'bg-gym-surface text-gym-muted border border-gym-border cursor-not-allowed opacity-50'
                }`}
              >
                <DollarSign className="w-4 h-4 stroke-[3]" />
                <span>Cobrar Ticket (${cartTotal.toFixed(2)})</span>
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Cash Movements Modal */}
      {showMovementsModal && (
        <CashMovementsModal onClose={() => setShowMovementsModal(false)} />
      )}

      {/* Quick Add Client Modal with Membership & Biometric prompt */}
      {showAddClientModal && (
        <ClientFormModal
          onClose={() => {
            setShowAddClientModal(false);
            setSelectedPlanForModal(undefined);
          }}
          initialPlanId={selectedPlanForModal}
          onClientCreated={(client, wantsEnrollment) => {
            setSelectedClientId(client.id);
            setShowAddClientModal(false);
            setSelectedPlanForModal(undefined);
            if (wantsEnrollment) {
              setClientToEnroll(client);
            }
          }}
        />
      )}

      {/* Biometric Enroll Modal (Fingerprint Scanner) */}
      {clientToEnroll && (
        <BiometricEnrollModal
          client={clientToEnroll}
          onClose={() => setClientToEnroll(null)}
          onSuccess={() => {
            setClientToEnroll(null);
          }}
        />
      )}

      {/* Search / Select Member Modal */}
      {showSearchClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white leading-tight">Buscar Socio del Gimnasio</h3>
                  <p className="text-[11px] text-gym-muted">Selecciona un socio para asociarlo al cobro o enrolar su huella</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSearchClientModal(false);
                  setClientSearchQuery('');
                }}
                className="text-gym-muted hover:text-white p-1 rounded-lg hover:bg-gym-surface"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-gym-border bg-gym-surface/20">
              <div className="relative">
                <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, teléfono, credencial (MEM-001)..."
                  className="w-full pl-9 pr-3 py-2 bg-gym-card rounded-xl border border-gym-border text-xs text-white placeholder-gym-muted focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Members List */}
            <div className="p-3 overflow-y-auto divide-y divide-gym-border/40 flex-1 min-h-[220px] space-y-1">
              {filteredMembersForSearch.length === 0 ? (
                <div className="py-8 text-center text-gym-muted">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-400" />
                  <p className="text-xs font-semibold text-white">No se encontraron socios</p>
                  <p className="text-[11px] mt-0.5">Intenta con otro término o registra uno nuevo.</p>
                </div>
              ) : (
                filteredMembersForSearch.map(m => (
                  <div key={m.id} className="py-2 flex items-center justify-between gap-3 hover:bg-gym-surface/40 px-2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={m.avatarUrl}
                        alt={m.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-gym-border shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white truncate">{m.fullName}</span>
                          <span className="text-[10px] font-mono text-amber-400 font-bold">{m.id}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                            m.membership.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {m.membership.planName || 'Plan'} ({m.membership.daysRemaining}d)
                          </span>
                          <span className="text-gym-muted text-[10px]">{m.phone}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Botón Huella */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowSearchClientModal(false);
                          setClientToEnroll(m);
                        }}
                        className={`p-1.5 rounded-lg border text-xs font-bold transition-all ${
                          m.biometricRegistered 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                            : 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/30 animate-pulse'
                        }`}
                        title={m.biometricRegistered ? 'Huella ya registrada (clic para re-enrolar)' : 'Capturar huella en sensor biométrico'}
                      >
                        <Fingerprint className="w-4 h-4" />
                      </button>

                      {/* Botón Seleccionar */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedClientId(m.id);
                          setShowSearchClientModal(false);
                          setClientSearchQuery('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow-sm"
                      >
                        Seleccionar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with Register New */}
            <div className="p-3 border-t border-gym-border bg-gym-surface/40 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedClientId('');
                  setShowSearchClientModal(false);
                }}
                className="text-xs text-gym-muted hover:text-white underline"
              >
                Cobrar como Público en General
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSearchClientModal(false);
                  setSelectedPlanForModal(undefined);
                  setShowAddClientModal(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs flex items-center gap-1.5 shadow-md"
              >
                <Fingerprint className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Inscribir Nuevo con Huella</span>
              </button>
            </div>
          </div>
        </div>
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
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
          ) : scanFeedback.type === 'warning' ? (
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <AlertCircle className="w-5 h-5 stroke-[2.5]" />
            </div>
          )}
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider block ${
              scanFeedback.type === 'success' ? 'text-emerald-400' : scanFeedback.type === 'warning' ? 'text-amber-400' : 'text-red-400'
            }`}>
              {scanFeedback.type === 'success' ? 'Lector de Código • OK' : scanFeedback.type === 'warning' ? 'Aviso de Stock' : 'Lector de Código'}
            </span>
            <span className="text-xs font-bold text-white block">
              {scanFeedback.message}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
