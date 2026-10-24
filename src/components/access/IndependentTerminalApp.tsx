import cardClienteNuevo from '../../assets/card-cliente-nuevo.jpg';
import cardVisita from '../../assets/card-visita.jpg';
import cardHuella from '../../assets/card-huella.jpg';
import gymBg from '../../assets/gym-background.jpg';
import gymBgMotto from '../../assets/gym-background-motto.jpg';
import modalGymBg from '../../assets/modal-gym-bg.jpg';
import logoImg from '../../assets/logo.png';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGym } from '../../context/GymContext';
import { FingerprintScanner } from './FingerprintScanner';
import { AccessHistory } from './AccessHistory';
import { TerminalSyncModal, getTerminalConfig, saveTerminalConfig, TerminalConfig } from './TerminalSyncModal';
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
  X,
  Calendar,
  Mail,
  User,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Fingerprint,
  Check,
  Dumbbell,
  BicepsFlexed
} from 'lucide-react';
import { Client, MembershipPlanType, PaymentMethod } from '../../types';
import { getGymAvatar } from '../../utils/genderAvatar';
import { checkServerHealth, fetchMembersFromServer } from '../../services/syncService';

interface IndependentTerminalAppProps {
  isEmbeddedFullScreen?: boolean;
  onExitFullScreen?: () => void;
}

