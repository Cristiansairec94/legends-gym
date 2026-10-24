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
    <div className="flex flex-col items-center justify-center py-2 px-4 shrink-0 my-auto relative z-10">
      {/* Scanner Pad Container */}
      <div 
        onClick={() => !disabled && onScanClick()}
        className={`relative group ${hasPhoto ? 'w-28 h-28 sm:w-32 sm:h-32' : 'w-32 h-32 sm:w-36 sm:h-36'} rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 select-none shrink-0 ${
          status === 'scanning'
            ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.6)] scale-105'
            : status === 'granted'
            ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-glow-green scale-105'
            : status === 'denied'
            ? 'bg-red-500/20 border-2 border-red-500 shadow-glow-red scale-105'
            : 'bg-black/50 backdrop-blur-md border-2 border-amber-500/35 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.18)] hover:shadow-[0_0_40px_rgba(245,158,11,0.4)]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Radar Ring Animation */}
        {status === 'scanning' && (
          <div className="absolute inset-0 rounded-full border border-amber-400/40 scanner-ring" />
        )}

        {/* Laser Scan Line */}
        {status === 'scanning' && (
          <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-amber-200 to-transparent shadow-[0_0_15px_#FBBF24] animate-scan-line z-20" />
        )}

        {/* Outer Circular Track (when not showing full photo) */}
        {!hasPhoto && (
          <div className="absolute inset-2 rounded-full border border-dashed border-amber-400/30 group-hover:border-amber-400/50 transition-colors pointer-events-none" />
        )}

        {/* Biometric Icon, State OR Member Photo */}
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
          {hasPhoto ? (
            /* Member Photo replaces the fingerprint in the circle */
            <div className="relative w-full h-full p-1.5 flex items-center justify-center">
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
              <div className={`absolute bottom-1.5 right-1.5 p-1 rounded-full shadow-lg border-2 border-gym-card z-20 ${
                status === 'granted' 
                  ? 'bg-emerald-500 text-black' 
                  : 'bg-red-500 text-white'
              }`}>
                {status === 'granted' ? (
                  <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                ) : (
                  <XCircle className="w-4 h-4 stroke-[3]" />
                )}
              </div>
            </div>
          ) : status === 'scanning' ? (
            <Fingerprint className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.8)]" />
          ) : status === 'granted' ? (
            <CheckCircle2 className="w-16 h-16 text-emerald-400 animate-pulse drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
          ) : status === 'denied' ? (
            <XCircle className="w-16 h-16 text-red-500 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
          ) : (
            <Fingerprint 
              className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400/80 group-hover:text-amber-300 drop-shadow-[0_0_14px_rgba(245,158,11,0.3)] transition-all" 
            />
          )}
        </div>

        {/* Corner alignment markers for high-tech HUD look */}
        <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] pointer-events-none" />
        <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] pointer-events-none" />
        <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] pointer-events-none" />
        <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)] pointer-events-none" />
      </div>

      {/* Label and instructions */}
      <div className="mt-2.5 text-center w-full max-w-lg px-2">
        <p className={`text-sm sm:text-base font-black tracking-wide uppercase transition-colors drop-shadow-[0_2px_5px_rgba(0,0,0,1)] ${
          status === 'scanning'
            ? 'text-amber-400 animate-pulse'
            : status === 'granted'
            ? 'text-emerald-400'
            : status === 'denied'
            ? 'text-red-400'
            : 'text-white font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]'
        }`}>
          {status === 'scanning' && 'Escaneando Huella Digital...'}
          {status === 'granted' && (clientName ? `¡Bienvenido, ${clientName}!` : '¡Acceso Concedido!')}
          {status === 'denied' && (clientName ? `Acceso Restringido: ${clientName}` : 'Acceso Restringido')}
          {status === 'idle' && 'Coloque su dedo sobre el sensor'}
        </p>

        {(status === 'idle' || status === 'scanning' || status === 'denied') && (
          <p className="text-xs text-amber-300/90 font-semibold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] mt-1">
            {status === 'idle' && 'Haz clic en el sensor o usa los accesos rápidos abajo'}
            {status === 'scanning' && 'Leyendo minucias biométricas...'}
            {status === 'denied' && 'Consulte el estado de su membresía en recepción'}
          </p>
        )}

        {/* Motivational Gym Quote Card */}
        {status === 'granted' && motivationalQuote && (
          <div className="mt-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-amber-500/15 border border-emerald-500/40 shadow-glow-green/30">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 mb-0.5">
              <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>Frase Motivacional</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <p className="text-xs font-bold italic text-white leading-snug">
              "{motivationalQuote}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
