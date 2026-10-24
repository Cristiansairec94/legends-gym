import React, { useState, useEffect, useRef } from 'react';
import { useGym } from '../../context/GymContext';
import { FingerprintScanner } from './FingerprintScanner';
import { AccessHistory } from './AccessHistory';
import { sounds } from '../../services/audio';
import confetti from 'canvas-confetti';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  ArrowRight, 
  ArrowLeft, 
  Fingerprint, 
  Zap, 
  Clock, 
  ShieldCheck, 
  Award, 
  Check, 
  ExternalLink, 
  Maximize2, 
  Minimize2, 
  Search,
  Ticket,
  ChevronRight,
  HeartPulse,
  IdCard,
  QrCode,
  DollarSign,
  Volume2,
  VolumeX,
  History
} from 'lucide-react';
import { Client, MembershipPlanType, PaymentMethod } from '../../types';
import gymBg4k from '../../assets/gym-background-4k.jpg';
import { fetchMembersFromServer } from '../../services/syncService';
import { getTerminalConfig } from './TerminalSyncModal';

export interface SmartFitKioskProps {
  onOpenErp?: () => void;
}

export const SmartFitKiosk: React.FC<SmartFitKioskProps> = ({ onOpenErp }) => {
  const { addMember, verifyBiometricAccess, members, replaceMembers } = useGym();

  // Kiosk navigation state: 'home' | 'member-access' | 'register' | 'visit' | 'success'
  const [currentView, setCurrentView] = useState<'home' | 'member-access' | 'register' | 'visit' | 'success'>('home');
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1); // 1: Datos, 2: Planes, 3: Pago

  // Current real-time clock
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    documentId: '',
    gender: 'male' as 'male' | 'female',
    emergencyContactName: '',
    emergencyContactPhone: '',
    selectedPlanType: 'monthly' as MembershipPlanType,
    selectedPlanName: 'Mensualidad Estándar',
    selectedPlanPrice: 850,
    selectedPlanDurationDays: 30,
    paymentMethod: 'cash' as PaymentMethod,
  });

  // Success result state
  const [createdMember, setCreatedMember] = useState<Client | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(20);

  // Biometric scanner state for existing members
  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'granted' | 'denied'>('idle');
  const [verifiedMember, setVerifiedMember] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [relayRemaining, setRelayRemaining] = useState(0);

  // Keyboard wedge scanner buffer (RFID cards / Barcode scanner)
  const keyBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const serverVersionRef = useRef<number>(0);

  // Real-time clock tick
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Background server auto-sync for multi-computer setups
  useEffect(() => {
    const config = getTerminalConfig();
    if (!config.serverUrl) return;

    const doSync = async () => {
      try {
        const res = await fetchMembersFromServer(config.serverUrl, serverVersionRef.current);
        if (res.success && res.members && res.members.length > 0 && res.version !== serverVersionRef.current) {
          replaceMembers(res.members);
          serverVersionRef.current = res.version;
        }
      } catch {
        // silent
      }
    };

    doSync();
    if (config.autoSync) {
      const interval = setInterval(doSync, Math.max(3, config.syncIntervalSeconds || 3) * 1000);
      return () => clearInterval(interval);
    }
  }, [replaceMembers]);

  // Speech synthesis announcement
  const announceAccess = (clientName: string, granted: boolean) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = granted 
        ? `Bienvenido ${clientName}, acceso concedido` 
        : `Acceso restringido para ${clientName}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';
      utterance.rate = 1.05;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Keyboard wedge listener: scan RFID badge or barcode card from ANY screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 250) {
        keyBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const scannedCode = keyBufferRef.current.trim();
        if (scannedCode.length >= 2) {
          setCurrentView('member-access');
          executeScanMember(scannedCode);
        }
        keyBufferRef.current = '';
      } else if (e.key.length === 1) {
        keyBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted]);

  // Countdown timer on success view to return to home
  useEffect(() => {
    if (currentView !== 'success') return;
    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          resetToHome();
          return 20;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentView]);

  // Turnstile relay timer
  useEffect(() => {
    if (relayRemaining <= 0) return;
    const timer = setInterval(() => {
      setRelayRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [relayRemaining]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  const resetToHome = () => {
    setCurrentView('home');
    setRegisterStep(1);
    setCreatedMember(null);
    setVerifiedMember(null);
    setScanStatus('idle');
    setSearchQuery('');
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      age: '',
      documentId: '',
      gender: 'male',
      emergencyContactName: '',
      emergencyContactPhone: '',
      selectedPlanType: 'monthly',
      selectedPlanName: 'Mensualidad Estándar',
      selectedPlanPrice: 850,
      selectedPlanDurationDays: 30,
      paymentMethod: 'cash',
    });
  };

  // Plan catalog (Smart Fit style)
  const AVAILABLE_PLANS = [
    {
      id: 'plan-monthly',
      type: 'monthly' as MembershipPlanType,
      name: 'Plan Mensual Estándar',
      price: 850,
      durationDays: 30,
      period: 'por mes',
      badge: 'MÁS POPULAR',
      recommended: true,
      features: [
        'Acceso total ilimitado a pesas y máquinas',
        'Zona de cardio con pantallas interactivas',
        'Vestidores, casilleros y regaderas con agua caliente',
        'Asesoría de rutina con coach de sala',
        'Sin cobro por mantenimiento anual'
      ]
    },
    {
      id: 'plan-weekly',
      type: 'daily' as MembershipPlanType,
      name: 'Plan Semanal (7 Días)',
      price: 350,
      durationDays: 7,
      period: 'por semana',
      badge: 'SIN COMPROMISO',
      recommended: false,
      features: [
        '7 días continuos de acceso completo',
        'Ideal para viajes, vacaciones o prueba',
        'Uso completo de pesas, cardio y regaderas',
        'Sin inscripción ni penalizaciones'
      ]
    },
    {
      id: 'plan-daily',
      type: 'daily' as MembershipPlanType,
      name: 'Pase por Día (Day Pass)',
      price: 150,
      durationDays: 1,
      period: 'por 1 día',
      badge: 'VISITA RÁPIDA',
      recommended: false,
      features: [
        'Acceso completo durante todo el día',
        'Uso libre de todas las instalaciones',
        'Entrenamiento único o visita ocasional',
        'Paso libre instantáneo hoy'
      ]
    },
    {
      id: 'plan-vip',
      type: 'vip' as MembershipPlanType,
      name: 'Membresía Black VIP Anual',
      price: 9500,
      durationDays: 365,
      period: 'anual (ahorro 20%)',
      badge: 'VIP BLACK',
      recommended: false,
      features: [
        'Acceso 365 días del año sin restricciones',
        'Playera oficial Legends Gym de regalo',
        'Casillero personal asignado todo el año',
        '1 invitado gratis al mes (fin de semana)',
        'Acceso preferencial multi-sucursales'
      ]
    }
  ];

  // Handle plan selection
  const handleSelectPlan = (plan: typeof AVAILABLE_PLANS[0]) => {
    setFormData(prev => ({
      ...prev,
      selectedPlanType: plan.type,
      selectedPlanName: plan.name,
      selectedPlanPrice: plan.price,
      selectedPlanDurationDays: plan.durationDays
    }));
  };

  // Handle final registration submit
  const handleCompleteRegistration = (isVisitOnly: boolean = false) => {
    sounds.unlock();

    // Determine birth date roughly from age
    const numericAge = parseInt(formData.age, 10) || 24;
    const birthYear = new Date().getFullYear() - numericAge;
    const birthDate = `${birthYear}-06-15`;

    const docId = formData.documentId.trim() || `${Math.floor(10000000 + Math.random() * 90000000)}`;

    const startDate = new Date().toISOString().slice(0, 10);
    const endDate = new Date(Date.now() + (formData.selectedPlanDurationDays || 30) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Call GymContext addMember
    const newClient = addMember({
      fullName: formData.fullName.trim() || (isVisitOnly ? 'Visita del Día' : 'Nuevo Atleta'),
      email: formData.email.trim() || `atleta-${docId}@leyendsgym.com`,
      phone: formData.phone.trim() || '+52 55 0000 0000',
      documentId: docId,
      birthDate: birthDate,
      emergencyContact: {
        name: formData.emergencyContactName.trim() || 'Familiar',
        phone: formData.emergencyContactPhone.trim() || formData.phone.trim() || '+52 55 1111 2222',
        relationship: 'Contacto'
      },
      membership: {
        planType: formData.selectedPlanType,
        planName: formData.selectedPlanName,
        startDate: startDate,
        endDate: endDate,
        price: formData.selectedPlanPrice,
        status: 'active',
        daysRemaining: formData.selectedPlanDurationDays
      }
    }, formData.paymentMethod);

    setCreatedMember(newClient);
    setCountdownSeconds(25);
    setCurrentView('success');

    // Trigger celebration effects
    sounds.playAccessGranted();
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.35, x: 0.5 },
      colors: ['#EAB308', '#FACC15', '#FFFFFF', '#10B981']
    });
  };

  // Handle member scan for existing members
  const executeScanMember = (identifier: string) => {
    if (scanStatus === 'scanning') return;
    if (!isMuted) {
      sounds.unlock();
      sounds.playScanBlip();
    }
    setScanStatus('scanning');
    setVerifiedMember(null);

    setTimeout(() => {
      const result = verifyBiometricAccess(identifier);
      if (result.granted) {
        if (!isMuted) sounds.playAccessGranted();
        setScanStatus('granted');
        setRelayRemaining(7);
        if (result.client) {
          setVerifiedMember(result.client);
          announceAccess(result.client.fullName, true);
        }
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.45, x: 0.5 },
          colors: ['#10B981', '#FACC15', '#FFFFFF']
        });
      } else {
        if (!isMuted) sounds.playAccessDenied();
        setScanStatus('denied');
        if (result.client) {
          setVerifiedMember(result.client);
          announceAccess(result.client.fullName, false);
        } else {
          announceAccess('Socio no encontrado', false);
        }
      }
    }, 700);
  };

  return (
    <div className="relative min-h-screen h-screen w-full overflow-y-auto bg-[#07080c] text-white flex flex-col justify-between font-sans select-none z-0">
      
      {/* 🏋️ Fullscreen Background 4K UHD Dark Luxury - Club Fitness (Sin Techo) */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <img
          src={gymBg4k}
          alt="Legends Gym Club Fitness 4K"
          className="w-full h-full object-cover object-[center_top] filter brightness-[0.88] contrast-[1.18] saturate-[1.08]"
        />
        {/* Soft dark vignette that keeps the photo clear and luminous */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/65 pointer-events-none" />
        {/* Luminous Neon Light Strip Bloom at top */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl h-36 bg-gradient-to-b from-amber-400/20 via-yellow-400/10 to-transparent blur-3xl pointer-events-none animate-pulse" />
      </div>

      {/* 🧭 Top Kiosk Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-3 sm:pt-4 relative z-10 shrink-0">
        <div className="bg-black/40 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div 
            onClick={resetToHome}
            className="flex items-center gap-3 cursor-pointer group"
            title="Volver a la pantalla principal"
          >
            <div className="w-11 h-11 rounded-xl bg-black border border-white/20 p-1 flex items-center justify-center shadow-lg ring-1 ring-amber-400/30 group-hover:scale-105 transition-transform shrink-0">
              <img src="/logo.png" alt="Legends Gym" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-wider text-white">LEYENDS</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-black shadow-glow-gold">
                  SMART KIOSK
                </span>
              </div>
              <p className="text-xs text-amber-300 font-semibold tracking-wide hidden sm:block">
                "TU ÚNICO LÍMITE ERES TÚ" • AUTOSERVICIO
              </p>
            </div>
          </div>

          {/* Right Kiosk Info & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-time Clock */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>

            {/* Access History Button */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-black/40 hover:bg-black/60 text-xs font-bold text-amber-300 hover:text-white transition-all border border-amber-500/20 flex items-center gap-1.5"
              title="Ver Registro de Accesos"
            >
              <History className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Historial</span>
            </button>

            {/* Sound Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-gray-200 hover:text-white transition-all border border-white/10"
              title={isMuted ? 'Activar Sonido y Voz' : 'Silenciar'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Back to ERP Mode Button */}
            <button
              onClick={() => {
                if (onOpenErp) onOpenErp();
                else {
                  localStorage.removeItem('legends_device_mode');
                  window.location.href = window.location.pathname.includes('index.html') ? 'index.html?mode=main' : '/?mode=main';
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 hover:bg-black/60 text-xs font-bold text-gray-200 hover:text-white transition-all border border-white/10"
              title="Abrir Sistema ERP Administrativo (POS, Caja, Socios)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Modo ERP</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullScreen}
              className="p-2 rounded-xl bg-black/40 hover:bg-black/60 text-gray-200 hover:text-white transition-all border border-white/10"
              title="Pantalla Completa (F11)"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* 🚀 Main Kiosk Screen Container */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 flex-1 flex flex-col justify-center items-center relative z-10">

        {/* ============================================================== */}
        {/* VIEW 1: HOME SCREEN (Bienvenida y Selección Smart Fit) */}
        {/* ============================================================== */}
        {currentView === 'home' && (
          <div className="w-full max-w-5xl space-y-4 sm:space-y-6 animate-in fade-in duration-300">
            
            {/* Hero Welcome Text */}
            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/50 border border-amber-400/40 text-amber-300 text-xs font-black uppercase tracking-widest backdrop-blur-md shadow-glow-gold/30">
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>BIENVENIDO A LEGENDS PRO GYM</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                ¿Qué deseas hacer hoy?
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 font-medium max-w-xl mx-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                Selecciona una opción para ingresar con tu huella, inscribirte o adquirir un pase.
              </p>
            </div>

            {/* 3 Main Smart Fit Interactive Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">

              {/* CARD 1: YA SOY SOCIO (Acceso Rápido) */}
              <div
                onClick={() => setCurrentView('member-access')}
                className="group relative bg-black/35 hover:bg-black/55 backdrop-blur-md rounded-3xl p-6 sm:p-7 border-2 border-white/20 hover:border-emerald-400 shadow-[0_15px_35px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(16,185,129,0.4)] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform shadow-glow-green">
                      <Fingerprint className="w-8 h-8" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ACCESO RÁPIDO
                    </span>
                  </div>

                  <h3 className="text-2xl font-black uppercase text-white group-hover:text-emerald-400 transition-colors drop-shadow">
                    Ya soy Socio
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 font-medium mt-2 leading-relaxed">
                    Pon tu dedo en el sensor o busca por tu cédula/nombre para liberar el torniquete al instante.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-emerald-400 font-extrabold text-sm group-hover:translate-x-1 transition-transform">
                  <span>Escanear Huella</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

              {/* CARD 2: SOY NUEVO • INSCRIBIRME (Planes) */}
              <div
                onClick={() => {
                  setFormData(prev => ({ ...prev, selectedPlanType: 'monthly', selectedPlanName: 'Plan Mensual Estándar', selectedPlanPrice: 850, selectedPlanDurationDays: 30 }));
                  setCurrentView('register');
                  setRegisterStep(1);
                }}
                className="group relative bg-gradient-to-b from-amber-500/25 to-black/45 hover:from-amber-500/35 hover:to-black/60 backdrop-blur-md rounded-3xl p-6 sm:p-7 border-2 border-amber-400 hover:border-yellow-300 shadow-[0_20px_45px_rgba(245,158,11,0.25)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden scale-[1.02]"
              >
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-400/30 transition-all" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500 text-black flex items-center justify-center font-black group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                      <Award className="w-8 h-8 stroke-[2.5]" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-400 text-black shadow-glow-gold animate-pulse">
                      ¡MÁS POPULAR!
                    </span>
                  </div>

                  <h3 className="text-2xl font-black uppercase text-white group-hover:text-amber-300 transition-colors drop-shadow">
                    Soy Nuevo • Inscribirme
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-200 font-medium mt-2 leading-relaxed">
                    Únete hoy en menos de 1 minuto. Elige tu plan mensual, semanal o anual y entrena de inmediato.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-amber-400/30 flex items-center justify-between text-amber-300 font-black text-sm group-hover:translate-x-1 transition-transform">
                  <span>Ver Planes y Registrarme</span>
                  <ArrowRight className="w-5 h-5 text-amber-400" />
                </div>
              </div>

              {/* CARD 3: SOY VISITA • PASE DEL DÍA O SEMANA */}
              <div
                onClick={() => {
                  setFormData(prev => ({ ...prev, selectedPlanType: 'daily', selectedPlanName: 'Pase por Día (Day Pass)', selectedPlanPrice: 150, selectedPlanDurationDays: 1 }));
                  setCurrentView('visit');
                }}
                className="group relative bg-black/35 hover:bg-black/55 backdrop-blur-md rounded-3xl p-6 sm:p-7 border-2 border-white/20 hover:border-cyan-400 shadow-[0_15px_35px_rgba(0,0,0,0.6)] hover:shadow-[0_0_35px_rgba(6,182,212,0.4)] transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                      <Ticket className="w-8 h-8" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                      SIN CONTRATO
                    </span>
                  </div>

                  <h3 className="text-2xl font-black uppercase text-white group-hover:text-cyan-400 transition-colors drop-shadow">
                    Soy Visita • Pase del Día
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-300 font-medium mt-2 leading-relaxed">
                    ¿Vienes de paso o quieres probar hoy? Compra tu pase por 1 día o por semana con registro rápido.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-cyan-400 font-extrabold text-sm group-hover:translate-x-1 transition-transform">
                  <span>Obtener Pase de Visita</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>

            </div>

            {/* Bottom Quick Feature Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs font-bold text-gray-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Acceso con Biometría Óptica
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Pase de Torniquete Inmediato
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Registro Seguro y Sincronizado
              </span>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: REGISTRATION WIZARD (Estilo Smart Fit) */}
        {/* ============================================================== */}
        {currentView === 'register' && (
          <div className="w-full max-w-4xl bg-black/40 backdrop-blur-xl rounded-3xl border border-white/20 p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Stepper Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <button
                onClick={() => {
                  if (registerStep > 1) setRegisterStep((prev) => (prev - 1) as any);
                  else resetToHome();
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className={`flex items-center gap-1.5 text-xs font-bold ${registerStep === 1 ? 'text-amber-400' : 'text-gray-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${registerStep === 1 ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>1</span>
                  <span className="hidden sm:inline">Tus Datos</span>
                </div>
                <div className="w-6 h-[1px] bg-white/20" />
                <div className={`flex items-center gap-1.5 text-xs font-bold ${registerStep === 2 ? 'text-amber-400' : 'text-gray-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${registerStep === 2 ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>2</span>
                  <span className="hidden sm:inline">Elige tu Plan</span>
                </div>
                <div className="w-6 h-[1px] bg-white/20" />
                <div className={`flex items-center gap-1.5 text-xs font-bold ${registerStep === 3 ? 'text-amber-400' : 'text-gray-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${registerStep === 3 ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>3</span>
                  <span className="hidden sm:inline">Pago</span>
                </div>
              </div>

              <span className="text-xs font-bold text-amber-400 hidden sm:block">Paso {registerStep} de 3</span>
            </div>

            {/* STEP 1: DATOS PERSONALES */}
            {registerStep === 1 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-black text-white">Ingresa tus Datos Personales</h2>
                  <p className="text-xs sm:text-sm text-gray-300">Te tomará menos de 30 segundos crear tu expediente de atleta.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nombre Completo */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Juan Pérez González"
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 text-sm font-semibold"
                    />
                  </div>

                  {/* Correo Electrónico */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="Ej. juan@correo.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 text-sm font-semibold"
                    />
                  </div>

                  {/* Número Telefónico */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-amber-400" />
                      Número Telefónico / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej. +52 55 1234 5678"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 text-sm font-semibold"
                    />
                  </div>

                  {/* Edad */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Edad (Años) *
                    </label>
                    <input
                      type="number"
                      min="12"
                      max="95"
                      required
                      placeholder="Ej. 24"
                      value={formData.age}
                      onChange={e => setFormData({ ...formData, age: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 text-sm font-semibold"
                    />
                  </div>

                  {/* Cédula o DNI */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <IdCard className="w-3.5 h-3.5 text-amber-400" />
                      Cédula / DNI / Identificación
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 45892011 o INE"
                      value={formData.documentId}
                      onChange={e => setFormData({ ...formData, documentId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 text-sm font-semibold"
                    />
                  </div>

                  {/* Género */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-300 block">Género</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'male' })}
                        className={`py-3 rounded-xl font-bold text-xs transition-all border ${formData.gender === 'male' ? 'bg-amber-400 text-black border-amber-400 shadow-glow-gold' : 'bg-black/50 text-gray-300 border-white/10'}`}
                      >
                        Hombre
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: 'female' })}
                        className={`py-3 rounded-xl font-bold text-xs transition-all border ${formData.gender === 'female' ? 'bg-amber-400 text-black border-amber-400 shadow-glow-gold' : 'bg-black/50 text-gray-300 border-white/10'}`}
                      >
                        Mujer
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim()}
                    onClick={() => setRegisterStep(2)}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-black text-sm uppercase tracking-wider shadow-glow-gold transition-all"
                  >
                    <span>Continuar a Selección de Planes</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: SELECCIÓN DE PLANES SMART FIT */}
            {registerStep === 2 && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-black text-white">Elige tu Plan de Entrenamiento</h2>
                  <p className="text-xs sm:text-sm text-gray-300">Todos los planes incluyen acceso completo a las instalaciones de Legends Gym.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {AVAILABLE_PLANS.map(plan => {
                    const isSelected = formData.selectedPlanName === plan.name;
                    return (
                      <div
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan)}
                        className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)] scale-[1.01]'
                            : 'bg-black/40 border-white/15 hover:border-white/40'
                        }`}
                      >
                        {plan.badge && (
                          <span className={`absolute top-3 right-3 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                            plan.recommended ? 'bg-amber-400 text-black shadow-glow-gold' : 'bg-white/15 text-white'
                          }`}>
                            {plan.badge}
                          </span>
                        )}

                        <div>
                          <h4 className="text-lg font-black text-white">{plan.name}</h4>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-3xl font-black text-amber-400">${plan.price.toLocaleString()}</span>
                            <span className="text-xs text-gray-400 font-semibold">{plan.period}</span>
                          </div>

                          <ul className="mt-4 space-y-1.5">
                            {plan.features.map((feat, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-xs text-gray-300">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-400">Duración: {plan.durationDays} días</span>
                          <span className={`text-xs font-black px-3 py-1 rounded-lg ${isSelected ? 'bg-amber-400 text-black' : 'bg-white/10 text-white'}`}>
                            {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRegisterStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Atrás</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegisterStep(3)}
                    className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-sm uppercase tracking-wider shadow-glow-gold transition-all"
                  >
                    <span>Continuar a Forma de Pago</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: FORMA DE PAGO Y CONFIRMACIÓN */}
            {registerStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-black text-white">Confirma tu Inscripción</h2>
                  <p className="text-xs sm:text-sm text-gray-300">Selecciona cómo deseas realizar tu pago para activar tu acceso.</p>
                </div>

                {/* Resumen del Atleta */}
                <div className="p-4 rounded-2xl bg-black/50 border border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block font-medium">Atleta:</span>
                    <strong className="text-white text-sm block truncate">{formData.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">WhatsApp:</span>
                    <strong className="text-white text-sm block truncate">{formData.phone}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Plan Elegido:</span>
                    <strong className="text-amber-400 text-sm block truncate">{formData.selectedPlanName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-medium">Total a Pagar:</span>
                    <strong className="text-emerald-400 text-lg font-black block">${formData.selectedPlanPrice} MXN</strong>
                  </div>
                </div>

                {/* Métodos de Pago */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 block">Forma de Pago:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: 'cash' })}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.paymentMethod === 'cash' ? 'bg-amber-400/20 border-amber-400 shadow-glow-gold' : 'bg-black/40 border-white/10 text-gray-400'
                      }`}
                    >
                      <DollarSign className="w-6 h-6 text-amber-400" />
                      <span className="font-bold text-xs text-white">Efectivo en Recepción</span>
                      <span className="text-[10px] text-gray-400 text-center">Pagas al pasar el torniquete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: 'card' })}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.paymentMethod === 'card' ? 'bg-amber-400/20 border-amber-400 shadow-glow-gold' : 'bg-black/40 border-white/10 text-gray-400'
                      }`}
                    >
                      <CreditCard className="w-6 h-6 text-amber-400" />
                      <span className="font-bold text-xs text-white">Tarjeta de Débito / Crédito</span>
                      <span className="text-[10px] text-gray-400 text-center">En terminal bancaria</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: 'transfer' })}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        formData.paymentMethod === 'transfer' ? 'bg-amber-400/20 border-amber-400 shadow-glow-gold' : 'bg-black/40 border-white/10 text-gray-400'
                      }`}
                    >
                      <QrCode className="w-6 h-6 text-amber-400" />
                      <span className="font-bold text-xs text-white">Transferencia / QR</span>
                      <span className="text-[10px] text-gray-400 text-center">SPEI o CoDi inmediato</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setRegisterStep(2)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Atrás</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCompleteRegistration(false)}
                    className="flex items-center gap-2 px-9 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-black font-black text-sm uppercase tracking-wider shadow-glow-green transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    <span>Finalizar Inscripción y Entrar</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 3: VISIT SCREEN (Registro Express de Visita / Day Pass) */}
        {/* ============================================================== */}
        {currentView === 'visit' && (
          <div className="w-full max-w-2xl bg-black/40 backdrop-blur-xl rounded-3xl border border-white/20 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-200 space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <button
                onClick={resetToHome}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al Inicio</span>
              </button>
              <div className="flex items-center gap-1.5 text-xs font-black text-cyan-400 uppercase tracking-wider">
                <Ticket className="w-4 h-4" />
                <span>Pase Express de Visita</span>
              </div>
            </div>

            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-black text-white">Registro de Visita</h2>
              <p className="text-xs sm:text-sm text-gray-300">Entrena hoy sin trámites pesados. Llena tus datos para generar tu acceso de torniquete.</p>
            </div>

            {/* Opción de pase */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setFormData({ ...formData, selectedPlanType: 'daily', selectedPlanName: 'Pase por Día (Day Pass)', selectedPlanPrice: 150, selectedPlanDurationDays: 1 })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  formData.selectedPlanDurationDays === 1 ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)]' : 'bg-black/40 border-white/10'
                }`}
              >
                <span className="text-[10px] font-black uppercase text-cyan-400 block mb-1">Pase 1 Día</span>
                <span className="text-2xl font-black text-white block">$150 MXN</span>
                <span className="text-xs text-gray-400 block mt-1">Acceso total hoy</span>
              </div>

              <div
                onClick={() => setFormData({ ...formData, selectedPlanType: 'daily', selectedPlanName: 'Plan Semanal (7 Días)', selectedPlanPrice: 350, selectedPlanDurationDays: 7 })}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  formData.selectedPlanDurationDays === 7 ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)]' : 'bg-black/40 border-white/10'
                }`}
              >
                <span className="text-[10px] font-black uppercase text-cyan-400 block mb-1">Pase 7 Días</span>
                <span className="text-2xl font-black text-white block">$350 MXN</span>
                <span className="text-xs text-gray-400 block mt-1">Una semana completa</span>
              </div>
            </div>

            {/* Datos de Visita */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre y apellido"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">WhatsApp / Teléfono *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+52 55..."
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-300">Edad *</label>
                  <input
                    type="number"
                    min="12"
                    max="90"
                    placeholder="Ej. 25"
                    value={formData.age}
                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Correo Electrónico (Para recibir tu comprobante)</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/20 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-sm font-semibold"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={!formData.fullName.trim() || !formData.phone.trim()}
                onClick={() => handleCompleteRegistration(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>Confirmar Pase (${formData.selectedPlanPrice} MXN) y Entrar</span>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 4: MEMBER BIOMETRIC ACCESS (Ya soy Socio) */}
        {/* ============================================================== */}
        {currentView === 'member-access' && (
          <div className="w-full max-w-3xl bg-black/40 backdrop-blur-xl rounded-3xl border border-white/20 p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in-95 duration-200 space-y-6">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <button
                onClick={resetToHome}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al Menú Principal</span>
              </button>
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Torniquete En Vivo</span>
              </div>
            </div>

            {/* Relay Status */}
            {relayRemaining > 0 && (
              <div className="py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/25 via-emerald-500/40 to-emerald-500/25 border border-emerald-400/70 shadow-glow-green text-center animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-sm uppercase tracking-wider">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 animate-spin" />
                  <span>ACCESO CONCEDIDO • PASO LIBRE: {relayRemaining}s</span>
                </div>
              </div>
            )}

            {/* Central Scanner */}
            <div className="py-2">
              <FingerprintScanner
                status={scanStatus}
                onScanClick={() => executeScanMember('MEM-001')}
                clientName={verifiedMember?.fullName}
                planName={verifiedMember?.membership?.planName}
                clientPhoto={verifiedMember?.avatarUrl}
              />
            </div>

            {/* Manual ID / Name Search */}
            <div className="pt-4 border-t border-white/10">
              <label className="text-xs font-bold text-gray-300 block mb-1.5">
                O ingresa tu Nombre, Cédula o Folio de Socio:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchQuery.trim() && executeScanMember(searchQuery.trim())}
                    placeholder="Ej. Carlos Mendoza, MEM-001 o 45892011..."
                    className="w-full pl-9 pr-3 py-2.5 bg-black/50 border border-white/20 rounded-xl text-sm font-semibold text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  disabled={!searchQuery.trim() || scanStatus === 'scanning'}
                  onClick={() => executeScanMember(searchQuery.trim())}
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-glow-gold transition-all"
                >
                  Verificar
                </button>
              </div>
            </div>

            {/* Quick socio demo buttons */}
            <div className="pt-2 flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2">
              <span>Accesos rápidos de prueba:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => executeScanMember('MEM-001')}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-emerald-400 font-bold"
                >
                  ✓ Carlos Mendoza
                </button>
                <button
                  onClick={() => executeScanMember('MEM-004')}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-amber-400 font-bold"
                >
                  ⚠ Membresía Vencida
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 5: SUCCESS WELCOME SCREEN & DIGITAL ATHLETE CREDENTIAL */}
        {/* ============================================================== */}
        {currentView === 'success' && createdMember && (
          <div className="w-full max-w-2xl bg-black/45 backdrop-blur-xl rounded-3xl border-2 border-emerald-400/60 p-6 sm:p-8 shadow-[0_25px_60px_rgba(16,185,129,0.25)] animate-in zoom-in-95 duration-300 text-center space-y-6">
            
            {/* Header Triumph */}
            <div className="space-y-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-glow-green">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h2 className="text-3xl font-black uppercase text-white tracking-tight">
                ¡BIENVENIDO A LEGENDS PRO GYM!
              </h2>
              <p className="text-sm text-emerald-300 font-semibold">
                Tu registro ha sido completado y tu pase al gimnasio está activo.
              </p>
            </div>

            {/* Digital Athlete Credential Card */}
            <div className="bg-gradient-to-br from-black/80 via-[#13151f] to-black/80 p-5 rounded-2xl border border-amber-400/40 shadow-xl text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

              <div className="flex items-center gap-4">
                <img
                  src={createdMember.avatarUrl || '/logo.png'}
                  alt={createdMember.fullName}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md ring-2 ring-black"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                      MIEMBRO ACTIVO
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ID: {createdMember.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">{createdMember.fullName}</h3>
                  <p className="text-xs text-gray-300">{createdMember.membership.planName}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block">Vigencia:</span>
                  <span className="font-bold text-white">{createdMember.membership.daysRemaining} días</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Monto:</span>
                  <span className="font-bold text-emerald-400">${createdMember.membership.price} MXN</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Pago:</span>
                  <span className="font-bold text-amber-400 uppercase">{formData.paymentMethod}</span>
                </div>
              </div>
            </div>

            {/* Biometric Enrolment prompt */}
            <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-left flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Fingerprint className="w-7 h-7 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-300">Enrolamiento de Huella Digital</h4>
                  <p className="text-[11px] text-gray-300">Puedes vincular tu huella con el staff en recepción para entrar siempre sin celular.</p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-lg bg-amber-400 text-black shrink-0">
                Opcional
              </span>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-center">
              <button
                onClick={() => {
                  executeScanMember(createdMember.id);
                  setCurrentView('member-access');
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-wider shadow-glow-green transition-all"
              >
                Acceder y Abrir Torniquete
              </button>

              <button
                onClick={resetToHome}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                Volver al Inicio ({countdownSeconds}s)
              </button>
            </div>

          </div>
        )}

      </main>

      {/* ⚓ Minimal Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 text-center text-[11px] text-gray-400 relative z-10 shrink-0">
        <p>FITNESS LEGENDS PRO GYM • Sistema de Kiosco Inteligente y Control Biométrico en Tiempo Real</p>
      </footer>

      {/* Access History Modal */}
      <AccessHistory
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

    </div>
  );
};

