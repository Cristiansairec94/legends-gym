import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { FingerprintScanner } from './FingerprintScanner';
import { AccessHistory } from './AccessHistory';
import { Client } from '../../types';
import { 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Sparkles, 
  User, 
  Calendar, 
  CreditCard, 
  Zap, 
  Maximize2, 
  Minimize2,
  Search
} from 'lucide-react';

export const TurnstileTerminal: React.FC = () => {
  const { verifyBiometricAccess, members } = useGym();

  const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'granted' | 'denied'>('idle');
  const [lastScannedResult, setLastScannedResult] = useState<{
    granted: boolean;
    client?: Client;
    reason: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Trigger simulated scan
  const executeScan = (identifier: string) => {
    if (scanStatus === 'scanning') return;
    setScanStatus('scanning');

    setTimeout(() => {
      const result = verifyBiometricAccess(identifier);
      setLastScannedResult({
        granted: result.granted,
        client: result.client,
        reason: result.reason,
      });
      setScanStatus(result.granted ? 'granted' : 'denied');

      // Return to idle after 4.5 seconds
      setTimeout(() => {
        setScanStatus('idle');
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

  return (
    <div className={`space-y-6 ${isFullScreen ? 'p-6 bg-gym-bg min-h-screen' : ''}`}>
      
      {/* Top Banner / Mode Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gym-card p-5 rounded-2xl border border-gym-border shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h1 className="text-xl font-black text-white tracking-wide uppercase">
              Torniquete de Entrada & Control Biométrico
            </h1>
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">
              Lector Activo
            </span>
          </div>
          <p className="text-sm text-gym-muted mt-1">
            Validación instantánea de huella digital y vigencia de cuota en torniquete principal.
          </p>
        </div>

        <button
          onClick={toggleFullScreen}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gray-200 transition-colors"
          title="Modo pantalla completa para recepción o kiosco"
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span>{isFullScreen ? 'Salir de Pantalla Completa' : 'Modo Kiosco / Pantalla Completa'}</span>
        </button>
      </div>

      {/* Main Grid: Biometric Terminal + Live Feedback + Access Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Fingerprint Scanner & Fast Tests */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Hardware Sensor Simulator Box */}
          <div className="bg-gym-card rounded-2xl border border-gym-border p-6 shadow-xl relative overflow-hidden">
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
                    className="w-full pl-9 pr-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-sm text-white placeholder-gym-muted focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
                <button
                  onClick={() => searchQuery && executeScan(searchQuery)}
                  disabled={!searchQuery || scanStatus === 'scanning'}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs rounded-xl shadow-glow-gold transition-all"
                >
                  Verificar
                </button>
              </div>
            </div>

            {/* Fast Simulation Action Buttons (Demo Presets) */}
            <div className="mt-5 pt-4 border-t border-gym-border">
              <p className="text-[11px] uppercase tracking-wider font-bold text-gym-muted mb-2">
                Pruebas Rápidas de Demostración:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => executeScan('MEM-001')}
                  disabled={scanStatus === 'scanning'}
                  className="p-2.5 rounded-xl bg-gym-surface hover:bg-emerald-500/10 border border-gym-border hover:border-emerald-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                      Carlos Mendoza
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                      VIP Activo
                    </span>
                  </div>
                  <p className="text-[10px] text-gym-muted mt-0.5">Acceso autorizado (95 días)</p>
                </button>

                <button
                  onClick={() => executeScan('MEM-002')}
                  disabled={scanStatus === 'scanning'}
                  className="p-2.5 rounded-xl bg-gym-surface hover:bg-emerald-500/10 border border-gym-border hover:border-emerald-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-emerald-400">
                      Valeria Ríos
                    </span>
                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-mono">
                      Mensual
                    </span>
                  </div>
                  <p className="text-[10px] text-gym-muted mt-0.5">Acceso autorizado (18 días)</p>
                </button>

                <button
                  onClick={() => executeScan('MEM-004')}
                  disabled={scanStatus === 'scanning'}
                  className="p-2.5 rounded-xl bg-gym-surface hover:bg-red-500/10 border border-gym-border hover:border-red-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-red-400">
                      Sofía Domínguez
                    </span>
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-mono">
                      Vencida
                    </span>
                  </div>
                  <p className="text-[10px] text-gym-muted mt-0.5">Acceso denegado (-5 días)</p>
                </button>

                <button
                  onClick={() => executeScan('HUELLA_DESCONOCIDA_999')}
                  disabled={scanStatus === 'scanning'}
                  className="p-2.5 rounded-xl bg-gym-surface hover:bg-red-500/10 border border-gym-border hover:border-red-500/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white group-hover:text-red-400">
                      Huella No Registrada
                    </span>
                    <span className="text-[10px] bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded font-mono">
                      Desconocido
                    </span>
                  </div>
                  <p className="text-[10px] text-gym-muted mt-0.5">Alerta de intrusión / no socio</p>
                </button>
              </div>
            </div>

          </div>

          {/* Scanned Result Big Feedback Banner */}
          {lastScannedResult && (
            <div className={`p-6 rounded-2xl border-2 transition-all transform shadow-2xl ${
              lastScannedResult.granted
                ? 'bg-gradient-to-br from-emerald-950/40 to-gym-card border-emerald-500 shadow-glow-green'
                : 'bg-gradient-to-br from-red-950/40 to-gym-card border-red-500 shadow-glow-red'
            }`}>
              <div className="flex items-start justify-between gap-4">
                
                <div className="flex items-center gap-4">
                  {/* Photo */}
                  <div className="relative">
                    {lastScannedResult.client?.avatarUrl ? (
                      <img
                        src={lastScannedResult.client.avatarUrl}
                        alt={lastScannedResult.client.fullName}
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-gym-border shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gym-surface flex items-center justify-center border-2 border-gym-border text-gym-muted">
                        <User className="w-10 h-10" />
                      </div>
                    )}
                    <div className={`absolute -bottom-2 -right-2 p-1 rounded-full border-2 border-gym-card ${
                      lastScannedResult.granted ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
                    }`}>
                      {lastScannedResult.granted ? (
                        <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <XCircle className="w-4 h-4 stroke-[3]" />
                      )}
                    </div>
                  </div>

                  {/* Name and status */}
                  <div>
                    <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                      lastScannedResult.granted
                        ? 'bg-emerald-500 text-black'
                        : 'bg-red-500 text-white'
                    }`}>
                      {lastScannedResult.granted ? 'Paso Autorizado • Torniquete Abierto' : 'Acceso Denegado'}
                    </span>

                    <h2 className="text-xl font-black text-white mt-1.5">
                      {lastScannedResult.client?.fullName || 'Desconocido'}
                    </h2>

                    <p className={`text-xs font-semibold mt-0.5 ${
                      lastScannedResult.granted ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {lastScannedResult.reason}
                    </p>
                  </div>
                </div>

                {/* Membership details pills */}
                {lastScannedResult.client && (
                  <div className="text-right hidden sm:block">
                    <span className="text-xs text-gym-muted block">Plan Contratado:</span>
                    <span className="text-sm font-bold text-amber-400 block">
                      {lastScannedResult.client.membership.planName}
                    </span>
                    <span className={`text-xs font-bold inline-block px-2 py-0.5 rounded mt-1.5 ${
                      lastScannedResult.client.membership.daysRemaining >= 0
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>
                      {lastScannedResult.client.membership.daysRemaining >= 0
                        ? `${lastScannedResult.client.membership.daysRemaining} días restantes`
                        : `Venció hace ${Math.abs(lastScannedResult.client.membership.daysRemaining)} días`}
                    </span>
                  </div>
                )}
              </div>

              {/* Emergency / Medical note preview if granted */}
              {lastScannedResult.client?.medicalNotes && lastScannedResult.granted && (
                <div className="mt-4 pt-3 border-t border-gym-border/60 text-xs text-gym-muted flex items-center gap-2">
                  <span className="font-semibold text-amber-400">Nota médica:</span>
                  <span>{lastScannedResult.client.medicalNotes}</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Live Real-time Turnstile Access History */}
        <div className="lg:col-span-6">
          <AccessHistory />
        </div>

      </div>

    </div>
  );
};
