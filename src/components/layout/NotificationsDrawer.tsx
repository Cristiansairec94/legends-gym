import React, { useEffect, useMemo, useState } from 'react';
import { useGym } from '../../context/GymContext';
import { PaymentMethod } from '../../types';
import {
  Bell,
  X,
  CheckCheck,
  Check,
  AlertTriangle,
  Info,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Trash2,
  UserPlus,
  Dumbbell,
  Loader2,
  Lock,
} from 'lucide-react';
import { formatBirthDateToDisplay, calculateAgeFromBirthDate } from '../../utils/membershipUtils';

const FIXED_PAYMENT_LABELS: Record<PaymentMethod, { short: string; badge: string }> = {
  cash: { short: '💵 Efectivo', badge: '💵 Efectivo' },
  card: { short: '💳 Tarjeta', badge: '💳 Tarjeta' },
  transfer: { short: '📲 Transf.', badge: '📲 Transferencia' },
};

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

type NotificationTab = 'nuevos' | 'vistos';

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  if (!isOpen) return null;
  return <NotificationsPanel onClose={onClose} onNavigateTab={onNavigateTab} />;
};

const NotificationsPanel: React.FC<Omit<NotificationsDrawerProps, 'isOpen'>> = ({
  onClose,
  onNavigateTab,
}) => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    pendingRegistrationRequests,
    authorizeMemberRegistration,
    rejectMemberRegistration,
    pendingVisitRequests,
    authorizeVisitPass,
    rejectVisitPass,
  } = useGym();

  const [activeTab, setActiveTab] = useState<NotificationTab>('nuevos');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<Record<string, PaymentMethod>>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const pendingRegById = useMemo(
    () => new Map(pendingRegistrationRequests.map((r) => [r.id, r])),
    [pendingRegistrationRequests]
  );

  const pendingVisitById = useMemo(
    () => new Map(pendingVisitRequests.map((r) => [r.id, r])),
    [pendingVisitRequests]
  );

  const { newNotifications, seenNotifications } = useMemo(() => {
    const nuevos: typeof notifications = [];
    const vistos: typeof notifications = [];

    for (const notif of notifications) {
      const hasPendingReg =
        notif.requestKind === 'registration' &&
        Boolean(notif.requestId) &&
        !notif.completed &&
        pendingRegById.has(notif.requestId!);
      const hasPendingVisit =
        notif.requestKind === 'visit' &&
        Boolean(notif.requestId) &&
        !notif.completed &&
        pendingVisitById.has(notif.requestId!);

      if (!notif.read || hasPendingReg || hasPendingVisit) {
        nuevos.push(notif);
      } else {
        vistos.push(notif);
      }
    }

    return { newNotifications: nuevos, seenNotifications: vistos };
  }, [notifications, pendingRegById, pendingVisitById]);

  const visibleNotifications =
    activeTab === 'nuevos' ? newNotifications : seenNotifications;

  const hasMarkableNew = newNotifications.some((n) => {
    const isPendingAction =
      !n.completed &&
      Boolean(n.requestId) &&
      ((n.requestKind === 'registration' && pendingRegById.has(n.requestId!)) ||
        (n.requestKind === 'visit' && pendingVisitById.has(n.requestId!)));
    return !n.read && !isPendingAction;
  });

  const getIcon = (type: string, requestKind?: string) => {
    if (requestKind === 'registration' && type !== 'success') {
      return <UserPlus className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (requestKind === 'visit' && type !== 'success') {
      return <Dumbbell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'danger':
        return <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: string, read: boolean, pendingKind?: 'registration' | 'visit') => {
    if (pendingKind === 'registration') {
      return 'border-amber-400/75 bg-amber-500/10 shadow-[0_0_14px_rgba(245,158,11,0.14)]';
    }
    if (pendingKind === 'visit') {
      return 'border-emerald-400/75 bg-emerald-500/10 shadow-[0_0_14px_rgba(16,185,129,0.14)]';
    }
    if (read) return 'border-white/10 bg-white/[0.03]';
    switch (type) {
      case 'warning':
        return 'border-amber-500/40 bg-amber-500/5';
      case 'danger':
        return 'border-red-500/40 bg-red-500/5';
      case 'success':
        return 'border-emerald-500/40 bg-emerald-500/5';
      default:
        return 'border-blue-500/40 bg-blue-500/5';
    }
  };

  const handleAuthorizeRequest = async (
    kind: 'registration' | 'visit',
    requestId: string,
    method: PaymentMethod
  ) => {
    setProcessingId(requestId);
    try {
      if (kind === 'registration') {
        await authorizeMemberRegistration(requestId, method);
      } else {
        await authorizeVisitPass(requestId, method);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (kind: 'registration' | 'visit', requestId: string) => {
    setProcessingId(requestId);
    try {
      if (kind === 'registration') {
        await rejectMemberRegistration(requestId);
      } else {
        await rejectVisitPass(requestId);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleClearSeen = () => {
    for (const notif of seenNotifications) {
      deleteNotification(notif.id);
    }
  };

  return (
    <>
      {/* Transparent click-outside layer (no full-screen blur/dimming) */}
      <div
        className="fixed inset-0 z-[45]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Compact Floating Notifications Panel */}
      <div
        role="dialog"
        aria-label="Centro de Avisos"
        className="fixed top-[66px] right-2 left-2 sm:left-auto sm:right-4 sm:w-[356px] max-h-[min(460px,calc(100vh-5rem))] z-50 bg-[#10131c]/95 backdrop-blur-xl border border-white/15 rounded-2xl flex flex-col shadow-[0_18px_50px_rgba(0,0,0,0.72)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
      >
        {/* Compact Header */}
        <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-xs text-white leading-tight truncate">
                Centro de Avisos
              </h2>
              <p className="text-[10px] text-zinc-400 leading-tight">
                {newNotifications.length} nuevos • {seenNotifications.length} vistos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {activeTab === 'nuevos' && hasMarkableNew && (
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="px-2 py-1 rounded-lg text-[10px] font-bold text-amber-300 hover:bg-amber-500/15 border border-amber-500/25 flex items-center gap-1 transition-colors cursor-pointer"
                title="Pasar avisos informativos a Mensajes vistos"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Marcar vistos</span>
              </button>
            )}
            {activeTab === 'vistos' && seenNotifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearSeen}
                className="px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-300 hover:text-red-300 hover:bg-red-500/10 border border-white/10 flex items-center gap-1 transition-colors cursor-pointer"
                title="Limpiar mensajes vistos"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpiar</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Two Sections Tabs: Mensajes nuevos | Mensajes vistos */}
        <div className="px-2.5 pt-2 pb-1.5 border-b border-white/[0.08] bg-black/20">
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setActiveTab('nuevos')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'nuevos'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>Mensajes nuevos</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === 'nuevos'
                    ? 'bg-black/20 text-black'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {newNotifications.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vistos')}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'vistos'
                  ? 'bg-zinc-200 text-black shadow-sm'
                  : 'text-zinc-300 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>Mensajes vistos</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeTab === 'vistos'
                    ? 'bg-black/15 text-black'
                    : 'bg-white/10 text-zinc-300'
                }`}
              >
                {seenNotifications.length}
              </span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {visibleNotifications.length === 0 ? (
            <div className="py-8 px-4 flex flex-col items-center justify-center text-center text-zinc-400">
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center mb-2">
                <Bell className="w-4 h-4 text-zinc-400" />
              </div>
              <p className="text-xs font-bold text-zinc-200">
                {activeTab === 'nuevos'
                  ? 'Sin mensajes nuevos'
                  : 'Sin mensajes vistos'}
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                {activeTab === 'nuevos'
                  ? seenNotifications.length > 0
                    ? `Tienes ${seenNotifications.length} en "Mensajes vistos".`
                    : 'Aquí aparecerán registros y alertas pendientes.'
                  : 'Los cobros autorizados y avisos leídos aparecerán aquí.'}
              </p>
            </div>
          ) : (
            visibleNotifications.map((notif) => {
              const dateObj = new Date(notif.timestamp);
              const pendingReg =
                notif.requestKind === 'registration' && notif.requestId && !notif.completed
                  ? pendingRegById.get(notif.requestId)
                  : undefined;
              const pendingVisit =
                notif.requestKind === 'visit' && notif.requestId && !notif.completed
                  ? pendingVisitById.get(notif.requestId)
                  : undefined;

              const pendingKind: 'registration' | 'visit' | undefined = pendingReg
                ? 'registration'
                : pendingVisit
                  ? 'visit'
                  : undefined;
              const activeRequestId = pendingReg?.id || pendingVisit?.id || '';
              const fixedRegMethod: PaymentMethod = (
                pendingReg?.paymentMethod ||
                pendingReg?.memberData?.paymentMethod ||
                notif.paymentMethod ||
                'cash'
              ) as PaymentMethod;
              const chosenMethod: PaymentMethod =
                pendingKind === 'registration'
                  ? fixedRegMethod
                  : selectedMethods[notif.id] || notif.paymentMethod || 'cash';
              const price = Number(
                pendingReg?.memberData?.planPrice ?? pendingVisit?.cost ?? notif.planPrice ?? 420
              );
              const isPendingRegistration =
                notif.requestKind === 'registration' && !notif.completed;
              const regM = pendingReg?.memberData || {};
              const regDetails = notif.registrationDetails;
              const regGender = (regM.gender || regDetails?.gender) as 'male' | 'female' | undefined;
              const regBirthIso = regM.birthDate || regDetails?.birthDate;
              const regBirthDisplay = regBirthIso ? formatBirthDateToDisplay(regBirthIso) : '';
              const regAge = regM.age || regDetails?.age || (regBirthIso ? calculateAgeFromBirthDate(regBirthIso) : null);
              const regPhone = (regM.rawPhone ?? regM.phone ?? regDetails?.phone ?? '').trim();
              const rawEmailCandidate = (regM.rawEmail ?? regM.email ?? regDetails?.email ?? '').trim();
              const regEmail = rawEmailCandidate && !rawEmailCandidate.endsWith('@legendsgym.com')
                ? rawEmailCandidate
                : '';
              const regFingerprint = Boolean(regM.biometricEnrolled ?? regDetails?.biometricEnrolled);
              const regFingerName = regM.selectedFinger || regDetails?.selectedFinger || 'Escáner USB';
              const regGroupCompanions: Array<{
                fullName: string;
                gender?: 'male' | 'female';
                biometricEnrolled?: boolean;
                selectedFinger?: string;
              }> =
                Array.isArray(pendingReg?.memberData?.groupMembers)
                  ? pendingReg.memberData.groupMembers.filter((gm: any) => gm && gm.fullName)
                  : [];
              const displayRoster: Array<{ fullName: string; biometricEnrolled?: boolean; selectedFinger?: string }> =
                regGroupCompanions.length > 0
                  ? [
                      {
                        fullName: pendingReg?.memberData?.fullName || notif.clientName || 'Titular',
                        biometricEnrolled: regFingerprint,
                        selectedFinger: regFingerName,
                      },
                      ...regGroupCompanions,
                    ]
                  : Array.isArray(notif.groupMembers) && notif.groupMembers.length > 1
                    ? notif.groupMembers
                    : [];
              const rosterEnrolledCount =
                displayRoster.length > 1
                  ? displayRoster.filter((p, idx) =>
                      Boolean(p.biometricEnrolled ?? (idx === 0 ? regFingerprint : false))
                    ).length
                  : regFingerprint
                    ? 1
                    : 0;
              const allRosterBiometricsReady =
                displayRoster.length > 1 ? rosterEnrolledCount === displayRoster.length : regFingerprint;
              const displayTitle = isPendingRegistration
                ? displayRoster.length > 1
                  ? allRosterBiometricsReady
                    ? `Huellas (${displayRoster.length}/${displayRoster.length}) · Autorizar grupo`
                    : `Registro grupal (${displayRoster.length} personas)`
                  : regFingerprint
                    ? 'Huella registrada · Autorizar cliente'
                    : 'Registro completado'
                : notif.title;
              const displayClientName = (
                pendingReg?.memberData?.fullName ||
                notif.clientName ||
                'Nuevo Socio'
              ).trim();
              const displayPlanName = (
                pendingReg?.memberData?.planName ||
                notif.planName ||
                'Membresía Estándar'
              ).trim();
              const hasRegistrationInfo = Boolean(
                pendingReg?.memberData?.fullName ||
                pendingReg?.memberData?.planName ||
                notif.clientName ||
                notif.planName
              );

              return (
                <div
                  key={notif.id}
                  className={`p-2.5 rounded-xl border transition-all ${getBorderColor(
                    notif.type,
                    notif.read,
                    pendingKind
                  )}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {getIcon(notif.type, notif.requestKind)}
                      <h4 className="font-bold text-[11px] text-white truncate">
                        {displayTitle}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-zinc-400 tabular-nums">
                        {dateObj.toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {!notif.read && !pendingKind && (
                        <button
                          type="button"
                          onClick={() => markNotificationAsRead(notif.id)}
                          className="p-0.5 rounded text-zinc-400 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
                          title="Marcar como visto"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {!pendingKind && (
                        <button
                          type="button"
                          onClick={() => deleteNotification(notif.id)}
                          className="p-0.5 rounded text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
                          title="Eliminar aviso"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {isPendingRegistration && hasRegistrationInfo ? (
                    <div className="mt-1.5 space-y-1 text-[11px] leading-snug">
                      <p className="text-zinc-200 truncate">
                        <span className="text-zinc-400 font-semibold">
                          {displayRoster.length > 1 ? 'Titular: ' : 'Nombre: '}
                        </span>
                        <span className="font-bold text-white capitalize">{displayClientName}</span>
                        {regGender && (
                          <span className="text-zinc-400">
                            {' '}· {regGender === 'female' ? 'Mujer' : 'Hombre'}
                          </span>
                        )}
                        {regAge && <span className="text-emerald-300 font-medium"> · {regAge} años</span>}
                      </p>
                      {displayRoster.length > 1 && (
                        <div className="flex flex-wrap gap-1">
                          {displayRoster.map((person, pIdx) => {
                            const personBioReady = Boolean(
                              person.biometricEnrolled ?? (pIdx === 0 ? regFingerprint : false)
                            );
                            return (
                              <span
                                key={pIdx}
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize ${
                                  personBioReady
                                    ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-200'
                                    : 'bg-amber-500/15 border-amber-400/30 text-amber-200'
                                }`}
                              >
                                {personBioReady ? '✓ ' : ''}
                                {pIdx + 1}. {person.fullName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {(regBirthDisplay || regPhone || regEmail) && (
                        <div className="text-[10px] text-zinc-300 flex flex-wrap gap-x-2.5 gap-y-0.5">
                          {regBirthDisplay && (
                            <span>
                              <strong className="text-zinc-400 font-semibold">Nac:</strong> {regBirthDisplay}
                            </span>
                          )}
                          {regPhone && !regPhone.includes('55 0000 0000') && (
                            <span>
                              <strong className="text-zinc-400 font-semibold">Tel:</strong> {regPhone}
                            </span>
                          )}
                          {regEmail && (
                            <span className="truncate max-w-full">
                              <strong className="text-zinc-400 font-semibold">Correo:</strong> {regEmail}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-zinc-300">
                        <span className="text-zinc-400 font-semibold">Huella: </span>
                        {displayRoster.length > 1 ? (
                          allRosterBiometricsReady ? (
                            <span className="text-emerald-300 font-semibold">
                              ✓ {rosterEnrolledCount}/{displayRoster.length} huellas obligatorias registradas
                            </span>
                          ) : (
                            <span className="text-amber-300 font-semibold">
                              {rosterEnrolledCount}/{displayRoster.length} huellas registradas
                            </span>
                          )
                        ) : regFingerprint ? (
                          <span className="text-emerald-300 font-semibold">✓ Registrada ({regFingerName})</span>
                        ) : (
                          <span className="text-amber-300">Pendiente en mostrador</span>
                        )}
                      </p>
                      <p className="text-zinc-200">
                        <span className="text-zinc-400 font-semibold">Paquete: </span>
                        <span className="font-semibold text-amber-300">{displayPlanName}</span>
                        {price > 0 && (
                          <span className="text-zinc-200 font-bold">
                            {' '}• ${price.toLocaleString('es-MX')} MXN
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-200 mt-1 leading-snug">
                      {notif.message}
                    </p>
                  )}

                  {/* Paso final directo desde Notificaciones (Registro nuevo o Visita) */}
                  {pendingKind && activeRequestId && (
                    <div
                      className={`mt-2 p-2 rounded-lg bg-black/45 border space-y-2 ${
                        pendingKind === 'registration'
                          ? 'border-amber-500/35'
                          : 'border-emerald-500/35'
                      }`}
                    >
                      {pendingKind === 'registration' ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Cobro fijo:</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-black border border-amber-300">
                            {FIXED_PAYMENT_LABELS[fixedRegMethod].badge}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold text-zinc-300">Cobro:</span>
                          <div className="flex gap-1">
                            {(['cash', 'card', 'transfer'] as PaymentMethod[]).map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() =>
                                  setSelectedMethods((prev) => ({ ...prev, [notif.id]: method }))
                                }
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                  chosenMethod === method
                                    ? 'bg-emerald-500 text-black border-emerald-300'
                                    : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800'
                                }`}
                              >
                                {FIXED_PAYMENT_LABELS[method].short}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRejectRequest(pendingKind, activeRequestId)}
                          disabled={processingId === activeRequestId}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-bold text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleAuthorizeRequest(pendingKind, activeRequestId, chosenMethod)
                          }
                          disabled={processingId === activeRequestId}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-black font-black text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:brightness-110 ${
                            pendingKind === 'registration'
                              ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                              : 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                          }`}
                        >
                          {processingId === activeRequestId ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-black" />
                              <span>Procesando...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                              <span>
                                {pendingKind === 'registration'
                                  ? 'Autorizar cliente y cobrar'
                                  : `Cobrar $${price.toLocaleString('es-MX')} y Dar Entrada`}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {notif.targetTab && (
                    <div className="mt-1.5 pt-1.5 border-t border-white/[0.08] flex justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateTab(notif.targetTab!);
                          markNotificationAsRead(notif.id);
                          onClose();
                        }}
                        className="text-[10px] font-extrabold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>{notif.actionLabel || 'Ir al módulo'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
