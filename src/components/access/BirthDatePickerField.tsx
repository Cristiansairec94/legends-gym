import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, Check, X, RotateCcw } from 'lucide-react';
import {
  parseBirthDateParts,
  calculateAgeFromBirthDate,
  sanitizeBirthDateInput,
  getDaysInCalendarMonth,
} from '../../utils/membershipUtils';

interface BirthDatePickerFieldProps {
  displayValue: string;
  isoValue: string;
  onInputChange: (val: string) => void;
  onSelectDate: (isoDate: string) => void;
  required?: boolean;
  compact?: boolean;
}

const MONTHS = [
  { num: 1, label: '01 · Ene' },
  { num: 2, label: '02 · Feb' },
  { num: 3, label: '03 · Mar' },
  { num: 4, label: '04 · Abr' },
  { num: 5, label: '05 · May' },
  { num: 6, label: '06 · Jun' },
  { num: 7, label: '07 · Jul' },
  { num: 8, label: '08 · Ago' },
  { num: 9, label: '09 · Sep' },
  { num: 10, label: '10 · Oct' },
  { num: 11, label: '11 · Nov' },
  { num: 12, label: '12 · Dic' },
];

function getDaysInMonth(year: number | null, month: number | null): number {
  return getDaysInCalendarMonth(month || 1, year);
}

function getDecadeForYear(year: number): string {
  if (year >= 2010) return '2010s';
  if (year >= 2000) return '2000s';
  if (year >= 1990) return '1990s';
  if (year >= 1980) return '1980s';
  if (year >= 1970) return '1970s';
  if (year >= 1960) return '1960s';
  if (year >= 1950) return '1950s';
  return '1940s';
}

