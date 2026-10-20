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
  ArrowRight
} from 'lucide-react';
import { getGymAvatar } from '../../utils/genderAvatar';
import { checkServerHealth, fetchMembersFromServer } from '../../services/syncService';

export const IndependentTerminalApp: React.FC = () => {
  const { verifyBiometricAccess, members, accessLogs, forceSync, replaceMembers, syncMembersWithServer } = useGym();

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
            filter: 'url(#ultra-sharp-8k-terminal) brightness(0.68) contrast(1.18) saturate(1.10)',
            imageRendering: '-webkit-optimize-contrast',
            transform: 'translateZ(0)',
          }}
          className="w-full h-full object-cover object-center"
        />
        {/* Soft Eye-Care anti-glare shield so neon lights do not hurt the eyes */}
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[0.5px] pointer-events-none" />

      </div>

      {/* Top Application Bar / Brand & Terminal Header */}
      <div className="w-full max-w-6xl mx-auto shrink-0 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 relative">
          
          {/* Subtle glow accent */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Left Title with Gym Logo */}
          <div className="flex items-center gap-3.5">
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

          {/* Right Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Cambiar Foto Button */}
            <label
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/25 text-xs font-bold text-gray-100 hover:text-white cursor-pointer transition-all shadow-md group"
              title="Cambiar fotografía de fondo del gimnasio"
            >
              <Image className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Cambiar Foto</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const result = event.target?.result as string;
                    if (result) {
                      setBgImage(result);
                      try { localStorage.setItem('legends_terminal_bg', result); } catch {}
                    }
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>

            {/* View Access History */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-400 hover:text-amber-300 transition-all shadow-sm group"
              title="Ver desglose detallado de accesos registrados"
            >
              <Clock className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
              <span>Ver Registro de Accesos</span>
              <span className="bg-amber-500/25 text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border border-amber-500/40">
                {accessLogs.length}
              </span>
            </button>

            {/* Mute audio toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl bg-gym-surface hover:bg-gym-border text-gym-muted hover:text-white transition-colors border border-gym-border"
              title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Network / Terminal Settings */}
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-gym-surface hover:bg-gym-border text-xs font-semibold text-gray-200 transition-colors border border-gym-border"
              title="Configuración de red y sincronización"
            >
              <Settings className="w-4 h-4 text-gym-muted hover:text-amber-400" />
              {serverStatus === 'connected' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Enlazado al Servidor Central" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" title="Modo Autónomo Local" />
              )}
            </button>

            {/* Kiosk / Fullscreen toggle */}
            <button
              onClick={toggleFullScreen}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gym-surface hover:bg-gym-border text-xs font-semibold text-gray-200 transition-colors border border-gym-border"
              title="Modo pantalla completa para kiosco de recepción (F11)"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden md:inline">{isFullScreen ? 'Salir' : 'Pantalla Completa'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Container: Biometric Terminal Card adapted to window size */}
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col justify-between gap-3 relative z-10">
        
        {/* Hardware Sensor Simulator Box */}
        <div className="relative flex-1 flex flex-col justify-between gap-3 px-4 py-2">
          
          {/* Top sensor status bar */}
          <div className="flex items-center justify-between border-b border-gym-border pb-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                SENSOR BIOMÉTRICO ÓPTICO USB
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {serverStatus === 'connected' ? (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  LAN Activa
                </span>
              ) : (
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  Caché Local
                </span>
              )}
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                500 DPI • Online
              </span>
            </div>
          </div>

          {/* Turnstile Relay Active Banner when open */}
          {relayRemainingSeconds > 0 && (
            <div className="py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/30 to-emerald-500/20 border border-emerald-400/60 shadow-glow-green text-center animate-in zoom-in-95 duration-200 shrink-0 relative z-20">
              <div className="flex items-center justify-center gap-2 text-emerald-300 font-black text-xs sm:text-sm uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-spin" />
                <span>ACCESO CONCEDIDO (PASO LIBRE)</span>
                <span className="bg-emerald-400 text-black px-2 py-0.5 rounded-full font-mono text-xs font-black">
                  {relayRemainingSeconds}s
                </span>
              </div>
            </div>
          )}

          {/* Central Animated Scanner Pad */}
          <FingerprintScanner
            status={scanStatus}
            onScanClick={handleDirectPadClick}
            disabled={scanStatus === 'scanning'}
            motivationalQuote={currentQuote}
            clientPhoto={lastVerifiedClient?.avatarUrl}
            clientName={lastVerifiedClient?.name}
            planName={lastVerifiedClient?.plan}
          />

          {/* Verified Client Card (when granted or denied) */}
          {lastVerifiedClient && scanStatus !== 'idle' && (
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 animate-in fade-in duration-300 shrink-0 relative z-20 ${
              lastVerifiedClient.status === 'granted'
                ? 'bg-emerald-950/30 border-emerald-500/40'
                : 'bg-red-950/30 border-red-500/40'
            }`}>
              <div className="flex items-center gap-3">
                <img 
                  src={getGymAvatar(lastVerifiedClient.name, lastVerifiedClient.avatarUrl)} 
                  alt={lastVerifiedClient.name} 
                  loading="eager"
                  className="w-11 h-11 rounded-xl object-cover border border-gym-border shadow-md"
                />
                <div>
                  <h4 className="text-sm font-black text-white">{lastVerifiedClient.name}</h4>
                  <p className="text-xs text-gray-300 mt-0.5">{lastVerifiedClient.reason}</p>
                  {lastVerifiedClient.plan && (
                    <span className="text-[11px] font-mono text-amber-400">
                      Plan: {lastVerifiedClient.plan}
                    </span>
                  )}
                </div>
              </div>

              {typeof lastVerifiedClient.daysRemaining === 'number' && (
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold px-2 py-1 rounded-md block ${
                    lastVerifiedClient.daysRemaining >= 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    {lastVerifiedClient.daysRemaining >= 0 
                      ? `${lastVerifiedClient.daysRemaining} días vigentes` 
                      : `Vencida`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bottom Controls Wrapper */}
          <div className="shrink-0">
            {/* Manual Search or Barcode Input */}
            <div className="pt-3 border-t border-gym-border/80">
              <label className="text-xs font-semibold text-gym-muted block mb-1.5">
                O buscar socio por nombre, cédula o ID:
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        executeScan(searchQuery.trim());
                        setSearchQuery('');
                      }
                    }}
                    placeholder="Ej. Carlos Mendoza, Juan Solis, MEM-001 o 45892011..."
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950/45 backdrop-blur-md rounded-xl border border-white/25 text-sm text-white placeholder-zinc-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 transition-all shadow-inner"
                  />
                </div>
                <button
                  onClick={() => {
                    if (searchQuery.trim()) {
                      executeScan(searchQuery.trim());
                      setSearchQuery('');
                    }
                  }}
                  disabled={!searchQuery.trim() || scanStatus === 'scanning'}
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs rounded-xl shadow-glow-gold transition-all shrink-0"
                >
                  Verificar
                </button>
              </div>
              <p className="text-[11px] text-gym-muted mt-1.5">
                💡 <span className="font-semibold text-gray-300">Escáner USB / RFID automático:</span> Puedes pasar cualquier tarjeta, código o huella directamente en este equipo en cualquier momento.
              </p>
            </div>

            {/* Quick Access Today Counter */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-gym-muted flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Accesos hoy: <strong className="text-white font-mono">{accessLogs.length}</strong></span>
              </span>
              <button
                onClick={() => setIsHistoryModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-xl transition-all"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Ver desglose completo &rarr;</span>
              </button>
            </div>
          </div>

        </div>

        {/* Quick Testing Bar for Operator convenience */}
        <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white shrink-0 relative z-10">
          <span>Pruebas rápidas:</span>
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => executeScan('MEM-001')}
              disabled={scanStatus === 'scanning'}
              className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg text-emerald-400 font-medium transition-colors"
            >
              ✓ Carlos Mendoza (Activo)
            </button>
            <button
              onClick={() => executeScan('MEM-008')}
              disabled={scanStatus === 'scanning'}
              className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg text-emerald-400 font-medium transition-colors"
            >
              ✓ Juan Solis (Activo)
            </button>
            <button
              onClick={() => executeScan('MEM-004')}
              disabled={scanStatus === 'scanning'}
              className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg text-amber-400 font-medium transition-colors"
            >
              ⚠ Membresía Vencida
            </button>
            <button
              onClick={() => executeScan('DESCONOCIDO')}
              disabled={scanStatus === 'scanning'}
              className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg text-red-400 font-medium transition-colors"
            >
              ✗ No Registrado
            </button>
          </div>
        </div>

      </div>

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
