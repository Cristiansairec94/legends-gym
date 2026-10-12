import React, { useState } from 'react';
import { Fingerprint, CheckCircle2, XCircle, Sparkles, Flame, User } from 'lucide-react';
import { getGymAvatar, getOfflineGymSvgAvatar, detectGender } from '../../utils/genderAvatar';

interface FingerprintScannerProps {
  status: 'idle' | 'scanning' | 'granted' | 'denied';
  onScanClick: () => void;
  disabled?: boolean;
  motivationalQuote?: string;
  clientPhoto?: string;
  clientName?: string;
  planName?: string;
}

export const FingerprintScanner: React.FC<FingerprintScannerProps> = ({
  status,
  onScanClick,
  disabled = false,
  motivationalQuote,
  clientPhoto,
  clientName,
  planName,
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset img error on status change
  React.useEffect(() => {
    setImgError(false);
  }, [status, clientPhoto, clientName]);

  // Determine photo based on name and gender
  const resolvedPhoto = clientName 
    ? getGymAvatar(clientName, clientPhoto) 
    : clientPhoto;

  const fallbackSvg = clientName 
    ? getOfflineGymSvgAvatar(detectGender(clientName))
    : undefined;

  const displayPhoto = imgError ? fallbackSvg : (resolvedPhoto || fallbackSvg);
  const hasPhoto = !!displayPhoto && (status === 'granted' || status === 'denied');

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
          <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_#FFFFFF] animate-scan-line z-20" />
        )}

        {/* Outer Circular Track (when not showing full photo) */}
        {!hasPhoto && (
          <div className="absolute inset-2 rounded-full border border-dashed border-gym-border/70 pointer-events-none" />
        )}

        {/* Biometric Icon, State OR Member Photo */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {hasPhoto ? (
            /* Member Photo replaces the fingerprint in the circle */
            <div className="relative w-full h-full p-2 flex items-center justify-center">
              <img 
                src={displayPhoto} 
                alt={clientName || 'Socio'} 
                loading="eager"
                draggable={false}
                onError={() => !imgError && setImgError(true)}
                className={`w-full h-full rounded-full object-cover border-2 shadow-2xl animate-in zoom-in-75 duration-300 ${
                  status === 'granted' 
                    ? 'border-emerald-400 shadow-glow-green' 
                    : 'border-red-500 shadow-glow-red grayscale-[30%]'
                }`}
              />

              {/* Status Badge floating at bottom-right corner of the photo */}
              <div className={`absolute bottom-2.5 right-2.5 p-1.5 rounded-full shadow-lg border-2 border-gym-card z-20 ${
                status === 'granted' 
                  ? 'bg-emerald-500 text-black' 
                  : 'bg-red-500 text-white'
              }`}>
                {status === 'granted' ? (
                  <CheckCircle2 className="w-5 h-5 stroke-[3]" />
                ) : (
                  <XCircle className="w-5 h-5 stroke-[3]" />
                )}
              </div>
            </div>
          ) : status === 'granted' ? (
            <CheckCircle2 className="w-20 h-20 text-emerald-400 animate-pulse" />
          ) : status === 'denied' ? (
            <XCircle className="w-20 h-20 text-red-500 animate-pulse" />
          ) : (
            <Fingerprint 
              className={`w-20 h-20 transition-all ${
                status === 'scanning'
                  ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(255,255,255,0.7)] scale-105'
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
      <div className="mt-4 text-center w-full max-w-md px-2">
        <p className={`text-base font-black tracking-wide uppercase transition-colors ${
          status === 'scanning'
            ? 'text-amber-400 animate-pulse'
            : status === 'granted'
            ? 'text-emerald-400'
            : status === 'denied'
            ? 'text-red-400'
            : 'text-gray-300'
        }`}>
          {status === 'scanning' && 'Escaneando Huella Digital...'}
          {status === 'granted' && (clientName ? `¡Bienvenido, ${clientName}!` : '¡Acceso Concedido!')}
          {status === 'denied' && (clientName ? `Acceso Restringido: ${clientName}` : 'Acceso Restringido')}
          {status === 'idle' && 'Coloque su dedo sobre el sensor'}
        </p>

        {(status === 'idle' || status === 'scanning' || status === 'denied') && (
          <p className="text-xs text-gym-muted mt-1.5">
            {status === 'idle' && 'Haz clic en el sensor o usa los accesos rápidos abajo'}
            {status === 'scanning' && 'Leyendo minucias biométricas...'}
            {status === 'denied' && 'Consulte el estado de su membresía en recepción'}
          </p>
        )}

        {/* Motivational Gym Quote Card */}
        {status === 'granted' && motivationalQuote && (
          <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border border-emerald-500/40 shadow-glow-green/30 animate-pulse-fast">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-400 mb-1">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Frase Motivacional</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-xs sm:text-sm font-bold italic text-white leading-relaxed">
              "{motivationalQuote}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
