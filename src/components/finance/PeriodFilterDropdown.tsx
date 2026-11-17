import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  Clock,
  Layers,
  X,
} from 'lucide-react';
import {
  getAvailableYears,
  getPeriodDisplayLabel,
  isDateInPeriod,
  MONTH_OPTIONS,
  PeriodFilterType,
} from '../../utils/periodFilter';

export interface PeriodRecordItem {
  date: string;
  amount: number;
}

interface PeriodFilterDropdownProps {
  items: PeriodRecordItem[];
  periodFilter: PeriodFilterType;
  selectedMonth: number;
  selectedYear: number;
  onPeriodChange: (period: PeriodFilterType) => void;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onReset: () => void;
  variant: 'income' | 'expense';
  onBeforeOpen?: () => void;
}

const VARIANT_STYLES = {
  income: {
    triggerTitle: 'Filtrar ingresos por día, semana, mes o año',
    todaySubtitle: 'Cobros de hoy',
    unitSingular: 'cobro',
    unitPlural: 'cobros',
    amountPrefix: '+',
    amountText: 'text-emerald-400',
    activeTrigger: 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    defaultIconBox: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dayIconBg: 'bg-emerald-500/15 border-emerald-500/30',
    dayIconColor: 'text-emerald-400',
    activeBadge: 'bg-emerald-500 text-black border-emerald-400 shadow-sm',
    clearHover: 'hover:bg-emerald-500/25 text-emerald-400',
    headerIconColor: 'text-emerald-400',
    resetBtnColor: 'text-emerald-400 hover:text-emerald-300',
    activeOption: 'bg-emerald-500/15 border-emerald-500/40 text-white font-bold shadow-sm',
    activeCheck: 'text-emerald-400',
    subPanelBorder: 'border-emerald-500/25',
    subPanelHeading: 'text-emerald-400',
    subActiveBtn: 'bg-emerald-500 text-black border-emerald-400 font-black shadow-sm',
    subHasDataBtn: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/25 hover:bg-emerald-500/20 font-bold',
    subActiveCount: 'text-black/80 font-extrabold',
    subHasDataCount: 'text-emerald-400',
    applyBtn: 'bg-emerald-500 hover:bg-emerald-400 text-black',
  },
  expense: {
    triggerTitle: 'Filtrar gastos por día, semana, mes o año',
    todaySubtitle: 'Gastos de hoy',
    unitSingular: 'gasto',
    unitPlural: 'gastos',
    amountPrefix: '-',
    amountText: 'text-red-400',
    activeTrigger: 'bg-crimson-500/15 border-crimson-500/40 text-white shadow-[0_0_15px_rgba(225,29,56,0.15)]',
    defaultIconBox: 'bg-crimson-500/15 text-crimson-400 border-crimson-500/30',
    dayIconBg: 'bg-crimson-500/15 border-crimson-500/30',
    dayIconColor: 'text-crimson-400',
    activeBadge: 'bg-crimson-500 text-white border-crimson-400 shadow-sm',
    clearHover: 'hover:bg-crimson-500/25 text-crimson-400',
    headerIconColor: 'text-crimson-400',
    resetBtnColor: 'text-crimson-400 hover:text-crimson-300',
    activeOption: 'bg-crimson-500/15 border-crimson-500/40 text-white font-bold shadow-sm',
    activeCheck: 'text-crimson-400',
    subPanelBorder: 'border-crimson-500/25',
    subPanelHeading: 'text-crimson-400',
    subActiveBtn: 'bg-crimson-500 text-white border-crimson-400 font-black shadow-sm',
    subHasDataBtn: 'bg-crimson-500/10 text-crimson-200 border-crimson-500/25 hover:bg-crimson-500/20 font-bold',
    subActiveCount: 'text-white/90 font-extrabold',
    subHasDataCount: 'text-crimson-400',
    applyBtn: 'bg-crimson-500 hover:bg-crimson-400 text-white',
  },
} as const;

/**
 * Interactive period selector popover supporting All, Today, Last 7 Days, Month+Year, and Year.
 */
