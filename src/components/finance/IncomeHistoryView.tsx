import React, { useState, useRef, useEffect } from 'react';
import { useGym } from '../../context/GymContext';
import { Sale, PaymentMethod } from '../../types';
import { 
  TrendingUp, 
  Search, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Calendar, 
  CalendarDays,
  Clock,
  Filter, 
  Download, 
  FileText, 
  CheckCircle2, 
  Dumbbell, 
  ShoppingBag,
  UserCheck,
  Eye,
  X,
  Printer,
  ChevronDown,
  Check,
  Layers
} from 'lucide-react';
import { ReceiptModal } from '../pos/ReceiptModal';
import { exportIncomeReportToExcel } from '../../utils/excelExport';
import { getSaleItemLabel, toSafeNumber } from '../../utils/saleNormalizer';

type PeriodFilterType = 'all' | 'today' | 'month' | 'year';

const INCOME_PERIOD_OPTIONS: Array<{
  id: PeriodFilterType;
  label: string;
  periodLabel: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}> = [
  {
    id: 'all',
    label: 'Todos los periodos',
    periodLabel: 'Histórico Completo',
    subtitle: 'Historial completo',
    icon: Layers,
    iconBg: 'bg-zinc-800/80 border-zinc-700/70',
    iconColor: 'text-zinc-300',
  },
  {
    id: 'today',
    label: 'Por Día',
    periodLabel: 'Hoy',
    subtitle: 'Cobros de hoy',
    icon: Clock,
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    id: 'month',
    label: 'Por Mes',
    periodLabel: 'Este Mes',
    subtitle: 'Mes actual',
    icon: Calendar,
    iconBg: 'bg-teal-500/15 border-teal-500/30',
    iconColor: 'text-teal-400',
  },
  {
    id: 'year',
    label: 'Por Año',
    periodLabel: 'Este Año',
    subtitle: 'Año actual',
    icon: CalendarDays,
    iconBg: 'bg-purple-500/15 border-purple-500/30',
    iconColor: 'text-purple-400',
  },
];

function isSaleInPeriod(saleTimestamp: string, period: PeriodFilterType, now = new Date()): boolean {
  if (period === 'all') return true;
  const saleTime = new Date(saleTimestamp).getTime();
  if (isNaN(saleTime)) return true;

  const nowTime = now.getTime();
  const diffMs = nowTime - saleTime;
  const saleDate = new Date(saleTimestamp);

  if (period === 'today') {
    return (
      saleDate.getDate() === now.getDate() &&
      saleDate.getMonth() === now.getMonth() &&
      saleDate.getFullYear() === now.getFullYear()
    );
  }
  if (period === 'month') {
    const isCurrentMonth =
      saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    return (diffMs >= -60000 && diffMs <= 30 * 24 * 60 * 60 * 1000) || isCurrentMonth;
  }
  if (period === 'year') {
    const isCurrentYear = saleDate.getFullYear() === now.getFullYear();
    return (diffMs >= -60000 && diffMs <= 365 * 24 * 60 * 60 * 1000) || isCurrentYear;
  }
  return true;
}

const PAYMENT_METHOD_FILTERS = [
  { id: 'cash', label: 'Efectivo', activeClass: 'bg-emerald-500 text-black' },
  { id: 'card', label: 'Tarjeta', activeClass: 'bg-blue-500 text-white' },
  { id: 'transfer', label: 'Transfer', activeClass: 'bg-purple-500 text-white' },
] as const;

