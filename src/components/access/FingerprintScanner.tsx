import React from 'react';
import { Fingerprint, CheckCircle2, XCircle, ShieldAlert } from 'lucide-react';

interface FingerprintScannerProps {
  status: 'idle' | 'scanning' | 'granted' | 'denied';
  onScanClick: () => void;
  disabled?: boolean;
}

export const FingerprintScanner: React.FC<FingerprintScannerProps> = ({
  status,
  onScanClick,
  disabled = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      {/* Scanner Pad Container */}
      <div 
        onClick={() => !disabled && onScanClick()}
        className={`relative w-44 h-44 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 select-none ${
          status === 'scanning'
            ? 'bg-amber-500/10 border-2 border-amber-400 shadow-glow-gold'
            : status === 'granted'
            ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-glow-green scale-105'
            : status === 'denied'
            ? 'bg-red-500/20 border-2 border-red-500 shadow-glow-red scale-105'
            : 'bg-gym-surface/80 border-2 border-gym-border hover:border-amber-400/60 hover:shadow-glow-gold/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Radar Ring Animation */}
        {status === 'scanning' && (
          <div className="absolute inset-0 rounded-full border border-amber-400/40 scanner-ring" />
        )}

        {/* Laser Scan Line */}
        {status === 'scanning' && (
          <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#F59E0B] animate-scan-line z-20" />
        )}

        {/* Outer Circular Track */}
        <div className="absolute inset-2 rounded-full border border-dashed border-gym-border/70 pointer-events-none" />

        {/* Biometric Icon & State */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          {status === 'granted' ? (
            <CheckCircle2 className="w-20 h-20 text-emerald-400 animate-pulse" />
          ) : status === 'denied' ? (
            <XCircle className="w-20 h-20 text-red-500 animate-pulse" />
          ) : (
            <Fingerprint 
              className={`w-20 h-20 transition-all ${
                status === 'scanning'
                  ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] scale-105'
                  : 'text-gym-muted group-hover:text-amber-400'
              }`} 
            />
          )}
        </div>

        {/* Corner alignment markers for high-tech HUD look */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-amber-400/60 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-amber-400/60 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-amber-400/60 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-amber-400/60 pointer-events-none" />
      </div>

      {/* Label and instructions */}
      <div className="mt-4 text-center">
        <p className={`text-sm font-bold tracking-wide uppercase ${
          status === 'scanning'
            ? 'text-amber-400 animate-pulse'
            : status === 'granted'
            ? 'text-emerald-400'
            : status === 'denied'
            ? 'text-red-400'
            : 'text-gray-300'
        }`}>
          {status === 'scanning' && 'Escaneando Huella Digital...'}
          {status === 'granted' && '¡Acceso Concedido!'}
          {status === 'denied' && 'Acceso Restringido'}
          {status === 'idle' && 'Coloque su dedo sobre el sensor'}
        </p>
        <p className="text-xs text-gym-muted mt-1">
          {status === 'idle' && 'Haz clic en el sensor o usa los accesos rápidos abajo'}
          {status === 'scanning' && 'Leyendo minucias biométricas...'}
          {status === 'granted' && 'Torniquete liberado (Paso libre)'}
          {status === 'denied' && 'Consulte el estado de su membresía'}
        </p>
      </div>
    </div>
  );
};
