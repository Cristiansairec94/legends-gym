import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { Dumbbell, Fingerprint, UserPlus, X } from 'lucide-react';

interface VisitAuthorizationBannerProps {
  onOpenNotifications?: () => void;
  isHidden?: boolean;
}

export const VisitAuthorizationBanner: React.FC<VisitAuthorizationBannerProps> = ({
  onOpenNotifications,
  isHidden = false,
}) => {
  const { pendingVisitRequests, pendingRegistrationRequests } = useGym();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const visibleRegs = (pendingRegistrationRequests || []).filter(
    (r) => !dismissedIds.includes(r.id)
  );
  const visibleVisits = (pendingVisitRequests || []).filter(
    (r) => !dismissedIds.includes(r.id)
  );

  const hasReg = visibleRegs.length > 0;
  const hasVisit = visibleVisits.length > 0;

  if (isHidden || (!hasReg && !hasVisit)) {
    return null;
  }

  const totalPending = visibleRegs.length + visibleVisits.length;
  const currentIsReg = hasReg;
  const currentReg = currentIsReg ? visibleRegs[0] : undefined;
  const regCompanions = currentReg && Array.isArray(currentReg.memberData?.groupMembers)
    ? currentReg.memberData.groupMembers.filter((gm: any) => gm && gm.fullName)
    : [];
  const regGroupTotal = 1 + regCompanions.length;
  const regHasBiometric = Boolean(currentReg?.memberData?.biometricEnrolled);
  const currentId = currentIsReg ? visibleRegs[0].id : visibleVisits[0].id;
  const rawPersonName = currentIsReg
    ? (visibleRegs[0].memberData?.fullName || 'Nuevo Socio').trim()
    : (visibleVisits[0].clientName || 'Visitante del Día').trim();
  const personName = currentIsReg && regGroupTotal > 1
    ? `${rawPersonName} (+${regGroupTotal - 1})`
    : rawPersonName;
  const typeLabel = currentIsReg
    ? regHasBiometric
      ? regGroupTotal > 1
        ? `Huellas (${regGroupTotal}) • Autorizar RP`
        : 'Huella registrada • Autorizar RP'
      : 'Registro de Nuevo Cliente'
    : 'Solicitud de Visita';

  return (
    <div className="fixed top-[68px] right-3 sm:right-4 z-[42] max-w-[min(20rem,calc(100vw-1.5rem))] w-auto animate-in slide-in-from-top-3 fade-in duration-200">
      <div
        onClick={() => onOpenNotifications?.()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onOpenNotifications?.();
        }}
        title="Abrir notificaciones para cobrar y dar entrada"
        className={`group flex items-center gap-2.5 pl-3 pr-2 py-2.5 rounded-2xl bg-[#0c1018]/92 backdrop-blur-md border shadow-2xl cursor-pointer transition-all hover:scale-[1.02] ${
          currentIsReg
            ? 'border-amber-400/75 shadow-[0_8px_28px_rgba(245,158,11,0.25)]'
            : 'border-emerald-400/75 shadow-[0_8px_28px_rgba(16,185,129,0.25)]'
        }`}
      >
        <div
          className={`relative w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
            currentIsReg
              ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
              : 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300'
          }`}
        >
          {currentIsReg ? (
            regHasBiometric ? <Fingerprint className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />
          ) : (
            <Dumbbell className="w-4 h-4" />
          )}
          <span
            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-ping ${
              currentIsReg ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
          />
        </div>

        <div className="min-w-0 pr-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                currentIsReg ? 'text-amber-300' : 'text-emerald-300'
              }`}
            >
              {typeLabel}
            </span>
            {totalPending > 1 && (
              <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-black">
                +{totalPending - 1}
              </span>
            )}
          </div>
          <p className="text-xs font-extrabold text-white truncate max-w-[205px]">
            Esperando confirmación de {personName}
          </p>
          {currentIsReg && (
            <p className="text-[10px] font-medium text-amber-200/85 truncate max-w-[205px]">
              {regHasBiometric ? 'Huella obligatoria lista · Toca para autorizar' : 'Toca para autorizar en RP'}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDismissedIds((prev) => [...prev, currentId]);
          }}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Ocultar aviso de esquina"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