export const BirthDatePickerField: React.FC<BirthDatePickerFieldProps> = ({
  displayValue,
  isoValue,
  onInputChange,
  onSelectDate,
  required = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selYear, setSelYear] = useState<number | null>(null);
  const [selMonth, setSelMonth] = useState<number | null>(null);
  const [selDay, setSelDay] = useState<number | null>(null);
  const [activeDecade, setActiveDecade] = useState<string>('1990s');

  const currentYear = new Date().getFullYear();

  const decades = useMemo(() => {
    const maxChildYear = currentYear - 6;
    const recentYears: number[] = [];
    const upper = Math.min(2020, maxChildYear);
    for (let y = Math.max(2010, upper - 9); y <= upper; y++) {
      recentYears.push(y);
    }
    return [
      { id: '2010s', label: '2010+', years: recentYears },
      { id: '2000s', label: '2000s', years: Array.from({ length: 10 }, (_, i) => 2000 + i) },
      { id: '1990s', label: '90s', years: Array.from({ length: 10 }, (_, i) => 1990 + i) },
      { id: '1980s', label: '80s', years: Array.from({ length: 10 }, (_, i) => 1980 + i) },
      { id: '1970s', label: '70s', years: Array.from({ length: 10 }, (_, i) => 1970 + i) },
      { id: '1960s', label: '60s', years: Array.from({ length: 10 }, (_, i) => 1960 + i) },
      { id: '1950s', label: '50s', years: Array.from({ length: 10 }, (_, i) => 1950 + i) },
      { id: '1940s', label: '40s', years: Array.from({ length: 10 }, (_, i) => 1940 + i) },
    ];
  }, [currentYear]);

  // Sync internal picker state when opening from existing value
  useEffect(() => {
    if (!isOpen) return;
    const parsed = parseBirthDateParts(displayValue || isoValue);
    if (parsed) {
      setSelYear(parsed.year);
      setSelMonth(parsed.month);
      setSelDay(parsed.day);
      setActiveDecade(getDecadeForYear(parsed.year));
    } else {
      setSelYear(null);
      setSelMonth(null);
      setSelDay(null);
      setActiveDecade('1990s');
    }
  }, [isOpen, displayValue, isoValue]);

  const emitIfComplete = (y: number | null, m: number | null, d: number | null) => {
    if (y && m && d) {
      const maxD = getDaysInMonth(y, m);
      const clampedD = Math.min(d, maxD);
      const iso = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(clampedD).padStart(2, '0')}`;
      onSelectDate(iso);
    }
  };

  const handlePickYear = (y: number) => {
    setSelYear(y);
    const maxD = getDaysInMonth(y, selMonth);
    const nextD = selDay ? Math.min(selDay, maxD) : null;
    if (nextD !== selDay) setSelDay(nextD);
    emitIfComplete(y, selMonth, nextD);
  };

  const handlePickMonth = (m: number) => {
    setSelMonth(m);
    const maxD = getDaysInMonth(selYear, m);
    const nextD = selDay ? Math.min(selDay, maxD) : null;
    if (nextD !== selDay) setSelDay(nextD);
    emitIfComplete(selYear, m, nextD);
  };

  const handlePickDay = (d: number) => {
    setSelDay(d);
    emitIfComplete(selYear, selMonth, d);
  };

  const handleClear = () => {
    setSelYear(null);
    setSelMonth(null);
    setSelDay(null);
    onInputChange('');
  };

  const handleConfirm = () => {
    if (selYear && (!selMonth || !selDay)) {
      const m = selMonth || 1;
      const d = selDay || 1;
      const iso = `${String(selYear).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      onSelectDate(iso);
    }
    setIsOpen(false);
  };

  const maxDays = getDaysInMonth(selYear, selMonth);
  const currentDecadeYears = decades.find(d => d.id === activeDecade)?.years || [];

  const previewIso =
    selYear && selMonth && selDay
      ? `${String(selYear).padStart(4, '0')}-${String(selMonth).padStart(2, '0')}-${String(Math.min(selDay, maxDays)).padStart(2, '0')}`
      : null;
  const previewAge = previewIso ? calculateAgeFromBirthDate(previewIso) : null;

  return (
    <>
      <div className="relative flex items-center bg-[#1b202b] border border-white/15 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 rounded-2xl transition-colors">
        <input
          type="text"
          inputMode="numeric"
          required={required}
          value={displayValue}
          onChange={(e) => {
            const sanitized = sanitizeBirthDateInput(e.target.value, displayValue);
            onInputChange(sanitized);
          }}
          placeholder="dd/mm/aaaa"
          maxLength={10}
          className={`w-full min-w-0 pl-3.5 pr-2 ${
            compact ? 'py-1.5 sm:py-2 text-xs sm:text-sm' : 'py-2.5 text-sm'
          } bg-transparent font-medium text-white placeholder-zinc-500 focus:outline-none font-mono`}
        />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title="Desplegar números para elegir fecha sin escribir"
          className="shrink-0 mr-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-amber-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Calendar className="w-3 h-3 shrink-0" />
          <span>Elegir</span>
          <ChevronDown className="w-3 h-3 shrink-0" />
        </button>
      </div>

      {/* Material Design 3 Number Picker Modal Popover (Zero Typing Needed) */}
      {isOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          className="fixed inset-0 z-[90] bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
        >
          <div
            className="w-full max-w-[460px] max-h-[94vh] overflow-y-auto bg-[#141822] border border-white/12 rounded-[26px] p-4 sm:p-5 shadow-[0_24px_64px_rgba(0,0,0,0.85)] text-white space-y-3 animate-in zoom-in-95 duration-150"
            style={{ fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header & Live Preview */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-white tracking-tight leading-tight">
                    Elige fecha de cumpleaños
                  </h4>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {previewIso ? (
                      <span className="text-emerald-300 font-medium tabular-nums">
                        {`${String(Math.min(selDay!, maxDays)).padStart(2, '0')}/${String(selMonth!).padStart(2, '0')}/${selYear}`}
                        {previewAge !== null ? ` · ${previewAge} años` : ''}
                      </span>
                    ) : (
                      'Toca año, mes y día sin escribir'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. AÑO (Decade Tabs + 10 Year Chips) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-zinc-300">1. Año</span>
                {selYear && (
                  <span className="text-[11px] font-semibold text-amber-300 tabular-nums">{selYear}</span>
                )}
              </div>
              {/* Decade quick-switch tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1.5 no-scrollbar">
                {decades.map((dec) => (
                  <button
                    key={dec.id}
                    type="button"
                    onClick={() => setActiveDecade(dec.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                      activeDecade === dec.id
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/45'
                        : 'bg-white/[0.05] text-zinc-400 hover:text-white border border-transparent'
                    }`}
                  >
                    {dec.label}
                  </button>
                ))}
              </div>
              {/* Year pills */}
              <div className="grid grid-cols-5 gap-1.5">
                {currentDecadeYears.map((y) => {
                  const isSelected = selYear === y;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => handlePickYear(y)}
                      className={`py-1.5 rounded-xl text-xs font-semibold tabular-nums cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-400 text-[#1a1200] border-amber-300 shadow-sm'
                          : 'bg-[#1c212e] text-zinc-200 border-white/[0.06] hover:bg-[#252b3b] hover:text-white'
                      }`}
                    >
                      {y}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. MES (All 12 months visible) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-zinc-300">2. Mes</span>
                {selMonth && (
                  <span className="text-[11px] font-semibold text-amber-300">
                    {MONTHS.find(m => m.num === selMonth)?.label}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {MONTHS.map((m) => {
                  const isSelected = selMonth === m.num;
                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => handlePickMonth(m.num)}
                      className={`py-1.5 px-1.5 rounded-xl text-[11px] font-semibold tabular-nums cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-400 text-[#1a1200] border-amber-300 shadow-sm'
                          : 'bg-[#1c212e] text-zinc-200 border-white/[0.06] hover:bg-[#252b3b] hover:text-white'
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. DÍA (All 1..31 visible) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-zinc-300">3. Día</span>
                {selDay && (
                  <span className="text-[11px] font-semibold text-amber-300 tabular-nums">
                    Día {String(Math.min(selDay, maxDays)).padStart(2, '0')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                  const isDisabled = d > maxDays;
                  const isSelected = selDay === d && !isDisabled;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handlePickDay(d)}
                      className={`py-1.5 rounded-xl text-xs font-semibold tabular-nums border ${
                        isDisabled
                          ? 'bg-[#171b24] text-zinc-600 border-transparent opacity-35 cursor-not-allowed'
                          : isSelected
                            ? 'bg-emerald-500 text-[#04140d] border-emerald-400 shadow-sm cursor-pointer'
                            : 'bg-[#1c212e] text-zinc-200 border-white/[0.06] hover:bg-[#252b3b] hover:text-white cursor-pointer'
                      }`}
                    >
                      {String(d).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Controls */}
            <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleClear}
                className="px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs font-medium text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-xs font-semibold text-[#04140d] flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Listo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