export const IncomeHistoryView: React.FC = () => {
  const { sales, todaySalesTotal, cashSession, gymSettings } = useGym();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'membership' | 'store'>('all');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('all');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPeriodDropdownOpen(false);
      }
    };

    if (isPeriodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPeriodDropdownOpen]);

  const safeSales = Array.isArray(sales) ? sales.filter(Boolean) : [];

  const periodSummaries = INCOME_PERIOD_OPTIONS.map((option) => {
    const matching = safeSales.filter((s) => isSaleInPeriod(s.timestamp || '', option.id));
    return {
      ...option,
      count: matching.length,
      total: matching.reduce((acc, s) => acc + toSafeNumber(s.total), 0),
    };
  });

  const activePeriodMeta = periodSummaries.find((p) => p.id === periodFilter) || periodSummaries[0];
  const ActivePeriodIcon = activePeriodMeta.icon;

  // Totales del periodo seleccionado
  const periodSales = safeSales.filter(s => isSaleInPeriod(s.timestamp || '', periodFilter));
  const periodTotalSales = periodSales.reduce((acc, s) => acc + toSafeNumber(s.total), 0);
  const periodCash = periodSales.filter(s => s.paymentMethod === 'cash').reduce((acc, s) => acc + toSafeNumber(s.total), 0);
  const periodCard = periodSales.filter(s => s.paymentMethod === 'card').reduce((acc, s) => acc + toSafeNumber(s.total), 0);
  const periodTransfer = periodSales.filter(s => s.paymentMethod === 'transfer').reduce((acc, s) => acc + toSafeNumber(s.total), 0);
  const periodAverageTicket = periodSales.length > 0 ? Math.round(periodTotalSales / periodSales.length) : 0;

  const periodLabel = activePeriodMeta.periodLabel;

  const normalizedQuery = searchTerm.toLowerCase();
  const filteredSales = safeSales.filter(s => {
    const matchesPeriod = isSaleInPeriod(s.timestamp || '', periodFilter);
    const itemNames = Array.isArray(s.items)
      ? s.items.map(i => getSaleItemLabel(i, '')).join(' ').toLowerCase()
      : '';
    const matchesSearch = (s.folio || '').toLowerCase().includes(normalizedQuery) ||
                          (s.clientName || '').toLowerCase().includes(normalizedQuery) ||
                          (s.cashierName || '').toLowerCase().includes(normalizedQuery) ||
                          itemNames.includes(normalizedQuery) ||
                          Boolean(s.planName && String(s.planName).toLowerCase().includes(normalizedQuery));
    const matchesMethod = methodFilter === 'all' || s.paymentMethod === methodFilter;
    const matchesType = typeFilter === 'all' || 
                        (typeFilter === 'membership' && s.saleType === 'membership') ||
                        (typeFilter === 'store' && s.saleType !== 'membership');
    return matchesPeriod && matchesSearch && matchesMethod && matchesType;
  });

  const handleExportToExcel = () => {
    if (filteredSales.length === 0) {
      alert('No hay cobros en este periodo o filtro para generar el reporte.');
      return;
    }
    exportIncomeReportToExcel(filteredSales, periodLabel, gymSettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500/20 via-gym-card to-gym-surface p-6 rounded-2xl border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                AUDITORÍA DE INGRESOS & COBROS
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-emerald-400" />
              Historial de Ingresos y Facturación
            </h1>
            <p className="text-xs text-gym-muted mt-1 max-w-xl">
              Registro consolidado de cobro de membresías, pases diarios y ventas en el punto de venta.
            </p>
          </div>

          <div className="text-right bg-gym-surface/80 px-4 py-2 rounded-xl border border-gym-border">
            <span className="text-[11px] text-gym-muted uppercase font-bold block">Gimnasio</span>
            <span className="text-sm font-black text-emerald-400">LEYENDS FITNESS</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Ingresos Periodo */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase truncate max-w-[170px]" title={periodLabel}>
              Ingresos ({periodLabel})
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400">
              ${periodTotalSales.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">{periodSales.length} cobro(s) en este periodo</p>
        </div>

        {/* Efectivo en Caja */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase truncate max-w-[170px]">
              Cobrado en Efectivo
            </span>
            <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">
              ${periodCash.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">En resguardo de gaveta ({periodFilter === 'all' ? 'todo' : periodLabel})</p>
        </div>

        {/* Tarjeta & Bancario */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase truncate max-w-[170px]">
              Terminal & SPEI
            </span>
            <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-400">
              ${(periodCard + periodTransfer).toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Abonos directos a cuenta bancaria</p>
        </div>

        {/* Ticket Promedio */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase truncate max-w-[170px]">
              Ticket Promedio
            </span>
            <ShoppingBag className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">
              ${periodAverageTicket.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Monto medio por transacción</p>
        </div>

      </div>

      {/* Filtros & Búsqueda */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-gym-card p-3 rounded-2xl border border-gym-border shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por folio, atleta o cajero..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gym-surface border border-gym-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gym-muted focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Type, Period & Method Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Dropdown de Periodo (Día, Mes, Año, Todos) */}
          <div className="relative shrink-0" ref={periodDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className={`w-full sm:w-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 shadow-sm ${
                periodFilter !== 'all'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : isPeriodDropdownOpen
                  ? 'bg-gym-surface border-zinc-500 text-white shadow-md'
                  : 'bg-gym-surface hover:bg-gym-surface/80 border-gym-border text-zinc-300 hover:text-white'
              }`}
              title="Filtrar ingresos por día, mes o año"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                  periodFilter === 'all'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : `${activePeriodMeta.iconBg} ${activePeriodMeta.iconColor}`
                }`}>
                  <ActivePeriodIcon className="w-3.5 h-3.5" />
                </div>

                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Periodo
                  </span>
                  <span className="text-xs font-black text-white truncate max-w-[160px]">
                    {activePeriodMeta.label}
                  </span>
                </div>

                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 border ${
                  periodFilter !== 'all'
                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-sm'
                    : 'bg-zinc-800/90 text-zinc-300 border-zinc-700/80'
                }`}>
                  {activePeriodMeta.count}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {periodFilter !== 'all' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setPeriodFilter('all');
                    }}
                    className="p-1 rounded-md hover:bg-emerald-500/25 text-emerald-400 hover:text-white transition-colors cursor-pointer"
                    title="Mostrar todos los periodos"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${isPeriodDropdownOpen ? 'rotate-180 text-white' : ''}`} />
              </div>
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[340px] bg-[#121317] border border-zinc-800/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-800/80 mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] uppercase font-extrabold tracking-wider text-zinc-300">
                      Filtrar por Periodo
                    </span>
                  </div>
                  {periodFilter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPeriodFilter('all');
                        setIsPeriodDropdownOpen(false);
                      }}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Restablecer</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Día / Mes / Año
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {periodSummaries.map((option) => {
                    const isSelected = periodFilter === option.id;
                    const OptionIcon = option.icon;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setPeriodFilter(option.id);
                          setIsPeriodDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all group border ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-white font-bold shadow-sm'
                            : 'border-transparent hover:bg-zinc-800/60 hover:border-zinc-700/50 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${option.iconBg} ${option.iconColor} group-hover:scale-105`}>
                            <OptionIcon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col leading-tight truncate">
                            <span className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                              {option.label}
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {option.subtitle}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <div className="text-right leading-tight">
                            <span className={`font-mono font-bold text-[11px] block ${option.total > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                              +${option.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {option.count} {option.count === 1 ? 'cobro' : 'cobros'}
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-zinc-800/80 px-2 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                  <span>Total del periodo activo</span>
                  <span className="font-bold text-emerald-400">
                    +${activePeriodMeta.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1 bg-gym-surface p-1 rounded-xl border border-gym-border">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                typeFilter === 'all'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('membership')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                typeFilter === 'membership'
                  ? 'bg-purple-500 text-white'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              <Dumbbell className="w-3 h-3" />
              <span>Membresías</span>
            </button>
            <button
              onClick={() => setTypeFilter('store')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                typeFilter === 'store'
                  ? 'bg-amber-500 text-black'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Punto Venta</span>
            </button>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1 bg-gym-surface p-1 rounded-xl border border-gym-border">
            {PAYMENT_METHOD_FILTERS.map((method) => {
              const isActive = methodFilter === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => setMethodFilter(prev => (prev === method.id ? 'all' : method.id))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    isActive
                      ? method.activeClass
                      : 'text-gym-muted hover:text-white'
                  }`}
                  title={isActive ? 'Clic para mostrar todos los métodos' : `Filtrar por ${method.label}`}
                >
                  {method.label}
                </button>
              );
            })}
          </div>

          {/* Botón Descargar Reporte Detallado */}
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
            title={`Descargar reporte detallado de ingresos (${periodLabel}) en Excel (.xlsx)`}
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Descargar Reporte</span>
          </button>
        </div>

      </div>

      {/* Resumen del periodo activo y contador de cobros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-sm">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-extrabold text-white text-sm sm:text-base">Detalle de Cobros:</span>
          <span className="px-3 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-xs sm:text-sm inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            {periodLabel}
          </span>
          <span className="text-gym-muted text-xs sm:text-sm font-medium">
            ({filteredSales.length} {filteredSales.length === 1 ? 'cobro encontrado' : 'cobros encontrados'})
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-gym-muted text-xs sm:text-sm">
          <span>Total en vista:</span>
          <span className="text-emerald-400 font-mono font-black text-base sm:text-lg">
            ${filteredSales.reduce((acc, s) => acc + toSafeNumber(s.total), 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </span>
        </div>
      </div>

      {/* Tabla de Ingresos */}
      <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gym-surface/80 border-b border-gym-border text-zinc-300 uppercase font-extrabold text-[11px] xl:text-xs tracking-wider">
              <tr>
                <th className="py-3.5 px-3 xl:px-4 whitespace-nowrap">Fecha</th>
                <th className="py-3.5 px-3 xl:px-4 whitespace-nowrap">Tipo</th>
                <th className="py-3.5 px-3 xl:px-4">Detalle de Cobro</th>
                <th className="py-3.5 px-3 xl:px-4 whitespace-nowrap">Método de Pago</th>
                <th className="py-3.5 px-3 xl:px-4 whitespace-nowrap">Cajero</th>
                <th className="py-3.5 px-3 xl:px-4 text-right whitespace-nowrap">Total Cobrado</th>
                <th className="py-3.5 px-3 xl:px-4 text-center whitespace-nowrap">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/50">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gym-muted">
                    <Clock className="w-10 h-10 mx-auto text-gym-muted/40 mb-3" />
                    <p className="font-bold text-gray-300 text-base">
                      No se encontraron cobros registrados en {periodLabel.toLowerCase()}.
                    </p>
                    <p className="text-xs sm:text-sm text-gym-muted mt-1.5">
                      Puedes cambiar el filtro de tiempo a &quot;Todo&quot; o seleccionar otro periodo (Hoy, Mes, Año).
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale, idx) => {
                  const dateObj = new Date(sale.timestamp || '');
                  const hasValidDate = !isNaN(dateObj.getTime());
                  const saleItems = Array.isArray(sale.items) ? sale.items : [];
                  const itemsCount = saleItems.reduce((acc, i) => acc + toSafeNumber(i?.quantity, 1), 0);
                  const itemsSummary = saleItems.length > 0
                    ? saleItems.map(i => `${toSafeNumber(i?.quantity, 1)}x ${getSaleItemLabel(i, sale.planName || 'Artículo')}`).join(', ')
                    : sale.planName || 'Cobro registrado';
                  const isMembership = sale.saleType === 'membership';

                  return (
                    <tr key={sale.id || idx} className="hover:bg-gym-surface/40 transition-colors">
                      <td className="py-3.5 px-3 xl:px-4 whitespace-nowrap">
                        <div className="font-bold text-sm text-white">
                          {hasValidDate ? dateObj.toLocaleDateString('es-MX') : 'Sin fecha'}
                        </div>
                        <span className="text-xs text-gym-muted">
                          {hasValidDate ? dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 xl:px-4 whitespace-nowrap">
                        {isMembership ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] xl:text-xs font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <Dumbbell className="w-3.5 h-3.5" />
                            Membresía
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] xl:text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            Punto Venta
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 xl:px-4 min-w-[180px]">
                        <div className="font-semibold text-sm text-gray-200">
                          {itemsCount} artículo(s)
                        </div>
                        <p className="text-xs sm:text-[13px] text-zinc-400 line-clamp-2 leading-snug max-w-[240px] lg:max-w-[280px] xl:max-w-[320px] 2xl:max-w-[400px] mt-0.5" title={itemsSummary}>
                          {itemsSummary}
                        </p>
                      </td>

                      <td className="py-3.5 px-3 xl:px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {sale.paymentMethod === 'cash' && <Banknote className="w-4 h-4 text-emerald-400" />}
                          {sale.paymentMethod === 'card' && <CreditCard className="w-4 h-4 text-blue-400" />}
                          {sale.paymentMethod === 'transfer' && <DollarSign className="w-4 h-4 text-purple-400" />}
                          <span className="capitalize font-semibold text-sm text-gray-200">
                            {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 xl:px-4 text-zinc-300 font-medium text-sm">
                        {sale.cashierName || 'Recepción Mostrador'}
                      </td>

                      <td className="py-3.5 px-3 xl:px-4 text-right whitespace-nowrap">
                        <span className="font-mono font-black text-sm xl:text-base text-emerald-400">
                          ${toSafeNumber(sale.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 xl:px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          className="px-3 py-1.5 xl:px-3.5 xl:py-2 rounded-xl bg-gym-surface hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-400 border border-gym-border hover:border-emerald-500/30 transition-all inline-flex items-center gap-1.5"
                          title="Reimprimir o ver ticket"
                        >
                          <Printer className="w-4 h-4" />
                          <span className="text-xs font-bold">Ticket</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reimpresión de Ticket */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}

    </div>
  );
};
