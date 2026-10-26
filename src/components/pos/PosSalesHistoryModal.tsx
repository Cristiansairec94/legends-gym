import React, { useState, useMemo } from 'react';
import { useGym } from '../../context/GymContext';
import { Sale } from '../../types';
import {
  X,
  Receipt,
  RotateCcw,
  Search,
  Printer,
  CheckCircle2,
  AlertCircle,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Clock,
  User,
  Package,
  ShieldAlert,
  Sparkles,
  Plus,
  Minus,
  Calendar,
  History
} from 'lucide-react';

interface PosSalesHistoryModalProps {
  onClose: () => void;
  onReprintSale: (sale: Sale) => void;
  initialTab?: 'today' | 'returns';
}

export const PosSalesHistoryModal: React.FC<PosSalesHistoryModalProps> = ({
  onClose,
  onReprintSale,
  initialTab = 'today',
}) => {
  const { sales, refundSale } = useGym();

  const [activeTab, setActiveTab] = useState<'today' | 'returns'>(initialTab);
  const [dateScope, setDateScope] = useState<'today' | 'all'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'card' | 'transfer'>('all');

  // Estado del módulo de Devoluciones (Patrón TemploGym DevolucionesPage.tsx)
  const [folioInput, setFolioInput] = useState('');
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState<Sale | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const quickReasons = [
    'Error de cobro en caja',
    'Cambio de producto o sabor',
    'Cancelación solicitada por el socio',
    'Envase o sello con defecto',
  ];

  // Filtrado de ventas para la vista de Historial del Turno / Hoy (Patrón gym-operations-suite)
  const scopedSales = useMemo(() => {
    return sales.filter(s => {
      if (dateScope === 'today' && !s.timestamp.startsWith(todayStr)) {
        return false;
      }
      if (methodFilter !== 'all' && s.paymentMethod !== methodFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchesFolio = s.folio.toLowerCase().includes(q);
      const matchesClient = s.clientName.toLowerCase().includes(q);
      const matchesCashier = s.cashierName.toLowerCase().includes(q);
      const matchesItem = s.items.some(i => i.product.name.toLowerCase().includes(q));
      return matchesFolio || matchesClient || matchesCashier || matchesItem;
    });
  }, [sales, dateScope, todayStr, methodFilter, searchQuery]);

  // Resumen financiero del turno / día (Patrón TodaySalesPanel de gym-operations-suite)
  const summary = useMemo(() => {
    const baseList = dateScope === 'today' ? sales.filter(s => s.timestamp.startsWith(todayStr)) : sales;
    let grossTotal = 0;
    let refundedTotal = 0;
    let netCash = 0;
    let netCard = 0;
    let netTransfer = 0;
    let activeCount = 0;
    let voidedOrPartialCount = 0;

    baseList.forEach(s => {
      const refAmt = s.refundedAmount || 0;
      const netAmt = Math.max(0, s.total - refAmt);
      grossTotal += s.total;
      refundedTotal += refAmt;
      if (s.status !== 'voided') activeCount += 1;
      if (s.status === 'voided' || s.status === 'partial_refund') voidedOrPartialCount += 1;

      if (s.paymentMethod === 'cash') netCash += netAmt;
      else if (s.paymentMethod === 'card') netCard += netAmt;
      else if (s.paymentMethod === 'transfer') netTransfer += netAmt;
    });

    return {
      totalTickets: baseList.length,
      activeCount,
      voidedOrPartialCount,
      grossTotal,
      refundedTotal,
      netTotal: Math.max(0, grossTotal - refundedTotal),
      netCash,
      netCard,
      netTransfer,
    };
  }, [sales, dateScope, todayStr]);

  // Inicializar una venta en el formulario de devolución (TemploGym pattern)
  const loadSaleIntoReturnForm = (sale: Sale) => {
    const prevRefundedMap = new Map<string, number>();
    (sale.refundedItems || []).forEach(ri => {
      prevRefundedMap.set(ri.productId, (prevRefundedMap.get(ri.productId) || 0) + ri.quantity);
    });

    const initialQtyMap: Record<string, number> = {};
    sale.items.forEach(item => {
      const alreadyRefunded = prevRefundedMap.get(item.product.id) || 0;
      const remaining = Math.max(0, item.quantity - alreadyRefunded);
      initialQtyMap[item.product.id] = remaining;
    });

    setSelectedSaleForReturn(sale);
    setFolioInput(sale.folio);
    setReturnQuantities(initialQtyMap);
    setFeedbackBanner(null);
    setActiveTab('returns');
  };

  // Buscar venta por código de folio escrito manualmente
  const handleFolioSearch = (rawValue: string) => {
    setFolioInput(rawValue);
    setFeedbackBanner(null);
    const clean = rawValue.trim().toLowerCase();
    if (!clean) {
      setSelectedSaleForReturn(null);
      setReturnQuantities({});
      return;
    }

    const found = sales.find(
      s =>
        s.folio.toLowerCase() === clean ||
        s.id.toLowerCase() === clean ||
        s.folio.toLowerCase().endsWith(clean)
    );

    if (found) {
      const prevRefundedMap = new Map<string, number>();
      (found.refundedItems || []).forEach(ri => {
        prevRefundedMap.set(ri.productId, (prevRefundedMap.get(ri.productId) || 0) + ri.quantity);
      });

      const initialQtyMap: Record<string, number> = {};
      found.items.forEach(item => {
        const alreadyRefunded = prevRefundedMap.get(item.product.id) || 0;
        initialQtyMap[item.product.id] = Math.max(0, item.quantity - alreadyRefunded);
      });

      setSelectedSaleForReturn(found);
      setReturnQuantities(initialQtyMap);
    } else {
      setSelectedSaleForReturn(null);
      setReturnQuantities({});
    }
  };

  // Cálculos en vivo para la devolución seleccionada
  const returnPreview = useMemo(() => {
    if (!selectedSaleForReturn) {
      return { totalRefundAmount: 0, totalRestoredUnits: 0, itemRows: [] };
    }

    const prevRefundedMap = new Map<string, number>();
    (selectedSaleForReturn.refundedItems || []).forEach(ri => {
      prevRefundedMap.set(ri.productId, (prevRefundedMap.get(ri.productId) || 0) + ri.quantity);
    });

    let totalRefundAmount = 0;
    let totalRestoredUnits = 0;

    const itemRows = selectedSaleForReturn.items.map(item => {
      const alreadyRefunded = prevRefundedMap.get(item.product.id) || 0;
      const maxRemaining = Math.max(0, item.quantity - alreadyRefunded);
      const selectedQty = Math.min(maxRemaining, Math.max(0, returnQuantities[item.product.id] || 0));
      const lineRefund = Math.round(selectedQty * item.unitPrice * 100) / 100;
      const isStoreProduct = !item.product.id.startsWith('PLAN-');

      totalRefundAmount += lineRefund;
      if (isStoreProduct) {
        totalRestoredUnits += selectedQty;
      }

      return {
        productId: item.product.id,
        productName: item.product.name,
        brand: item.product.brand,
        image: item.product.image,
        unitPrice: item.unitPrice,
        originalQty: item.quantity,
        alreadyRefunded,
        maxRemaining,
        selectedQty,
        lineRefund,
        isStoreProduct,
      };
    });

    return {
      totalRefundAmount: Math.round(totalRefundAmount * 100) / 100,
      totalRestoredUnits,
      itemRows,
    };
  }, [selectedSaleForReturn, returnQuantities]);

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForReturn) return;
    if (!returnReason.trim()) {
      setFeedbackBanner({
        type: 'error',
        message: 'Por favor escribe o selecciona un motivo para respaldar la devolución.',
      });
      return;
    }

    const itemsPayload = Object.entries(returnQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ productId, quantity }));

    const result = refundSale(selectedSaleForReturn.folio, returnReason, itemsPayload);
    if (result.success) {
      setFeedbackBanner({
        type: 'success',
        message: result.message,
      });
      if (result.updatedSale) {
        setSelectedSaleForReturn(result.updatedSale);
        // Reset remaining quantities
        const prevRefundedMap = new Map<string, number>();
        (result.updatedSale.refundedItems || []).forEach(ri => {
          prevRefundedMap.set(ri.productId, (prevRefundedMap.get(ri.productId) || 0) + ri.quantity);
        });
        const nextQtyMap: Record<string, number> = {};
        result.updatedSale.items.forEach(item => {
          const already = prevRefundedMap.get(item.product.id) || 0;
          nextQtyMap[item.product.id] = Math.max(0, item.quantity - already);
        });
        setReturnQuantities(nextQtyMap);
      }
      setReturnReason('');
    } else {
      setFeedbackBanner({
        type: 'error',
        message: result.message,
      });
    }
  };

  // Historial de devoluciones ya procesadas (como en la tabla derecha de TemploGym DevolucionesPage.tsx)
  const processedReturns = useMemo(() => {
    return sales.filter(s => s.status === 'voided' || s.status === 'partial_refund');
  }, [sales]);

  const getMethodBadge = (method: Sale['paymentMethod']) => {
    if (method === 'cash') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black">
          <Banknote className="w-3 h-3" /> Efectivo
        </span>
      );
    }
    if (method === 'card') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-black">
          <CreditCard className="w-3 h-3" /> Tarjeta
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-black">
        <ArrowRightLeft className="w-3 h-3" /> Transferencia
      </span>
    );
  };

  const getStatusBadge = (sale: Sale) => {
    if (sale.status === 'voided') {
      return (
        <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black uppercase tracking-wider">
          Anulada
        </span>
      );
    }
    if (sale.status === 'partial_refund') {
      return (
        <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black uppercase tracking-wider">
          Devolución Parcial
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
        Pagada
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-b from-[#13141f] via-[#0e0f17] to-[#0a0b10] rounded-3xl border border-white/[0.12] w-full max-w-6xl max-h-[92vh] flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden">
        
        {/* 1. MODAL HEADER */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#14151e] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-glow-gold/30 border border-amber-300/40 shrink-0">
              <History className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                <span>Tickets del Turno y Devoluciones</span>
                <span className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  POS Auditoría
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Consulta ventas del día, reimprime tickets térmicos o procesa devoluciones restaurando el stock automáticamente.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('today');
                  setFeedbackBanner(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  activeTab === 'today'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-glow-gold/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Tickets del Turno ({summary.totalTickets})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('returns');
                  setFeedbackBanner(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                  activeTab === 'returns'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-glow-gold/30'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Devoluciones y Stock ({processedReturns.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white border border-white/[0.08] transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. KPI SUMMARY STRIP (Patrón gym-operations-suite TodaySalesPanel) */}
        <div className="px-5 py-3 bg-[#0c0d14] border-b border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <span>Ingreso Neto {dateScope === 'today' ? 'Hoy' : 'Total'}</span>
              <span className="text-emerald-400 font-mono">{summary.activeCount} vigentes</span>
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-amber-400 mt-1">
              ${summary.netTotal.toFixed(2)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Bruto registrado: ${summary.grossTotal.toFixed(2)}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <span>Efectivo Neto en Caja</span>
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1">
              ${summary.netCash.toFixed(2)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              Descontando devoluciones en efectivo
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <span>Tarjeta + Transferencia</span>
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-white mt-1">
              ${(summary.netCard + summary.netTransfer).toFixed(2)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
              Tarj: ${summary.netCard.toFixed(2)} • Transf: ${summary.netTransfer.toFixed(2)}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <span>Devoluciones / Anuladas</span>
              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-red-400 mt-1">
              -${summary.refundedTotal.toFixed(2)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">
              {summary.voidedOrPartialCount} ticket(s) con devolución
            </div>
          </div>
        </div>

        {/* 3. MAIN BODY CONTENT */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {activeTab === 'today' ? (
            /* ================================================================ */
            /* TAB 1: HISTORIAL DE TICKETS DEL TURNO (gym-operations-suite)     */
            /* ================================================================ */
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/[0.07]">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar por Folio (ej. FOL-123456), socio, cajero o producto..."
                    className="w-full pl-10 pr-8 py-2 bg-black/70 rounded-xl border border-white/[0.12] text-xs sm:text-sm text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-amber-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Method Filter Pills */}
                  {(['all', 'cash', 'card', 'transfer'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethodFilter(m)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        methodFilter === m
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 font-black'
                          : 'bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white'
                      }`}
                    >
                      {m === 'all'
                        ? 'Todos'
                        : m === 'cash'
                        ? '$ Efectivo'
                        : m === 'card'
                        ? 'Tarjeta'
                        : 'Transferencia'}
                    </button>
                  ))}

                  {/* Scope Toggle: Hoy vs Todo */}
                  <div className="h-5 w-[1px] bg-white/[0.1] mx-1 hidden sm:block" />
                  <button
                    type="button"
                    onClick={() => setDateScope(prev => (prev === 'today' ? 'all' : 'today'))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-zinc-200 border border-white/[0.1] transition-colors"
                  >
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{dateScope === 'today' ? 'Viendo: Solo Hoy' : 'Viendo: Todo el Historial'}</span>
                  </button>
                </div>
              </div>

              {/* Tickets List */}
              {scopedSales.length === 0 ? (
                <div className="py-14 text-center space-y-3 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                    <Receipt className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">No hay tickets registrados con este filtro</h4>
                    <p className="text-xs text-zinc-400 mt-1">
                      {dateScope === 'today'
                        ? 'Las ventas que proceses hoy en el Punto de Venta aparecerán aquí al instante.'
                        : 'No se encontraron coincidencias para tu búsqueda.'}
                    </p>
                  </div>
                  {dateScope === 'today' && sales.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDateScope('all')}
                      className="px-4 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors"
                    >
                      Ver historial de días anteriores ({sales.length} tickets)
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {scopedSales.map(sale => {
                    const isVoided = sale.status === 'voided';
                    const isPartial = sale.status === 'partial_refund';
                    const netSaleTotal = Math.max(0, sale.total - (sale.refundedAmount || 0));

                    return (
                      <div
                        key={sale.id}
                        className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all ${
                          isVoided
                            ? 'bg-red-950/15 border-red-500/25 opacity-80'
                            : isPartial
                            ? 'bg-amber-950/10 border-amber-500/30'
                            : 'bg-white/[0.03] hover:bg-white/[0.05] border-white/[0.08]'
                        }`}
                      >
                        {/* Top Card Row: Folio, Time, Status & Total */}
                        <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-sm text-amber-400">
                                {sale.folio}
                              </span>
                              {getStatusBadge(sale)}
                              {getMethodBadge(sale.paymentMethod)}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-zinc-500" />
                                {new Date(sale.timestamp).toLocaleString('es-MX', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: 'short',
                                })}
                              </span>
                              <span className="flex items-center gap-1 truncate">
                                <User className="w-3 h-3 text-zinc-500" />
                                <strong className="text-zinc-200">{sale.clientName}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                              {isPartial ? 'Total Neto' : 'Total'}
                            </span>
                            <span
                              className={`text-lg font-black font-mono ${
                                isVoided ? 'line-through text-red-400' : 'text-white'
                              }`}
                            >
                              ${netSaleTotal.toFixed(2)}
                            </span>
                            {(isPartial || isVoided) && sale.refundedAmount ? (
                              <span className="block text-[10px] font-mono text-red-400 font-bold">
                                Devuelto: -${sale.refundedAmount.toFixed(2)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Middle: Sold Items List */}
                        <div className="space-y-1.5">
                          {sale.items.map((item, idx) => {
                            const refundedEntry = (sale.refundedItems || []).find(
                              r => r.productId === item.product.id
                            );
                            return (
                              <div
                                key={`${sale.id}-${item.product.id}-${idx}`}
                                className="flex items-center justify-between text-xs bg-black/40 px-2.5 py-1.5 rounded-xl border border-white/[0.04]"
                              >
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <span className="font-mono font-black text-amber-400">
                                    {item.quantity}x
                                  </span>
                                  <span className="text-zinc-200 font-semibold truncate">
                                    {item.product.name}
                                  </span>
                                  {refundedEntry && (
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 shrink-0">
                                      -{refundedEntry.quantity} dev.
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-bold text-zinc-300 shrink-0">
                                  ${item.subtotal.toFixed(2)}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Void / Refund Audit Box (Patrón gym-operations-suite today-sale-void-record) */}
                        {(isVoided || isPartial) && (
                          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-[11px] space-y-0.5">
                            <div className="font-black text-red-300 flex items-center gap-1.5">
                              <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span>
                                {isVoided ? 'Registro de Anulación Total' : 'Registro de Devolución Parcial'}
                              </span>
                            </div>
                            <p className="text-zinc-300">
                              <strong className="text-zinc-400">Motivo:</strong>{' '}
                              {sale.voidReason || 'Devolución en caja'}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-mono">
                              Autorizado por {sale.voidedBy || sale.cashierName}
                              {sale.voidedAt
                                ? ` • ${new Date(sale.voidedAt).toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}`
                                : ''}
                            </p>
                          </div>
                        )}

                        {/* Card Footer Actions */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                          <span className="text-[10px] text-zinc-500 truncate">
                            Atendió: <strong className="text-zinc-400">{sale.cashierName}</strong>
                          </span>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onReprintSale(sale)}
                              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 hover:text-white border border-white/[0.1] text-xs font-bold flex items-center gap-1.5 transition-colors"
                              title="Ver e imprimir ticket térmico"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-400" />
                              <span>Reimprimir Ticket</span>
                            </button>

                            {!isVoided && (
                              <button
                                type="button"
                                onClick={() => loadSaleIntoReturnForm(sale)}
                                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                                title="Devolver artículos o anular ticket"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Devolver / Anular</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ================================================================ */
            /* TAB 2: GESTIÓN DE DEVOLUCIONES Y STOCK (Patrón TemploGym)        */
            /* ================================================================ */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column (5 of 12): Formulario de Devolución por Folio */}
              <div className="lg:col-span-5 bg-white/[0.03] rounded-2xl border border-white/[0.08] p-4 sm:p-5 space-y-4 h-fit">
                <div className="border-b border-white/[0.08] pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <h4 className="font-black text-sm text-white uppercase tracking-wider">
                      Registrar Devolución
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/25">
                    Restaura Stock
                  </span>
                </div>

                {feedbackBanner && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                      feedbackBanner.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-red-500/15 border-red-500/40 text-red-300'
                    }`}
                  >
                    {feedbackBanner.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 font-semibold">{feedbackBanner.message}</div>
                  </div>
                )}

                <form onSubmit={handleSubmitReturn} className="space-y-4">
                  {/* Search by Folio */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                      Folio de Ticket o Código de Venta *
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={folioInput}
                        onChange={e => handleFolioSearch(e.target.value)}
                        placeholder="Ej. FOL-849201 (o selecciona de la lista)"
                        className="w-full pl-10 pr-8 py-2.5 bg-black/70 rounded-xl border border-white/[0.14] text-xs sm:text-sm font-mono font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                      {folioInput && (
                        <button
                          type="button"
                          onClick={() => handleFolioSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Recent Tickets Selector if none selected */}
                  {!selectedSaleForReturn && sales.filter(s => s.status !== 'voided').length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">
                        Últimos tickets cobrados (clic para cargar):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {sales
                          .filter(s => s.status !== 'voided')
                          .slice(0, 5)
                          .map(s => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => loadSaleIntoReturnForm(s)}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-amber-400/20 text-zinc-300 hover:text-amber-300 border border-white/[0.08] hover:border-amber-400/40 text-[11px] font-mono font-bold transition-all"
                            >
                              {s.folio} (${s.total.toFixed(0)})
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Found Sale Details & Per-Item Quantity Selector (TemploGym Pattern) */}
                  {selectedSaleForReturn ? (
                    <div className="p-3.5 rounded-2xl bg-amber-500/[0.06] border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <div>
                          <span className="font-mono font-black text-sm text-amber-400 block">
                            {selectedSaleForReturn.folio}
                          </span>
                          <span className="text-[11px] text-zinc-300 flex items-center gap-1">
                            <User className="w-3 h-3 text-amber-400" />
                            {selectedSaleForReturn.clientName}
                          </span>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(selectedSaleForReturn)}
                          <span className="text-xs font-mono font-bold text-white block mt-1">
                            Total: ${selectedSaleForReturn.total.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {selectedSaleForReturn.status === 'voided' ? (
                        <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-xs text-red-300 font-semibold text-center">
                          Este ticket ya fue devuelto / anulado en su totalidad.
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                                Artículos a devolver al almacén:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const allMax: Record<string, number> = {};
                                  returnPreview.itemRows.forEach(r => {
                                    allMax[r.productId] = r.maxRemaining;
                                  });
                                  setReturnQuantities(allMax);
                                }}
                                className="text-[10px] text-amber-400 hover:underline font-bold"
                              >
                                Seleccionar Todo
                              </button>
                            </div>

                            {returnPreview.itemRows.map(row => (
                              <div
                                key={row.productId}
                                className="flex items-center justify-between gap-2 bg-black/60 p-2.5 rounded-xl border border-white/[0.08]"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-white truncate">
                                    {row.productName}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 font-mono">
                                    ${row.unitPrice.toFixed(2)} c/u • Disp. devolver: {row.maxRemaining} de{' '}
                                    {row.originalQty}
                                  </p>
                                </div>

                                {row.maxRemaining > 0 ? (
                                  <div className="flex items-center gap-1 bg-[#0a0b10] p-1 rounded-xl border border-white/[0.1] shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReturnQuantities(prev => ({
                                          ...prev,
                                          [row.productId]: Math.max(0, (prev[row.productId] || 0) - 1),
                                        }))
                                      }
                                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                                    >
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="font-mono font-black text-xs px-2 text-amber-400">
                                      {row.selectedQty}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReturnQuantities(prev => ({
                                          ...prev,
                                          [row.productId]: Math.min(
                                            row.maxRemaining,
                                            (prev[row.productId] || 0) + 1
                                          ),
                                        }))
                                      }
                                      className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08]"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-red-400 px-2 py-0.5 rounded bg-red-500/10">
                                    Ya devuelto
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Live Refund & Stock Restoration Summary */}
                          <div className="p-3 rounded-xl bg-black/70 border border-white/[0.08] flex items-center justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-black text-zinc-400 block">
                                Stock a Restaurar
                              </span>
                              <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1 mt-0.5">
                                <Package className="w-3.5 h-3.5" />+{returnPreview.totalRestoredUnits}{' '}
                                {returnPreview.totalRestoredUnits === 1 ? 'unidad' : 'unidades'} al almacén
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-black text-zinc-400 block">
                                Monto a Reembolsar
                              </span>
                              <span className="text-lg font-black font-mono text-amber-400">
                                ${returnPreview.totalRefundAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : folioInput.trim().length > 2 ? (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>No se encontró ningún ticket con ese folio.</span>
                    </div>
                  ) : null}

                  {/* Reason Input & Quick Chips */}
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                      Motivo de Devolución / Anulación *
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {quickReasons.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReturnReason(r)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                            returnReason === r
                              ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                              : 'bg-white/[0.03] text-zinc-400 border-white/[0.08] hover:text-white'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      rows={2}
                      value={returnReason}
                      onChange={e => setReturnReason(e.target.value)}
                      placeholder="Describe el motivo para auditoría de caja..."
                      required
                      className="w-full px-3.5 py-2 bg-black/70 rounded-xl border border-white/[0.14] text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={
                      !selectedSaleForReturn ||
                      selectedSaleForReturn.status === 'voided' ||
                      returnPreview.totalRefundAmount <= 0
                    }
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 disabled:opacity-35 disabled:cursor-not-allowed text-black font-black text-xs sm:text-sm shadow-glow-gold flex items-center justify-center gap-2 transition-all"
                  >
                    <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                    <span>Procesar Devolución y Restaurar Stock</span>
                  </button>
                </form>
              </div>

              {/* Right Column (7 of 12): Historial de Devoluciones Registradas (TemploGym Pattern) */}
              <div className="lg:col-span-7 bg-white/[0.03] rounded-2xl border border-white/[0.08] flex flex-col overflow-hidden">
                <div className="px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-sm text-white">
                      Historial de Devoluciones y Anulaciones
                    </h4>
                    <p className="text-[11px] text-zinc-400">
                      Registro de auditoría de reembolsos y piezas reintegradas al inventario.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-xl border border-amber-400/25">
                    {processedReturns.length} registros
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {processedReturns.length === 0 ? (
                    <div className="py-16 text-center space-y-2">
                      <Sparkles className="w-8 h-8 text-amber-400/40 mx-auto" />
                      <p className="text-xs font-bold text-zinc-300">
                        Sin devoluciones registradas
                      </p>
                      <p className="text-[11px] text-zinc-500 max-w-xs mx-auto">
                        Cuando anules o devuelvas productos de un ticket, aparecerán aquí con su folio, responsable y motivo.
                      </p>
                    </div>
                  ) : (
                    processedReturns.map(retSale => (
                      <div
                        key={retSale.id}
                        className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs sm:text-sm text-amber-400">
                              {retSale.folio}
                            </span>
                            {getStatusBadge(retSale)}
                            {getMethodBadge(retSale.paymentMethod)}
                          </div>
                          <p className="text-xs text-white font-semibold">
                            Cliente: {retSale.clientName}
                          </p>
                          <p className="text-[11px] text-zinc-400">
                            <strong>Motivo:</strong> {retSale.voidReason}
                          </p>
                          {retSale.refundedItems && retSale.refundedItems.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {retSale.refundedItems.map(ri => (
                                <span
                                  key={ri.productId}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
                                >
                                  +{ri.quantity} {ri.productName} (Stock restaurado)
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="text-left sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 border-white/[0.06] pt-2 sm:pt-0">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                              Reembolsado
                            </span>
                            <span className="text-base font-black font-mono text-red-400">
                              -${(retSale.refundedAmount || retSale.total).toFixed(2)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onReprintSale(retSale)}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 text-[11px] font-bold flex items-center gap-1 border border-white/[0.08]"
                          >
                            <Printer className="w-3 h-3 text-amber-400" />
                            <span>Ver Ticket</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};
