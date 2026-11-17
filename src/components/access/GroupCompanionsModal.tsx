import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  X,
  Check,
  User,
  Calendar,
  Clock,
  Phone,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { BirthDatePickerField } from './BirthDatePickerField';
import {
  GroupCompanionDraft,
  createEmptyGroupCompanion,
  isGroupCompanionComplete,
  sanitizeBirthDateInput,
  parseBirthDateParts,
  calculateAgeFromBirthDate,
  formatBirthDateToISO,
  formatBirthDateToDisplay,
} from '../../utils/membershipUtils';
import {
  detectGender,
  FEMALE_CLIENT_AVATAR,
  MALE_CLIENT_AVATAR,
} from '../../utils/genderAvatar';

interface GroupCompanionsModalProps {
  isOpen: boolean;
  planName: string;
  groupSize: number;
  primaryName: string;
  companions: GroupCompanionDraft[];
  onChangeCompanions: (updated: GroupCompanionDraft[]) => void;
  onClose: () => void;
  onConfirmAndContinue: () => void;
}

export const GroupCompanionsModal: React.FC<GroupCompanionsModalProps> = ({
  isOpen,
  planName,
  groupSize,
  primaryName,
  companions,
  onChangeCompanions,
  onClose,
  onConfirmAndContinue,
}) => {
  const requiredCompanions = Math.max(1, groupSize - 1);
  const [activeIdx, setActiveIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const normalizedCompanions: GroupCompanionDraft[] = Array.from(
    { length: requiredCompanions },
    (_, idx) => companions[idx] || createEmptyGroupCompanion()
  );

  // Jump automatically to the first incomplete companion when opening
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    const firstIncomplete = normalizedCompanions.findIndex(
      (c) => !isGroupCompanionComplete(c)
    );
    setActiveIdx(firstIncomplete >= 0 ? firstIncomplete : 0);
  }, [isOpen, requiredCompanions]);

  if (!isOpen) return null;

  const safeIdx = Math.min(activeIdx, requiredCompanions - 1);
  const current = normalizedCompanions[safeIdx];
  const completedCompanionsCount = normalizedCompanions.filter(
    isGroupCompanionComplete
  ).length;
  const totalRegistered = 1 + completedCompanionsCount;

  const updateCurrent = (patch: Partial<GroupCompanionDraft>) => {
    const updated = normalizedCompanions.map((item, idx) =>
      idx === safeIdx ? { ...item, ...patch } : item
    );
    onChangeCompanions(updated);
    if (errorMsg) setErrorMsg('');
  };

  const handleNameChange = (val: string) => {
    const patch: Partial<GroupCompanionDraft> = { fullName: val };
    if (!current.genderManuallySelected && val.trim()) {
      patch.gender = detectGender(val);
    }
    updateCurrent(patch);
  };

  const handleBirthInputChange = (rawVal: string) => {
    const val = sanitizeBirthDateInput(rawVal, current.birthDateDisplay);
    if (!val.trim()) {
      updateCurrent({
        birthDateDisplay: '',
        birthDate: '',
        age: '',
      });
      return;
    }
    const calcAge = calculateAgeFromBirthDate(val);
    if (calcAge !== null) {
      updateCurrent({
        birthDateDisplay: val,
        birthDate: formatBirthDateToISO(val),
        age: calcAge,
      });
    } else {
      updateCurrent({
        birthDateDisplay: val,
        birthDate: '',
        age: '',
      });
    }
  };

  const handleSelectDate = (isoDate: string) => {
    if (!isoDate) {
      updateCurrent({ birthDate: '', birthDateDisplay: '', age: '' });
      return;
    }
    const calcAge = calculateAgeFromBirthDate(isoDate);
    updateCurrent({
      birthDate: isoDate,
      birthDateDisplay: formatBirthDateToDisplay(isoDate),
      age: calcAge !== null ? calcAge : current.age,
    });
  };

  const handleAgeInputChange = (val: string) => {
    const num = parseInt(val, 10);
    const patch: Partial<GroupCompanionDraft> = { age: val };
    if (!isNaN(num) && num > 0 && num < 120 && !current.birthDateDisplay) {
      const approxYear = new Date().getFullYear() - num;
      patch.birthDate = `${approxYear}-01-01`;
      patch.birthDateDisplay = `01/01/${approxYear}`;
    }
    updateCurrent(patch);
  };

  const validateCompanionAt = (idx: number): string | null => {
    const target = normalizedCompanions[idx];
    const label = `Acompañante ${idx + 2}`;
    if (!target.fullName.trim()) {
      return `Ingresa el nombre completo del ${label}`;
    }
    if (
      target.birthDateDisplay.trim() &&
      !parseBirthDateParts(target.birthDateDisplay)
    ) {
      return `Ingresa una fecha de cumpleaños válida (dd/mm/aaaa) para ${label}`;
    }
    const hasBirth = Boolean(
      parseBirthDateParts(target.birthDateDisplay || target.birthDate)
    );
    const ageNum = Number(target.age);
    if (!hasBirth && (isNaN(ageNum) || ageNum < 8 || ageNum > 110)) {
      return `Selecciona fecha de cumpleaños o edad válida (8-110 años) para ${label}`;
    }
    return null;
  };

  const nextIncompleteIdx = normalizedCompanions.findIndex(
    (c, idx) => idx !== safeIdx && !isGroupCompanionComplete(c)
  );

  const handlePrimaryAction = () => {
    const errCurrent = validateCompanionAt(safeIdx);
    if (errCurrent) {
      setErrorMsg(errCurrent);
      return;
    }

    if (nextIncompleteIdx >= 0) {
      setActiveIdx(nextIncompleteIdx);
      setErrorMsg('');
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 60);
      return;
    }

    // Double check every slot before closing & advancing
    for (let i = 0; i < requiredCompanions; i++) {
      const err = validateCompanionAt(i);
      if (err) {
        setActiveIdx(i);
        setErrorMsg(err);
        return;
      }
    }

    setErrorMsg('');
    onConfirmAndContinue();
  };

  const isLastStep = nextIncompleteIdx < 0;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[520px] max-h-[94vh] overflow-y-auto bg-[#141822] border border-white/15 rounded-[26px] p-4 sm:p-5 shadow-[0_24px_64px_rgba(0,0,0,0.85)] text-white space-y-3.5 my-auto"
        style={{
          fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-400/75 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight truncate">
                  Integrantes del paquete
                </h4>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 tabular-nums">
                  {totalRegistered}/{groupSize} listos
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {planName} · Regístralos aquí mismo sin volver atrás
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Integrated Roster Tabs (1. Titular done + 2..N selectable tabs) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {/* Primary Member Chip */}
          <div
            className="px-2.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
            title="Titular ya registrado en el Paso 1"
          >
            <Check className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
            <span>1. {(primaryName || 'Titular').trim().split(' ')[0]}</span>
          </div>

          {/* Companion Tabs */}
          {normalizedCompanions.map((comp, idx) => {
            const done = isGroupCompanionComplete(comp);
            const active = idx === safeIdx;
            const firstWord = comp.fullName.trim().split(' ')[0];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveIdx(idx);
                  setErrorMsg('');
                }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 border cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-amber-400 text-[#1a1200] border-amber-300 font-semibold shadow-sm'
                    : done
                      ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35 hover:bg-emerald-500/20'
                      : 'bg-[#1b202b] text-zinc-300 border-white/10 hover:bg-[#232938] hover:text-white'
                }`}
              >
                {done ? (
                  <Check
                    className={`w-3 h-3 stroke-[2.5] ${
                      active ? 'text-[#1a1200]' : 'text-emerald-400'
                    }`}
                  />
                ) : (
                  <span
                    className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                      active
                        ? 'bg-[#1a1200]/15 text-[#1a1200]'
                        : 'bg-white/10 text-zinc-300'
                    }`}
                  >
                    {idx + 2}
                  </span>
                )}
                <span>
                  {idx + 2}. {firstWord || `Persona ${idx + 2}`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Companion Card */}
        <div className="p-3.5 rounded-2xl bg-[#181c28] border border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">
              Datos de Persona {safeIdx + 2} de {groupSize}
            </span>
            <span className="text-[11px] text-zinc-400">
              {isGroupCompanionComplete(current)
                ? '✓ Datos completos'
                : 'Campos obligatorios *'}
            </span>
          </div>

          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Nombre completo *</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              value={current.fullName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={`Ej. Nombre de la persona ${safeIdx + 2}`}
              className="w-full px-3.5 py-2 bg-[#1b202b] border border-white/15 rounded-2xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          {/* Género */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1 flex items-center justify-between">
              <span>Género *</span>
              <span className="text-[11px] text-zinc-400">
                Toca para seleccionar
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  updateCurrent({
                    gender: 'female',
                    genderManuallySelected: true,
                  })
                }
                className={`flex items-center gap-2 py-1.5 px-3 rounded-2xl font-medium text-xs sm:text-sm border cursor-pointer ${
                  current.gender === 'female'
                    ? 'bg-pink-500/15 border-pink-400/70 text-white ring-1 ring-pink-400/30'
                    : 'bg-[#1b202b] border-white/10 text-zinc-300 hover:text-white hover:bg-[#222836]'
                }`}
              >
                <img
                  src={FEMALE_CLIENT_AVATAR}
                  alt="Mujer"
                  className="w-7 h-7 rounded-full object-contain bg-white p-0.5 shrink-0"
                />
                <span>Mujer</span>
                {current.gender === 'female' && (
                  <span className="w-2 h-2 rounded-full bg-pink-400 ml-auto" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  updateCurrent({
                    gender: 'male',
                    genderManuallySelected: true,
                  })
                }
                className={`flex items-center gap-2 py-1.5 px-3 rounded-2xl font-medium text-xs sm:text-sm border cursor-pointer ${
                  current.gender === 'male'
                    ? 'bg-blue-500/15 border-blue-400/70 text-white ring-1 ring-blue-400/30'
                    : 'bg-[#1b202b] border-white/10 text-zinc-300 hover:text-white hover:bg-[#222836]'
                }`}
              >
                <img
                  src={MALE_CLIENT_AVATAR}
                  alt="Hombre"
                  className="w-7 h-7 rounded-full object-contain bg-white p-0.5 shrink-0"
                />
                <span>Hombre</span>
                {current.gender === 'male' && (
                  <span className="w-2 h-2 rounded-full bg-blue-400 ml-auto" />
                )}
              </button>
            </div>
          </div>

          {/* Cumpleaños & Edad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cumpleaños *</span>
                </span>
                <span className="text-[10px] text-zinc-400">dd/mm/aaaa</span>
              </label>
              <BirthDatePickerField
                displayValue={current.birthDateDisplay}
                isoValue={current.birthDate}
                compact
                onInputChange={handleBirthInputChange}
                onSelectDate={handleSelectDate}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Edad *</span>
                </span>
                {current.age ? (
                  <span className="text-[10px] text-emerald-400 font-medium">
                    ✓ {current.age} años
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-400 font-medium">
                    (Automática)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="8"
                  max="110"
                  value={current.age}
                  onChange={(e) => handleAgeInputChange(e.target.value)}
                  placeholder="Ej. 25"
                  className={`w-full px-3.5 py-1.5 sm:py-2 bg-[#1b202b] border rounded-2xl text-xs sm:text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 pr-14 tabular-nums ${
                    current.age
                      ? 'border-emerald-500/45 text-emerald-300'
                      : 'border-white/15'
                  }`}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-zinc-300 font-medium bg-white/[0.07] px-2 py-0.5 rounded-full pointer-events-none">
                  años
                </span>
              </div>
            </div>
          </div>

          {/* Teléfono Opcional */}
          <div>
            <label className="text-xs font-medium text-zinc-300 block mb-1 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-emerald-400" />
              <span>Teléfono / WhatsApp (Opcional)</span>
            </label>
            <input
              type="tel"
              value={current.phone}
              onChange={(e) => updateCurrent({ phone: e.target.value })}
              placeholder="Opcional (o se usa el teléfono del titular)"
              className="w-full px-3.5 py-2 bg-[#1b202b] border border-white/15 rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Inline Error */}
        {errorMsg && (
          <div className="px-3.5 py-2 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-1 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] text-xs sm:text-sm font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            Volver al plan
          </button>

          <button
            type="button"
            onClick={handlePrimaryAction}
            className={`flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98] ${
              isLastStep
                ? 'bg-emerald-500 hover:bg-emerald-400 text-[#04140d]'
                : 'bg-amber-400 hover:bg-amber-300 text-[#1a1200]'
            }`}
          >
            <span>
              {isLastStep
                ? `Confirmar ${groupSize} integrantes y continuar`
                : `Siguiente (Persona ${nextIncompleteIdx + 2}/${groupSize})`}
            </span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
