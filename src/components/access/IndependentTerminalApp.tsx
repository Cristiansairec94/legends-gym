import modalGymBg from '../../assets/modal-gym-bg.jpg';
import logoImg from '../../assets/logo.png';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGym } from '../../context/GymContext';
import { FingerprintScanner } from './FingerprintScanner';
import { AccessHistory } from './AccessHistory';
import { TerminalSyncModal, getTerminalConfig, saveTerminalConfig, TerminalConfig } from './TerminalSyncModal';
import { TerminalEntryCanvas } from './TerminalEntryCanvas';
import { TerminalDesignEditorControls } from './TerminalDesignEditorControls';
import {
  TERMINAL_BG_PRESETS,
  TerminalCardId,
  TerminalEntryDesignConfig,
} from '../../utils/terminalDesign';
import { getRandomMotivationalQuote } from '../../data/motivationalQuotes';
import { sounds } from '../../services/audio';
import confetti from 'canvas-confetti';
import { 
  Zap, 
  Maximize2, 
  Minimize2, 
  Search, 
  Clock, 
  Settings, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  XCircle, 
  Wifi, 
  WifiOff, 
  ShieldCheck, 
  ShieldAlert,
  Flame,
  Sparkles,
  Image,
  ArrowRight,
  ArrowLeft,
  X,
  Calendar,
  Mail,
  User,
  Fingerprint,
  Check,
  Dumbbell,
  BicepsFlexed,
  UserPlus,
  Users,
  Ticket,
  QrCode,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Palette
} from 'lucide-react';
import { Client, MembershipPlanType, PaymentMethod } from '../../types';
import { INITIAL_CATALOG_PLANS } from '../../data/initialEmployees';
import { getGymAvatar, detectGender, FEMALE_CLIENT_AVATAR, MALE_CLIENT_AVATAR } from '../../utils/genderAvatar';
import { 
  calculateMembershipDates, 
  getLocalDateString,
  calculateAgeFromBirthDate,
  formatBirthDateToISO,
  formatBirthDateToDisplay,
  sanitizeBirthDateInput,
  parseBirthDateParts,
  getGroupPackageSize,
  resizeGroupCompanions,
  isGroupCompanionComplete,
  GroupCompanionDraft
} from '../../utils/membershipUtils';
import { 
  checkServerHealth, 
  fetchMembersFromServer, 
  subscribeToRemoteSync, 
  subscribeToLocalSync,
  pushVisitRequestToServer,
  pushVisitRejectToServer,
  fetchVisitRequestStatusFromServer,
  pushRegistrationRequestToServer,
  pushRegistrationRejectToServer,
  fetchPendingRegistrationRequestsFromServer
} from '../../services/syncService';
import { BiometricFingerprintSvg } from './BiometricFingerprintSvg';
import { AccessWelcomeDashboardModal, AccessSuccessData } from './AccessWelcomeDashboardModal';
import { BirthDatePickerField } from './BirthDatePickerField';
import { GroupCompanionsModal } from './GroupCompanionsModal';

interface IndependentTerminalAppProps {
  isEmbeddedFullScreen?: boolean;
  onExitFullScreen?: () => void;
  onOpenClients?: () => void;
}

