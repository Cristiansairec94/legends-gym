import React from 'react';

interface BiometricFingerprintSvgProps {
  className?: string;
  isScanning?: boolean;
  isSuccess?: boolean;
  size?: number | string;
  color?: string;
  glowColor?: string;
  variant?: 'monster' | 'amber' | 'emerald';
}

export const BiometricFingerprintSvg: React.FC<BiometricFingerprintSvgProps> = ({
  className = 'w-full h-full',
  isScanning = false,
  isSuccess = false,
  color,
  glowColor,
  variant = 'monster',
}) => {
  const filterId = React.useId().replace(/:/g, '_');

  const isMonster = variant === 'monster' || color === 'monster';

  // Monster Energy Green Palette (Vibrant neon green legible top-to-bottom on dark cards)
  const startColor = isSuccess 
    ? '#86efac' 
    : isMonster 
    ? '#4ade80' 
    : isScanning 
    ? '#fef08a' 
    : '#fde68a';

  const midColor = isSuccess 
    ? '#22c55e' 
    : isMonster 
    ? '#22c55e' 
    : isScanning 
    ? '#fbbf24' 
    : '#fbbf24';

  const endColor = isSuccess 
    ? '#16a34a' 
    : isMonster 
    ? '#15803d' 
    : isScanning 
    ? '#f59e0b' 
    : '#d97706';

  const bracketColor = (isSuccess || isMonster) 
    ? '#22c55e' 
    : isScanning 
    ? '#fde047' 
    : '#fbbf24';

  const laserColor = (isSuccess || isMonster) 
    ? '#4ade80' 
    : isScanning 
    ? '#fbbf24' 
    : '#f59e0b';

  const animDuration = isScanning ? '1.1s' : '2.4s';

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <svg
        viewBox="0 0 200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full transition-all duration-300 ${
          isSuccess || isMonster
            ? 'drop-shadow-[0_0_24px_rgba(34,197,94,0.55)]'
            : 'drop-shadow-[0_0_24px_rgba(245,158,11,0.55)]'
        }`}
      >
        <defs>
          <style>{`
            @keyframes scanSweep_${filterId} {
              0% { transform: translateY(22px); opacity: 0.3; }
              15% { opacity: 1; }
              50% { transform: translateY(212px); opacity: 1; }
              85% { opacity: 1; }
              100% { transform: translateY(22px); opacity: 0.3; }
            }
            .scan-beam-${filterId} {
              animation: scanSweep_${filterId} ${animDuration} ease-in-out infinite;
              will-change: transform, opacity;
            }
          `}</style>

          {/* Futuristic Multi-Pass Neon Glow */}
          <filter id={`neon-glow-${filterId}`} x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="3.8" result="blur2" />
            <feGaussianBlur stdDeviation="1.5" result="blur1" />
            <feMerge>
              <feMergeNode in="blur2" opacity="0.65" />
              <feMergeNode in="blur1" opacity="0.9" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* High-Tech Cyan-Emerald Neon Gradient */}
          <linearGradient id={`cyber-grad-${filterId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="40%" stopColor={midColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>

          {/* Laser Beam Trail */}
          <linearGradient id={`laser-grad-${filterId}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="65%" stopColor={laserColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={laserColor} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Ambient Circular HUD Radar Reticle */}
        <circle cx="100" cy="120" r="92" stroke={bracketColor} strokeOpacity="0.14" strokeWidth="1" strokeDasharray="4 6" />
        <circle cx="100" cy="120" r="70" stroke={bracketColor} strokeOpacity="0.18" strokeWidth="1" strokeDasharray="3 5" />
        <circle cx="100" cy="120" r="48" stroke={bracketColor} strokeOpacity="0.22" strokeWidth="1" strokeDasharray="2 4" />
        <line x1="100" y1="18" x2="100" y2="222" stroke={bracketColor} strokeOpacity="0.12" strokeDasharray="3 4" />
        <line x1="14" y1="120" x2="186" y2="120" stroke={bracketColor} strokeOpacity="0.12" strokeDasharray="3 4" />

        {/* High-Tech Corner HUD Brackets */}
        <g stroke={bracketColor} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M 22 40 L 22 22 L 40 22" />
          <path d="M 160 22 L 178 22 L 178 40" />
          <path d="M 22 200 L 22 218 L 40 218" />
          <path d="M 160 218 L 178 218 L 178 200" />
        </g>

        {/* Aesthetic Biometric Fingerprint (Centered, Symmetrical, Authentic Touch ID Design) */}
        <g transform="translate(18, 28) scale(6.85)">
          <path
            fill={`url(#cyber-grad-${filterId})`}
            filter={`url(#neon-glow-${filterId})`}
            d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.71 2.54.71.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.12-1.21.12zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z"
          />
        </g>

        {/* Laser Scanning Beam (Smooth Hardware-Accelerated Sweep) */}
        <g className={`scan-beam-${filterId} pointer-events-none`}>
          <line
            x1="22"
            y1="0"
            x2="178"
            y2="0"
            stroke={isSuccess || isMonster ? '#86efac' : '#fef08a'}
            strokeWidth="2.4"
            filter={`url(#neon-glow-${filterId})`}
          />
          <rect
            x="22"
            y="-18"
            width="156"
            height="18"
            fill={`url(#laser-grad-${filterId})`}
          />
        </g>
      </svg>
    </div>
  );
};