export const IndependentTerminalApp: React.FC<IndependentTerminalAppProps> = ({
  isEmbeddedFullScreen = false,
  onExitFullScreen,
}) => {
  const { 
    verifyBiometricAccess, 
    members, 
    accessLogs, 
    forceSync, 
    replaceMembers, 
    syncMembersWithServer, 
    addMember, 
    catalogPlans 
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

  // New client form state (Nombre, Cumpleaños, Edad, Correo, Mensualidad, Opción de Pago)
  const [newClientName, setNewClientName] = useState('');
  const [newClientBirthDate, setNewClientBirthDate] = useState('');
  const [newClientAge, setNewClientAge] = useState<number | string>('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPlan, setNewClientPlan] = useState('Mensualidad Estándar');
  const [newClientPaymentMethod, setNewClientPaymentMethod] = useState<PaymentMethod>('cash');
  const [newClientId, setNewClientId] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientFingerprintEnrolled, setNewClientFingerprintEnrolled] = useState(false);
  const [showBiometricDashboard, setShowBiometricDashboard] = useState(false);
  const [biometricScanState, setBiometricScanState] = useState<'idle' | 'scanning' | 'completed'>('idle');
  const [selectedFinger, setSelectedFinger] = useState('Pulgar Derecho');

  // Available plans list (from catalogPlans or gym defaults)
  const availablePlans = (catalogPlans && catalogPlans.length > 0)
    ? catalogPlans.filter(p => p.active !== false)
    : [
        { id: 'CAT-PLAN-002', name: 'Mensualidad Estándar', type: 'monthly', durationDays: 30, price: 850 },
        { id: 'CAT-PLAN-005', name: 'Mensualidad Estudiante', type: 'monthly', durationDays: 30, price: 650 },
        { id: 'CAT-PLAN-003', name: 'Plan Trimestral Fuerza', type: 'quarterly', durationDays: 90, price: 2300 },
        { id: 'CAT-PLAN-004', name: 'Membresía Black VIP Anual', type: 'annual', durationDays: 365, price: 9500 },
      ];

  // Birthday change: auto-calculate Age
  const handleBirthDateChange = (dateStr: string) => {
    setNewClientBirthDate(dateStr);
    if (dateStr) {
      const birth = new Date(dateStr);
      if (!isNaN(birth.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        if (age >= 0 && age <= 120) {
          setNewClientAge(age);
        }
      }
    }
  };

  // Age change: approximate birth year if not set
  const handleAgeChange = (val: string) => {
    setNewClientAge(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num < 120 && !newClientBirthDate) {
      const approxYear = new Date().getFullYear() - num;
      setNewClientBirthDate(`${approxYear}-01-01`);
    }
  };

  // Visit pass state
  const [visitClientName, setVisitClientName] = useState('');
  const [visitCost, setVisitCost] = useState('5.00');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(isEmbeddedFullScreen);
  const [showEscHint, setShowEscHint] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [bgImage, setBgImage] = useState<string>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('legends_terminal_bg_version') !== 'v9_zoom_caminadoras_8k') {
      localStorage.setItem('legends_terminal_bg_version', 'v9_zoom_caminadoras_8k');
      localStorage.setItem('legends_terminal_bg', gymBg);
      return gymBg;
    }
    return localStorage.getItem('legends_terminal_bg') || gymBg;
  });

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

  // Sync members from server
  const syncWithServer = useCallback(async (): Promise<boolean> => {
    if (!config.serverUrl) {
      setServerStatus('disconnected');
      return false;
    }
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
    }
  }, [config.serverUrl, replaceMembers]);

  // Periodic polling for new/deleted/updated members
  useEffect(() => {
    syncWithServer();
    if (config.autoSync) {
      const intervalSec = Math.max(2, config.syncIntervalSeconds || 3);
      const interval = setInterval(() => {
        syncWithServer();
      }, intervalSec * 1000);
      return () => clearInterval(interval);
    }
  }, [syncWithServer, config.autoSync, config.syncIntervalSeconds]);

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
  const announceAccess = (clientName: string, granted: boolean) => {
    if (!config.voiceEnabled || isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const text = granted 
        ? `Bienvenido ${clientName}, acceso concedido` 
        : `Acceso restringido para ${clientName}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = config.soundVolume ?? 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Handle Registration of New Member
  
  const handleEnrollFingerprintAction = () => {
    if (biometricScanState === 'scanning') return;
    setBiometricScanState('scanning');
    sounds.playScanBlip();

    setTimeout(() => {
      setBiometricScanState('completed');
      setNewClientFingerprintEnrolled(true);
      sounds.playAccessGranted();
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}

      setTimeout(() => {
        setShowBiometricDashboard(false);
        setBiometricScanState('idle');
      }, 900);
    }, 1200);
  };

  const handleRegisterNewMember = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newClientName.trim();
    if (!trimmedName) return;

    // Determine plan properties
    const selectedPlanObj = availablePlans.find(p => p.name === newClientPlan || p.id === newClientPlan);
    const planType: MembershipPlanType = selectedPlanObj ? (selectedPlanObj.type as MembershipPlanType) : 'monthly';
    const planPrice = selectedPlanObj ? selectedPlanObj.price : 850;
    const durationDays = selectedPlanObj ? selectedPlanObj.durationDays : 30;
    const planName = selectedPlanObj ? selectedPlanObj.name : newClientPlan;

    const memberId = newClientId.trim() || ('MEM-' + Math.floor(100 + Math.random() * 900));
    const finalBirthDate = newClientBirthDate || (newClientAge ? `${new Date().getFullYear() - Number(newClientAge)}-01-01` : '1998-01-01');
    const finalEmail = newClientEmail.trim() || `${memberId.toLowerCase()}@legendsgym.com`;

    const paymentLabel = newClientPaymentMethod === 'cash' 
      ? 'Efectivo' 
      : newClientPaymentMethod === 'card' 
        ? 'Tarjeta' 
        : 'Transferencia / SINPE';

    const clientData: Partial<Client> = {
      id: memberId,
      fullName: trimmedName,
      documentId: newClientId.trim() || `${Math.floor(10000000 + Math.random() * 90000000)}`,
      email: finalEmail,
      phone: newClientPhone.trim() || '+52 55 0000 0000',
      birthDate: finalBirthDate,
      avatarUrl: getGymAvatar(trimmedName),
      biometricRegistered: newClientFingerprintEnrolled,
      biometricHash: `BIO_HASH_${memberId}`,
      biometricTemplate: `FP_THUMB_RIGHT_${memberId}`,
      membership: {
        planType,
        planName,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        price: planPrice,
        status: 'active',
        daysRemaining: durationDays,
      },
      medicalNotes: `Inscripción desde Terminal. Edad: ${newClientAge || 'N/A'}. Método de pago: ${paymentLabel}.`
    };

    if (addMember) {
      addMember(clientData, newClientPaymentMethod);
    } else {
      const fullMember: any = {
        ...clientData,
        name: trimmedName,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: durationDays,
        biometricEnrolled: newClientFingerprintEnrolled,
        biometrics: {
          enrolled: newClientFingerprintEnrolled,
          template: 'simulated_template_' + Date.now(),
          registeredAt: new Date().toISOString(),
          quality: 95
        }
      };
      replaceMembers([fullMember, ...members]);
    }

    setShowNewMemberModal(false);
    setNewClientName('');
    setNewClientBirthDate('');
    setNewClientAge('');
    setNewClientEmail('');
    setNewClientId('');
    setNewClientPhone('');
    setNewClientPaymentMethod('cash');
    setNewClientFingerprintEnrolled(false);

    // Announce out loud as requested: "Por favor diríjase al encargado"
    speakCustomMessage("Por favor diríjase al encargado");

    // Display welcome banner on screen & trigger turnstile
    setScanStatus('granted');
    setLastVerifiedClient({
      name: trimmedName,
      plan: planName,
      daysRemaining: durationDays,
      reason: 'Registro completado • Por favor diríjase al encargado',
      avatarUrl: getGymAvatar(trimmedName),
      status: 'granted',
    });

    triggerTurnstileRelay(config.relayPulseDurationSeconds || 5);
    if (!isMuted) sounds.playAccessGranted();
    try {
      confetti({
        particleCount: 55,
        spread: 70,
        origin: { y: 0.5, x: 0.5 }
      });
    } catch {}

    setTimeout(() => {
      setScanStatus('idle');
      setLastVerifiedClient(null);
    }, 6000);
  };

  // Handle Visit / Day Pass
  const handleRegisterVisit = () => {
    const name = visitClientName.trim() || 'Visitante del Día';

    setScanStatus('granted');
    setLastVerifiedClient({
      name: name,
      plan: 'Pase por 1 Día',
      reason: 'Pase de Visita Concedido',
      status: 'granted',
      daysRemaining: 1
    });

    triggerTurnstileRelay(5);
    announceAccess(name, true);
    sounds.playAccessGranted();
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    setShowVisitModal(false);
    setVisitClientName('');
    setTimeout(() => { setScanStatus('idle'); setLastVerifiedClient(null); }, 5000);
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
    if (scanStatus === 'scanning') return;
    
    if (!isMuted) {
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
      const result = verifyBiometricAccess(identifier);
      
      if (result.granted) {
        if (!isMuted) sounds.playAccessGranted();
        const quote = getRandomMotivationalQuote(currentQuote);
        setCurrentQuote(quote);
        
        triggerTurnstileRelay(config.relayPulseDurationSeconds || 4);

        if (result.client) {
          announceAccess(result.client.fullName, true);
          setLastVerifiedClient({
            name: result.client.fullName,
            plan: result.client.membership.planName,
            daysRemaining: result.client.membership.daysRemaining,
            reason: result.reason,
            avatarUrl: getGymAvatar(result.client.fullName, result.client.avatarUrl),
            status: 'granted',
          });
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
        if (!isMuted) sounds.playAccessDenied();
        if (result.client) {
          announceAccess(result.client.fullName, false);
          setLastVerifiedClient({
            name: result.client.fullName,
            plan: result.client.membership.planName,
            daysRemaining: result.client.membership.daysRemaining,
            reason: result.reason,
            avatarUrl: getGymAvatar(result.client.fullName, result.client.avatarUrl),
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

  // Direct sensor pad click (quick scan Carlos Mendoza MEM-001 or current search query)
  const handleDirectPadClick = () => {
    if (searchQuery.trim()) {
      executeScan(searchQuery.trim());
      setSearchQuery('');
    } else {
      executeScan('MEM-001');
    }
  };

  // Global Keyboard listener for USB Barcode / RFID scanner guns
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (showNewMemberModal || showVisitModal || showDirectAccessModal || isConfigModalOpen || isHistoryModalOpen) {
        setShowNewMemberModal(false);
        setShowVisitModal(false);
        setShowDirectAccessModal(false);
        setIsConfigModalOpen(false);
        setIsHistoryModalOpen(false);
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

      // Don't intercept if user is actively typing in a standard input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const now = Date.now();
      // Hardware barcode scanners send keystrokes extremely rapidly (< 50ms between keys)
      if (now - lastKeyTimeRef.current > 300) {
        keyBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const scannedCode = keyBufferRef.current.trim();
        if (scannedCode.length >= 2) {
          executeScan(scannedCode);
        }
        keyBufferRef.current = '';
      } else if (e.key.length === 1) {
        keyBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [scanStatus]);

  
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFull = !!document.fullscreenElement;
      setIsFullScreen(isNowFull);
      if (!isNowFull && onExitFullScreen) {
        onExitFullScreen();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [onExitFullScreen]);

  // Fullscreen / Kiosk toggle
  const toggleBackground = () => {
    const nextBg = bgImage === gymBg ? gymBgMotto : (bgImage === gymBgMotto ? modalGymBg : gymBg);
    setBgImage(nextBg);
    if (typeof window !== 'undefined') {
      localStorage.setItem('legends_terminal_bg', nextBg);
    }
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
    <div className="relative min-h-screen h-screen w-full overflow-y-auto text-gym-text flex flex-col justify-between font-sans select-none p-3 sm:p-4 lg:p-5 gap-3">
      
            

      
      {/* BOTÓN PANTALLA COMPLETA (VISIBLE SOLO CUANDO NO ESTÁ EN PANTALLA COMPLETA) */}
      {!isFullScreen && (
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
          <button
            onClick={toggleBackground}
            className="px-3.5 py-2.5 rounded-2xl bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xl transition-all cursor-pointer transform hover:scale-105 active:scale-95 select-none"
            title="Cambiar imagen de fondo (Mancuernas / Estudio / Neón)"
          >
            <Image className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">CAMBIAR FONDO</span>
          </button>
          <button
            onClick={toggleFullScreen}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-2xl shadow-amber-500/40 transition-all cursor-pointer transform hover:scale-105 active:scale-95 select-none"
            title="Activar Pantalla Completa"
          >
            <Maximize2 className="w-4 h-4" />
            <span>PANTALLA COMPLETA</span>
          </button>
        </div>
      )}



      {/* Real Gym Background Photo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={bgImage}
          alt="Fitness Legends Gym Background"
          style={{
            filter: 'brightness(1.05) contrast(1.08) saturate(1.06)',
            objectPosition: 'center 22%',
          }}
          className="w-full h-full object-cover"
        />
        {/* Transparent dark vignette so neon sign and photo are 100% visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
        {/* Spotlight cálido ámbar/dorado centrado exactamente en el logo GYM LEGENDS en la pared para que resalte con máxima fuerza */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(245,158,11,0.22)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />
        {/* Degradado oscuro inferior para que las tarjetas de opciones resalten con nitidez y contraste profesional */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
        {/* Viñeta sutil superior */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Turnstile Relay Active Banner when open */}
      {relayRemainingSeconds > 0 && (
        <div className="w-full max-w-2xl mx-auto mb-2 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500/30 via-emerald-500/40 to-emerald-500/30 border border-emerald-400/80 shadow-glow-green text-center animate-in zoom-in-95 duration-200 z-20 shrink-0">
          <div className="flex items-center justify-center gap-2.5 text-emerald-200 font-black text-sm uppercase tracking-wider">
            <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-spin" />
            <span>ACCESO CONCEDIDO (PASO LIBRE)</span>
            <span className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full font-mono text-xs font-black shadow-md">
              {relayRemainingSeconds}s
            </span>
          </div>
        </div>
      )}

      {/* Verified Client Alert Banner */}
      {lastVerifiedClient && scanStatus !== 'idle' && (
        <div className={'w-full max-w-2xl mx-auto mb-2 p-4 rounded-2xl border flex items-center justify-between gap-4 animate-in zoom-in-95 duration-200 shadow-2xl z-20 shrink-0 ' + (
          lastVerifiedClient.status === 'granted'
            ? 'bg-emerald-950/80 border-emerald-400 text-white shadow-glow-green'
            : 'bg-red-950/80 border-red-400 text-white shadow-glow-red'
        )}>
          <div className="flex items-center gap-3">
            <img 
              src={getGymAvatar(lastVerifiedClient.name, lastVerifiedClient.avatarUrl)} 
              alt={lastVerifiedClient.name} 
              className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-md"
            />
            <div>
              <h4 className="text-base font-black text-white">{lastVerifiedClient.name}</h4>
              <p className="text-xs text-gray-200">{lastVerifiedClient.reason}</p>
              {lastVerifiedClient.plan && (
                <span className="text-[11px] font-mono text-amber-300 font-bold">
                  Plan: {lastVerifiedClient.plan}
                </span>
              )}
            </div>
          </div>
          <button 
            onClick={() => { setLastVerifiedClient(null); setScanStatus('idle'); }}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-gray-300 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* ESPACIO SUPERIOR / CENTRAL TOTALMENTE DESPEJADO: EL LOGO "GYM LEGENDS" DE LA FOTO RESALTA 100% VISIBLE Y PROTAGONISTA */}
      <div className="flex-1 w-full min-h-[140px] sm:min-h-[180px] pointer-events-none" />

      {/* Main Container: 3 Clear Intuitive Access Options */}
      <div className="w-full max-w-5xl mx-auto shrink-0 relative z-10 px-3 pb-4 sm:pb-8 mt-auto">

        
        {/* The 3 Clean High-Impact Options Grid with Full-Bleed Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 w-full max-w-5xl mx-auto">

          {/* Opción 1: CLIENTE NUEVO */}
          <div 
            onClick={() => setShowNewMemberModal(true)}
            className="group relative h-[300px] sm:h-[330px] lg:h-[350px] max-h-[40vh] rounded-3xl overflow-hidden border-2 border-amber-400/60 hover:border-amber-400 transition-all duration-500 shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:shadow-[0_0_45px_rgba(245,158,11,0.55)] flex flex-col justify-between p-5 cursor-pointer transform hover:-translate-y-2 select-none"
          >
            <img 
              src={cardClienteNuevo} 
              alt="Cliente Nuevo Gym" 
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 brightness-95 group-hover:brightness-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20 pointer-events-none" />
            <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative z-10 self-end px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/80 flex items-center gap-1.5 text-white font-black text-xs uppercase tracking-wider shadow-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              <span>💪</span>
              <span className="tracking-wider">Inscripción</span>
            </div>

            <div className="relative z-10 p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 group-hover:border-amber-400/40 transition-colors">
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider group-hover:text-amber-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Cliente Nuevo
              </h3>
              
              <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                  Registrarme &rarr;
                </span>
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                  +
                </span>
              </div>
            </div>
          </div>

          {/* Opción 2: QUIERO VISITA */}
          <div 
            onClick={() => setShowVisitModal(true)}
            className="group relative h-[300px] sm:h-[330px] lg:h-[350px] max-h-[40vh] rounded-3xl overflow-hidden border-2 border-emerald-400/60 hover:border-emerald-400 transition-all duration-500 shadow-[0_0_25px_rgba(16,185,129,0.25)] hover:shadow-[0_0_45px_rgba(16,185,129,0.55)] flex flex-col justify-between p-5 cursor-pointer transform hover:-translate-y-2 select-none"
          >
            <img 
              src={cardVisita} 
              alt="Pase de Visita Gym" 
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 brightness-95 group-hover:brightness-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20 pointer-events-none" />
            <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative z-10 self-end px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-emerald-400/80 flex items-center gap-1.5 text-white font-black text-xs uppercase tracking-wider shadow-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              <span>🎟️</span>
              <span className="tracking-wider">Pase del Día</span>
            </div>

            <div className="relative z-10 p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 group-hover:border-emerald-400/40 transition-colors">
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider group-hover:text-emerald-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Quiero Visita
              </h3>
              
              <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1">
                  Pase de Visita &rarr;
                </span>
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white flex items-center justify-center font-black text-base shadow-lg group-hover:scale-110 transition-transform">
                  ✓
                </span>
              </div>
            </div>
          </div>

          {/* Opción 3: YA TENGO MEMBRESÍA (ACCESO DIRECTO) */}
          <div 
            onClick={() => setShowDirectAccessModal(true)}
            className="group relative h-[300px] sm:h-[330px] lg:h-[350px] max-h-[40vh] rounded-3xl overflow-hidden border-2 border-amber-400/70 hover:border-amber-400 transition-all duration-500 shadow-[0_0_25px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.6)] flex flex-col justify-between p-5 cursor-pointer transform hover:-translate-y-2 select-none"
          >
            <img 
              src={cardHuella} 
              alt="Lector Biométrico de Huella Gym" 
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 brightness-95 group-hover:brightness-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20 pointer-events-none" />
            <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative z-10 self-end px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/80 flex items-center gap-1.5 text-white font-black text-xs uppercase tracking-wider shadow-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              <span>👆</span>
              <span className="tracking-wider">Acceso Directo</span>
            </div>

            <div className="relative z-10 p-3.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 group-hover:border-amber-400/40 transition-colors">
              <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider group-hover:text-amber-300 transition-colors drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Ya Tengo Membresía
              </h3>
              
              <div className="mt-2.5 pt-2 border-t border-white/15 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                  Validar Huella &rarr;
                </span>
                <span className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white flex items-center justify-center font-black text-base shadow-lg group-hover:scale-110 transition-transform">
                  👆
                </span>
              </div>
            </div>
          </div>

        </div>
        {/* Bottom subtle hint */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-300 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            💡 <strong className="text-white">Lector Automático:</strong> Puedes posar tu dedo directamente en el sensor USB o pasar tu tarjeta RFID en cualquier momento.
          </p>
        </div>

      </div>

      {/* MODAL 1: REGISTRO CLIENTE NUEVO */}
      {showNewMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative bg-[#0d0f17]/92 backdrop-blur-2xl border-2 border-amber-500/50 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl shadow-amber-500/15 animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] overflow-y-auto overflow-hidden">
            {/* Background Fitness Dumbbell Photo */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              <img 
                src={modalGymBg} 
                alt="Fondo Mancuernas Fitness" 
                className="w-full h-full object-cover object-bottom opacity-35 select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f]/95 via-[#0e1017]/85 to-[#0e1017]/90 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] pointer-events-none" />
            </div>
            
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-inner">
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider">
                      Registro de Cliente Nuevo
                    </h3>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      Inscripción
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Ingresa tus datos personales, mensualidad y opción de pago
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowNewMemberModal(false)}
                className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterNewMember} className="relative z-10 space-y-4">
              
              {/* 1. Nombre Completo */}
              <div>
                <label className="text-xs font-bold text-gray-200 block mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Nombre Completo *</span>
                </label>
                <input 
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej. Andrea García Morales"
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>

              {/* 2 & 3. Fecha de Cumpleaños y Edad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-200 block mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Fecha de Cumpleaños *</span>
                  </label>
                  <input 
                    type="date"
                    required
                    value={newClientBirthDate}
                    onChange={(e) => handleBirthDateChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-200 block mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edad *</span>
                    </span>
                    <span className="text-[10px] text-amber-400/90 font-medium">(Automática)</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      required
                      min="8"
                      max="110"
                      value={newClientAge}
                      onChange={(e) => handleAgeChange(e.target.value)}
                      placeholder="Ej. 25"
                      className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all pr-12"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold pointer-events-none">
                      años
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Correo Electrónico y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-200 block mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>Correo Electrónico (Opcional)</span>
                  </label>
                  <input 
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="andrea@ejemplo.com (opcional)"
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-200 block mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input 
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="Ej. 8888-9999"
                    className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                  />
                </div>
              </div>

              {/* 5. Mensualidad */}
              <div>
                <label className="text-xs font-bold text-gray-200 block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Mensualidad / Plan de Entrenamiento *</span>
                  </span>
                  <span className="text-[11px] text-amber-400 font-semibold">Toca para seleccionar</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availablePlans.map((plan) => {
                    const isSelected = newClientPlan === plan.name;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setNewClientPlan(plan.name)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-glow-gold/40 ring-1 ring-amber-400'
                            : 'bg-white/10 border-white/15 hover:border-white/30 hover:bg-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white leading-tight">{plan.name}</span>
                          {isSelected ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-sm" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0" />
                          )}
                        </div>
                        <div className="mt-2 flex items-baseline justify-between">
                          <span className="text-sm font-black text-amber-400">
                            ${plan.price.toLocaleString('es-MX')}
                          </span>
                          <span className="text-[10px] text-gray-300 font-medium">
                            {plan.durationDays} días
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 6. Opción de Pago */}
              <div>
                <label className="text-xs font-bold text-gray-200 block mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                  <span>Opción de Pago *</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewClientPaymentMethod('cash')}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      newClientPaymentMethod === 'cash'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black border-amber-300 shadow-glow-gold'
                        : 'bg-white/10 text-gray-300 border-white/15 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>💵 Efectivo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClientPaymentMethod('card')}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      newClientPaymentMethod === 'card'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black border-amber-300 shadow-glow-gold'
                        : 'bg-white/10 text-gray-300 border-white/15 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>💳 Tarjeta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClientPaymentMethod('transfer')}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      newClientPaymentMethod === 'transfer'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black border-amber-300 shadow-glow-gold'
                        : 'bg-white/10 text-gray-300 border-white/15 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>📱 Transfer / SINPE</span>
                  </button>
                </div>
              </div>

              {/* Fingerprint Capture Dashboard Launcher */}
              <div 
                onClick={() => {
                  setBiometricScanState('idle');
                  setShowBiometricDashboard(true);
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-3 ${
                  newClientFingerprintEnrolled
                    ? 'bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : 'bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 ${
                    newClientFingerprintEnrolled 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  }`}>
                    {newClientFingerprintEnrolled ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Fingerprint className="w-6 h-6 text-amber-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                        Escáner Biométrico de Huella
                      </p>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        newClientFingerprintEnrolled
                          ? 'bg-emerald-500 text-white font-black shadow-glow-green'
                          : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                      }`}>
                        {newClientFingerprintEnrolled ? '✓ Enrolada' : 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-300 mt-0.5">
                      {newClientFingerprintEnrolled 
                        ? `✓ Huella vinculada (${selectedFinger}) • Clic para ver escáner / re-escanear` 
                        : 'Haz clic aquí para abrir el dashboard y registrar tu huella en grande'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setBiometricScanState('idle');
                    setShowBiometricDashboard(true);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all transform group-hover:scale-105 shrink-0 cursor-pointer ${
                    newClientFingerprintEnrolled 
                      ? 'bg-emerald-500 text-white font-black shadow-glow-green' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black shadow-glow-gold'
                  }`}
                >
                  {newClientFingerprintEnrolled ? '✓ Ver Escáner' : '⚡ Abrir Escáner'}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewMemberModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-black text-white shadow-glow-gold uppercase tracking-wider transition-all transform hover:scale-[1.02]"
                >
                  Guardar e Ingresar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      
      {/* MODAL: DASHBOARD DEL ESCÁNER BIOMÉTRICO EN GRANDE */}
      {showBiometricDashboard && (
        <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="relative bg-gradient-to-b from-[#111625] via-[#0b0e17] to-[#04060a] border-2 border-cyan-500/50 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.35)] animate-in zoom-in-95 duration-200 text-white overflow-hidden">
            {/* Top decorative neon cyber bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]" />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                  <Fingerprint className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase">
                    Dashboard Biométrico de Huella
                  </h3>
                  <p className="text-xs text-gray-300">
                    Estación de enrolamiento óptico en alta resolución • 500 DPI
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black">
                  <span className={`w-2 h-2 rounded-full ${
                    biometricScanState === 'scanning' ? 'bg-amber-400 animate-ping' :
                    biometricScanState === 'completed' ? 'bg-emerald-400' : 'bg-cyan-400 animate-ping'
                  }`} />
                  {biometricScanState === 'scanning' ? 'ESCANEANDO' :
                   biometricScanState === 'completed' ? 'ENROLADA' : 'SENSOR ACTIVO'}
                </div>
                <button 
                  onClick={() => setShowBiometricDashboard(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Client summary pill if name exists */}
            {newClientName.trim() && (
              <div className="mb-3 px-3.5 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs">
                <span className="text-gray-300">Socio a enrolar: <strong className="text-white font-bold">{newClientName}</strong></span>
                <span className="text-cyan-400 font-mono font-bold">{newClientPlan}</span>
              </div>
            )}

            {/* Selector of Finger */}
            <div className="mb-3">
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                Selecciona el dedo a registrar:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Pulgar Derecho', 'Índice Derecho', 'Pulgar Izquierdo', 'Índice Izquierdo'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setSelectedFinger(f)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                      selectedFinger === f
                        ? 'bg-cyan-600 text-white font-bold border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Centerpiece Scanner Dashboard View ("en grande") */}
            <div className="flex flex-col items-center justify-center my-2 select-none">
              <div 
                onClick={() => {
                  if (biometricScanState !== 'scanning') {
                    handleEnrollFingerprintAction();
                  }
                }}
                className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center cursor-pointer group my-1"
                title="Haz clic para registrar tu huella"
              >
                {/* Outer Glow Halo */}
                <div className={`absolute inset-4 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${
                  biometricScanState === 'completed'
                    ? 'bg-emerald-500/30'
                    : biometricScanState === 'scanning'
                    ? 'bg-amber-500/30'
                    : 'bg-cyan-500/20 group-hover:bg-cyan-400/35'
                }`} />

                {/* Rotating HUD Rings (Clockwise) */}
                <img 
                  src="/biometric-rings-opt.png" 
                  alt="HUD Biometric Rings" 
                  className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(6,182,212,0.45)] pointer-events-none animate-biometric-spin"
                />

                {/* Upright Center Fingerprint */}
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center rounded-full overflow-hidden">
                  <img 
                    src="/biometric-fingerprint-opt.png" 
                    alt="Huella Digital" 
                    className={`w-full h-full object-contain filter transition-transform duration-300 ${
                      biometricScanState === 'completed'
                        ? 'drop-shadow-[0_0_20px_rgba(16,185,129,0.9)] scale-105'
                        : 'drop-shadow-[0_0_12px_rgba(255,255,255,0.85)] group-hover:scale-105'
                    }`}
                  />

                  {/* Biometric Laser Scanning Line */}
                  <div className="absolute left-0 right-0 pointer-events-none animate-biometric-laser">
                    <div className={`h-10 w-full bg-gradient-to-t to-transparent ${
                      biometricScanState === 'completed' ? 'from-emerald-400/50' : 'from-cyan-400/40'
                    }`} />
                    <div className={`h-1 w-full ${
                      biometricScanState === 'completed'
                        ? 'bg-emerald-300 shadow-[0_0_15px_#34d399,0_0_30px_#10b981]'
                        : 'bg-cyan-300 shadow-[0_0_12px_#38bdf8,0_0_24px_#06b6d4]'
                    }`} />
                  </div>
                </div>

                {/* Radar Pulse Wave */}
                <div className="absolute w-36 h-36 rounded-full border border-cyan-400/50 animate-ping pointer-events-none opacity-40" />
              </div>

              {/* Status Badge Under Scanner */}
              <div className="mt-2 text-center">
                {biometricScanState === 'idle' && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                      SENSOR LISTO • TOCA EL ESCÁNER O PULSA REGISTRARME
                    </span>
                  </div>
                )}
                {biometricScanState === 'scanning' && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      ESCANEANDO MINUCIAS Y CRESTAS PAPILARES...
                    </span>
                  </div>
                )}
                {biometricScanState === 'completed' && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                      ✓ HUELLA REGISTRADA CON ÉXITO (CALIDAD 99%)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* High-Tech Biometric Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 text-center">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Calidad de Señal</p>
                <p className="text-xs font-black text-emerald-400 mt-0.5">98.6% Óptima</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Minucias</p>
                <p className="text-xs font-black text-cyan-400 mt-0.5">136 Detectadas</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Resolución</p>
                <p className="text-xs font-black text-amber-400 mt-0.5">508 DPI Óptico</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">Seguridad</p>
                <p className="text-xs font-black text-purple-400 mt-0.5">Cifrado SHA-256</p>
              </div>
            </div>

            {/* Primary Action Button: REGISTRARME */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleEnrollFingerprintAction}
                disabled={biometricScanState === 'scanning'}
                className={`w-full py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer ${
                  biometricScanState === 'completed'
                    ? 'bg-emerald-500 text-white font-black shadow-glow-green'
                    : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 text-white font-black shadow-[0_0_25px_rgba(245,158,11,0.5)]'
                }`}
              >
                {biometricScanState === 'scanning' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Escaneando Huella Digital...</span>
                  </>
                ) : biometricScanState === 'completed' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>✓ Huella Enrolada - Guardando...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-5 h-5 text-white" />
                    <span>👆 Registrar Mi Huella Digital</span>
                  </>
                )}
              </button>

              <div className="mt-2.5 text-center">
                <button
                  type="button"
                  onClick={() => setShowBiometricDashboard(false)}
                  className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer font-bold"
                >
                  ← Volver al Formulario de Registro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PASE DE VISITA / CLASE PRUEBA */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-[#0d0f17]/92 backdrop-blur-2xl border-2 border-emerald-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl shadow-emerald-500/15 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              <img 
                src={modalGymBg} 
                alt="Fondo Mancuernas Fitness" 
                className="w-full h-full object-cover object-bottom opacity-35 select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f]/95 via-[#0e1017]/85 to-[#0e1017]/90 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] pointer-events-none" />
            </div>
            <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"><Dumbbell className="w-5 h-5 text-emerald-400" /></div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    Pase de Visita por 1 Día
                  </h3>
                  <p className="text-xs text-gray-300">Ingreso rápido para entrenamiento diario</p>
                </div>
              </div>
              <button 
                onClick={() => setShowVisitModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative z-10 space-y-4">

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-300">Tarifa de Visita Diaria:</p>
                  <p className="text-2xl font-black text-emerald-400 font-mono">{'$' + visitCost}</p>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Paso Inmediato
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowVisitModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRegisterVisit}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-xs font-black text-white shadow-glow-green uppercase tracking-wider"
                >
                  🔓 Conceder Acceso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: YA TENGO MEMBRESÍA (ACCESO DIRECTO) */}
      {showDirectAccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative bg-[#0d0f17]/92 backdrop-blur-2xl border-2 border-amber-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl shadow-amber-500/15 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              <img 
                src={modalGymBg} 
                alt="Fondo Mancuernas Fitness" 
                className="w-full h-full object-cover object-bottom opacity-35 select-none pointer-events-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#090a0f]/95 via-[#0e1017]/85 to-[#0e1017]/90 pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b] pointer-events-none" />
            </div>
            <div className="relative z-10 flex items-center justify-between border-b border-white/15 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-amber-400" /></div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    Validación de Socio Activo
                  </h3>
                  <p className="text-xs text-gray-300">Posa tu huella o ingresa tu cédula / ID</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDirectAccessModal(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-2 select-none">
              {/* Neon Green Biometric Scanner Pad */}
              <div 
                onClick={() => {
                  executeScan('MEM-001');
                  setShowDirectAccessModal(false);
                }}
                className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-black/85 border-2 border-emerald-500/50 hover:border-emerald-400 flex items-center justify-center cursor-pointer group shadow-[0_0_35px_rgba(16,185,129,0.3)] hover:shadow-[0_0_55px_rgba(16,185,129,0.5)] transition-all duration-300 overflow-hidden my-2"
                title="Posa tu huella en el sensor"
              >
                {/* Corner Target Markers */}
                <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
                <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
                <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
                <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />

                {/* Cyber Grid Lines Background */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#052e16_1px,transparent_1px),linear-gradient(to_bottom,#052e16_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />

                {/* Outer Ambient Glow */}
                <div className="absolute inset-6 rounded-full bg-emerald-500/15 blur-2xl group-hover:bg-emerald-400/30 transition-all duration-500 pointer-events-none" />

                {/* Neon Green Fingerprint Image & Scanning Laser */}
                <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                  <img 
                    src="/biometric-green-fp-opt.png" 
                    alt="Huella Biométrica Neón Verde" 
                    className="w-full h-full object-contain filter drop-shadow-[0_0_18px_rgba(34,197,94,0.95)] group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Animated Neon Green Laser Line */}
                  <div className="absolute left-0 right-0 pointer-events-none animate-green-laser z-20">
                    <div className="h-10 w-full bg-gradient-to-t from-emerald-400/35 via-emerald-400/15 to-transparent" />
                    <div className="h-1 w-full bg-white shadow-[0_0_12px_#22c55e,0_0_24px_#10b981,0_0_36px_#22c55e]" />
                  </div>
                </div>

                {/* Radar Pulse Wave */}
                <div className="absolute w-44 h-44 rounded-full border border-emerald-400/40 animate-ping pointer-events-none opacity-30" />
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 mt-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                  SENSOR BIOMÉTRICO ACTIVO
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Posa tu huella en el lector USB o ingresa tu ID
              </p>
            </div>

            {/* Search / ID input */}
            <div className="mt-2 pt-4 border-t border-white/15">
              <label className="text-xs font-bold text-gray-300 block mb-1.5">O escribe tu cédula o ID de socio:</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      executeScan(searchQuery.trim());
                      setSearchQuery('');
                      setShowDirectAccessModal(false);
                    }
                  }}
                  placeholder="Ej. Carlos Mendoza, MEM-001 o 45892011..."
                  className="flex-1 px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => {
                    if (searchQuery.trim()) {
                      executeScan(searchQuery.trim());
                      setSearchQuery('');
                      setShowDirectAccessModal(false);
                    }
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-glow-gold"
                >
                  Verificar
                </button>
              </div>
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

    </div>
  );
};

export default IndependentTerminalApp;
