import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGym } from '../../context/GymContext';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { 
  Receipt, 
  Plus, 
  Search, 
  DollarSign, 
  TrendingDown, 
  Calendar, 
  CreditCard, 
  Banknote, 
  Building2, 
  Tag, 
  Trash2, 
  FileText,
  AlertCircle,
  X,
  Filter,
  ChevronDown,
  Check,
  Layers,
  Zap,
  Wrench,
  Package,
  Users,
  Megaphone,
  Sparkles,
  Clock,
  ShieldCheck,
  ArrowDownRight,
  Flame,
  User,
  SlidersHorizontal,
  Info
} from 'lucide-react';

export const ExpensesManager: React.FC = () => {
  const { 
    expenses, 
    addExpense, 
    deleteExpense, 
    todayExpensesTotal, 
    monthExpensesTotal, 
    cashSession,
    currentRole 
  } = useGym();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Close category dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isCategoryDropdownOpen]);

  // Nuevo gasto form state
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ExpenseCategory>('equipment');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidFromCashRegister, setPaidFromCashRegister] = useState(true);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  const categoryLabels: Record<ExpenseCategory, { 
    label: string; 
    shortLabel: string;
    description: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    glowColor: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
  }> = {
    equipment: { 
      label: 'Mantenimiento de Equipo', 
      shortLabel: 'Mantenimiento',
      description: 'Poleas, cables, bandas y máquinas',
      badgeBg: 'bg-cyan-500/10',
      badgeBorder: 'border-cyan-500/30',
      badgeText: 'text-cyan-400',
      glowColor: 'shadow-[0_0_15px_rgba(6,182,212,0.2)]',
      icon: Wrench,
      iconBg: 'bg-cyan-500/20 border-cyan-500/40',
      iconColor: 'text-cyan-400'
    },
    utilities: { 
      label: 'Luz & Aire Acondicionado', 
      shortLabel: 'Luz & Clima',
      description: 'CFE, agua comercial y climatización',
      badgeBg: 'bg-amber-500/10',
      badgeBorder: 'border-amber-500/30',
      badgeText: 'text-amber-400',
      glowColor: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]',
      icon: Zap,
      iconBg: 'bg-amber-500/20 border-amber-500/40',
      iconColor: 'text-amber-400'
    },
    payroll: { 
      label: 'Nómina & Sueldos', 
      shortLabel: 'Nómina',
      description: 'Entrenadores, limpieza y recepción',
      badgeBg: 'bg-rose-500/10',
      badgeBorder: 'border-rose-500/30',
      badgeText: 'text-rose-400',
      glowColor: 'shadow-[0_0_15px_rgba(244,63,94,0.2)]',
      icon: Users,
      iconBg: 'bg-rose-500/20 border-rose-500/40',
      iconColor: 'text-rose-400'
    },
    supplements_stock: { 
      label: 'Compra Suplementos', 
      shortLabel: 'Suplementos',
      description: 'Proteínas, creatinas, bebidas y snacks',
      badgeBg: 'bg-emerald-500/10',
      badgeBorder: 'border-emerald-500/30',
      badgeText: 'text-emerald-400',
      glowColor: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
      icon: Package,
      iconBg: 'bg-emerald-500/20 border-emerald-500/40',
      iconColor: 'text-emerald-400'
    },
    cleaning: { 
      label: 'Insumos de Limpieza', 
      shortLabel: 'Limpieza',
      description: 'Sanitizante, toallas de papel y jabón',
      badgeBg: 'bg-teal-500/10',
      badgeBorder: 'border-teal-500/30',
      badgeText: 'text-teal-400',
      glowColor: 'shadow-[0_0_15px_rgba(20,184,166,0.2)]',
      icon: Sparkles,
      iconBg: 'bg-teal-500/20 border-teal-500/40',
      iconColor: 'text-teal-400'
    },
    rent: { 
      label: 'Renta de Local', 
      shortLabel: 'Renta',
      description: 'Arrendamiento de instalaciones',
      badgeBg: 'bg-purple-500/10',
      badgeBorder: 'border-purple-500/30',
      badgeText: 'text-purple-400',
      glowColor: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',
      icon: Building2,
      iconBg: 'bg-purple-500/20 border-purple-500/40',
      iconColor: 'text-purple-400'
    },
    marketing: { 
      label: 'Marketing & Redes', 
      shortLabel: 'Marketing',
      description: 'Campañas, flyers y publicidad',
      badgeBg: 'bg-pink-500/10',
      badgeBorder: 'border-pink-500/30',
      badgeText: 'text-pink-400',
      glowColor: 'shadow-[0_0_15px_rgba(236,72,153,0.2)]',
      icon: Megaphone,
      iconBg: 'bg-pink-500/20 border-pink-500/40',
      iconColor: 'text-pink-400'
    },
    other: { 
      label: 'Otros Gastos', 
      shortLabel: 'Otros',
      description: 'Gastos imprevistos de operación',
      badgeBg: 'bg-zinc-500/10',
      badgeBorder: 'border-zinc-500/30',
      badgeText: 'text-zinc-400',
      glowColor: 'shadow-[0_0_15px_rgba(161,161,170,0.1)]',
      icon: Tag,
      iconBg: 'bg-zinc-500/20 border-zinc-500/40',
      iconColor: 'text-zinc-400'
    }
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0 || !description.trim()) return;

    addExpense({
      date: new Date().toISOString(),
      category,
      description: description.trim(),
      amount: Number(amount),
      paymentMethod,
      paidFromCashRegister,
      registeredBy: currentRole === 'admin' ? 'Administrador' : 'Recepcionista en turno',
      receiptNumber: receiptNumber.trim() || undefined,
      branchId: 'main-gym',
      notes: notes.trim() || undefined
    });

    // Reset form
    setAmount('');
    setDescription('');
    setReceiptNumber('');
    setNotes('');
    setIsModalOpen(false);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (e.receiptNumber && e.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  }, [filteredExpenses]);

  // Average expense calculation
  const averageExpense = useMemo(() => {
    if (expenses.length === 0) return 0;
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    return total / expenses.length;
  }, [expenses]);

  return (
    <div className="relative min-h-full space-y-6 pb-12 select-none">

      {/* Atmospheric Background Glows (VoltFit & Fitlife aesthetic) */}
      <div className="pointer-events-none absolute -top-16 left-1/4 w-[500px] h-64 bg-red-600/10 rounded-full blur-[100px] -z-10" />
      <div className="pointer-events-none absolute top-40 right-10 w-[400px] h-64 bg-amber-500/5 rounded-full blur-[90px] -z-10" />

      {/* HERO BANNER CARD - High Contrast Athletic Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800/90 bg-gradient-to-r from-[#171923]/95 via-[#13141a]/95 to-[#0b0c10]/98 p-6 sm:p-7 shadow-[0_15px_45px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
        {/* Subtle Carbon Mesh Grid Texture */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
            backgroundSize: '18px 18px'
          }}
        />

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/80 to-transparent" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            {/* Live Operational Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/25 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400 font-mono">
                CONTROL FINANCIERO • EGRESOS OPERATIVOS
              </span>
            </div>

            {/* Title with Glowing Athletic Icon */}
            <div className="flex items-center gap-3.5 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/25 via-red-600/10 to-transparent border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.35)] shrink-0">
                <Receipt className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase flex items-center gap-2">
                  Registro de Gastos Operativos
                </h1>
                <p className="text-xs text-zinc-400 font-medium max-w-2xl mt-0.5">
                  Auditoría y control de salidas de dinero para mantenimiento de pesas/cardio, servicios comerciales (luz CFE, clima), suplementación y caja chica.
                </p>
              </div>
            </div>

            {/* Micro Metrics Strip inside Header */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] font-mono text-zinc-400">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                <span>Registros totales: <strong className="text-zinc-200">{expenses.length}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                <span>Egresos del mes: <strong className="text-red-400">-${monthExpensesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong></span>
              </div>
              {expenses.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Promedio por gasto: <strong className="text-amber-300">${averageExpense.toLocaleString('es-MX', { maximumFractionDigits: 0 })} MXN</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button: Registrar Gasto */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="group relative px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.45)] hover:shadow-[0_0_35px_rgba(239,68,68,0.7)] transition-all duration-300 flex items-center gap-2.5 border border-red-400/40 hover:scale-[1.02] active:scale-95"
            >
              <div className="w-5 h-5 rounded-lg bg-black/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span>Registrar Gasto</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI METRIC CARDS - VoltFit Glassmorphism Style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Gastos Registrados Hoy */}
        <div className="group relative rounded-2xl border border-red-500/25 bg-gradient-to-br from-red-500/10 via-[#14151b]/80 to-[#0e0f14]/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:border-red-500/50 hover:shadow-[0_0_25px_rgba(239,68,68,0.2)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-red-300/80 font-mono">
                GASTOS DE HOY
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)] group-hover:scale-110 transition-transform">
              <TrendingDown className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-red-400 font-mono tracking-tight flex items-baseline gap-1">
              <span>-${todayExpensesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span className="text-xs font-bold text-red-400/70 font-sans">MXN</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-red-400" />
              Impacto en arqueo diario
            </span>
            <span className="font-mono text-[10px] text-red-300/80 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
              Hoy
            </span>
          </div>
        </div>

        {/* Card 2: Egresos del Mes */}
        <div className="group relative rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-[#14151b]/80 to-[#0e0f14]/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300/80 font-mono">
                EGRESOS DEL MES
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)] group-hover:scale-110 transition-transform">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight flex items-baseline gap-1">
              <span>-${monthExpensesTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span className="text-xs font-bold text-zinc-400 font-sans">MXN</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5 truncate">
              <Calendar className="w-3 h-3 text-amber-400 shrink-0" />
              Mantenimiento + Insumos
            </span>
            <span className="font-mono text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0">
              Mes en curso
            </span>
          </div>
        </div>

        {/* Card 3: Efectivo Disponible en Caja Chica */}
        <div className="group relative rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-[#14151b]/80 to-[#0e0f14]/90 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl hover:border-emerald-500/50 hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300/80 font-mono">
                DISPONIBLE EN CAJA
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)] group-hover:scale-110 transition-transform">
              <Banknote className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono tracking-tight flex items-baseline gap-1">
              <span>${cashSession.expectedCash.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              <span className="text-xs font-bold text-emerald-400/70 font-sans">MXN</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Caja Principal • Turno activo
            </span>
            <span className="font-mono text-[10px] text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              En Vivo
            </span>
          </div>
        </div>

      </div>

      {/* FILTER & SEARCH TOOLBAR WITH QUICK CATEGORY CHIPS */}
      <div className="rounded-2xl border border-zinc-800/90 bg-[#121319]/90 p-4 shadow-xl backdrop-blur-xl space-y-3.5">
        
        {/* Top Filter Controls: Category dropdown + Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Category Dropdown (Compact/Select Option) */}
          <div className="relative shrink-0" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className={`w-full md:w-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 shadow-sm ${
                categoryFilter !== 'all'
                  ? 'bg-red-500/15 border-red-500/50 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                  : isCategoryDropdownOpen
                  ? 'bg-zinc-800/90 border-zinc-600 text-white'
                  : 'bg-zinc-900/90 hover:bg-zinc-800/90 border-zinc-800 text-zinc-300 hover:text-white'
              }`}
              title="Filtrar gastos por categoría"
            >
              <div className="flex items-center gap-2.5 truncate">
                {/* Dynamic Category Icon Box */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                  categoryFilter === 'all'
                    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : `${categoryLabels[categoryFilter as ExpenseCategory]?.iconBg} ${categoryLabels[categoryFilter as ExpenseCategory]?.iconColor}`
                }`}>
                  {categoryFilter === 'all' ? (
                    <Layers className="w-3.5 h-3.5" />
                  ) : (
                    (() => {
                      const IconComp = categoryLabels[categoryFilter as ExpenseCategory]?.icon || Tag;
                      return <IconComp className="w-3.5 h-3.5" />;
                    })()
                  )}
                </div>

                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    Categoría
                  </span>
                  <span className="text-xs font-black text-white truncate max-w-[170px]">
                    {categoryFilter === 'all'
                      ? 'Todas las categorías'
                      : categoryLabels[categoryFilter as ExpenseCategory]?.label || categoryFilter}
                  </span>
                </div>

                {/* Counter Badge */}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 border ${
                  categoryFilter !== 'all'
                    ? 'bg-red-500 text-white border-red-400 shadow-sm'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}>
                  {categoryFilter === 'all'
                    ? expenses.length
                    : expenses.filter(e => e.category === categoryFilter).length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {categoryFilter !== 'all' && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryFilter('all');
                    }}
                    className="p-1 rounded-md hover:bg-red-500/25 text-red-400 hover:text-white transition-colors cursor-pointer"
                    title="Mostrar todas las categorías"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${isCategoryDropdownOpen ? 'rotate-180 text-white' : ''}`} />
              </div>
            </button>

            {/* Dropdown Menu Modal */}
            {isCategoryDropdownOpen && (
              <div className="absolute left-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[490px] md:w-[510px] bg-[#121319] border border-zinc-800/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-3 z-50 animate-in fade-in zoom-in-95 backdrop-blur-2xl">
                {/* Dropdown Header */}
                <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-800 mb-2">
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[11px] uppercase font-extrabold tracking-wider text-zinc-300">
                      Filtrar por Categoría
                    </span>
                  </div>
                  {categoryFilter !== 'all' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter('all');
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      <span>Restablecer</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-mono">
                      8 categorías
                    </span>
                  )}
                </div>

                {/* Option: All */}
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter('all');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all group border mb-2 ${
                    categoryFilter === 'all'
                      ? 'bg-red-500/15 border-red-500/40 text-white font-bold shadow-sm'
                      : 'border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700/50 text-zinc-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                      categoryFilter === 'all'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/70 group-hover:text-red-400 group-hover:border-red-500/40'
                    }`}>
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className={`font-bold ${categoryFilter === 'all' ? 'text-white' : 'text-zinc-200 group-hover:text-white'}`}>
                      Todas las categorías
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                      categoryFilter === 'all'
                        ? 'bg-red-500/30 text-red-200 border-red-500/40'
                        : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/70'
                    }`}>
                      {expenses.length}
                    </span>
                    {categoryFilter === 'all' && (
                      <Check className="w-3.5 h-3.5 text-red-400 stroke-[3]" />
                    )}
                  </div>
                </button>

                {/* Grid 2 Columns of Categories */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[60vh] sm:max-h-none overflow-y-auto sm:overflow-visible pr-0.5 custom-scrollbar">
                  {Object.entries(categoryLabels).map(([catKey, catMeta]) => {
                    const count = expenses.filter(e => e.category === catKey).length;
                    const isSelected = categoryFilter === catKey;
                    const IconComponent = catMeta.icon;

                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(catKey);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all group border ${
                          isSelected
                            ? 'bg-red-500/15 border-red-500/40 text-white font-bold shadow-sm'
                            : 'border-transparent hover:bg-zinc-800/60 hover:border-zinc-700/50 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 truncate">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                            catMeta.iconBg
                          } ${catMeta.iconColor} group-hover:scale-105`}>
                            <IconComponent className="w-3 h-3" />
                          </div>
                          
                          <span className={`font-semibold text-xs truncate ${
                            isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                          }`}>
                            {catMeta.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold border transition-colors ${
                            isSelected
                              ? 'bg-red-500/30 text-red-200 border-red-500/40'
                              : count > 0
                              ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                              : 'bg-zinc-900/50 text-zinc-500 border-zinc-800/40'
                          }`}>
                            {count}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-red-400 stroke-[3]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Search Input Bar */}
          <div className="flex items-center gap-2 flex-1 md:justify-end">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                type="text"
                placeholder="Buscar por folio, concepto o factura..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none transition-all shadow-inner"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800 transition-colors"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Reset Filters button if any filter is active */}
            {(categoryFilter !== 'all' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter('all');
                  setSearchTerm('');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-bold transition-all whitespace-nowrap shadow-sm flex items-center gap-1.5"
                title="Restablecer filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>
            )}
          </div>

        </div>

        {/* BOTTOM: Horizontal Quick-Filter Category Pills */}
        <div className="pt-2 border-t border-zinc-800/70">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
            {/* 'Todas' Pill */}
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                categoryFilter === 'all'
                  ? 'bg-red-500/20 border-red-500/60 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] ring-1 ring-red-500/30'
                  : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-red-400" />
              <span>Todas</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold border ${
                categoryFilter === 'all' ? 'bg-red-500/30 text-white border-red-400/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}>
                {expenses.length}
              </span>
            </button>

            {/* Category Pills */}
            {Object.entries(categoryLabels).map(([catKey, catMeta]) => {
              const isSelected = categoryFilter === catKey;
              const count = expenses.filter(e => e.category === catKey).length;
              const IconComp = catMeta.icon;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setCategoryFilter(catKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 border ${
                    isSelected
                      ? `${catMeta.badgeBg} ${catMeta.badgeBorder} ${catMeta.badgeText} ${catMeta.glowColor} ring-1 ring-current`
                      : 'bg-zinc-900/60 hover:bg-zinc-800/80 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${isSelected ? catMeta.iconColor : 'text-zinc-400'}`} />
                  <span>{catMeta.shortLabel}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold border ${
                    isSelected 
                      ? 'bg-white/20 text-white border-white/30' 
                      : count > 0 
                      ? 'bg-zinc-800 text-zinc-300 border-zinc-700' 
                      : 'bg-zinc-900/80 text-zinc-500 border-zinc-800'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filter Summary Strip */}
        <div className="pt-2 border-t border-zinc-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-zinc-400 font-mono">
          <div>
            Mostrando <strong className="text-white font-bold">{filteredExpenses.length}</strong> de <strong className="text-white font-bold">{expenses.length}</strong> gastos registrados
          </div>
          
          <div className="flex items-center gap-2">
            <span>Suma de gastos filtrados:</span>
            <span className="font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/25 font-mono">
              -${filteredTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
            </span>
          </div>
        </div>

      </div>

      {/* EXPENSES DATA TABLE - Textured Carbon Table with Smooth Hover */}
      <div className="rounded-3xl border border-zinc-800/90 bg-[#121319]/90 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 uppercase font-black text-[10px] tracking-wider">
                <th className="py-4 px-5">Folio / Fecha</th>
                <th className="py-4 px-4">Categoría</th>
                <th className="py-4 px-5">Descripción del Gasto</th>
                <th className="py-4 px-4">Método de Pago</th>
                <th className="py-4 px-4">Registró</th>
                <th className="py-4 px-5 text-right">Importe</th>
                <th className="py-4 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center text-zinc-500 shadow-inner">
                        <Receipt className="w-7 h-7" />
                      </div>
                      <h4 className="font-bold text-white text-sm">No se encontraron egresos</h4>
                      <p className="text-xs text-zinc-400">
                        {searchTerm || categoryFilter !== 'all' 
                          ? 'No hay registros que coincidan con los filtros aplicados. Intenta restablecer los filtros.'
                          : 'Aún no se han registrado gastos en el sistema. Registra el primero para llevar la contabilidad.'}
                      </p>
                      {(searchTerm || categoryFilter !== 'all') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryFilter('all');
                            setSearchTerm('');
                          }}
                          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 transition-colors"
                        >
                          Limpiar Filtros
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(true)}
                          className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold text-xs shadow-md transition-colors"
                        >
                          + Registrar Primer Gasto
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const cat = categoryLabels[expense.category] || categoryLabels.other;
                  const IconComp = cat.icon;
                  const dateObj = new Date(expense.date);

                  return (
                    <tr 
                      key={expense.id} 
                      className="group hover:bg-gradient-to-r hover:from-red-500/[0.04] hover:via-white/[0.02] hover:to-transparent transition-all duration-150"
                    >
                      {/* Folio & Fecha */}
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-white bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-700/60 shadow-inner tracking-wider">
                            #{expense.folio}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          <span>{dateObj.toLocaleDateString('es-MX')}</span>
                          <span className="text-zinc-600">•</span>
                          <Clock className="w-3 h-3 text-zinc-500" />
                          <span>{dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>

                      {/* Categoría Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${cat.badgeBg} ${cat.badgeBorder} ${cat.badgeText} ${cat.glowColor}`}>
                          <IconComp className="w-3.5 h-3.5 shrink-0" />
                          <span>{cat.label}</span>
                        </span>
                      </td>

                      {/* Descripción & Factura */}
                      <td className="py-3.5 px-5 max-w-xs md:max-w-md">
                        <p className="font-bold text-zinc-100 text-xs leading-snug break-words" title={expense.description}>
                          {expense.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {expense.receiptNumber && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25 font-mono">
                              <FileText className="w-3 h-3" />
                              Doc: {expense.receiptNumber}
                            </span>
                          )}
                          {expense.notes && (
                            <span className="text-[10px] text-zinc-400 italic truncate max-w-[200px]" title={expense.notes}>
                              Nota: {expense.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Método de Pago */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {expense.paymentMethod === 'cash' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold text-xs">
                              <Banknote className="w-3.5 h-3.5" />
                              <span>Efectivo</span>
                            </span>
                          )}
                          {expense.paymentMethod === 'card' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/25 text-blue-400 font-bold text-xs">
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Tarjeta</span>
                            </span>
                          )}
                          {expense.paymentMethod === 'transfer' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/25 text-purple-400 font-bold text-xs">
                              <Building2 className="w-3.5 h-3.5" />
                              <span>SPEI</span>
                            </span>
                          )}
                        </div>

                        {expense.paidFromCashRegister && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/25">
                              <Zap className="w-3 h-3" />
                              Descontado de Caja
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Registró */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-zinc-300 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-300">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-xs">{expense.registeredBy}</span>
                        </div>
                      </td>

                      {/* Importe Negativo */}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <span className="inline-block font-mono font-black text-sm text-red-400 bg-red-500/10 px-3 py-1 rounded-xl border border-red-500/20 shadow-sm">
                          -${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (window.confirm(`¿Estás seguro de eliminar el gasto folio #${expense.folio} (${expense.description})?`)) {
                              deleteExpense(expense.id);
                            }
                          }}
                          className="p-2 rounded-xl text-zinc-500 hover:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 transition-all"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Bar */}
        <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span>Auditoría financiera Legends Gym</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Gastos listados: <strong className="text-white">{filteredExpenses.length}</strong></span>
            <span>Importe total: <strong className="text-red-400 font-bold">-${filteredTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</strong></span>
          </div>
        </div>
      </div>

      {/* MODAL REGISTRAR GASTO - Textured Frosted Glass */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-[#12141c] border border-zinc-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 overflow-hidden">
            
            {/* Top Crimson Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]">
                  <Receipt className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white tracking-tight uppercase">
                    Registrar Egreso Operativo
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Ingresa el monto y concepto del gasto del gimnasio
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              
              {/* Monto & Categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1.5 font-mono">
                    Monto ($ MXN) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-400 font-black text-base pointer-events-none">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl pl-8 pr-3 py-2.5 text-base text-white font-mono font-black focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-inner"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1.5 font-mono">
                    Categoría *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-inner cursor-pointer"
                  >
                    {Object.entries(categoryLabels).map(([catKey, catMeta]) => (
                      <option key={catKey} value={catKey} className="bg-zinc-900 text-white py-1">
                        {catMeta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1.5 font-mono">
                  Descripción / Concepto del Gasto *
                </label>
                <input 
                  type="text"
                  placeholder="Ej. Lubricación y ajuste de poleas y cables de máquinas matrix..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-inner placeholder-zinc-500"
                  required
                />
              </div>

              {/* Forma de Pago & Factura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1.5 font-mono">
                    Forma de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-3 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-inner cursor-pointer"
                  >
                    <option value="cash" className="bg-zinc-900 text-white">Efectivo</option>
                    <option value="transfer" className="bg-zinc-900 text-white">Transferencia SPEI</option>
                    <option value="card" className="bg-zinc-900 text-white">Tarjeta Débito/Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1.5 font-mono">
                    No. Factura / Ticket (Opcional)
                  </label>
                  <input 
                    type="text"
                    placeholder="Ej. FAC-88912"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 shadow-inner placeholder-zinc-500 font-mono"
                  />
                </div>
              </div>

              {/* Caja Chica Toggle Alert */}
              {paymentMethod === 'cash' && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                  <input 
                    type="checkbox"
                    id="paidFromCash"
                    checked={paidFromCashRegister}
                    onChange={(e) => setPaidFromCashRegister(e.target.checked)}
                    className="w-4 h-4 text-red-500 rounded bg-zinc-900 border-zinc-700 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="paidFromCash" className="text-xs text-amber-200/90 cursor-pointer font-medium leading-tight">
                    Descontar inmediatamente del efectivo en caja chica del turno activo
                  </label>
                </div>
              )}

              {/* Notas Adicionales */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-300 block mb-1.5 font-mono">
                  Notas / Observaciones del Proveedor
                </label>
                <textarea 
                  rows={2}
                  placeholder="Detalles sobre garantía, técnico autorizado, teléfono..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 resize-none shadow-inner placeholder-zinc-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all"
                >
                  Guardar Gasto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
