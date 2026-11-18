import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  X, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  PartyPopper, 
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getGymAvatar, detectGender } from '../../utils/genderAvatar';
import { isClientBirthdayToday } from '../../data/gymTips';
import { parseLocalDate, calculateDaysRemaining } from '../../utils/membershipUtils';

export interface AccessSuccessData {
  clientName: string;
  documentId?: string;
  memberId?: string;
  planName: string;
  daysRemaining?: number;
  avatarUrl?: string;
  birthDate?: string;
  reason?: string;
  isNewRegistration?: boolean;
  isVisit?: boolean;
  endDate?: string;
  startDate?: string;
  gender?: 'male' | 'female';
  groupMembers?: Array<{ fullName: string; gender?: 'male' | 'female' }>;
}

interface AccessWelcomeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AccessSuccessData | null;
  voiceEnabled?: boolean;
  soundVolume?: number;
}

/**
 * Formats the expiration/due date into clean Spanish text anchored to local date/time
 */
export function formatMembershipDueDate(
  endDateStr?: string,
  daysRemaining?: number,
  referenceDate: Date = new Date()
): { dateStr: string; subtitle: string } {
  let dateObj: Date | null = parseLocalDate(endDateStr);
  const resolvedDays = endDateStr
    ? calculateDaysRemaining(endDateStr, referenceDate)
    : daysRemaining;

  if (!dateObj || isNaN(dateObj.getTime())) {
    if (typeof daysRemaining === 'number') {
      dateObj = new Date(referenceDate);
      dateObj.setHours(0, 0, 0, 0);
      dateObj.setDate(dateObj.getDate() + daysRemaining);
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return {
      dateStr: 'Al día',
      subtitle: typeof resolvedDays === 'number' ? `${resolvedDays} días restantes` : 'Membresía activa'
    };
  }

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  const dateFormatted = `${day} de ${month} de ${year}`;

  let subtitle = 'Membresía activa';
  if (typeof resolvedDays === 'number') {
    if (resolvedDays < 0) {
      subtitle = `Vencida hace ${Math.abs(resolvedDays)} día(s)`;
    } else if (resolvedDays === 0) {
      subtitle = '¡Vence el día de hoy!';
    } else if (resolvedDays === 1) {
      subtitle = '1 día restante de vigencia';
    } else {
      subtitle = `${resolvedDays} días restantes de vigencia`;
    }
  }

  return {
    dateStr: dateFormatted,
    subtitle
  };
}

export function resolveIsVisitor(data: AccessSuccessData | null | undefined): boolean {
  if (!data) return false;
  return Boolean(data.isVisit)
    || !data.clientName
    || data.clientName.trim().toLowerCase().includes('visitante')
    || (data.planName || '').toLowerCase().includes('visita');
}

export const AccessWelcomeDashboardModal: React.FC<AccessWelcomeDashboardModalProps> = ({
  isOpen,
  onClose,
  data,
  voiceEnabled = true,
  soundVolume = 1.0,
}) => {
  const [currentNow, setCurrentNow] = useState<Date>(() => new Date());
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const spokenOpenKeyRef = useRef<string | null>(null);

  // Check if today is actual birthday
  const isBirthday = data?.birthDate ? isClientBirthdayToday(data.birthDate) : false;

  // Voice announcement and celebratory effects on open
  useEffect(() => {
    if (!isOpen || !data) {
      spokenOpenKeyRef.current = null;
      return () => {
        try {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        } catch {}
      };
    }

    const openSpeechKey = `${data.memberId || ''}::${data.clientName}::${isBirthday ? '1' : '0'}`;

    // 1. Voice announcement: "Acceso autorizado. ¡Bienvenido(a), [Nombre]!" (once per open modal, strictly honoring mute/voice setting)
    if (
      voiceEnabled &&
      spokenOpenKeyRef.current !== openSpeechKey &&
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      spokenOpenKeyRef.current = openSpeechKey;
      try {
        window.speechSynthesis.cancel();
        const detectedGender = data.gender || detectGender(data.clientName);
        const isGroup = Array.isArray(data.groupMembers) && data.groupMembers.length > 1;
        const greeting = isGroup ? 'Bienvenidos' : (detectedGender === 'female' ? 'Bienvenida' : 'Bienvenido');
        const isVisitor = resolveIsVisitor(data);
        const firstName = data.clientName.trim().split(' ')[0] || data.clientName;
        const speechText = isGroup
          ? `Acceso autorizado. ¡Bienvenidos al club!`
          : isVisitor
            ? `Acceso autorizado. ¡${greeting}!`
            : `Acceso autorizado. ¡${greeting}, ${firstName}!`;

        const utterance = new SpeechSynthesisUtterance(speechText);
        utterance.lang = 'es-MX';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = soundVolume;

        const voices = window.speechSynthesis.getVoices();
        const esVoice = voices.find(v => 
          (v.lang && v.lang.startsWith('es')) || 
          (v.name && (v.name.includes('Spanish') || v.name.includes('Mexico') || v.name.includes('Sabina') || v.name.includes('Raul')))
        );
        if (esVoice) utterance.voice = esVoice;

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis error:', err);
      }
    }

    // 3. Energetic Confetti Blast
    try {
      if (isBirthday) {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.45, x: 0.5 },
          colors: ['#F59E0B', '#E11D48', '#10B981', '#38BDF8', '#FFFFFF']
        });
      } else {
        confetti({
          particleCount: 55,
          spread: 65,
          origin: { y: 0.45, x: 0.5 },
          colors: ['#10B981', '#34D399', '#059669', '#F59E0B', '#FFFFFF']
        });
      }
    } catch {
      // ignore
    }
  }, [isOpen, data, isBirthday, voiceEnabled, soundVolume]);

  // Silent 5-second auto-dismiss timer + live header clock update
  useEffect(() => {
    if (!isOpen) return;
    setCurrentNow(new Date());
    const clockInterval = setInterval(() => {
      setCurrentNow(new Date());
    }, 1000);
    const closeTimer = window.setTimeout(() => {
      onCloseRef.current();
    }, 5000);

    return () => {
      clearInterval(clockInterval);
      window.clearTimeout(closeTimer);
    };
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const resolvedAvatar = getGymAvatar(data.clientName, data.avatarUrl, data.gender);
  const dateFormattedNow = currentNow
    .toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(/\./g, '')
    .toUpperCase();
  const timeFormatted = currentNow.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const dueDateInfo = formatMembershipDueDate(data.endDate, data.daysRemaining, currentNow);
  const parsedStartDate = parseLocalDate(data.startDate);
  const startDateShort = parsedStartDate
    ? parsedStartDate.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '')
    : null;

  const isGroupWelcome = Array.isArray(data.groupMembers) && data.groupMembers.length > 1;
  const isFemale = (data.gender === 'female') || (detectGender(data.clientName) === 'female');
  const greetingWord = isGroupWelcome ? 'Bienvenidos' : (isFemale ? 'Bienvenida' : 'Bienvenido');
  const isVisitor = resolveIsVisitor(data);

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      {/* Material Design 3 Elevated Surface Container (dark charcoal/navy + emerald/amber palette) */}
      <div
        className="relative w-full max-w-[560px] max-h-[95vh] overflow-y-auto bg-[#12161f] border border-white/10 rounded-[28px] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.75)] animate-in zoom-in-95 duration-200 text-white my-auto flex flex-col items-center text-center"
        style={{ fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
      >
        {/* Subtle Material top tonal hairline */}
        <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent pointer-events-none" />

        {/* 1. Single-row Compact Header Bar + Live Clock */}
        <div className="w-full pb-2 mb-2 border-b border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-medium text-emerald-300 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{data.isNewRegistration ? 'Registro exitoso' : 'Acceso autorizado'}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-300 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>Torniquete abierto</span>
            </span>

            {!isVisitor && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-medium text-zinc-300 tabular-nums whitespace-nowrap">
                <Calendar className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{dateFormattedNow}</span>
                <span className="text-zinc-600">·</span>
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="font-mono text-white">{timeFormatted}</span>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Extra-Large Hero Photo Frame Occupying Center of Card */}
        <div className="relative mb-2 flex items-center justify-center w-full">
          <div className="relative w-full max-w-[440px]">
            <div className="w-full h-[clamp(220px,42vh,370px)] rounded-[28px] bg-white p-2 ring-4 ring-emerald-500/20 border-2 border-emerald-400/75 shadow-[0_14px_40px_rgba(16,185,129,0.22)] flex items-center justify-center overflow-hidden">
              <img
                src={resolvedAvatar}
                alt={greetingWord}
                className="w-full h-full object-contain rounded-[20px] select-none"
              />
            </div>
            {/* Material Verified Checkmark Anchored Badge */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-emerald-500 border-[3px] border-[#12161f] flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-[#04140d] stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* 3. Clean Google Display Greeting & Member Context */}
        <div className="w-full text-center">
          <h2 className="text-2xl sm:text-[30px] font-semibold text-white tracking-tight leading-tight">
            ¡{greetingWord}!
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-zinc-300 font-normal flex items-center justify-center gap-1.5 flex-wrap">
            {!isVisitor && !isGroupWelcome && data.clientName && (
              <>
                <span className="font-medium text-white">{data.clientName}</span>
                <span className="text-zinc-500">·</span>
              </>
            )}
            <span className="text-emerald-300 font-medium">
              {isGroupWelcome
                ? `${data.groupMembers!.length} socios activados`
                : data.isNewRegistration
                  ? 'Alta autenticada'
                  : isVisitor
                    ? '¡Disfruta tu entrenamiento!'
                    : 'Biometría OK'}
            </span>
            {data.planName && !isVisitor && (
              <>
                <span className="text-zinc-500">·</span>
                <span className="text-amber-300/90 font-medium">{data.planName}</span>
              </>
            )}
          </p>
          {isGroupWelcome && (
            <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
              {data.groupMembers!.map((gm, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 capitalize"
                >
                  ✓ {gm.fullName}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 4. Material Tonal Info Card (Omitido en visitas; solo se muestra en socios con vigencia) */}
        {!isVisitor && (
          <div className="w-full mt-2.5 p-3 rounded-2xl bg-[#17231f] border border-emerald-500/25 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-emerald-300/90">
                Día de pago · Fecha a vencer
              </p>
              <p className="text-base sm:text-lg font-semibold text-white tracking-tight leading-snug">
                {dueDateInfo.dateStr}
              </p>
              <p className="text-[11px] font-medium text-zinc-300 mt-0.5 flex items-center gap-1.5 flex-wrap tabular-nums">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{dueDateInfo.subtitle}</span>
                {startDateShort && (
                  <span className="text-zinc-400">· Inicio: {startDateShort}</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Festive Birthday Material Tonal Banner */}
        {isBirthday && (
          <div className="w-full mt-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-medium flex items-center justify-center gap-2">
            <PartyPopper className="w-4 h-4 text-amber-300 shrink-0" />
            <span>¡Feliz cumpleaños! Hoy se entrena con energía extra</span>
          </div>
        )}

        {/* 5. Clean Pill Footer without visible counter */}
        <div className="w-full mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-center">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-6 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-[#04140d] font-semibold text-sm transition-all cursor-pointer flex items-center gap-2 shadow-sm"
          >
            <span>Acceso autorizado</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