export const PeriodFilterDropdown: React.FC<PeriodFilterDropdownProps> = ({
  items,
  periodFilter,
  selectedMonth,
  selectedYear,
  onPeriodChange,
  onMonthChange,
  onYearChange,
  onReset,
  variant,
  onBeforeOpen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const theme = VARIANT_STYLES[variant];

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const availableYears = getAvailableYears(items.map((item) => item.date));
  const selectedMonthName = MONTH_OPTIONS[selectedMonth]?.name || 'Mes';

  const baseOptions: Array<{
    id: PeriodFilterType;
    label: string;
    subtitle: string;
    triggerLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
  }> = [
    {
      id: 'all',
      label: 'Todos los periodos',
      subtitle: 'Historial completo',
      triggerLabel: 'Todos los periodos',
      icon: Layers,
      iconBg: 'bg-zinc-800/80 border-zinc-700/70',
      iconColor: 'text-zinc-300',
    },
    {
      id: 'day',
      label: 'Por Día',
      subtitle: theme.todaySubtitle,
      triggerLabel: 'Por Día',
      icon: Clock,
      iconBg: theme.dayIconBg,
      iconColor: theme.dayIconColor,
    },
    {
      id: 'week',
      label: 'Por Semana',
      subtitle: 'Últimos 7 días',
      triggerLabel: 'Por Semana',
      icon: CalendarRange,
      iconBg: 'bg-blue-500/15 border-blue-500/30',
      iconColor: 'text-blue-400',
    },
    {
      id: 'month',
      label: 'Por Mes',
      subtitle: `${selectedMonthName} ${selectedYear}`,
      triggerLabel: `${selectedMonthName} ${selectedYear}`,
      icon: Calendar,
      iconBg: 'bg-teal-500/15 border-teal-500/30',
      iconColor: 'text-teal-400',
    },
    {
      id: 'year',
      label: 'Por Año',
      subtitle: `Año ${selectedYear}`,
      triggerLabel: `Año ${selectedYear}`,
      icon: CalendarDays,
      iconBg: 'bg-purple-500/15 border-purple-500/30',
      iconColor: 'text-purple-400',
    },
  ];

  const periodSummaries = baseOptions.map((option) => {
    const matching = items.filter((item) =>
      isDateInPeriod(item.date, option.id, selectedMonth, selectedYear)
    );
    return {
      ...option,
      count: matching.length,
      total: matching.reduce((acc, item) => acc + item.amount, 0),
    };
  });

  const activeMeta = periodSummaries.find((p) => p.id === periodFilter) || periodSummaries[0];
  const ActiveIcon = activeMeta.icon;
  const activePeriodLabel = getPeriodDisplayLabel(periodFilter, selectedMonth, selectedYear);

  const formatUnitCount = (count: number) =>
    `${count} ${count === 1 ? theme.unitSingular : theme.unitPlural}`;

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          if (!isOpen) onBeforeOpen?.();
          setIsOpen((prev) => !prev);
        }}
        className={`w-full sm:w-auto flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 shadow-sm ${
          periodFilter !== 'all'
            ? theme.activeTrigger
            : isOpen
            ? 'bg-gym-surface border-zinc-500 text-white shadow-md'
            : 'bg-gym-surface hover:bg-gym-surface/80 border-gym-border text-zinc-300 hover:text-white'
        }`}
        title={theme.triggerTitle}
      >
        <div className="flex items-center gap-2.5 truncate">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
              periodFilter === 'all'
                ? theme.defaultIconBox
                : `${activeMeta.iconBg} ${activeMeta.iconColor}`
            }`}
          >
            <ActiveIcon className="w-3.5 h-3.5" />
          </div>

          <div className="flex flex-col text-left leading-tight">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Periodo
            </span>
            <span className="text-xs font-black text-white truncate max-w-[160px]">
              {activeMeta.triggerLabel}
            </span>
          </div>

          <span
            className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shrink-0 border ${
              periodFilter !== 'all'
                ? theme.activeBadge
                : 'bg-zinc-800/90 text-zinc-300 border-zinc-700/80'
            }`}
          >
            {activeMeta.count}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {periodFilter !== 'all' && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className={`p-1 rounded-md hover:text-white transition-colors cursor-pointer ${theme.clearHover}`}
              title="Mostrar todos los periodos"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-white' : ''
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-[370px] bg-[#121317] border border-zinc-800/90 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] p-2.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-800/80 mb-2">
            <div className="flex items-center gap-2">
              <Calendar className={`w-3.5 h-3.5 ${theme.headerIconColor}`} />
              <span className="text-[11px] uppercase font-extrabold tracking-wider text-zinc-300">
                Filtrar por Periodo
              </span>
            </div>
            {periodFilter !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setIsOpen(false);
                }}
                className={`text-[11px] font-bold transition-colors flex items-center gap-1 ${theme.resetBtnColor}`}
              >
                <X className="w-3 h-3" />
                <span>Restablecer</span>
              </button>
            ) : (
              <span className="text-[10px] text-zinc-400 font-mono">
                Día / Semana / Mes / Año
              </span>
            )}
          </div>

          <div className="space-y-1.5 max-h-[65vh] overflow-y-auto pr-0.5 custom-scrollbar">
            {periodSummaries.map((option) => {
              const isSelected = periodFilter === option.id;
              const OptionIcon = option.icon;
              const hasSubSelector = option.id === 'month' || option.id === 'year';

              return (
                <div key={option.id} className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onPeriodChange(option.id);
                      if (!hasSubSelector) {
                        setIsOpen(false);
                      }
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-all group border ${
                      isSelected
                        ? theme.activeOption
                        : 'border-transparent hover:bg-zinc-800/60 hover:border-zinc-700/50 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all ${option.iconBg} ${option.iconColor} group-hover:scale-105`}
                      >
                        <OptionIcon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col leading-tight truncate">
                        <span
                          className={`font-bold text-xs ${
                            isSelected ? 'text-white' : 'text-zinc-200 group-hover:text-white'
                          }`}
                        >
                          {option.label}
                        </span>
                        <span className="text-[10px] text-zinc-400">{option.subtitle}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="text-right leading-tight">
                        <span
                          className={`font-mono font-bold text-[11px] block ${
                            option.total > 0 ? theme.amountText : 'text-zinc-500'
                          }`}
                        >
                          {theme.amountPrefix}$
                          {option.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {formatUnitCount(option.count)}
                        </span>
                      </div>
                      {isSelected ? (
                        <Check className={`w-3.5 h-3.5 stroke-[3] ${theme.activeCheck}`} />
                      ) : hasSubSelector ? (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />
                      ) : null}
                    </div>
                  </button>

                  {option.id === 'month' && isSelected && (
                    <div
                      className={`mx-1 p-2.5 rounded-xl bg-zinc-900/85 border space-y-2.5 ${theme.subPanelBorder}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[10px] uppercase font-extrabold tracking-wider ${theme.subPanelHeading}`}
                        >
                          Año
                        </span>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {availableYears.map((yr) => {
                            const isYrActive = selectedYear === yr;
                            return (
                              <button
                                key={yr}
                                type="button"
                                onClick={() => onYearChange(yr)}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold transition-all border ${
                                  isYrActive
                                    ? theme.subActiveBtn
                                    : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/70 hover:text-white hover:border-zinc-500'
                                }`}
                              >
                                {yr}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-zinc-400 block mb-1.5">
                          Selecciona el Mes ({selectedYear})
                        </span>
                        <div className="grid grid-cols-4 gap-1.5">
                          {MONTH_OPTIONS.map((m) => {
                            const isMonthActive = selectedMonth === m.index;
                            const monthCount = items.filter((item) =>
                              isDateInPeriod(item.date, 'month', m.index, selectedYear)
                            ).length;

                            return (
                              <button
                                key={m.index}
                                type="button"
                                onClick={() => onMonthChange(m.index)}
                                title={`${m.name} ${selectedYear} (${formatUnitCount(monthCount)})`}
                                className={`px-1.5 py-1.5 rounded-lg text-[11px] flex flex-col items-center justify-center leading-tight transition-all border ${
                                  isMonthActive
                                    ? theme.subActiveBtn
                                    : monthCount > 0
                                    ? theme.subHasDataBtn
                                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white font-semibold'
                                }`}
                              >
                                <span>{m.short}</span>
                                <span
                                  className={`text-[9px] font-mono mt-0.5 ${
                                    isMonthActive
                                      ? theme.subActiveCount
                                      : monthCount > 0
                                      ? theme.subHasDataCount
                                      : 'text-zinc-500'
                                  }`}
                                >
                                  {monthCount}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {option.id === 'year' && isSelected && (
                    <div
                      className={`mx-1 p-2.5 rounded-xl bg-zinc-900/85 border space-y-1.5 ${theme.subPanelBorder}`}
                    >
                      <span
                        className={`text-[10px] uppercase font-extrabold tracking-wider block ${theme.subPanelHeading}`}
                      >
                        Selecciona el Año
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {availableYears.map((yr) => {
                          const isYrActive = selectedYear === yr;
                          const yrCount = items.filter((item) =>
                            isDateInPeriod(item.date, 'year', selectedMonth, yr)
                          ).length;

                          return (
                            <button
                              key={yr}
                              type="button"
                              onClick={() => onYearChange(yr)}
                              className={`px-2 py-1.5 rounded-lg text-xs flex flex-col items-center justify-center leading-tight transition-all border ${
                                isYrActive
                                  ? theme.subActiveBtn
                                  : yrCount > 0
                                  ? theme.subHasDataBtn
                                  : 'bg-zinc-800/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white font-semibold'
                              }`}
                            >
                              <span className="font-mono">{yr}</span>
                              <span
                                className={`text-[9.5px] font-mono mt-0.5 ${
                                  isYrActive
                                    ? theme.subActiveCount
                                    : yrCount > 0
                                    ? theme.subHasDataCount
                                    : 'text-zinc-500'
                                }`}
                              >
                                {formatUnitCount(yrCount)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-zinc-800/80 px-2 flex items-center justify-between gap-2 text-[10px] text-zinc-400 font-mono">
            <div className="flex items-center gap-1.5 truncate">
              <span>Total ({activePeriodLabel}):</span>
              <span className={`font-bold ${theme.amountText}`}>
                {theme.amountPrefix}$
                {activeMeta.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {(periodFilter === 'month' || periodFilter === 'year') && (
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`px-2.5 py-1 rounded-lg font-sans font-black text-[11px] transition-colors shrink-0 ${theme.applyBtn}`}
              >
                Aplicar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
