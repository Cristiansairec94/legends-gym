import { IndependentTerminalApp } from './IndependentTerminalApp';
import gymBg from '../../assets/gym-background.jpg';
import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { FingerprintScanner } from './FingerprintScanner';
import { AccessHistory } from './AccessHistory';
import { getRandomMotivationalQuote } from '../../data/motivationalQuotes';
import { sounds } from '../../services/audio';
import confetti from 'canvas-confetti';
import { getGymAvatar } from '../../utils/genderAvatar';
import { 
  Zap, 
  Maximize2, 
  Minimize2,
  Search,
  Clock,
  ExternalLink,
  Users,
  Image,
  LogOut,
  Download
} from 'lucide-react';

export const TurnstileTerminal: React.FC = () => {
  const { verifyBiometricAccess, registerExit, members, accessLogs, activeBranch } = useGym();

  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'granted' | 'denied'>('idle');
  const [currentQuote, setCurrentQuote] = useState<string>('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [verifiedClient, setVerifiedClient] = useState<{
    name: string;
    avatarUrl?: string;
    planName?: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [bgImage, setBgImage] = useState<string>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('legends_terminal_bg_version') !== 'v7_fixed_bright_8k') {
      localStorage.setItem('legends_terminal_bg_version', 'v7_fixed_bright_8k');
      localStorage.setItem('legends_terminal_bg', gymBg);
      return gymBg;
    }
    return localStorage.getItem('legends_terminal_bg') || gymBg;
  });

  // Trigger simulated scan
  const executeScan = (identifier: string) => {
    if (scanStatus === 'scanning') return;
    sounds.unlock();
    sounds.playScanBlip();
    setScanStatus('scanning');
    setVerifiedClient(null);

    setTimeout(() => {
      const result = verifyBiometricAccess(identifier);
      
      if (result.client) {
        setVerifiedClient({
          name: result.client.fullName,
          avatarUrl: getGymAvatar(result.client.fullName, result.client.avatarUrl),
          planName: result.client.membership.planName,
        });
      } else {
        setVerifiedClient(null);
      }

      if (result.granted) {
        sounds.playAccessGranted();
        const quote = getRandomMotivationalQuote(currentQuote);
        setCurrentQuote(quote);
        try {
          confetti({
            particleCount: 40,
            spread: 65,
            origin: { y: 0.5, x: 0.35 },
            colors: ['#FFB800', '#10B981', '#F59E0B', '#FFFFFF'],
          });
        } catch {
          // ignore if canvas is not supported
        }
      } else {
        sounds.playAccessDenied();
      }

      setScanStatus(result.granted ? 'granted' : 'denied');

      // Return to idle after 4.5 seconds
      setTimeout(() => {
        setScanStatus('idle');
        setVerifiedClient(null);
      }, 4500);
    }, 1100);
  };

  // Default quick scan if user just clicks the fingerprint sensor directly
  const handleDirectPadClick = () => {
    // If there is a search query, use it; otherwise test with active member 1
    if (searchQuery.trim()) {
      executeScan(searchQuery.trim());
    } else {
      executeScan('MEM-001'); // Carlos Mendoza
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullScreen(false);
    }
  };

  
  // Modo Pantalla Completa: Cubre toda la pantalla al 100% y oculta todos los menús
  if (isFullScreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black w-screen h-screen overflow-hidden">
        <IndependentTerminalApp 
          isEmbeddedFullScreen={true} 
          onExitFullScreen={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
            setIsFullScreen(false);
          }} 
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 relative rounded-3xl overflow-hidden p-3 sm:p-5 ${isFullScreen ? 'p-6 min-h-screen' : ''}`}>
      
            

      {/* Real Gym Background Photo */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-3xl">
        <img
          src={bgImage}
          alt="Fitness Legends Gym Background"
          style={{
            filter: 'brightness(1.04) contrast(1.06) saturate(1.06)',
            objectPosition: 'center center',
          }}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />
        {/* Soft Eye-Care anti-glare shield so neon lights do not hurt the eyes */}
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[0.5px] pointer-events-none" />

      </div>

      {/* Top Banner / Mode Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-xl font-black text-white tracking-wide uppercase">
              Control de Acceso
            </h1>
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
              Lector Activo
            </span>
          </div>
          <p className="text-sm text-gym-muted mt-1">
            Validación instantánea de huella digital y vigencia de cuota en el acceso principal.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Live Occupancy Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gym-surface border border-gym-border text-xs">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-gym-muted">Aforo Sala:</span>
            <span className="font-bold text-white font-mono">{activeBranch.currentOccupancy} / {activeBranch.maxCapacity}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold">
              {Math.round((activeBranch.currentOccupancy / activeBranch.maxCapacity) * 100)}%
            </span>
          </div>

          {/* Quick Exit Button */}
          <button
            onClick={() => registerExit()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-400 hover:text-rose-300 transition-all shadow-sm"
            title="Registrar salida de un atleta y liberar aforo de sala"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Registrar Salida</span>
          </button>

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

          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-400 hover:text-amber-300 transition-all shadow-sm group"
            title="Ver desglose detallado de accesos registrados"
          >
            <Clock className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>Accesos</span>
            <span className="bg-amber-500/25 text-amber-300 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border border-amber-500/40">
              {accessLogs.length}
            </span>
          </button>

          <button
            onClick={() => window.open('?mode=terminal', '_blank', 'width=1180,height=840')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gym-surface hover:bg-gym-border/80 border border-gym-border text-xs font-bold text-white transition-all shadow-sm"
            title="Abrir vista dedicada de Control de Acceso para equipo independiente"
          >
            <ExternalLink className="w-4 h-4 text-amber-400" />
            <span>Equipo Independiente</span>
          </button>

          {/* Download Windows Desktop App (.exe) */}
          <a
            href="https://github.com/Cristiansairec94/legends-gym/releases/latest/download/ControlDeAccesoLegends-Windows-x64.zip"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-bold text-amber-400 hover:text-amber-300 transition-all shadow-sm"
            title="Descargar la aplicación de escritorio nativa para Windows (ControlDeAccesoLegends.exe)"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Descargar App Windows (.exe)</span>
          </a>

          <button
            onClick={toggleFullScreen}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gray-200 transition-colors"
            title="Modo pantalla completa para recepción o kiosco"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullScreen ? 'Salir' : 'PANTALLA COMPLETA'}</span>
          </button>
        </div>
      </div>

      {/* Main Container: Biometric Terminal */}
      <div className="w-full space-y-5 relative z-10">
          
          {/* Hardware Sensor Simulator Box */}
          <div className="p-3 relative">
            <div className="flex items-center justify-between border-b border-gym-border pb-3 mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-200">
                  Sensor Biométrico Óptico USB
                </span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                500 DPI • Online
              </span>
            </div>

            {/* Central Animated Scanner Pad */}
            <FingerprintScanner
              status={scanStatus}
              onScanClick={handleDirectPadClick}
              disabled={scanStatus === 'scanning'}
              motivationalQuote={currentQuote}
              clientPhoto={verifiedClient?.avatarUrl}
              clientName={verifiedClient?.name}
              planName={verifiedClient?.planName}
            />

            {/* Manual Client Biometric Search or Barcode Input */}
            <div className="mt-4 pt-4 border-t border-gym-border/80">
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
                    onKeyDown={(e) => e.key === 'Enter' && searchQuery && executeScan(searchQuery)}
                    placeholder="Ej. Carlos Mendoza, MEM-001 o 45892011..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/45 backdrop-blur-md rounded-xl border border-white/25 text-sm text-white placeholder-zinc-300 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 transition-colors shadow-inner"
                  />
                </div>
                <button
                  onClick={() => searchQuery && executeScan(searchQuery)}
                  disabled={!searchQuery || scanStatus === 'scanning'}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs rounded-xl shadow-glow-gold transition-all"
                >
                  Entrada
                </button>
                <button
                  onClick={() => {
                    const found = members.find(m => 
                      m.id.toLowerCase() === searchQuery.toLowerCase().trim() ||
                      m.documentId.toLowerCase() === searchQuery.toLowerCase().trim() ||
                      m.fullName.toLowerCase().includes(searchQuery.toLowerCase().trim())
                    );
                    registerExit(found?.id);
                    setSearchQuery('');
                  }}
                  disabled={!searchQuery}
                  className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 disabled:opacity-40 text-rose-400 font-bold text-xs rounded-xl transition-all"
                  title="Registrar salida para este socio"
                >
                  Salida
                </button>
              </div>
            </div>



            {/* Quick access history launcher */}
            <div className="mt-4 pt-3.5 border-t border-gym-border/80 flex items-center justify-between">
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

      {/* Detailed Access Breakdown Modal */}
      <AccessHistory 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
      />

    </div>
  );
};
