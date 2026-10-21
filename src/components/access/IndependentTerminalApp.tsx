import gymBg from '../../assets/gym-background.jpg';
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
  Check
} from 'lucide-react';
import { Client, MembershipPlanType, PaymentMethod } from '../../types';
import { getGymAvatar } from '../../utils/genderAvatar';
import { checkServerHealth, fetchMembersFromServer } from '../../services/syncService';

export const IndependentTerminalApp: React.FC = () => {
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [bgImage, setBgImage] = useState<string>(() => {
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

    // Instant direct access for the new member
    executeScan(memberId);
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

  // Fullscreen / Kiosk toggle
  const toggleFullScreen = () => {
    // Check if electronAPI exists
    if ((window as any).electronAPI?.toggleFullScreen) {
      (window as any).electronAPI.toggleFullScreen();
      setIsFullScreen(!isFullScreen);
      return;
    }

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
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
      
            {/* Hardware-accelerated 8K Ultra-Sharp Filter definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
        <defs>
          <filter id="ultra-sharp-8k-terminal" x="-10%" y="-10%" width="120%" height="120%">
            <feConvolveMatrix 
              order="3" 
              preserveAlpha="true" 
              kernelMatrix="
                0 -0.25 0 
                -0.25 2.0 -0.25 
                0 -0.25 0" 
            />
          </filter>
        </defs>
      </svg>

      {/* Real Gym Background Photo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={bgImage}
          alt="Fitness Legends Gym Background"
          style={{
            filter: 'url(#ultra-sharp-8k-terminal) brightness(0.98) contrast(1.08) saturate(1.08)',
            imageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)',
          }}
          className="w-full h-full object-cover object-center"
        />
        {/* Soft Eye-Care anti-glare shield so neon lights do not hurt the eyes */}
        

      </div>

      {/* Top Application Bar / Brand & Terminal Header */}
      <div className="w-full max-w-6xl mx-auto shrink-0 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 relative">
          
          {/* Subtle glow accent */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Left Title with Gym Logo */}
          <div 
            className="flex items-center gap-3.5 select-none"
            onDoubleClick={() => setIsConfigModalOpen(true)}
            title="FITNESS LEGENDS"
          >
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 p-1 shrink-0 shadow-lg flex items-center justify-center">
              <img
                src={logoImg}
                alt="Fitness Legends Gym"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h1 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase">
                  CONTROL DE ACCESO
                </h1>
                <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-md font-bold">
                  Lector Activo
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gym-muted mt-0.5">
                Validación instantánea de huella digital y vigencia de cuota en el acceso principal.
              </p>
            </div>
          </div>


        </div>
      </div>

      {/* Main Container: 3 Clear Intuitive Access Options */}
      <div className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center items-center py-4 px-4 relative z-10">

        {/* Turnstile Relay Active Banner when open */}
        {relayRemainingSeconds > 0 && (
          <div className="w-full max-w-2xl mb-4 py-3 px-5 rounded-2xl bg-gradient-to-r from-emerald-500/30 via-emerald-500/40 to-emerald-500/30 border border-emerald-400/80 shadow-glow-green text-center animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-2.5 text-emerald-200 font-black text-sm uppercase tracking-wider">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 animate-spin" />
              <span>ACCESO CONCEDIDO (PASO LIBRE)</span>
              <span className="bg-emerald-400 text-black px-2.5 py-0.5 rounded-full font-mono text-xs font-black">
                {relayRemainingSeconds}s
              </span>
            </div>
          </div>
        )}

        {/* Verified Client Alert Banner */}
        {lastVerifiedClient && scanStatus !== 'idle' && (
          <div className={'w-full max-w-2xl mb-4 p-4 rounded-2xl border flex items-center justify-between gap-4 animate-in zoom-in-95 duration-200 shadow-2xl ' + (
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

        {/* Main Welcome Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-xs font-bold text-amber-300 mb-2.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>TERMINAL DE ACCESO • FITNESS LEGENDS</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
            SELECCIONA TU TIPO DE INGRESO
          </h2>
          <p className="text-xs sm:text-sm text-gray-200 mt-1 font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            Toca una de las 3 opciones para gestionar tu acceso a la sala
          </p>
        </div>

        {/* The 3 Clean High-Impact Options Grid - No Black Background, Minimalist & Sleek */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 w-full">

          {/* Opción 1: CLIENTE NUEVO */}
          <div 
            onClick={() => setShowNewMemberModal(true)}
            className="group relative p-8 rounded-3xl bg-white/10 hover:bg-white/20 backdrop-blur-md border-2 border-white/30 hover:border-amber-400 transition-all duration-300 shadow-2xl flex flex-col items-center justify-center text-center cursor-pointer transform hover:-translate-y-2 hover:shadow-glow-gold"
          >
            <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
              👤
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors drop-shadow">
              Cliente Nuevo
            </h3>
          </div>

          {/* Opción 2: QUIERO VISITA */}
          <div 
            onClick={() => setShowVisitModal(true)}
            className="group relative p-8 rounded-3xl bg-white/10 hover:bg-white/20 backdrop-blur-md border-2 border-white/30 hover:border-emerald-400 transition-all duration-300 shadow-2xl flex flex-col items-center justify-center text-center cursor-pointer transform hover:-translate-y-2 hover:shadow-glow-green"
          >
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
              🎟️
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider group-hover:text-emerald-400 transition-colors drop-shadow">
              Quiero Visita
            </h3>
          </div>

          {/* Opción 3: YA SOY CLIENTE (REGISTRA TU HUELLA) */}
          <div 
            onClick={() => setShowDirectAccessModal(true)}
            className="group relative p-8 rounded-3xl bg-white/10 hover:bg-white/20 backdrop-blur-md border-2 border-amber-400/80 hover:border-amber-400 transition-all duration-300 shadow-2xl shadow-glow-gold/40 flex flex-col items-center justify-center text-center cursor-pointer transform hover:-translate-y-2 hover:shadow-glow-gold"
          >
            <div className="w-20 h-20 rounded-2xl bg-amber-500/30 border border-amber-400/60 flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
              ⚡
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider group-hover:text-amber-400 transition-colors drop-shadow">
              Ya Soy Cliente
            </h3>
            <span className="text-xs font-bold text-amber-300 mt-1 uppercase tracking-wider drop-shadow">
              Registra tu Huella
            </span>
          </div>

        </div>

        {/* Bottom subtle hint */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-300 font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            💡 <strong className="text-white">Lector Automático:</strong> Puedes posar tu dedo directamente en el sensor USB o pasar tu tarjeta RFID en cualquier momento.
          </p>
        </div>

      </div>

      {/* MODAL 1: REGISTRO CLIENTE NUEVO */}
      {showNewMemberModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-[#161824]/95 border border-amber-500/40 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4">
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

            <form onSubmit={handleRegisterNewMember} className="space-y-4">
              
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
                    <span>Correo Electrónico *</span>
                  </label>
                  <input 
                    type="email"
                    required
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="andrea@ejemplo.com"
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

              {/* Cédula / Documento ID */}
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">
                  Cédula / Documento ID (Opcional)
                </label>
                <input 
                  type="text"
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  placeholder="Ej. 10234567"
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                />
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
                        ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
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
                        ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
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
                        ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
                        : 'bg-white/10 text-gray-300 border-white/15 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>📱 Transfer / SINPE</span>
                  </button>
                </div>
              </div>

              {/* Fingerprint Capture Simulator */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">👆</span>
                  <div>
                    <p className="text-xs font-bold text-white">Captura de Huella Digital</p>
                    <p className="text-[11px] text-gray-300">
                      {newClientFingerprintEnrolled 
                        ? '✓ Huella enrolada correctamente' 
                        : 'Sensor biométrico listo para capturar'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setNewClientFingerprintEnrolled(!newClientFingerprintEnrolled)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    newClientFingerprintEnrolled 
                      ? 'bg-emerald-500 text-black shadow-glow-green' 
                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-glow-gold'
                  }`}
                >
                  {newClientFingerprintEnrolled ? '✓ Enrolada' : 'Capturar Huella'}
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
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-black shadow-glow-gold uppercase tracking-wider transition-all transform hover:scale-[1.02]"
                >
                  Guardar e Ingresar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PASE DE VISITA / CLASE PRUEBA */}
      {showVisitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#161824]/95 border border-emerald-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎟️</span>
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

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Nombre del Visitante (Opcional)</label>
                <input 
                  type="text"
                  value={visitClientName}
                  onChange={(e) => setVisitClientName(e.target.value)}
                  placeholder="Ej. Juan Pérez (o dejar vacío)"
                  className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

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
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-black shadow-glow-green uppercase tracking-wider"
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
          <div className="bg-[#161824]/95 border border-amber-500/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚡</span>
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

            <div className="flex flex-col items-center justify-center py-4">
              {/* Interactive Fingerprint Pad */}
              <div 
                onClick={() => {
                  executeScan('MEM-001');
                  setShowDirectAccessModal(false);
                }}
                className="relative w-32 h-32 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center cursor-pointer transition-all duration-300 shadow-glow-gold group"
                title="Haz clic para simular lectura de huella"
              >
                <div className="text-5xl text-amber-400 group-hover:scale-110 transition-transform">
                  <Zap className="w-16 h-16 fill-amber-400" />
                </div>
              </div>
              <p className="text-xs font-bold text-amber-400 mt-3 uppercase tracking-wider">
                Toca el sensor de huella
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
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-glow-gold"
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