export const IndependentTerminalApp: React.FC<IndependentTerminalAppProps> = ({
  isEmbeddedFullScreen = false,
  onExitFullScreen,
  onOpenClients,
}) => {
  const { 
    verifyBiometricAccess, 
    members, 
    accessLogs, 
    forceSync, 
    replaceMembers, 
    syncMembersWithServer, 
    catalogPlans,
    terminalDesign,
    updateTerminalDesign
  } = useGym();

  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'granted' | 'denied'>('idle');
  const [currentQuote, setCurrentQuote] = useState<string>('');
  const [lastVerifiedClient, setLastVerifiedClient] = useState<{
    name: string;
    plan: string;
    daysRemaining?: number;
    reason: string;
    avatarUrl?: string;
    status: 'granted' | 'denied';
  } | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // 3 Main Options Modals State
  const [showNewMemberModal, setShowNewMemberModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showDirectAccessModal, setShowDirectAccessModal] = useState(false);
  const [showWelcomeDashboard, setShowWelcomeDashboard] = useState(false);
  const [welcomeDashboardData, setWelcomeDashboardData] = useState<AccessSuccessData | null>(null);

  // New client form state (Nombre, Cumpleaños, Edad, Correo, Mensualidad, Huella)
  const [newMemberStep, setNewMemberStep] = useState<1 | 2 | 3>(1);
  const [stepError, setStepError] = useState('');
  const [pendingNewMemberRequestId, setPendingNewMemberRequestId] = useState<string | null>(null);
  const [pendingNewMemberSummary, setPendingNewMemberSummary] = useState<{
    name: string;
    planName: string;
    planPrice: number;
    durationDays: number;
    paymentMethod?: PaymentMethod;
    birthDate?: string;
    gender: 'male' | 'female';
    documentId?: string;
    groupMembers?: Array<{ fullName: string; gender: 'male' | 'female' }>;
  } | null>(null);
  const handleNewMemberAuthorizedRef = useRef<(member?: any, allGroupMembers?: any[]) => void>(() => {});
  const authorizedRegGuardRef = useRef<Set<string>>(new Set());
  const pendingNewMemberRequestIdRef = useRef<string | null>(null);
  const showNewMemberModalRef = useRef(false);
  pendingNewMemberRequestIdRef.current = pendingNewMemberRequestId;
  showNewMemberModalRef.current = showNewMemberModal;
  const [newClientName, setNewClientName] = useState('');
  const [newClientGender, setNewClientGender] = useState<'male' | 'female'>('male');
  const [genderManuallySelected, setGenderManuallySelected] = useState(false);
  const [newClientBirthDate, setNewClientBirthDate] = useState('');
  const [newClientBirthDateDisplay, setNewClientBirthDateDisplay] = useState('');
  const [newClientAge, setNewClientAge] = useState<number | string>('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPlan, setNewClientPlan] = useState('Mensualidad Individual');
  const [newClientPaymentMethod, setNewClientPaymentMethod] = useState<PaymentMethod | ''>('');
  const [newClientId, setNewClientId] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientFingerprintEnrolled, setNewClientFingerprintEnrolled] = useState(false);
  const [showBiometricDashboard, setShowBiometricDashboard] = useState(false);
  const showBiometricDashboardRef = useRef(false);
  showBiometricDashboardRef.current = showBiometricDashboard;
  const enrollTimerRef = useRef<number | null>(null);
  const clearEnrollTimer = () => {
    if (enrollTimerRef.current !== null) {
      window.clearTimeout(enrollTimerRef.current);
      enrollTimerRef.current = null;
    }
  };
  const [biometricScanState, setBiometricScanState] = useState<'idle' | 'scanning' | 'completed'>('idle');
  const [selectedFinger, setSelectedFinger] = useState('Índice Derecho');
  const [groupCompanions, setGroupCompanions] = useState<GroupCompanionDraft[]>([]);
  const [showGroupCompanionsModal, setShowGroupCompanionsModal] = useState(false);
  const [activeBiometricSlot, setActiveBiometricSlot] = useState<number>(0);

  // Available plans list (from catalogPlans or gym defaults)
  const availablePlans = (catalogPlans && catalogPlans.length > 0)
    ? catalogPlans.filter(p => p.active !== false)
    : INITIAL_CATALOG_PLANS;

  const selectedPlanObjForFlow = availablePlans.find(
    p => p.name === newClientPlan || p.id === newClientPlan
  );
  const activeGroupSize = getGroupPackageSize(
    selectedPlanObjForFlow?.name || newClientPlan,
    selectedPlanObjForFlow?.type
  );
  const requiredCompanionsCount = Math.max(0, activeGroupSize - 1);
  const activeGroupCompanions = requiredCompanionsCount > 0
    ? resizeGroupCompanions(groupCompanions, requiredCompanionsCount)
    : [];
  const completedCompanionsCount = activeGroupCompanions.filter(isGroupCompanionComplete).length;
  const allGroupCompanionsReady =
    requiredCompanionsCount === 0 || completedCompanionsCount === requiredCompanionsCount;
  const enrolledFingerprintsCount =
    (newClientFingerprintEnrolled ? 1 : 0) +
    (activeGroupSize > 1
      ? activeGroupCompanions.filter((c) => Boolean(c.fingerprintEnrolled)).length
      : 0);
  const allRequiredFingerprintsEnrolled =
    Boolean(newClientFingerprintEnrolled) &&
    (activeGroupSize <= 1 ||
      activeGroupCompanions.every((c) => Boolean(c.fingerprintEnrolled)));

  const newClientPaymentMethodRef = useRef<PaymentMethod | ''>(newClientPaymentMethod);
  newClientPaymentMethodRef.current = newClientPaymentMethod;
  const newMemberStepRef = useRef<number>(newMemberStep);
  newMemberStepRef.current = newMemberStep;
  const autoSendAfterBioTimerRef = useRef<number | null>(null);
  const handleRegisterNewMemberRef = useRef<
    (e?: React.FormEvent, bioOverride?: { slot: number; finger: string }) => Promise<void>
  >(async () => {});

  const clearAutoSendTimer = () => {
    if (autoSendAfterBioTimerRef.current !== null) {
      window.clearTimeout(autoSendAfterBioTimerRef.current);
      autoSendAfterBioTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    clearAutoSendTimer();
    clearEnrollTimer();
  }, []);

  const handleNextStep1 = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newClientName.trim()) {
      setStepError('Por favor ingresa el nombre completo del socio');
      return;
    }
    if (newClientBirthDateDisplay.trim() && !parseBirthDateParts(newClientBirthDateDisplay)) {
      setStepError('Ingresa una fecha de cumpleaños válida en formato dd/mm/aaaa (ej. 19/07/2009)');
      return;
    }
    setStepError('');
    setActiveBiometricSlot(0);
    setNewMemberStep(2);
  };

  const handleNextStep2 = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newClientPlan) {
      setStepError('Por favor selecciona un plan o mensualidad');
      return;
    }
    if (requiredCompanionsCount > 0 && !allGroupCompanionsReady) {
      setStepError('');
      setGroupCompanions(resizeGroupCompanions(groupCompanions, requiredCompanionsCount));
      setShowGroupCompanionsModal(true);
      return;
    }
    setStepError('');
    setActiveBiometricSlot(0);
    setNewMemberStep(3);
  };

  // Birthday change: sanitize strictly by calendar limits & auto-calculate Age in real time
  const handleBirthDateInputChange = (rawVal: string) => {
    const val = sanitizeBirthDateInput(rawVal, newClientBirthDateDisplay);
    setNewClientBirthDateDisplay(val);

    if (!val.trim()) {
      setNewClientBirthDate('');
      setNewClientAge('');
      return;
    }

    const calculatedAge = calculateAgeFromBirthDate(val);
    if (calculatedAge !== null) {
      setNewClientAge(calculatedAge);
      setNewClientBirthDate(formatBirthDateToISO(val));
      if (stepError) setStepError('');
    } else {
      setNewClientBirthDate('');
      setNewClientAge('');
    }
  };

  const handleCalendarDateChange = (isoDate: string) => {
    if (!isoDate) return;
    setNewClientBirthDate(isoDate);
    setNewClientBirthDateDisplay(formatBirthDateToDisplay(isoDate));
    const calculatedAge = calculateAgeFromBirthDate(isoDate);
    if (calculatedAge !== null) {
      setNewClientAge(calculatedAge);
      if (stepError) setStepError('');
    }
  };

  // Age change: approximate birth year if not set
  const handleAgeChange = (val: string) => {
    setNewClientAge(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num < 120 && !newClientBirthDateDisplay) {
      const approxYear = new Date().getFullYear() - num;
      setNewClientBirthDate(`${approxYear}-01-01`);
      setNewClientBirthDateDisplay(`01/01/${approxYear}`);
    }
  };

  // Visit pass state
  const [visitClientName, setVisitClientName] = useState('');
  const [visitCost, setVisitCost] = useState('50.00');
  const [visitModalState, setVisitModalState] = useState<'form' | 'waiting_approval' | 'authorized'>('form');
  const [pendingVisitRequestId, setPendingVisitRequestId] = useState<string | null>(null);
  const handleVisitAuthorizedRef = useRef<(name: string) => void>(() => {});
  const authorizedVisitGuardRef = useRef<Set<string>>(new Set());
  const pendingVisitRequestIdRef = useRef<string | null>(null);
  const showVisitModalRef = useRef(false);
  const isVisitSubmittingRef = useRef(false);
  const visitVoiceTimerRef = useRef<number | null>(null);
  const visitWelcomeTimerRef = useRef<number | null>(null);
  const visitIdleTimerRef = useRef<number | null>(null);

  pendingVisitRequestIdRef.current = pendingVisitRequestId;
  showVisitModalRef.current = showVisitModal;

  const clearVisitTimers = () => {
    if (visitVoiceTimerRef.current !== null) {
      window.clearTimeout(visitVoiceTimerRef.current);
      visitVoiceTimerRef.current = null;
    }
    if (visitWelcomeTimerRef.current !== null) {
      window.clearTimeout(visitWelcomeTimerRef.current);
      visitWelcomeTimerRef.current = null;
    }
    if (visitIdleTimerRef.current !== null) {
      window.clearTimeout(visitIdleTimerRef.current);
      visitIdleTimerRef.current = null;
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [directAccessError, setDirectAccessError] = useState('');
  const lastAutoScannedIdRef = useRef<string | null>(null);
  const directAccessInputRef = useRef<HTMLInputElement | null>(null);
  const executeScanRef = useRef<(identifier: string) => void>(() => {});
  const scanStatusRef = useRef(scanStatus);
  scanStatusRef.current = scanStatus;
  const [isDesignEditorOpen, setIsDesignEditorOpen] = useState(false);
  const [designDraft, setDesignDraft] = useState<TerminalEntryDesignConfig | null>(null);
  const [selectedDesignCardId, setSelectedDesignCardId] = useState<TerminalCardId>('new');
  const activeDesign = isDesignEditorOpen && designDraft ? designDraft : terminalDesign;
  const hasEscapeClosableModalRef = useRef(false);
  hasEscapeClosableModalRef.current = Boolean(
    showVisitModalRef.current ||
    showNewMemberModal ||
    showVisitModal ||
    showDirectAccessModal ||
    showWelcomeDashboard ||
    isConfigModalOpen ||
    isHistoryModalOpen ||
    showGroupCompanionsModal ||
    showBiometricDashboard ||
    isDesignEditorOpen
  );
  const isModalBlockingScanRef = useRef(false);
  isModalBlockingScanRef.current = Boolean(
    hasEscapeClosableModalRef.current ||
    scanStatus === 'scanning'
  );
  const [isFullScreen, setIsFullScreen] = useState(isEmbeddedFullScreen);
  const [showEscHint, setShowEscHint] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [bgToast, setBgToast] = useState<string | null>(null);

  // Enforce strict idle silence while Terminal Kiosk sits unused (blocks all background/phantom sounds)
  useEffect(() => {
    sounds.setExplicitTerminalGate(true);
    return () => {
      sounds.clearTerminalSoundWindow();
      sounds.setExplicitTerminalGate(false);
    };
  }, []);

  useEffect(() => {
    sounds.setMuted(isMuted);
    if (isMuted) {
      sounds.clearTerminalSoundWindow();
      try {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    }
  }, [isMuted]);

  // Standalone terminal configuration
  const [config, setConfig] = useState<TerminalConfig>(() => getTerminalConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(new Date());
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');

  // Turnstile relay pulse countdown state
  const [relayRemainingSeconds, setRelayRemainingSeconds] = useState<number>(0);
  const relayTimerRef = useRef<number | null>(null);

  // Barcode / RFID Keyboard Wedge scanner buffer
  const keyBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const serverVersionRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);

  // Sync members from server
  const syncWithServer = useCallback(async (): Promise<boolean> => {
    if (!config.serverUrl) {
      setServerStatus('disconnected');
      return false;
    }
    if (isSyncingRef.current) return false;
    isSyncingRef.current = true;
    try {
      const res = await fetchMembersFromServer(config.serverUrl, serverVersionRef.current);
      if (res.success) {
        setServerStatus('connected');
        if (res.hasChanges || (res.members && res.members.length > 0 && serverVersionRef.current === 0)) {
          if (res.members && res.members.length > 0) {
            replaceMembers(res.members);
            serverVersionRef.current = res.version;
            setLastSyncTime(new Date());
          }
        }
        return true;
      } else {
        const health = await checkServerHealth(config.serverUrl);
        setServerStatus(health.online ? 'connected' : 'disconnected');
        return health.online;
      }
    } catch {
      setServerStatus('disconnected');
      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }, [config.serverUrl, replaceMembers]);

  const syncWithServerRef = useRef(syncWithServer);
  useEffect(() => {
    syncWithServerRef.current = syncWithServer;
  }, [syncWithServer]);

  // Periodic polling for new/deleted/updated members
  useEffect(() => {
    syncWithServerRef.current();
    if (config.autoSync) {
      const intervalSec = Math.max(2, config.syncIntervalSeconds || 3);
      const interval = setInterval(() => {
        syncWithServerRef.current();
      }, intervalSec * 1000);
      return () => clearInterval(interval);
    }
  }, [config.autoSync, config.syncIntervalSeconds]);

  // Instant real-time listener for server push events and local BroadcastChannel
  useEffect(() => {
    const handleIncomingRequestEvent = (msg: any) => {
      if (msg.type === 'VISIT_PASS_AUTHORIZED') {
        const visId = msg.visitRequest?.id || (msg as any).visitRequestId || '';
        const activeId = pendingVisitRequestIdRef.current;
        if (!showVisitModalRef.current || !activeId) return;
        if (visId && visId !== activeId) return;
        const guardKey = visId || activeId;
        if (authorizedVisitGuardRef.current.has(guardKey)) return;
        authorizedVisitGuardRef.current.add(guardKey);
        const clientName = msg.visitRequest?.clientName || 'Visitante del Día';
        handleVisitAuthorizedRef.current(clientName);
      } else if (msg.type === 'VISIT_PASS_REJECTED') {
        const rejVisId = msg.visitRequest?.id || (msg as any).visitRequestId || '';
        const activeId = pendingVisitRequestIdRef.current;
        if (!showVisitModalRef.current || !activeId) return;
        if (rejVisId && rejVisId !== activeId) return;
        clearVisitTimers();
        isVisitSubmittingRef.current = false;
        pendingVisitRequestIdRef.current = null;
        setVisitModalState('form');
        setPendingVisitRequestId(null);
      } else if (msg.type === 'MEMBER_REGISTRATION_AUTHORIZED') {
        const reqId = msg.registrationRequest?.id || '';
        const activeRegId = pendingNewMemberRequestIdRef.current;
        if (!showNewMemberModalRef.current || !activeRegId) return;
        if (reqId && reqId !== activeRegId) return;
        const guardKey = reqId || activeRegId;
        if (authorizedRegGuardRef.current.has(guardKey)) return;
        authorizedRegGuardRef.current.add(guardKey);
        handleNewMemberAuthorizedRef.current(msg.member || msg.registrationRequest?.memberData, msg.members);
      } else if (msg.type === 'MEMBER_REGISTRATION_REJECTED') {
        const rejRegId = msg.registrationRequest?.id || (msg as any).registrationRequestId || '';
        const activeRegId = pendingNewMemberRequestIdRef.current;
        if (!showNewMemberModalRef.current || !activeRegId) return;
        if (rejRegId && rejRegId !== activeRegId) return;
        pendingNewMemberRequestIdRef.current = null;
        setNewMemberStep(3);
        setPendingNewMemberRequestId(null);
      }
    };

    const unsubRemote = subscribeToRemoteSync((msg) => {
      if (
        msg.type === 'MEMBER_ADDED' || 
        msg.type === 'MEMBER_UPDATED' || 
        msg.type === 'MEMBER_DELETED' || 
        msg.type === 'MEMBERS_REPLACED' ||
        msg.type === 'MEMBERS_CLEARED' || 
        msg.type === 'DATABASE_UPDATED'
      ) {
        if (!msg.version || msg.version > serverVersionRef.current) {
          syncWithServerRef.current();
        }
      } else {
        handleIncomingRequestEvent(msg);
      }
    }, config.serverUrl);

    const unsubLocal = subscribeToLocalSync((msg) => {
      handleIncomingRequestEvent(msg);
    });

    return () => {
      unsubRemote();
      unsubLocal();
      clearVisitTimers();
    };
  }, [config.serverUrl]);

  // Polling fallback while waiting for RP payment authorization on Visit Pass
  useEffect(() => {
    if (!showVisitModal || visitModalState !== 'waiting_approval' || !pendingVisitRequestId) return;
    let cancelled = false;
    const targetReqId = pendingVisitRequestId;

    const checkVisitStatus = async () => {
      if (cancelled || authorizedVisitGuardRef.current.has(targetReqId)) return;
      try {
        const statusRes = await fetchVisitRequestStatusFromServer(targetReqId, config.serverUrl);
        if (cancelled || !statusRes) return;
        if (statusRes.status === 'authorized') {
          if (!authorizedVisitGuardRef.current.has(targetReqId)) {
            authorizedVisitGuardRef.current.add(targetReqId);
            handleVisitAuthorizedRef.current(statusRes.clientName || 'Visitante del Día');
          }
        } else if (statusRes.status === 'rejected') {
          clearVisitTimers();
          isVisitSubmittingRef.current = false;
          pendingVisitRequestIdRef.current = null;
          setVisitModalState('form');
          setPendingVisitRequestId(null);
        }
      } catch {}
    };

    const timer = setInterval(checkVisitStatus, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [showVisitModal, visitModalState, pendingVisitRequestId, config.serverUrl]);

  // Polling fallback while waiting in Step 4 for RP payment authorization
  useEffect(() => {
    if (newMemberStep !== (4 as any) || !pendingNewMemberRequestId || !pendingNewMemberSummary) return;
    let cancelled = false;
    const targetReqId = pendingNewMemberRequestId;
    const expectedName = pendingNewMemberSummary.name.trim().toLowerCase();

    const checkPending = async () => {
      if (cancelled || authorizedRegGuardRef.current.has(targetReqId)) return;
      try {
        const pendingList = await fetchPendingRegistrationRequestsFromServer(config.serverUrl);
        if (cancelled) return;
        const stillPending = pendingList.some(r => r.id === targetReqId);
        if (!stillPending) {
          const membersRes = await fetchMembersFromServer(config.serverUrl, 0);
          if (cancelled) return;
          const createdMember = (membersRes.members || []).find(
            m => (m.fullName || '').trim().toLowerCase() === expectedName
          );
          if (createdMember && !authorizedRegGuardRef.current.has(targetReqId)) {
            authorizedRegGuardRef.current.add(targetReqId);
            handleNewMemberAuthorizedRef.current(createdMember, pendingNewMemberSummary.groupMembers);
          }
        }
      } catch {}
    };

    const timer = setInterval(checkPending, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [newMemberStep, pendingNewMemberRequestId, pendingNewMemberSummary, config.serverUrl]);

  // Custom speech synthesis announcement
  const speakCustomMessage = (text: string) => {
    if (!config.voiceEnabled || isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = config.soundVolume ?? 1.0;
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => (v.lang && v.lang.startsWith('es')) || (v.name && (v.name.includes('Spanish') || v.name.includes('Mexico'))));
      if (esVoice) utterance.voice = esVoice;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Speech synthesis announcement
  const announceAccess = (clientName: string, granted: boolean, gender?: 'male' | 'female') => {
    if (!config.voiceEnabled || isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const detectedGen = gender || detectGender(clientName);
      const greeting = detectedGen === 'female' ? 'Bienvenida' : 'Bienvenido';
      const firstName = clientName.trim().split(' ')[0] || clientName;
      const text = granted 
        ? `Acceso autorizado. ¡${greeting}, ${firstName}!` 
        : `Acceso restringido para ${clientName}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = config.soundVolume ?? 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => 
        (v.lang && v.lang.startsWith('es')) || 
        (v.name && (v.name.includes('Spanish') || v.name.includes('Mexico') || v.name.includes('Sabina') || v.name.includes('Raul')))
      );
      if (esVoice) utterance.voice = esVoice;
      
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Handle Registration of New Member
  
  const handleEnrollFingerprintAction = () => {
    if (biometricScanState === 'scanning') return;
    clearAutoSendTimer();
    clearEnrollTimer();
    setStepError('');
    setBiometricScanState('scanning');
    if (!isMuted) {
      sounds.allowTerminalSoundWindow(3500);
      sounds.playScanBlip();
    }

    const targetSlot = activeBiometricSlot;
    const fingerUsed =
      targetSlot === 0
        ? selectedFinger
        : activeGroupCompanions[targetSlot - 1]?.selectedFinger || selectedFinger;
    const primaryDoneAfter = targetSlot === 0 ? true : Boolean(newClientFingerprintEnrolled);
    const companionsAfter = activeGroupCompanions.map((c, idx) =>
      targetSlot > 0 && idx === targetSlot - 1
        ? { ...c, fingerprintEnrolled: true, selectedFinger: fingerUsed }
        : c
    );
    const nextPendingSlot: number | null = !primaryDoneAfter
      ? 0
      : (() => {
          const pendingIdx = companionsAfter.findIndex((c) => !c.fingerprintEnrolled);
          return pendingIdx >= 0 ? pendingIdx + 1 : null;
        })();

    enrollTimerRef.current = window.setTimeout(() => {
      enrollTimerRef.current = null;
      if (!showBiometricDashboardRef.current && !showNewMemberModalRef.current) {
        setBiometricScanState('idle');
        return;
      }
      setBiometricScanState('completed');
      if (targetSlot === 0) {
        setNewClientFingerprintEnrolled(true);
      } else {
        setGroupCompanions((prev) =>
          resizeGroupCompanions(prev, Math.max(targetSlot, requiredCompanionsCount)).map(
            (c, idx) =>
              idx === targetSlot - 1
                ? { ...c, fingerprintEnrolled: true, selectedFinger: fingerUsed }
                : c
          )
        );
      }
      if (!isMuted) {
        sounds.allowTerminalSoundWindow(2500);
        sounds.playAccessGranted();
      }
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      if (nextPendingSlot !== null) {
        setTimeout(() => {
          setShowBiometricDashboard(false);
          setBiometricScanState('idle');
          setActiveBiometricSlot(nextPendingSlot);
        }, 650);
      } else {
        setTimeout(() => {
          setShowBiometricDashboard(false);
          setBiometricScanState('idle');
        }, 700);
        if (
          newClientPaymentMethodRef.current &&
          newMemberStepRef.current === 3 &&
          !pendingNewMemberRequestIdRef.current
        ) {
          autoSendAfterBioTimerRef.current = window.setTimeout(() => {
            autoSendAfterBioTimerRef.current = null;
            if (
              newMemberStepRef.current === 3 &&
              !pendingNewMemberRequestIdRef.current &&
              newClientPaymentMethodRef.current
            ) {
              handleRegisterNewMemberRef.current(undefined, {
                slot: targetSlot,
                finger: fingerUsed,
              });
            }
          }, 750);
        }
      }
    }, 1200);
  };

  const handleNewMemberAuthorized = (memberData?: any, allGroupMembers?: any[]) => {
    const trimmedName = memberData?.fullName || pendingNewMemberSummary?.name || newClientName || 'Nuevo Socio';
    const planName = memberData?.membership?.planName || pendingNewMemberSummary?.planName || newClientPlan;
    const durationDays = memberData?.membership?.daysRemaining || pendingNewMemberSummary?.durationDays || 30;
    const gender = memberData?.gender || pendingNewMemberSummary?.gender || newClientGender;
    const memberId = memberData?.id || pendingNewMemberSummary?.documentId || newClientId;
    const finalBirthDate = memberData?.birthDate || pendingNewMemberSummary?.birthDate;

    const resolvedGroupRoster: Array<{ fullName: string; gender?: 'male' | 'female' }> | undefined =
      Array.isArray(allGroupMembers) && allGroupMembers.length > 1
        ? allGroupMembers.map((gm: any) => ({ fullName: gm.fullName, gender: gm.gender }))
        : pendingNewMemberSummary?.groupMembers && pendingNewMemberSummary.groupMembers.length > 0
          ? [{ fullName: trimmedName, gender }, ...pendingNewMemberSummary.groupMembers]
          : undefined;

    // Trigger turnstile relay
    triggerTurnstileRelay(config.relayPulseDurationSeconds || 5);
    if (!isMuted) {
      sounds.allowTerminalSoundWindow(3000);
      sounds.playAccessGranted();
    }
    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.55, x: 0.5 }
      });
    } catch {}

    setScanStatus('granted');
    setLastVerifiedClient({
      name: resolvedGroupRoster && resolvedGroupRoster.length > 1
        ? `${trimmedName} (+${resolvedGroupRoster.length - 1})`
        : trimmedName,
      plan: planName,
      daysRemaining: durationDays,
      reason: resolvedGroupRoster && resolvedGroupRoster.length > 1
        ? `Alta Grupal (${resolvedGroupRoster.length} socios) Autorizada por RP`
        : 'Alta de Socio y Pago Autorizado por RP • Acceso Concedido',
      avatarUrl: getGymAvatar(trimmedName, undefined, gender),
      status: 'granted',
    });

    const { startDate: regStartDate, endDate: regEndDate } = calculateMembershipDates(durationDays);
    setWelcomeDashboardData({
      clientName: trimmedName,
      documentId: memberId || undefined,
      memberId: memberId,
      planName: planName,
      daysRemaining: durationDays,
      birthDate: finalBirthDate,
      avatarUrl: getGymAvatar(trimmedName, undefined, gender),
      reason: 'Alta de Socio y Pago Registrado en RP • Torniquete Abierto',
      isNewRegistration: true,
      endDate: regEndDate,
      startDate: regStartDate,
      gender: gender,
      groupMembers: resolvedGroupRoster,
    });

    setTimeout(() => {
      showNewMemberModalRef.current = false;
      pendingNewMemberRequestIdRef.current = null;
      setShowNewMemberModal(false);
      setShowGroupCompanionsModal(false);
      setNewMemberStep(1);
      setPendingNewMemberRequestId(null);
      setPendingNewMemberSummary(null);
      setNewClientName('');
      setNewClientBirthDate('');
      setNewClientBirthDateDisplay('');
      setNewClientAge('');
      setNewClientEmail('');
      setNewClientId('');
      setNewClientPhone('');
      setNewClientPaymentMethod('');
      setNewClientFingerprintEnrolled(false);
      setGroupCompanions([]);
      setActiveBiometricSlot(0);
      setShowWelcomeDashboard(true);
    }, 1800);

    setTimeout(() => {
      setScanStatus('idle');
      setLastVerifiedClient(null);
    }, 6000);
  };
  handleNewMemberAuthorizedRef.current = handleNewMemberAuthorized;

  const handleRegisterNewMember = async (
    e?: React.FormEvent,
    bioOverride?: { slot: number; finger: string }
  ) => {
    if (e) e.preventDefault();
    clearAutoSendTimer();
    if (pendingNewMemberRequestIdRef.current) return;
    const trimmedName = newClientName.trim();
    if (!trimmedName) return;

    // Require client to explicitly choose how they will pay before submitting registration
    if (!newClientPaymentMethod) {
      setStepError('Por favor selecciona cómo vas a pagar (Efectivo, Tarjeta o Transferencia)');
      return;
    }

    // Determine plan properties
    const selectedPlanObj = availablePlans.find(p => p.name === newClientPlan || p.id === newClientPlan);
    const planType: MembershipPlanType = selectedPlanObj ? (selectedPlanObj.type as MembershipPlanType) : 'monthly';
    const planPrice = selectedPlanObj ? selectedPlanObj.price : 420;
    const durationDays = selectedPlanObj ? selectedPlanObj.durationDays : 30;
    const planName = selectedPlanObj ? selectedPlanObj.name : newClientPlan;

    // Ensure companions are ready if this is a group package
    if (requiredCompanionsCount > 0 && !allGroupCompanionsReady) {
      setNewMemberStep(2);
      setGroupCompanions(resizeGroupCompanions(groupCompanions, requiredCompanionsCount));
      setShowGroupCompanionsModal(true);
      return;
    }

    // Mandatory biometric fingerprint check for all registrants
    const primaryBioReady = Boolean(newClientFingerprintEnrolled || bioOverride?.slot === 0);
    if (!primaryBioReady) {
      setActiveBiometricSlot(0);
      const titularFirst = (trimmedName.split(' ')[0] || 'titular').trim();
      setStepError(
        activeGroupSize > 1
          ? `Registro obligatorio: captura la huella de ${titularFirst} (1/${activeGroupSize}) para enviar aviso al RP.`
          : 'Registro obligatorio: captura tu huella digital para enviar aviso directo de autorización al RP.'
      );
      return;
    }

    const resolvedPrimaryFinger =
      bioOverride?.slot === 0 ? bioOverride.finger : selectedFinger;

    const effectiveCompanions = activeGroupCompanions.map((comp, idx) =>
      bioOverride && bioOverride.slot === idx + 1
        ? { ...comp, fingerprintEnrolled: true, selectedFinger: bioOverride.finger }
        : comp
    );

    if (requiredCompanionsCount > 0) {
      const missingCompIdx = effectiveCompanions.findIndex((c) => !c.fingerprintEnrolled);
      if (missingCompIdx >= 0) {
        setActiveBiometricSlot(missingCompIdx + 1);
        const missingName =
          effectiveCompanions[missingCompIdx]?.fullName?.trim() ||
          `Integrante ${missingCompIdx + 2}`;
        setStepError(
          `Registro obligatorio: falta capturar la huella de ${missingName} (${missingCompIdx + 2}/${activeGroupSize}) para enviar aviso al RP.`
        );
        return;
      }
    }

    setStepError('');

    const memberId = newClientId.trim() || undefined;
    const parsedIso = formatBirthDateToISO(newClientBirthDateDisplay || newClientBirthDate);
    const finalBirthDate = parsedIso || newClientBirthDate || (newClientAge ? `${new Date().getFullYear() - Number(newClientAge)}-01-01` : '1998-01-01');
    const resolvedAge = newClientAge || calculateAgeFromBirthDate(finalBirthDate) || undefined;
    const rawEmailTrimmed = newClientEmail.trim();
    const rawPhoneTrimmed = newClientPhone.trim();
    const finalEmail = rawEmailTrimmed || `${(memberId || 'socio').toLowerCase()}@legendsgym.com`;

    const groupMembersPayload = effectiveCompanions.map((comp) => {
      const compIso = formatBirthDateToISO(comp.birthDateDisplay || comp.birthDate);
      const compBirth = compIso || comp.birthDate || (comp.age ? `${new Date().getFullYear() - Number(comp.age)}-01-01` : '1998-01-01');
      return {
        fullName: comp.fullName.trim(),
        gender: comp.gender,
        birthDate: compBirth,
        phone: comp.phone.trim() || rawPhoneTrimmed || '+52 55 0000 0000',
        biometricEnrolled: Boolean(comp.fingerprintEnrolled),
        selectedFinger: comp.selectedFinger || 'Índice Derecho',
      };
    });

    const reqId = `REG_${Date.now()}`;
    pendingNewMemberRequestIdRef.current = reqId;
    showNewMemberModalRef.current = true;
    setPendingNewMemberRequestId(reqId);
    setPendingNewMemberSummary({
      name: trimmedName,
      planName,
      planPrice,
      durationDays,
      paymentMethod: newClientPaymentMethod,
      birthDate: finalBirthDate,
      gender: newClientGender,
      documentId: memberId,
      groupMembers: groupMembersPayload.map(g => ({ fullName: g.fullName, gender: g.gender })),
    });

    // Voice announcement out loud confirming biometric registration & RP notification
    speakCustomMessage("Huella registrada. Solicitud enviada al RP, diríjase a recepción para su autorización");

    // Transition to registration sent step 4
    setNewMemberStep(4 as any);

    // Send complete registration + biometric data + fixed paymentMethod directly to RP
    try {
      await pushRegistrationRequestToServer({
        id: reqId,
        memberData: {
          id: memberId,
          fullName: trimmedName,
          gender: newClientGender,
          documentId: memberId,
          email: finalEmail,
          rawEmail: rawEmailTrimmed || undefined,
          phone: rawPhoneTrimmed || '+52 55 0000 0000',
          rawPhone: rawPhoneTrimmed || undefined,
          birthDate: finalBirthDate,
          age: resolvedAge,
          planName,
          planType,
          planPrice,
          durationDays,
          paymentMethod: newClientPaymentMethod,
          biometricEnrolled: primaryBioReady,
          selectedFinger: resolvedPrimaryFinger,
          groupMembers: groupMembersPayload.length > 0 ? groupMembersPayload : undefined
        },
        paymentMethod: newClientPaymentMethod
      }, config.serverUrl);
    } catch {}
  };
  handleRegisterNewMemberRef.current = handleRegisterNewMember;

  const cancelPendingRegistration = (targetStep: 1 | 2 | 3 = 3, closeModal = false) => {
    clearAutoSendTimer();
    clearEnrollTimer();
    sounds.clearTerminalSoundWindow();
    const activeId = pendingNewMemberRequestIdRef.current;
    if (activeId && (newMemberStep as number) === 4) {
      pushRegistrationRejectToServer(activeId, config.serverUrl).catch(() => {});
    }
    pendingNewMemberRequestIdRef.current = null;
    setPendingNewMemberRequestId(null);
    setPendingNewMemberSummary(null);
    setStepError('');
    if (closeModal) {
      showNewMemberModalRef.current = false;
      setShowNewMemberModal(false);
      setNewMemberStep(1);
      setNewClientPaymentMethod('');
    } else {
      setNewMemberStep(targetStep);
    }
  };

  // Voice announcement specifically for Visit Pass as requested by user
  const announceVisitWelcome = () => {
    if (!config.voiceEnabled || isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      // Anuncio por voz exacto pedido por el usuario
      const text = 'Esperamos cumplir tus expectativas en rutina';
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = config.soundVolume ?? 1.0;
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => 
        (v.lang && (v.lang.startsWith('es-MX') || v.lang.startsWith('es'))) || 
        (v.name && (v.name.includes('Mexico') || v.name.includes('Spanish') || v.name.includes('Sabina') || v.name.includes('Raul')))
      );
      if (esVoice) utterance.voice = esVoice;
      window.speechSynthesis.speak(utterance);
    } catch {
      // fallback
    }
  };

  // Called when Visit Pass is authorized (either remotely from ERP or directly by staff)
  const handleVisitAuthorized = (name: string = 'Visitante del Día') => {
    clearVisitTimers();
    isVisitSubmittingRef.current = false;
    const finalName = name.trim() || 'Visitante del Día';
    setVisitModalState('authorized');
    setScanStatus('granted');
    setLastVerifiedClient({
      name: finalName,
      plan: 'Pase de Visita ($50.00)',
      reason: 'Visita Autorizada por RP',
      avatarUrl: getGymAvatar(finalName),
      status: 'granted',
    });

    triggerTurnstileRelay(5);
    if (!isMuted) {
      sounds.allowTerminalSoundWindow(3000);
      sounds.playAccessGranted();
    }
    confetti({ particleCount: 85, spread: 65, origin: { y: 0.6 } });

    // Emisión del mensaje de voz solicitado: "Esperamos cumplir tus expectativas en rutina"
    visitVoiceTimerRef.current = window.setTimeout(() => {
      visitVoiceTimerRef.current = null;
      announceVisitWelcome();
    }, 350);

    setWelcomeDashboardData({
      clientName: finalName,
      planName: 'Visita',
      avatarUrl: getGymAvatar(finalName),
      reason: 'Acceso autorizado • Torniquete Abierto',
      isNewRegistration: false,
      isVisit: true,
      gender: detectGender(finalName),
    });

    visitWelcomeTimerRef.current = window.setTimeout(() => {
      visitWelcomeTimerRef.current = null;
      showVisitModalRef.current = false;
      pendingVisitRequestIdRef.current = null;
      setShowVisitModal(false);
      setVisitModalState('form');
      setPendingVisitRequestId(null);
      setVisitClientName('');
      setShowWelcomeDashboard(true);
    }, 2400);

    visitIdleTimerRef.current = window.setTimeout(() => {
      visitIdleTimerRef.current = null;
      setScanStatus('idle');
      setLastVerifiedClient(null);
    }, 6500);
  };
  handleVisitAuthorizedRef.current = handleVisitAuthorized;

  const cancelOrCloseVisitModal = (closeModal: boolean) => {
    clearVisitTimers();
    sounds.clearTerminalSoundWindow();
    isVisitSubmittingRef.current = false;
    const activeId = pendingVisitRequestIdRef.current;
    if (activeId && visitModalState === 'waiting_approval') {
      pushVisitRejectToServer(activeId, config.serverUrl).catch(() => {});
    }
    pendingVisitRequestIdRef.current = null;
    setPendingVisitRequestId(null);
    setVisitModalState('form');
    if (closeModal) {
      showVisitModalRef.current = false;
      setShowVisitModal(false);
    }
  };

  // Enviar solicitud de cobro al RP (Recepción / Administrador)
  const handleRequestVisitPass = async () => {
    if (isVisitSubmittingRef.current || visitModalState === 'waiting_approval' || visitModalState === 'authorized') return;
    isVisitSubmittingRef.current = true;
    const name = visitClientName.trim() || 'Visitante del Día';
    const id = `VIS_${Date.now()}`;
    pendingVisitRequestIdRef.current = id;
    showVisitModalRef.current = true;
    setPendingVisitRequestId(id);
    setVisitModalState('waiting_approval');

    try {
      await pushVisitRequestToServer({
        id,
        clientName: name,
        cost: 50,
        timestamp: Date.now()
      }, config.serverUrl);
    } catch {
      // ignore network error; poll/SSE handles state
    } finally {
      isVisitSubmittingRef.current = false;
    }
  };

  // Turnstile relay pulse simulator
  const triggerTurnstileRelay = (seconds: number) => {
    if (relayTimerRef.current) {
      clearInterval(relayTimerRef.current);
    }
    setRelayRemainingSeconds(seconds);
    relayTimerRef.current = window.setInterval(() => {
      setRelayRemainingSeconds(prev => {
        if (prev <= 1) {
          if (relayTimerRef.current) clearInterval(relayTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Main scan execution
  const executeScan = (identifier: string) => {
    const trimmed = (identifier || '').trim();
    if (!trimmed || scanStatus === 'scanning') return;
    
    if (!isMuted) {
      sounds.allowTerminalSoundWindow(3500);
      sounds.unlock();
      sounds.playScanBlip();
    }
    setScanStatus('scanning');
    setLastVerifiedClient(null);

    // Refresh member list from server in parallel during the scan animation
    const syncPromise = syncWithServer().catch(() => {});

    setTimeout(async () => {
      await Promise.race([
        syncPromise,
        new Promise(resolve => setTimeout(resolve, 600))
      ]);
      const result = verifyBiometricAccess(trimmed, { silent: true });
      
      if (result.granted) {
        if (!isMuted) {
          sounds.allowTerminalSoundWindow(2500);
          sounds.playAccessGranted();
        }
        const quote = getRandomMotivationalQuote(currentQuote);
        setCurrentQuote(quote);
        
        triggerTurnstileRelay(config.relayPulseDurationSeconds || 4);

        if (result.client) {
          setLastVerifiedClient({
            name: result.client.fullName,
            plan: result.client.membership.planName,
            daysRemaining: result.log.daysRemaining ?? result.client.membership.daysRemaining,
            reason: result.reason,
            avatarUrl: getGymAvatar(result.client.fullName, result.client.avatarUrl, result.client.gender),
            status: 'granted',
          });

          // Open Access Welcome & Authentication Dashboard with Birthday Check (handles single voice greeting)
          setWelcomeDashboardData({
            clientName: result.client.fullName,
            documentId: result.client.documentId,
            memberId: result.client.id,
            planName: result.client.membership.planName,
            daysRemaining: result.log.daysRemaining ?? result.client.membership.daysRemaining,
            avatarUrl: getGymAvatar(result.client.fullName, result.client.avatarUrl, result.client.gender),
            birthDate: result.client.birthDate,
            reason: result.reason || 'Membresía activa y al día',
            isNewRegistration: false,
            endDate: result.client.membership.endDate,
            startDate: result.client.membership.startDate,
            gender: result.client.gender,
          });
          setShowWelcomeDashboard(true);
        } else {
          announceAccess('Socio', true);
        }

        try {
          confetti({
            particleCount: 45,
            spread: 70,
            origin: { y: 0.5, x: 0.5 },
            colors: ['#FFFFFF', '#E4E4E7', '#A1A1AA', '#F4F4F6'],
          });
        } catch {
          // ignore
        }
      } else {
        if (!isMuted) {
          sounds.allowTerminalSoundWindow(2500);
          sounds.playAccessDenied();
        }
        if (result.client) {
          announceAccess(result.client.fullName, false);
          setLastVerifiedClient({
            name: result.client.fullName,
            plan: result.client.membership.planName,
            daysRemaining: result.log.daysRemaining ?? result.client.membership.daysRemaining,
            reason: result.reason,
            avatarUrl: getGymAvatar(result.client.fullName, result.client.avatarUrl, result.client.gender),
            status: 'denied',
          });
        } else {
          announceAccess('Socio no encontrado', false);
          setLastVerifiedClient({
            name: 'Huella / Credencial Desconocida',
            plan: 'Sin Membresía',
            reason: result.reason || 'No registrado en la base de datos',
            status: 'denied',
          });
        }
      }

      setScanStatus(result.granted ? 'granted' : 'denied');

      // Return to idle
      setTimeout(() => {
        setScanStatus('idle');
        setLastVerifiedClient(null);
      }, 4500);
    }, 850);
  };

  executeScanRef.current = executeScan;

  const normalizeMemberQuery = (val: string) =>
    (val || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const matchesMemberQuery = (m: Client, q: string): boolean => {
    const nameNorm = normalizeMemberQuery(m.fullName || '');
    const idNorm = (m.id || '').toLowerCase();
    const docNorm = (m.documentId || '').toLowerCase();
    const phoneDigits = (m.phone || '').replace(/\D/g, '');
    const qDigits = q.replace(/\D/g, '');
    return (
      idNorm.includes(q) ||
      docNorm.includes(q) ||
      nameNorm.includes(q) ||
      (qDigits.length >= 4 && phoneDigits.includes(qDigits))
    );
  };

  const directAccessMatches = React.useMemo(() => {
    const q = normalizeMemberQuery(searchQuery);
    if (q.length < 2) return [];
    return members.filter((m) => matchesMemberQuery(m, q)).slice(0, 5);
  }, [members, searchQuery]);

  const enrolledPadMembers = React.useMemo(() => {
    const bioPool = members.filter(
      (m) =>
        Boolean(m.biometricRegistered) ||
        Boolean((m as any).biometricEnrolled) ||
        Boolean((m as any).biometrics?.enrolled) ||
        Boolean(m.biometricHash) ||
        Boolean(m.biometricTemplate)
    );
    const baseList = bioPool.length > 0 ? bioPool : members;

    return [...baseList].sort((a, b) => {
      const aExpired = a.membership?.status === 'expired' || (a.membership?.daysRemaining ?? 0) < 0;
      const bExpired = b.membership?.status === 'expired' || (b.membership?.daysRemaining ?? 0) < 0;
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      return (a.fullName || '').localeCompare(b.fullName || '', 'es');
    });
  }, [members]);

  const handleDirectAccessSubmit = (explicitIdentifier?: string) => {
    const targetQuery = (explicitIdentifier ?? searchQuery).trim();
    if (!targetQuery) {
      setDirectAccessError('Toca la huella para escanear o escribe tu nombre/ID');
      directAccessInputRef.current?.focus({ preventScroll: true });
      return;
    }
    setDirectAccessError('');
    setSearchQuery('');
    setShowDirectAccessModal(false);
    executeScan(targetQuery);
  };

  // Automatic biometric pad click: validates search match if entered, or automatically scans an enrolled profile
  const handleDirectPadClick = () => {
    if (scanStatus === 'scanning') return;

    if (directAccessMatches.length === 1) {
      handleDirectAccessSubmit(directAccessMatches[0].id);
      return;
    }
    if (searchQuery.trim()) {
      handleDirectAccessSubmit();
      return;
    }

    const pool = enrolledPadMembers.length > 0 ? enrolledPadMembers : members;
    const validPool = pool.filter(
      (m) => !(m.membership?.status === 'expired' || (m.membership?.daysRemaining ?? 0) < 0)
    );
    const activeCandidates = validPool.length > 0 ? validPool : pool;

    if (activeCandidates.length === 0) {
      setDirectAccessError('No hay socios registrados aún — registra uno primero');
      directAccessInputRef.current?.focus({ preventScroll: true });
      return;
    }

    const randomPool =
      activeCandidates.length > 1 && lastAutoScannedIdRef.current
        ? activeCandidates.filter((m) => m.id !== lastAutoScannedIdRef.current)
        : activeCandidates;
    const chosenIdx = Math.floor(Math.random() * randomPool.length);
    const chosenMember = randomPool[chosenIdx];
    lastAutoScannedIdRef.current = chosenMember.id;
    handleDirectAccessSubmit(chosenMember.id);
  };

  const shouldKeepDirectInputActive = !(
    showVisitModal ||
    showNewMemberModal ||
    showDirectAccessModal ||
    showWelcomeDashboard ||
    isConfigModalOpen ||
    isHistoryModalOpen ||
    showGroupCompanionsModal ||
    showBiometricDashboard ||
    isDesignEditorOpen ||
    scanStatus === 'scanning'
  );

  // Keep search / USB scanner input continuously active & focused on the idle entry screen
  useEffect(() => {
    if (!shouldKeepDirectInputActive) return;
    const raf = window.requestAnimationFrame(() => {
      const inp = directAccessInputRef.current;
      if (inp && document.activeElement !== inp) {
        inp.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [shouldKeepDirectInputActive]);

  // Restore scanner input focus whenever the terminal window regains OS focus while idle
  useEffect(() => {
    const handleWindowFocus = () => {
      if (!isModalBlockingScanRef.current) {
        window.requestAnimationFrame(() => {
          const inp = directAccessInputRef.current;
          if (inp && document.activeElement !== inp) {
            inp.focus({ preventScroll: true });
          }
        });
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, []);

  // Clear buffered wedge keys whenever any modal opens/closes so stray keystrokes never carry over
  useEffect(() => {
    keyBufferRef.current = '';
    lastKeyTimeRef.current = 0;
  }, [
    showNewMemberModal,
    showVisitModal,
    showDirectAccessModal,
    showWelcomeDashboard,
    isConfigModalOpen,
    isHistoryModalOpen,
    showGroupCompanionsModal,
    showBiometricDashboard,
  ]);

  // Global Keyboard listener for USB Barcode / RFID scanner guns (hardware burst speed only, idle screen only)
  useEffect(() => {
    const clearKeyBuffer = () => {
      keyBufferRef.current = '';
      lastKeyTimeRef.current = 0;
    };

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearKeyBuffer();
        if (hasEscapeClosableModalRef.current) {
          if (showVisitModalRef.current) {
            cancelOrCloseVisitModal(true);
          }
          clearVisitTimers();
          clearEnrollTimer();
          sounds.clearTerminalSoundWindow();
          setShowNewMemberModal(false);
          setShowVisitModal(false);
          setShowDirectAccessModal(false);
          setShowWelcomeDashboard(false);
          setIsConfigModalOpen(false);
          setIsHistoryModalOpen(false);
          setShowGroupCompanionsModal(false);
          setShowBiometricDashboard(false);
          setDirectAccessError('');
          setSearchQuery('');
          return;
        }
        if (document.fullscreenElement || isFullScreen) {
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setIsFullScreen(false);
          if (onExitFullScreen) onExitFullScreen();
        }
        return;
      }

      // Never intercept shortcuts, held-key auto-repeats, or anything while a modal is active
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isModalBlockingScanRef.current) {
        clearKeyBuffer();
        return;
      }

      // Don't intercept if user is already typing inside an input/textarea/select
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'OPTION' ||
          target.isContentEditable)
      ) {
        clearKeyBuffer();
        return;
      }

      const isFocusedButtonOrLink =
        target &&
        (target.tagName === 'BUTTON' ||
          target.tagName === 'A' ||
          (typeof target.closest === 'function' && Boolean(target.closest('button, a'))));

      if (e.key === 'Shift' || e.key === 'CapsLock') return;

      // Keep YA TENGO MEMBRESÍA input always active: pressing any printable key on the idle screen focuses and populates it
      if (e.key.length === 1 && !(isFocusedButtonOrLink && e.key === ' ')) {
        const inp = directAccessInputRef.current;
        if (inp) {
          e.preventDefault();
          inp.focus({ preventScroll: true });
          const nextVal = (inp.value || '') + e.key;
          inp.value = nextVal;
          setSearchQuery(nextVal);
          setDirectAccessError((prev) => (prev ? '' : prev));
          clearKeyBuffer();
          return;
        }
      }

      if (isFocusedButtonOrLink) {
        clearKeyBuffer();
        return;
      }

      const now = Date.now();
      // Genuine USB HID barcode / RFID scanners emit keystrokes sequentially within < 80ms
      if (now - lastKeyTimeRef.current > 80) {
        keyBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const scannedCode = keyBufferRef.current.trim();
        clearKeyBuffer();
        if (scannedCode.length >= 3 && /[a-zA-Z0-9]/.test(scannedCode) && scanStatusRef.current !== 'scanning') {
          executeScanRef.current(scannedCode);
        }
      } else if (e.key.length === 1 && e.key !== ' ') {
        keyBufferRef.current += e.key;
      } else {
        clearKeyBuffer();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFull = !!document.fullscreenElement || 
        (window.innerHeight >= window.screen.height - 10 && window.innerWidth >= window.screen.width - 10);
      setIsFullScreen(isNowFull);
      if (!isNowFull && onExitFullScreen) {
        onExitFullScreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('resize', handleFullscreenChange);

    let removeElectronListener: (() => void) | undefined;
    const electronApi = (window as any).electronAPI;
    if (electronApi?.onFullscreenChange) {
      removeElectronListener = electronApi.onFullscreenChange((isFull: boolean) => {
        setIsFullScreen(Boolean(isFull));
      });
    }
    if (electronApi?.isFullScreen) {
      electronApi.isFullScreen().then((isFull: boolean) => {
        setIsFullScreen(Boolean(isFull));
      }).catch(() => {});
    }

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('resize', handleFullscreenChange);
      if (removeElectronListener) removeElectronListener();
    };
  }, [onExitFullScreen]);

  // Background preset cycler synced with terminalDesign
  const toggleBackground = () => {
    const curIdx = TERMINAL_BG_PRESETS.findIndex(p => p.id === terminalDesign.background.presetId);
    const nextIdx = (curIdx >= 0 ? curIdx + 1 : 1) % TERMINAL_BG_PRESETS.length;
    const nextOpt = TERMINAL_BG_PRESETS[nextIdx];
    updateTerminalDesign({
      ...terminalDesign,
      updatedAt: new Date().toISOString(),
      background: {
        ...terminalDesign.background,
        presetId: nextOpt.id,
        fit: nextOpt.defaultFit,
        position: nextOpt.defaultPosition,
      },
    });
    setBgToast(`Fondo: ${nextOpt.name}`);
    setTimeout(() => setBgToast(null), 2500);
  };

  const handleOpenDesignEditor = () => {
    setDesignDraft(terminalDesign);
    setSelectedDesignCardId('new');
    setIsDesignEditorOpen(true);
  };

  const handleSaveDesignEditor = (designToSave: TerminalEntryDesignConfig) => {
    updateTerminalDesign({
      ...designToSave,
      updatedAt: new Date().toISOString(),
    });
    setIsDesignEditorOpen(false);
    setDesignDraft(null);
    setBgToast('Diseño de entrada guardado');
    setTimeout(() => setBgToast(null), 2500);
  };
  const toggleFullScreen = () => {
    if ((window as any).electronAPI?.toggleFullScreen) {
      (window as any).electronAPI.toggleFullScreen();
      setIsFullScreen(!isFullScreen);
      return;
    }

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullScreen(true);
        setShowEscHint(true);
        setTimeout(() => setShowEscHint(false), 3500);
      }).catch(() => {
        setIsFullScreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullScreen(false);
        if (onExitFullScreen) onExitFullScreen();
      }).catch(() => {
        setIsFullScreen(false);
        if (onExitFullScreen) onExitFullScreen();
      });
    }
  };

  // Manual sync trigger
  const handleManualSync = async (): Promise<boolean> => {
    setIsSyncing(true);
    try {
      serverVersionRef.current = 0; // Force full check on manual request
      const connected = await syncWithServer();
      setLastSyncTime(new Date());
      setIsSyncing(false);
      return connected;
    } catch {
      setIsSyncing(false);
      return false;
    }
  };

  const handleSaveConfig = (newConfig: TerminalConfig) => {
    setConfig(newConfig);
    saveTerminalConfig(newConfig);
    serverVersionRef.current = 0;
    syncWithServer();
  };

  return (
    <div 
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget) toggleFullScreen();
      }}
      className="relative min-h-screen h-screen w-full overflow-y-auto text-gym-text flex flex-col justify-between font-sans select-none p-3 sm:p-4 lg:p-5 gap-3"
    >
      
            

      
      {/* BOTONES SUPERIORES DE ACCESO RÁPIDO: Ocultos cuando hay un modal o el editor abierto */}
      {!(showNewMemberModal || showVisitModal || showDirectAccessModal || showWelcomeDashboard || isConfigModalOpen || isHistoryModalOpen || isDesignEditorOpen) && (!isFullScreen ? (
        <div className="fixed top-2 right-3 z-40 flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={handleOpenDesignEditor}
            className="px-3.5 py-2 rounded-2xl bg-black/85 hover:bg-black border border-amber-400/50 text-amber-300 font-bold text-xs flex items-center gap-2 shadow-2xl transition-all cursor-pointer select-none"
            title="Abrir Editor de Pantalla de Acceso (imágenes, lugar, forma y diseño)"
          >
            <Palette className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">EDITAR DISEÑO</span>
          </button>
          <button
            onClick={toggleBackground}
            className="px-3.5 py-2 rounded-2xl bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/20 text-white font-bold text-xs flex items-center gap-2 shadow-2xl transition-all cursor-pointer select-none"
            title="Cambiar imagen de fondo oficial del gimnasio"
          >
            <Image className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">CAMBIAR FONDO</span>
          </button>
          <button
            onClick={toggleFullScreen}
            className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 shadow-2xl shadow-amber-500/40 transition-all cursor-pointer select-none"
            title="Activar Pantalla Completa"
          >
            <Maximize2 className="w-4 h-4" />
            <span>PANTALLA COMPLETA</span>
          </button>
        </div>
      ) : (
        <div className="fixed top-0 right-0 z-40 p-2 flex items-center gap-2 opacity-25 hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
          <button
            onClick={handleOpenDesignEditor}
            className="px-3 py-1.5 rounded-xl bg-black/85 hover:bg-black text-amber-300 border border-amber-400/50 text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-md cursor-pointer"
            title="Editar diseño de entrada"
          >
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            <span>Diseñar</span>
          </button>
          <button
            onClick={toggleFullScreen}
            className="px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black text-white/80 hover:text-white border border-white/20 text-xs font-bold flex items-center gap-1.5 shadow-2xl backdrop-blur-md cursor-pointer"
            title="Salir de Pantalla Completa (o presiona ESC / F11)"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Salir Pantalla Completa (ESC)</span>
          </button>
        </div>
      ))}

      {/* Toast de confirmación de cambio de fondo */}
      {bgToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-black/85 backdrop-blur-xl border border-amber-400/80 text-amber-300 font-bold text-xs sm:text-sm shadow-[0_0_30px_rgba(245,158,11,0.4)] animate-in fade-in zoom-in-95 duration-200 flex items-center gap-2">
          <Image className="w-4 h-4 text-amber-400" />
          <span>{bgToast}</span>
        </div>
      )}

      {/* Lienzo Dinámico de Entrada (Fondo + Tarjetas Personalizables en Forma, Lugar y Diseño) */}
      <div
        className="fixed inset-0 z-0"
        onClick={(e) => {
          if (
            shouldKeepDirectInputActive &&
            e.target instanceof HTMLElement &&
            !e.target.closest('button, input, textarea, select, a')
          ) {
            directAccessInputRef.current?.focus({ preventScroll: true });
          }
        }}
      >
        <TerminalEntryCanvas
          design={activeDesign}
          isEditing={isDesignEditorOpen}
          selectedCardId={selectedDesignCardId}
          onSelectCard={(id) => setSelectedDesignCardId(id)}
          onChangeDesign={(next) => setDesignDraft(next)}
          renderCardOverlay={(card) => {
            if (card.id !== 'member') return null;
            return (
              <div
                onClick={(e) => e.stopPropagation()}
                className="w-full h-full min-h-0 flex flex-col items-center justify-between gap-1.5 sm:gap-2 p-1.5 sm:p-2 text-white relative"
              >
                {/* Encabezado: YA TENGO MEMBRESÍA + estado en vivo */}
                <div className="w-full flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Fingerprint className="w-4 h-4 text-[#22c55e] shrink-0" />
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
                      {card.title || 'YA TENGO MEMBRESÍA'}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1 ${
                      scanStatus === 'scanning'
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                        : scanStatus === 'granted'
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : scanStatus === 'denied'
                            ? 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                            : 'bg-[#22c55e]/15 border-[#22c55e]/40 text-[#4ade80]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        scanStatus === 'scanning'
                          ? 'bg-amber-400 animate-ping'
                          : scanStatus === 'granted'
                            ? 'bg-emerald-400'
                            : scanStatus === 'denied'
                              ? 'bg-rose-400'
                              : 'bg-[#22c55e] animate-pulse'
                      }`}
                    />
                    {scanStatus === 'scanning'
                      ? 'Validando...'
                      : scanStatus === 'granted'
                        ? 'Acceso libre'
                        : scanStatus === 'denied'
                          ? 'Denegado'
                          : 'Huella lista'}
                  </span>
                </div>

                {/* Escáner biométrico SIEMPRE ABIERTO automático al clic */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDirectPadClick();
                  }}
                  title={
                    searchQuery.trim()
                      ? `Validar acceso para "${searchQuery.trim()}"`
                      : 'Toca aquí para leer huella y dar acceso'
                  }
                  className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center gap-1 cursor-pointer group bg-transparent border-0 transition-transform duration-300 hover:scale-[1.03]"
                >
                  <div className="relative aspect-square h-[82%] max-h-[165px] sm:max-h-[190px] flex items-center justify-center">
                    <BiometricFingerprintSvg
                      className="w-full h-full"
                      variant="monster"
                      isScanning={scanStatus === 'scanning'}
                      isSuccess={scanStatus === 'granted'}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-wide shrink-0 transition-colors ${
                      scanStatus === 'scanning'
                        ? 'text-amber-300 animate-pulse'
                        : scanStatus === 'granted'
                          ? 'text-emerald-300'
                          : scanStatus === 'denied'
                            ? 'text-rose-300'
                            : 'text-zinc-400 group-hover:text-[#4ade80]'
                    }`}
                  >
                    {scanStatus === 'scanning'
                      ? 'Leyendo huella y verificando...'
                      : scanStatus === 'granted'
                        ? '¡Acceso autorizado!'
                        : scanStatus === 'denied'
                          ? 'Acceso denegado'
                          : 'Toca la huella para escanear'}
                  </span>
                </button>

                {/* Barra rápida de búsqueda / lector automático */}
                <div className="w-full relative shrink-0 space-y-1">
                  {directAccessMatches.length > 0 && (
                    <div className="absolute bottom-full left-0 right-0 mb-1.5 max-h-40 overflow-y-auto rounded-2xl bg-[#090d13]/98 backdrop-blur-xl border border-[#22c55e]/40 shadow-2xl divide-y divide-white/[0.06] z-40">
                      {directAccessMatches.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleDirectAccessSubmit(m.id)}
                          className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-[#22c55e]/15 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={getGymAvatar(m.fullName, m.avatarUrl, m.gender)}
                              alt={m.fullName}
                              className="w-6 h-6 rounded-full object-contain bg-white p-0.5 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-white truncate">{m.fullName}</div>
                              <div className="text-[10px] text-zinc-400 truncate">
                                {m.id} • {m.membership.planName}
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-[#4ade80] shrink-0">
                            Entrar &rarr;
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1 min-w-0">
                      <Search className="w-3.5 h-3.5 text-[#4ade80] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                      <input
                        ref={!showDirectAccessModal ? directAccessInputRef : undefined}
                        type="text"
                        autoFocus={shouldKeepDirectInputActive}
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (directAccessError) setDirectAccessError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (directAccessMatches.length === 1) {
                              handleDirectAccessSubmit(directAccessMatches[0].id);
                            } else {
                              handleDirectAccessSubmit();
                            }
                          }
                        }}
                        placeholder="Escanea huella, código o nombre..."
                        className="w-full pl-8 pr-2.5 py-1.5 sm:py-2 bg-white/[0.08] border border-[#22c55e]/55 focus:border-[#22c55e] rounded-xl text-xs text-white placeholder-zinc-300 ring-1 ring-[#22c55e]/20 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/35 transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={scanStatus === 'scanning'}
                      onClick={() => {
                        if (directAccessMatches.length === 1) {
                          handleDirectAccessSubmit(directAccessMatches[0].id);
                        } else {
                          handleDirectAccessSubmit();
                        }
                      }}
                      className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-[#22c55e] hover:bg-emerald-400 active:scale-[0.98] border border-emerald-300/40 shadow-[0_0_16px_rgba(34,197,94,0.35)] disabled:opacity-50 disabled:cursor-wait text-black font-black text-xs transition-all cursor-pointer shrink-0"
                    >
                      Entrar
                    </button>
                  </div>

                  {directAccessError && (
                    <p className="text-[10px] text-amber-300 font-medium text-center truncate">
                      {directAccessError}
                    </p>
                  )}

                  {!directAccessError && scanStatus === 'denied' && lastVerifiedClient && (
                    <p className="text-[10px] text-rose-300 font-semibold text-center truncate">
                      {lastVerifiedClient.name}: {lastVerifiedClient.reason}
                    </p>
                  )}
                </div>
              </div>
            );
          }}
          onCardClick={(id) => {
            if (id === 'new') {
              setNewMemberStep(1);
              setStepError('');
              setNewClientPaymentMethod('');
              setShowNewMemberModal(true);
            } else if (id === 'visit') {
              clearVisitTimers();
              isVisitSubmittingRef.current = false;
              pendingVisitRequestIdRef.current = null;
              setPendingVisitRequestId(null);
              setVisitModalState('form');
              showVisitModalRef.current = true;
              setShowVisitModal(true);
            } else if (id === 'member') {
              handleDirectPadClick();
            }
          }}
        />
      </div>

      {/* Turnstile Relay Active Banner when open */}
      {relayRemainingSeconds > 0 && (
        <div className="w-full max-w-2xl mx-auto mb-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500/30 via-emerald-500/40 to-emerald-500/30 border border-emerald-400/80 shadow-glow-green text-center animate-in zoom-in-95 duration-200 z-20 shrink-0 pointer-events-none">
          <div className="flex items-center justify-center gap-2.5 text-emerald-200 font-black text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-spin" />
            <span>ACCESO CONCEDIDO (PASO LIBRE)</span>
            <span className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-mono text-xs font-black shadow-md">
              {relayRemainingSeconds}s
            </span>
          </div>
        </div>
      )}

      {/* Verified Client Material Alert Banner */}
      {lastVerifiedClient && scanStatus !== 'idle' && (
        <div className={'w-full max-w-2xl mx-auto mb-2 px-4 py-3.5 rounded-[24px] border backdrop-blur-xl flex items-center justify-between gap-4 animate-in zoom-in-95 duration-200 shadow-[0_12px_32px_rgba(0,0,0,0.55)] z-20 shrink-0 ' + (
          lastVerifiedClient.status === 'granted'
            ? 'bg-[#131b18]/95 border-emerald-500/30 text-white'
            : 'bg-[#1e1316]/95 border-rose-500/30 text-white'
        )}>
          <div className="flex items-center gap-3.5 min-w-0">
            <img 
              src={getGymAvatar(lastVerifiedClient.name, lastVerifiedClient.avatarUrl)} 
              alt={lastVerifiedClient.name} 
              className="w-11 h-11 rounded-full object-contain bg-white p-0.5 ring-2 ring-white/15 shrink-0"
            />
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-white truncate">{lastVerifiedClient.name}</h4>
              <p className="text-xs text-zinc-300 truncate">{lastVerifiedClient.reason}</p>
              {lastVerifiedClient.plan && (
                <span className="inline-block mt-0.5 text-[11px] text-amber-300 font-medium">
                  Plan: {lastVerifiedClient.plan}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={() => { setLastVerifiedClient(null); setScanStatus('idle'); }}
            className="px-4 py-1.5 bg-white/[0.08] hover:bg-white/[0.15] rounded-full text-xs font-medium text-zinc-200 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Editor Flotante en Vivo sobre la Terminal */}
      {isDesignEditorOpen && (
        <div className="fixed top-3 right-3 bottom-3 w-[360px] max-w-[92vw] z-50">
          <TerminalDesignEditorControls
            design={activeDesign}
            onChange={(next) => setDesignDraft(next)}
            onSave={handleSaveDesignEditor}
            onClose={() => {
              setIsDesignEditorOpen(false);
              setDesignDraft(null);
            }}
            selectedCardId={selectedDesignCardId}
            onSelectCard={setSelectedDesignCardId}
            compact={true}
          />
        </div>
      )}

      {/* MODAL 1: REGISTRO CLIENTE NUEVO - DISEÑO MATERIAL 3 */}
      {showNewMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-3 overflow-y-auto">
          <div
            className="relative bg-[#12161f]/96 backdrop-blur-2xl border border-white/10 rounded-[26px] max-w-[660px] w-full max-h-[96vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.75)] animate-in zoom-in-95 duration-200 my-auto"
            style={{ fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
          >
            {/* Subtle ambient gym texture in background keeping clean Material contrast */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[28px]">
              <img 
                src={modalGymBg} onError={(e) => { (e.currentTarget as HTMLImageElement).src = './modal-gym-bg.jpg'; }} alt="Fondo Mancuernas Fitness" 
                className="w-full h-full object-cover object-bottom opacity-20 select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#12161f]/92 via-[#12161f]/85 to-[#0e1118]/96 pointer-events-none" />
              <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-400/70 to-transparent pointer-events-none" />
            </div>
            
            {/* Header Material (siempre visible arriba con botón Atrás) */}
            <div className="relative z-10 border-b border-white/[0.08] px-5 pt-3 pb-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      if ((newMemberStep as number) === 4) {
                        cancelPendingRegistration(3, false);
                      } else if (newMemberStep > 1) {
                        setStepError('');
                        setNewMemberStep((newMemberStep - 1) as 1 | 2 | 3);
                      } else {
                        showNewMemberModalRef.current = false;
                        setShowNewMemberModal(false);
                        setNewMemberStep(1);
                        setStepError('');
                      }
                    }}
                    className="px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    title={(newMemberStep as number) === 4 ? 'Cancelar y volver al paso anterior' : newMemberStep > 1 ? 'Regresar al paso anterior' : 'Volver a la pantalla principal'}
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                    <span>Atrás</span>
                  </button>
                  <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-400/25 flex items-center justify-center text-amber-400 shrink-0 hidden sm:flex">
                    <UserPlus className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight truncate">
                      Registro de cliente nuevo
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-normal truncate">
                      {newMemberStep === 1
                        ? 'Datos personales del socio'
                        : newMemberStep === 2
                          ? 'Selecciona mensualidad o plan'
                          : newMemberStep === 3
                            ? 'Método de pago y huella obligatoria'
                            : 'Huella registrada • Aviso enviado al RP'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cancelPendingRegistration(1, true);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Material Progress Stepper (clic en pasos anteriores para volver) */}
              <div className="grid grid-cols-3 gap-2.5 mt-2">
                <button
                  type="button"
                  disabled={newMemberStep <= 1}
                  onClick={() => {
                    if (newMemberStep > 1) {
                      cancelPendingRegistration(1, false);
                    }
                  }}
                  className={`flex flex-col gap-0.5 text-left ${newMemberStep > 1 ? 'cursor-pointer group' : 'cursor-default'}`}
                >
                  <div className={`h-1 w-full rounded-full ${newMemberStep >= 1 ? 'bg-amber-400' : 'bg-white/10'}`} />
                  <span className={`text-[11px] font-medium text-center w-full ${newMemberStep === 1 ? 'text-amber-300' : newMemberStep > 1 ? 'text-zinc-300 group-hover:text-amber-200' : 'text-zinc-400'}`}>1. Datos</span>
                </button>
                <button
                  type="button"
                  disabled={newMemberStep <= 2}
                  onClick={() => {
                    if (newMemberStep > 2) {
                      cancelPendingRegistration(2, false);
                    }
                  }}
                  className={`flex flex-col gap-0.5 text-left ${newMemberStep > 2 ? 'cursor-pointer group' : 'cursor-default'}`}
                >
                  <div className={`h-1 w-full rounded-full ${newMemberStep >= 2 ? 'bg-amber-400' : 'bg-white/10'}`} />
                  <span className={`text-[11px] font-medium text-center w-full ${newMemberStep === 2 ? 'text-amber-300' : newMemberStep > 2 ? 'text-zinc-300 group-hover:text-amber-200' : 'text-zinc-400'}`}>2. Plan</span>
                </button>
                <div className="flex flex-col gap-0.5">
                  <div className={`h-1 w-full rounded-full ${newMemberStep >= 3 ? 'bg-amber-400' : 'bg-white/10'}`} />
                  <span className={`text-[11px] font-medium text-center ${newMemberStep === 3 ? 'text-amber-300' : 'text-zinc-400'}`}>3. Pago y huella</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegisterNewMember} className="relative z-10 flex-1 min-h-0 overflow-y-auto px-5 pt-2.5 pb-3.5 space-y-2.5">
              
              {/* PASO 1: DATOS PERSONALES */}
              {newMemberStep === 1 && (
                <div className="space-y-3.5 animate-in fade-in-50 duration-200">
                  {/* Nombre Completo */}
                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>Nombre completo *</span>
                    </label>
                    <input 
                      type="text"
                      required
                      autoFocus
                      value={newClientName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewClientName(val);
                        if (stepError) setStepError('');
                        if (!genderManuallySelected && val.trim()) {
                          setNewClientGender(detectGender(val));
                        }
                      }}
                      placeholder="Ej. Andrea García Morales"
                      className="w-full px-4 py-2.5 bg-[#1b202b] border border-white/12 rounded-2xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                    />
                  </div>

                  {/* Opción de Género: Hombre / Mujer */}
                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Género *</span>
                      </span>
                      <span className="text-[11px] text-zinc-400">Toca para seleccionar</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNewClientGender('female');
                          setGenderManuallySelected(true);
                        }}
                        className={`flex items-center gap-2.5 py-2 px-3.5 rounded-2xl font-medium text-sm transition-all border cursor-pointer ${
                          newClientGender === 'female'
                            ? 'bg-pink-500/15 border-pink-400/70 text-white ring-1 ring-pink-400/30'
                            : 'bg-[#1b202b] border-white/10 text-zinc-300 hover:text-white hover:bg-[#222836]'
                        }`}
                      >
                        <img src={FEMALE_CLIENT_AVATAR} alt="Mujer" className="w-8 h-8 rounded-full object-contain bg-white p-0.5 shrink-0" />
                        <span>Mujer</span>
                        {newClientGender === 'female' && (
                          <CheckCircle2 className="w-4 h-4 text-pink-400 ml-auto shrink-0" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewClientGender('male');
                          setGenderManuallySelected(true);
                        }}
                        className={`flex items-center gap-2.5 py-2 px-3.5 rounded-2xl font-medium text-sm transition-all border cursor-pointer ${
                          newClientGender === 'male'
                            ? 'bg-blue-500/15 border-blue-400/70 text-white ring-1 ring-blue-400/30'
                            : 'bg-[#1b202b] border-white/10 text-zinc-300 hover:text-white hover:bg-[#222836]'
                        }`}
                      >
                        <img src={MALE_CLIENT_AVATAR} alt="Hombre" className="w-8 h-8 rounded-full object-contain bg-white p-0.5 shrink-0" />
                        <span>Hombre</span>
                        {newClientGender === 'male' && (
                          <CheckCircle2 className="w-4 h-4 text-blue-400 ml-auto shrink-0" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Fecha de Cumpleaños y Edad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-400" />
                          <span>Fecha de cumpleaños *</span>
                        </span>
                        <span className="text-[11px] text-zinc-400">dd/mm/aaaa</span>
                      </label>
                      <BirthDatePickerField
                        displayValue={newClientBirthDateDisplay}
                        isoValue={newClientBirthDate}
                        required
                        onInputChange={(val) => {
                          handleBirthDateInputChange(val);
                          if (stepError) setStepError('');
                        }}
                        onSelectDate={(iso) => {
                          handleCalendarDateChange(iso);
                          if (stepError) setStepError('');
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Edad *</span>
                        </span>
                        {newClientAge ? (
                          <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" /> Calculada ({newClientAge} años)
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-400 font-medium">(Automática)</span>
                        )}
                      </label>
                      <div className="relative">
                        <input 
                          type="number"
                          required
                          min="8"
                          max="110"
                          value={newClientAge}
                          onChange={(e) => {
                            handleAgeChange(e.target.value);
                            if (stepError) setStepError('');
                          }}
                          placeholder="Ej. 25"
                          className={`w-full px-4 py-2.5 bg-[#1b202b] border rounded-2xl text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all pr-16 tabular-nums ${
                            newClientAge ? 'border-emerald-500/45 text-emerald-300' : 'border-white/12'
                          }`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-300 font-medium bg-white/[0.07] px-2.5 py-0.5 rounded-full pointer-events-none">
                          años
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Correo y Teléfono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>Correo (Opcional)</span>
                      </label>
                      <input 
                        type="email"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        placeholder="andrea@ejemplo.com"
                        className="w-full px-4 py-2.5 bg-[#1b202b] border border-white/12 rounded-2xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                        Teléfono / WhatsApp
                      </label>
                      <input 
                        type="tel"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        placeholder="Ej. 8888-9999"
                        className="w-full px-4 py-2.5 bg-[#1b202b] border border-white/12 rounded-2xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Error Alert */}
                  {stepError && (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{stepError}</span>
                    </div>
                  )}

                  {/* Botones Paso 1 */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewMemberModal(false);
                        setNewMemberStep(1);
                        setStepError('');
                      }}
                      className="flex-1 py-2.5 px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-sm font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep1}
                      className="flex-1 py-2.5 px-5 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-sm font-semibold text-[#1a1200] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>Continuar (Paso 2/3)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 2: MENSUALIDAD / PLAN */}
              {newMemberStep === 2 && (
                <div className="space-y-2.5 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mensualidad o plan *</span>
                    </label>
                    <span className="text-[11px] text-zinc-400">Toca para seleccionar</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[270px] overflow-y-auto pr-1">
                    {availablePlans.map((plan) => {
                      const isSelected = newClientPlan === plan.name;
                      const planSize = getGroupPackageSize(plan.name, plan.type);
                      return (
                        <div
                          key={plan.id}
                          onClick={() => {
                            setNewClientPlan(plan.name);
                            const nextReq = Math.max(0, planSize - 1);
                            setGroupCompanions((prev) => resizeGroupCompanions(prev, nextReq));
                            if (stepError) setStepError('');
                          }}
                          className={`p-2.5 rounded-2xl border cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-400/75 ring-1 ring-amber-400/30'
                              : 'bg-[#1b202b] border-white/10 hover:border-white/20 hover:bg-[#222836]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-semibold leading-tight ${
                              isSelected ? 'text-amber-200' : 'text-white'
                            }`}>
                              {plan.name}
                            </span>
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                            ) : (
                              <span className="w-4 h-4 rounded-full border border-zinc-500 shrink-0" />
                            )}
                          </div>
                          <div className="mt-2 flex items-baseline justify-between gap-1.5 flex-wrap">
                            <span className={`text-base font-semibold tabular-nums ${
                              isSelected ? 'text-amber-300' : 'text-amber-400'
                            }`}>
                              ${plan.price.toLocaleString('es-MX')}
                            </span>
                            <div className="flex items-center gap-1">
                              {planSize > 1 && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/30 inline-flex items-center gap-1">
                                  <Users className="w-2.5 h-2.5" />
                                  <span>{planSize} personas</span>
                                </span>
                              )}
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                isSelected 
                                  ? 'text-amber-200 bg-amber-500/20' 
                                  : 'text-zinc-300 bg-white/[0.06]'
                              }`}>
                                {plan.durationDays} días
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Aviso contextual rápido si el plan elegido incluye 3 o 4 personas */}
                  {activeGroupSize > 1 && (
                    <div
                      className={`p-3 rounded-2xl border space-y-2 ${
                        allGroupCompanionsReady
                          ? 'bg-[#15221d] border-emerald-500/35'
                          : 'bg-amber-500/10 border-amber-400/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              allGroupCompanionsReady
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-amber-400/20 text-amber-300'
                            }`}
                          >
                            <Users className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white leading-tight">
                              {allGroupCompanionsReady
                                ? `✓ ${activeGroupSize} integrantes registrados correctamente`
                                : `Requiere registrar ${requiredCompanionsCount} acompañantes más`}
                            </p>
                            <p className="text-[11px] text-zinc-300 leading-tight mt-0.5">
                              {allGroupCompanionsReady
                                ? 'Todos quedaron listos sin volver atrás.'
                                : `Titular ya listo (${1 + completedCompanionsCount}/${activeGroupSize}). Agrégalos rápido antes de continuar.`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGroupCompanions(resizeGroupCompanions(groupCompanions, requiredCompanionsCount));
                            setShowGroupCompanionsModal(true);
                          }}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
                            allGroupCompanionsReady
                              ? 'bg-white/[0.08] hover:bg-white/[0.15] text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-400 hover:bg-amber-300 text-[#1a1200] shadow-sm'
                          }`}
                        >
                          <span>
                            {allGroupCompanionsReady
                              ? 'Ver / Editar grupo'
                              : `Registrar ${requiredCompanionsCount - completedCompanionsCount} ahora`}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 capitalize">
                          ✓ 1. {(newClientName || 'Titular').trim().split(' ')[0]}
                        </span>
                        {activeGroupCompanions.map((comp, cIdx) => {
                          const done = isGroupCompanionComplete(comp);
                          return (
                            <button
                              key={cIdx}
                              type="button"
                              onClick={() => {
                                setGroupCompanions(resizeGroupCompanions(groupCompanions, requiredCompanionsCount));
                                setShowGroupCompanionsModal(true);
                              }}
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-pointer capitalize ${
                                done
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : 'bg-[#1b202b] text-zinc-400 border-white/10 hover:text-white'
                              }`}
                            >
                              {done ? `✓ ${cIdx + 2}. ${comp.fullName.trim().split(' ')[0]}` : `${cIdx + 2}. Falta registrar`}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="bg-[#1b202b] border border-white/10 px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-medium">Plan seleccionado</span>
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5 tabular-nums">
                      <span>{newClientPlan}</span>
                      <span className="text-zinc-400 font-normal">
                        (${availablePlans.find(p => p.name === newClientPlan)?.price.toLocaleString('es-MX') || 420} MXN)
                      </span>
                    </span>
                  </div>

                  {stepError && (
                    <div className="px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{stepError}</span>
                    </div>
                  )}

                  {/* Botones Paso 2 */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStepError('');
                        setNewMemberStep(1);
                      }}
                      className="flex-1 py-2.5 px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-sm font-medium text-zinc-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Volver (Paso 1/3)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep2}
                      className="flex-1 py-2.5 px-5 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-sm font-semibold text-[#1a1200] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <span>
                        {requiredCompanionsCount > 0 && !allGroupCompanionsReady
                          ? `Registrar ${requiredCompanionsCount - completedCompanionsCount} acompañantes`
                          : 'Continuar (Paso 3/3)'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 3: INFORMACIÓN IMPORTANTE, PAGO & HUELLA BIOMÉTRICA */}
              {newMemberStep === 3 && (() => {
                const slotEnrolled = activeBiometricSlot === 0
                  ? newClientFingerprintEnrolled
                  : Boolean(activeGroupCompanions[activeBiometricSlot - 1]?.fingerprintEnrolled);
                const slotFinger = activeBiometricSlot === 0
                  ? selectedFinger
                  : (activeGroupCompanions[activeBiometricSlot - 1]?.selectedFinger || selectedFinger);

                return (
                <div className="space-y-2 animate-in fade-in-50 duration-200">
                  {/* Resumen Material tipo Tarjeta de Cuenta */}
                  <div className="bg-[#1b202b] border border-white/10 p-2.5 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
                          newClientGender === 'female' ? 'bg-pink-500/15 text-pink-300 border border-pink-400/30' : 'bg-blue-500/15 text-blue-300 border border-blue-400/30'
                        }`}>
                          {activeGroupSize > 1 ? <Users className="w-4 h-4 text-amber-300" /> : (newClientGender === 'female' ? '👩' : '👨')}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-medium text-zinc-400 block leading-tight">
                            {activeGroupSize > 1 ? `Grupo (${activeGroupSize} integrantes)` : 'Socio'}
                          </span>
                          <p className="text-sm font-semibold text-white capitalize leading-tight truncate">{newClientName}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-medium text-amber-400 block leading-tight">Plan elegido</span>
                        <span className="text-xs font-semibold text-white block leading-tight">{newClientPlan}</span>
                        <span className="text-xs font-bold text-amber-300 tabular-nums leading-tight">
                          ${(availablePlans.find(p => p.name === newClientPlan)?.price || 420).toLocaleString('es-MX')} MXN
                        </span>
                      </div>
                    </div>

                    {activeGroupSize > 1 && (
                      <div className="pt-1.5 border-t border-white/[0.08] flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 capitalize">
                          1. {newClientName.trim()}
                        </span>
                        {activeGroupCompanions.map((comp, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-200 border border-white/10 capitalize"
                          >
                            {idx + 2}. {comp.fullName.trim()}
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => setShowGroupCompanionsModal(true)}
                          className="ml-auto text-[10px] font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                        >
                          Editar integrantes
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Selección obligatoria de forma de pago */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                        <span>¿Cómo vas a pagar? *</span>
                      </label>
                      <span className="text-[10px] text-amber-300/90 font-semibold">Obligatorio</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNewClientPaymentMethod('cash');
                          if (stepError) setStepError('');
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                          newClientPaymentMethod === 'cash'
                            ? 'bg-amber-400 text-[#1a1200] border-amber-300 shadow-sm'
                            : 'bg-[#1b202b] text-zinc-200 border-white/10 hover:bg-[#222836] hover:text-white'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5 shrink-0" />
                        <span>Efectivo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewClientPaymentMethod('card');
                          if (stepError) setStepError('');
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                          newClientPaymentMethod === 'card'
                            ? 'bg-amber-400 text-[#1a1200] border-amber-300 shadow-sm'
                            : 'bg-[#1b202b] text-zinc-200 border-white/10 hover:bg-[#222836] hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5 shrink-0" />
                        <span>Tarjeta</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewClientPaymentMethod('transfer');
                          if (stepError) setStepError('');
                        }}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                          newClientPaymentMethod === 'transfer'
                            ? 'bg-amber-400 text-[#1a1200] border-amber-300 shadow-sm'
                            : 'bg-[#1b202b] text-zinc-200 border-white/10 hover:bg-[#222836] hover:text-white'
                        }`}
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                        <span>Transf.</span>
                      </button>
                    </div>
                  </div>

                  {/* SECCIÓN BIOMÉTRICA OBLIGATORIA: LAYOUT BALANCEADO EN 2 COLUMNAS */}
                  <div className={`p-2.5 sm:p-3 rounded-2xl border space-y-2 ${
                    allRequiredFingerprintsEnrolled
                      ? 'bg-[#15221d] border-emerald-500/40'
                      : 'bg-[#1b202b] border-amber-500/35'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                        <Fingerprint className={`w-3.5 h-3.5 ${allRequiredFingerprintsEnrolled ? 'text-emerald-400' : 'text-amber-400'}`} />
                        <span>Registro de huella *</span>
                      </label>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          allRequiredFingerprintsEnrolled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                            : 'text-amber-300/95 bg-amber-500/15 border border-amber-400/35'
                        }`}
                      >
                        {allRequiredFingerprintsEnrolled
                          ? activeGroupSize > 1
                            ? `✓ ${activeGroupSize}/${activeGroupSize} huellas listas`
                            : '✓ Huella registrada'
                          : activeGroupSize > 1
                            ? `Obligatorio (${enrolledFingerprintsCount}/${activeGroupSize})`
                            : 'Obligatorio'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-3">
                      {/* Controles biométricos a la izquierda */}
                      <div className="min-w-0 space-y-2">
                        {activeGroupSize > 1 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveBiometricSlot(0);
                                if (stepError) setStepError('');
                              }}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer capitalize ${
                                activeBiometricSlot === 0
                                  ? 'bg-amber-400 text-[#1a1200] border-amber-300 font-semibold'
                                  : newClientFingerprintEnrolled
                                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                    : 'bg-white/[0.05] text-zinc-300 border-white/10 hover:text-white'
                              }`}
                            >
                              {newClientFingerprintEnrolled ? '✓ ' : ''}1. {newClientName.trim().split(' ')[0] || 'Titular'}
                            </button>
                            {activeGroupCompanions.map((comp, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setActiveBiometricSlot(idx + 1);
                                  if (stepError) setStepError('');
                                }}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer capitalize ${
                                  activeBiometricSlot === idx + 1
                                    ? 'bg-amber-400 text-[#1a1200] border-amber-300 font-semibold'
                                    : comp.fingerprintEnrolled
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-white/[0.05] text-zinc-300 border-white/10 hover:text-white'
                                }`}
                              >
                                {comp.fingerprintEnrolled ? '✓ ' : ''}{idx + 2}. {comp.fullName.trim().split(' ')[0] || `Persona ${idx + 2}`}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="space-y-1">
                          <span className="text-[11px] text-zinc-400 block">Dedo a registrar:</span>
                          <div className="flex items-center">
                            {['Índice Derecho'].map((finger) => (
                              <button
                                key={finger}
                                type="button"
                                onClick={() => {
                                  setSelectedFinger(finger);
                                  if (activeBiometricSlot > 0) {
                                    setGroupCompanions((prev) =>
                                      resizeGroupCompanions(
                                        prev,
                                        Math.max(activeBiometricSlot, requiredCompanionsCount)
                                      ).map((c, idx) =>
                                        idx === activeBiometricSlot - 1
                                          ? { ...c, selectedFinger: finger }
                                          : c
                                      )
                                    );
                                  }
                                }}
                                className="py-1.5 px-5 rounded-full text-xs font-semibold transition-all border text-center cursor-pointer bg-amber-400 text-[#1a1200] border-amber-300 shadow-sm"
                              >
                                {finger}
                              </button>
                            ))}
                          </div>
                        </div>

                        <p className={`text-[11px] font-medium ${
                          slotEnrolled
                            ? 'text-emerald-300'
                            : biometricScanState === 'scanning'
                              ? 'text-amber-300'
                              : 'text-zinc-400'
                        }`}>
                          {slotEnrolled
                            ? `✓ Huella capturada (${slotFinger})`
                            : biometricScanState === 'scanning'
                              ? 'Escaneando sensor biométrico...'
                              : 'Toca el lector de huella para capturar'}
                        </p>
                      </div>

                      {/* Escáner animado destacado a la derecha */}
                      <div className="flex justify-center shrink-0">
                        <button
                          type="button"
                          onClick={handleEnrollFingerprintAction}
                          aria-label={`Capturar huella obligatoria (${slotFinger})`}
                          className={`relative w-28 h-28 sm:w-[144px] sm:h-[144px] rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden group ${
                            slotEnrolled
                              ? 'bg-[#0c1a13] border-2 border-emerald-400/70 shadow-[0_0_24px_rgba(16,185,129,0.28)]'
                              : biometricScanState === 'scanning'
                                ? 'bg-[#10141c] border-2 border-amber-400/80 shadow-[0_0_24px_rgba(245,158,11,0.3)] scale-[1.03]'
                                : 'bg-[#10141c] border border-amber-500/40 hover:border-amber-400 hover:scale-[1.02]'
                          }`}
                        >
                          <div className="relative w-24 h-24 sm:w-[124px] sm:h-[124px] flex items-center justify-center">
                            <BiometricFingerprintSvg
                              className="w-full h-full"
                              variant={slotEnrolled ? 'emerald' : 'monster'}
                              isScanning={biometricScanState === 'scanning'}
                              isSuccess={slotEnrolled}
                            />
                          </div>
                          {slotEnrolled && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                              <Check className="w-3 h-3 text-black stroke-[3]" />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {stepError && (
                    <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-center gap-2">
                      <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{stepError}</span>
                    </div>
                  )}

                  {/* Botones Paso 3 */}
                  <div className="pt-1 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        clearAutoSendTimer();
                        setStepError('');
                        setNewMemberStep(2);
                      }}
                      className="flex-1 py-2 px-4 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-sm font-medium text-zinc-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Volver (Paso 2/3)</span>
                    </button>
                    <button
                      type="submit"
                      className={`flex-1 py-2 px-4 rounded-full active:scale-[0.98] text-sm font-semibold text-[#1a1200] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                        allRequiredFingerprintsEnrolled && newClientPaymentMethod
                          ? 'bg-amber-400 hover:bg-amber-300'
                          : 'bg-amber-400/60 hover:bg-amber-400/80'
                      }`}
                    >
                      <span>
                        {allRequiredFingerprintsEnrolled && newClientPaymentMethod
                          ? 'Enviar aviso al RP'
                          : 'Enviar registro'}
                      </span>
                    </button>
                  </div>
                </div>
                );
              })()}

              {/* PASO 4: HUELLA REGISTRADA Y MENSAJE ENVIADO AL RP */}
              {newMemberStep === (4 as any) && (
                <div className="py-1 text-center space-y-3 animate-in fade-in-50 duration-300">
                  <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping" />
                    <div className="relative w-11 h-11 rounded-full bg-amber-500/15 border border-amber-400/40 flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-amber-300" />
                    </div>
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-medium mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>
                        {pendingNewMemberSummary?.groupMembers?.length
                          ? `Huellas listas (${pendingNewMemberSummary.groupMembers.length + 1}/${pendingNewMemberSummary.groupMembers.length + 1})`
                          : 'Huella registrada'}
                      </span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                      Mensaje enviado directo al RP
                    </h4>
                    <p className="text-sm font-medium text-amber-300 mt-0.5 capitalize">
                      {pendingNewMemberSummary?.name || newClientName}
                    </p>
                    {pendingNewMemberSummary?.groupMembers && pendingNewMemberSummary.groupMembers.length > 0 && (
                      <div className="mt-1.5 flex items-center justify-center gap-1.5 flex-wrap">
                        {pendingNewMemberSummary.groupMembers.map((gm, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/[0.07] border border-white/10 text-zinc-200 capitalize"
                          >
                            + {gm.fullName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#1b202b] border border-white/10 text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto space-y-1.5 text-left">
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                      <span className="text-zinc-400 font-medium">Plan elegido</span>
                      <span className="font-semibold text-white">{pendingNewMemberSummary?.planName || newClientPlan}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                      <span className="text-zinc-400 font-medium">Costo del plan</span>
                      <span className="text-base font-semibold text-amber-400 tabular-nums">
                        ${pendingNewMemberSummary?.planPrice || 420} MXN
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                      <span className="text-zinc-400 font-medium">Huella biométrica</span>
                      <span className="font-semibold text-emerald-300">
                        {pendingNewMemberSummary?.groupMembers?.length
                          ? `✓ ${pendingNewMemberSummary.groupMembers.length + 1}/${pendingNewMemberSummary.groupMembers.length + 1} registradas`
                          : '✓ Registrada'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
                      <span className="text-zinc-400 font-medium">Forma de pago elegida</span>
                      <span className="font-semibold text-emerald-300">
                        {(pendingNewMemberSummary?.paymentMethod || newClientPaymentMethod) === 'card'
                          ? 'Tarjeta'
                          : (pendingNewMemberSummary?.paymentMethod || newClientPaymentMethod) === 'transfer'
                            ? 'Transferencia'
                            : 'Efectivo'}
                      </span>
                    </div>
                    <p className="font-semibold text-white pt-1 text-center">
                      Esperando autorización en el RP · Dirígete a recepción.
                    </p>
                  </div>

                  <div className="pt-1 flex flex-col gap-2 max-w-sm mx-auto">
                    <button
                      type="button"
                      onClick={() => cancelPendingRegistration(3, false)}
                      className="py-2 px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar solicitud
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* VENTANA RÁPIDA DE INTEGRANTES PARA PAQUETES GRUPALES (3 o 4 PERSONAS) */}
      <GroupCompanionsModal
        isOpen={showNewMemberModal && showGroupCompanionsModal && requiredCompanionsCount > 0}
        planName={newClientPlan}
        groupSize={activeGroupSize}
        primaryName={newClientName}
        companions={activeGroupCompanions}
        onChangeCompanions={setGroupCompanions}
        onClose={() => setShowGroupCompanionsModal(false)}
        onConfirmAndContinue={() => {
          setShowGroupCompanionsModal(false);
          setStepError('');
          setActiveBiometricSlot(0);
          setNewMemberStep(3);
        }}
      />

      {/* MODAL: DASHBOARD DEL ESCÁNER BIOMÉTRICO EN GRANDE - MATERIAL 3 */}
      {showBiometricDashboard && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div
            className="relative bg-[#12161f]/96 backdrop-blur-2xl border border-white/10 rounded-[28px] max-w-2xl w-full max-h-[94vh] overflow-y-auto p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.75)] animate-in zoom-in-95 duration-200 text-white my-auto"
            style={{ fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
          >
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[28px]">
              <img 
                src={modalGymBg} onError={(e) => { (e.currentTarget as HTMLImageElement).src = './modal-gym-bg.jpg'; }} alt="Fondo Mancuernas Fitness" 
                className="w-full h-full object-cover object-bottom opacity-15 select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#12161f]/92 via-[#12161f]/88 to-[#0e1118]/96 pointer-events-none" />
              <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-400/70 to-transparent pointer-events-none" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/[0.08] pb-3.5 mb-4 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">
                    Escáner biométrico de huella
                  </h3>
                  <p className="text-xs text-zinc-400 font-normal truncate">
                    Estación de enrolamiento óptico · 500 DPI
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/25 text-amber-300 text-xs font-medium whitespace-nowrap">
                  <span className={`w-2 h-2 rounded-full ${
                    biometricScanState === 'scanning' ? 'bg-amber-400 animate-ping' :
                    biometricScanState === 'completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`} />
                  <span>
                    {biometricScanState === 'scanning' ? 'Escaneando' :
                     biometricScanState === 'completed' ? 'Enrolada' : 'Sensor activo'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBiometricDashboard(false)}
                  className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Volver atrás"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-amber-300" />
                  <span>Atrás</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setShowBiometricDashboard(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Client summary pill if name exists */}
            {newClientName.trim() && (
              <div className="relative z-10 mb-3 px-4 py-2.5 rounded-2xl bg-[#1b202b] border border-white/10 flex items-center justify-between text-xs">
                <span className="text-zinc-300">Socio: <strong className="text-white font-semibold">{newClientName}</strong></span>
                <span className="text-amber-300 font-medium">{newClientPlan}</span>
              </div>
            )}

            {/* Dedo único a registrar: Índice Derecho */}
            <div className="relative z-10 mb-3">
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Dedo a registrar:
              </label>
              <div className="flex justify-center">
                {[
                  { name: 'Índice Derecho', icon: '☝️' }
                ].map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedFinger(item.name)}
                    className="w-full max-w-[260px] py-2.5 px-5 rounded-2xl text-xs font-semibold transition-all border flex items-center justify-center gap-2 cursor-pointer bg-amber-400 text-[#1a1200] border-amber-300 shadow-sm"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Centerpiece Scanner Dashboard View */}
            <div className="relative z-10 flex flex-col items-center justify-center my-2 select-none">
              <div 
                onClick={() => {
                  if (biometricScanState !== 'scanning') {
                    handleEnrollFingerprintAction();
                  }
                }}
                className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-3xl bg-[#0c1017] border border-amber-500/35 hover:border-amber-400/80 flex items-center justify-center cursor-pointer group shadow-lg transition-all duration-300 overflow-hidden my-1"
                title="Haz clic para registrar tu huella"
              >
                <div className={`absolute inset-4 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
                  biometricScanState === 'completed'
                    ? 'bg-emerald-500/20'
                    : biometricScanState === 'scanning'
                    ? 'bg-amber-500/25'
                    : 'bg-amber-500/10 group-hover:bg-amber-400/20'
                }`} />

                <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center rounded-3xl overflow-hidden p-2 group-hover:scale-105 transition-transform duration-300">
                  <BiometricFingerprintSvg
                    className="w-full h-full"
                    isScanning={biometricScanState === 'scanning'}
                    isSuccess={biometricScanState === 'completed'}
                  />
                </div>
              </div>

              {/* Status Chip Under Scanner */}
              <div className="mt-2.5 text-center">
                {biometricScanState === 'idle' && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1b202b] border border-white/12">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs font-medium text-amber-300">
                      Sensor listo · Toca el escáner para capturar
                    </span>
                  </div>
                )}
                {biometricScanState === 'scanning' && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/35">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-medium text-amber-200">
                      Escaneando minucias y crestas papilares...
                    </span>
                  </div>
                )}
                {biometricScanState === 'completed' && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-400/35">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-300">
                      Huella registrada con éxito (Calidad 99%)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Clean Material Telemetry Grid */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 text-center">
              <div className="p-2.5 rounded-2xl bg-[#1b202b] border border-white/[0.08]">
                <p className="text-[11px] text-zinc-400 font-normal">Señal óptica</p>
                <p className="text-xs font-semibold text-emerald-400 mt-0.5 tabular-nums">98.6% Óptima</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#1b202b] border border-white/[0.08]">
                <p className="text-[11px] text-zinc-400 font-normal">Minucias</p>
                <p className="text-xs font-semibold text-amber-300 mt-0.5 tabular-nums">136 Detectadas</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#1b202b] border border-white/[0.08]">
                <p className="text-[11px] text-zinc-400 font-normal">Resolución</p>
                <p className="text-xs font-semibold text-amber-400 mt-0.5 tabular-nums">508 DPI</p>
              </div>
              <div className="p-2.5 rounded-2xl bg-[#1b202b] border border-white/[0.08]">
                <p className="text-[11px] text-zinc-400 font-normal">Seguridad</p>
                <p className="text-xs font-semibold text-zinc-200 mt-0.5">SHA-256</p>
              </div>
            </div>

            {/* Primary Material Pill Action Button */}
            <div className="relative z-10 pt-2">
              <button
                type="button"
                onClick={handleEnrollFingerprintAction}
                disabled={biometricScanState === 'scanning'}
                className={`w-full py-3 px-6 rounded-full font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                  biometricScanState === 'completed'
                    ? 'bg-emerald-500 text-[#04140d]'
                    : 'bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-[#1a1200]'
                }`}
              >
                {biometricScanState === 'scanning' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#1a1200] border-t-transparent rounded-full animate-spin" />
                    <span>Escaneando huella digital...</span>
                  </>
                ) : biometricScanState === 'completed' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Huella enrolada · Guardando...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Registrar mi huella digital</span>
                  </>
                )}
              </button>

              <div className="mt-2.5 text-center">
                <button
                  type="button"
                  onClick={() => setShowBiometricDashboard(false)}
                  className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer font-medium"
                >
                  ← Volver al formulario de registro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PASE DE VISITA / CLASE PRUEBA - DISEÑO MATERIAL 3 */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div
            className="relative bg-[#12161f]/96 backdrop-blur-2xl border border-white/10 rounded-[28px] max-w-lg w-full max-h-[94vh] overflow-y-auto p-6 shadow-[0_24px_64px_rgba(0,0,0,0.75)] animate-in zoom-in-95 duration-200 my-auto"
            style={{ fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
          >
            
            {/* Subtle background texture */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[28px]">
              <img 
                src={modalGymBg} 
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = './modal-gym-bg.jpg'; }} 
                alt="Fondo Mancuernas Fitness" 
                className="w-full h-full object-cover object-bottom opacity-15 select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#12161f]/92 via-[#12161f]/88 to-[#0e1118]/96 pointer-events-none" />
              <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent pointer-events-none" />
            </div>

            {/* Modal Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => cancelOrCloseVisitModal(true)}
                  className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                  title="Volver a la pantalla principal"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Atrás</span>
                </button>
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 hidden sm:flex">
                  <Ticket className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <span className="inline-block text-[11px] font-medium text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full mb-0.5">
                    Pase de visita
                  </span>
                  <h3 className="text-lg sm:text-xl font-semibold text-white tracking-tight leading-tight truncate">
                    Acceso de visita
                  </h3>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => cancelOrCloseVisitModal(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors shrink-0 cursor-pointer"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* MODAL CONTENT SWITCH BY STATE */}
            {visitModalState === 'form' && (
              <div className="relative z-10 space-y-5">
                
                {/* Material Wallet-style Tarifa Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-[#16231e] border border-emerald-500/25 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-emerald-300/90">
                      Tarifa de visita
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl sm:text-4xl font-semibold text-white tabular-nums tracking-tight">
                        $50.00
                      </span>
                      <span className="text-xs font-medium text-zinc-400">MXN</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/25 inline-flex items-center gap-1.5 whitespace-nowrap">
                      <Zap className="w-3.5 h-3.5 text-emerald-400" />
                      Paso inmediato
                    </span>
                    <p className="text-[11px] text-zinc-400 font-normal mt-1.5">Acceso único por visita</p>
                  </div>
                </div>

                {/* Material Pill Action Buttons */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => cancelOrCloseVisitModal(true)}
                    className="py-3 px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] text-sm font-medium text-zinc-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Atrás</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestVisitPass}
                    className="flex-1 py-3 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-sm font-semibold text-[#04140d] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Solicitar pase y pagar $50 en recepción</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

              </div>
            )}

            {visitModalState === 'waiting_approval' && (
              <div className="relative z-10 py-2 text-center space-y-4 animate-in fade-in-50 duration-300">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping" />
                  <div className="relative w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 text-emerald-300" />
                  </div>
                </div>

                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>Esperando pago en recepción</span>
                  </div>
                  <p className="text-xs font-medium text-emerald-300">
                    {visitClientName ? `Visitante: ${visitClientName}` : 'Visitante del día'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#16231e] border border-emerald-500/30 max-w-sm mx-auto space-y-2">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-xs font-medium text-emerald-200">Costo del pase:</span>
                    <span className="text-2xl font-black text-white tabular-nums">$50.00 <span className="text-xs font-semibold text-emerald-300">MXN</span></span>
                  </div>
                  <p className="text-sm font-bold text-white pt-1">
                    Por favor, dirígete a recepción para realizar tu pago.
                  </p>
                </div>

                <div className="pt-1 max-w-sm mx-auto">
                  <button
                    type="button"
                    onClick={() => cancelOrCloseVisitModal(false)}
                    className="w-full py-2.5 px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-xs font-medium text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancelar solicitud
                  </button>
                </div>
              </div>
            )}

            {visitModalState === 'authorized' && (
              <div className="relative z-10 py-5 text-center space-y-4 animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                </div>

                <div>
                  <h4 className="text-2xl font-semibold text-white tracking-tight">
                    ¡Pago de $50 autorizado!
                  </h4>
                  <p className="text-sm font-medium text-emerald-300 mt-1">
                    Torniquete desbloqueado · Acceso concedido
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#16231e] border border-emerald-500/25 text-emerald-200 max-w-sm mx-auto">
                  <div className="flex items-center justify-center gap-2 text-sm font-medium text-white">
                    <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>"Esperamos cumplir tus expectativas en rutina"</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-400">
                  Abriendo pantalla de bienvenida y liberando torniquete...
                </p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* MODAL 3: YA TENGO MEMBRESÍA (ACCESO DIRECTO) - DISEÑO MATERIAL 3 */}
      {showDirectAccessModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDirectAccessError('');
              setSearchQuery('');
              setShowDirectAccessModal(false);
            }
          }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in-50 duration-200"
        >
          <div className="relative bg-[#11151d] border border-white/10 rounded-[28px] p-5 sm:p-6 w-full max-w-md shadow-[0_24px_64px_rgba(0,0,0,0.85)] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col items-center justify-center select-none">
            
            {/* Subtle top hairline accent in Monster Green */}
            <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#22c55e]/70 to-transparent pointer-events-none" />

            {/* Top header row with title and close button */}
            <div className="w-full flex items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Fingerprint className="w-4 h-4 text-[#22c55e] shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200 truncate">
                  Acceso Directo • Validar Socio
                </span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setDirectAccessError('');
                  setSearchQuery('');
                  setShowDirectAccessModal(false);
                }}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explicit member / barcode / RFID input */}
            <div className="w-full mb-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    ref={directAccessInputRef}
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (directAccessError) setDirectAccessError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (directAccessMatches.length === 1) {
                          handleDirectAccessSubmit(directAccessMatches[0].id);
                        } else {
                          handleDirectAccessSubmit();
                        }
                      }
                    }}
                    placeholder="Nombre, ID, teléfono o escanea código..."
                    className="w-full pl-9 pr-3 py-2.5 bg-[#090d11] border border-white/15 focus:border-[#22c55e] rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/20 transition-all"
                  />
                </div>
                <button
                  type="button"
                  disabled={scanStatus === 'scanning'}
                  onClick={() => handleDirectAccessSubmit()}
                  className="px-4 py-2.5 rounded-2xl bg-[#22c55e] hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-wait text-black font-bold text-xs transition-colors cursor-pointer shrink-0"
                >
                  Validar
                </button>
              </div>

              {directAccessError && (
                <p className="mt-2 text-xs text-amber-300 font-medium text-center">
                  {directAccessError}
                </p>
              )}

              {directAccessMatches.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl bg-[#090d11] border border-white/10 divide-y divide-white/[0.06]">
                  {directAccessMatches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleDirectAccessSubmit(m.id)}
                      className="w-full px-3 py-2 flex items-center justify-between gap-2.5 text-left hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={getGymAvatar(m.fullName, m.avatarUrl, m.gender)}
                          alt={m.fullName}
                          className="w-7 h-7 rounded-full object-contain bg-white p-0.5 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white truncate">{m.fullName}</div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            {m.id} • {m.membership.planName}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#22c55e] shrink-0">
                        Entrar &rarr;
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Automatic biometric scanner pad */}
            <div 
              onClick={handleDirectPadClick}
              title={searchQuery.trim() ? `Validar acceso para "${searchQuery.trim()}"` : 'Toca para leer huella y dar acceso'}
              className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-3xl bg-[#090d11] border border-[#22c55e]/35 hover:border-[#22c55e]/80 flex items-center justify-center cursor-pointer group shadow-lg transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-4 rounded-full bg-[#16a34a]/10 blur-2xl group-hover:bg-[#22c55e]/20 transition-all duration-500 pointer-events-none" />

              <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300">
                <BiometricFingerprintSvg
                  className="w-full h-full"
                  variant="monster"
                  isScanning={scanStatus === 'scanning'}
                  isSuccess={scanStatus === 'granted'}
                />
              </div>

              <div className="absolute w-32 h-32 rounded-full border border-[#22c55e]/25 animate-ping pointer-events-none opacity-20" />
            </div>

          </div>
        </div>
      )}

      {/* Access History Breakdown Modal */}
      <AccessHistory 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
      />

      {/* Independent Terminal & Network Configuration Modal */}
      <TerminalSyncModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onManualSync={handleManualSync}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        serverStatus={serverStatus}
      />

      {/* DASHBOARD DE AUTENTICACIÓN, BIENVENIDA Y FELICITACIÓN DE CUMPLEAÑOS */}
      <AccessWelcomeDashboardModal
        isOpen={showWelcomeDashboard}
        onClose={() => {
          clearVisitTimers();
          setShowWelcomeDashboard(false);
          setScanStatus('idle');
          setLastVerifiedClient(null);
        }}
        data={welcomeDashboardData}
        voiceEnabled={config.voiceEnabled && !isMuted}
        soundVolume={config.soundVolume ?? 1.0}
      />

    </div>
  );
};

export default IndependentTerminalApp;
