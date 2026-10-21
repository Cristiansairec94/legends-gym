const fs = require('fs');
const path = require('path');

const img1Base64 = 'data:image/jpeg;base64,' + fs.readFileSync('C:/Users/DELL/Desktop/gym leyends/LEGENDS/public/gym-background.jpg').toString('base64');
const img2Base64 = 'data:image/jpeg;base64,' + fs.readFileSync('C:/Users/DELL/Desktop/gym leyends/LEGENDS/public/gym-background-motto.jpg').toString('base64');
const logoBase64 = 'data:image/png;base64,' + fs.readFileSync('C:/Users/DELL/Desktop/gym leyends/LEGENDS/public/logo.png').toString('base64');

console.log('Assets loaded. Generating single-file HTML...');

const htmlContent = `<!DOCTYPE html>
<html lang="es" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FITNESS LEGENDS • Terminal de Control de Acceso</title>
  <link rel="icon" type="image/png" href="${logoBase64}">

  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- React 18 & ReactDOM -->
  <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>

  <!-- Babel Standalone for JSX in browser -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- Canvas Confetti -->
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js"></script>

  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            gym: {
              bg: '#08090C',
              card: 'rgba(13, 14, 21, 0.65)',
              surface: 'rgba(21, 23, 34, 0.6)',
              border: 'rgba(255, 255, 255, 0.14)',
              muted: '#9CA3AF',
              text: '#F4F4F6',
              gold: '#F59E0B'
            }
          },
          boxShadow: {
            'glow-gold': '0 0 25px rgba(245, 158, 11, 0.45)',
            'glow-green': '0 0 25px rgba(16, 185, 129, 0.5)',
            'glow-red': '0 0 25px rgba(239, 68, 68, 0.5)',
          }
        }
      }
    }
  </script>

  <style>
    @keyframes scanLine {
      0% { top: 10%; opacity: 0; }
      15% { opacity: 1; }
      85% { opacity: 1; }
      100% { top: 90%; opacity: 0; }
    }
    .animate-scan-line {
      position: absolute;
      animation: scanLine 1.4s ease-in-out infinite alternate;
    }
    @keyframes radarPulse {
      0% { transform: scale(0.92); opacity: 0.8; }
      100% { transform: scale(1.22); opacity: 0; }
    }
    .scanner-ring {
      animation: radarPulse 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
    }
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.4);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(245, 158, 11, 0.4);
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #f59e0b;
    }
  </style>
</head>
<body class="bg-black text-[#F4F4F6] min-h-screen overflow-x-hidden font-sans select-none">
  <div id="root"></div>

  <script type="text/babel">
    const { useState, useEffect, useRef, useCallback } = React;

    const BG_PHOTO_1 = "${img1Base64}";
    const BG_PHOTO_2 = "${img2Base64}";
    const LOGO_IMG = "${logoBase64}";

    // Web Audio API Synthesizer
    class SoundEffects {
      constructor() {
        this.ctx = null;
        this.lastGranted = 0;
        const unlock = () => {
          this.unlock();
          window.removeEventListener('pointerdown', unlock);
          window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('pointerdown', unlock, { passive: true });
        window.addEventListener('keydown', unlock, { passive: true });
      }

      initCtx() {
        if (!this.ctx && typeof window !== 'undefined') {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) this.ctx = new AudioContext();
        }
      }

      unlock() {
        try {
          this.initCtx();
          if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
          }
        } catch {}
      }

      playScanBlip() {
        this.unlock();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }

      playAccessGranted() {
        const nowMs = Date.now();
        if (nowMs - this.lastGranted < 400) return;
        this.lastGranted = nowMs;
        this.unlock();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [
          { f: 523.25, t: 0.00, d: 0.22, v: 0.35 },
          { f: 659.25, t: 0.08, d: 0.25, v: 0.38 },
          { f: 783.99, t: 0.16, d: 0.30, v: 0.40 },
          { f: 1046.5, t: 0.24, d: 0.60, v: 0.45 },
        ];
        notes.forEach(({ f, t, d, v }) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + t);
          gain.gain.setValueAtTime(v, now + t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + t);
          osc.stop(now + t + d);
        });
      }

      playAccessDenied() {
        this.unlock();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [185, 140].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);
          gain.gain.setValueAtTime(0.3, now + idx * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.22);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.22);
        });
      }
    }

    const soundManager = new SoundEffects();

    const MOTIVATIONAL_QUOTES = [
      "¡A romper tus marcas hoy! Fuerza y enfoque.",
      "El dolor de hoy es la victoria de mañana.",
      "La disciplina supera al talento. ¡Dale con todo!",
      "Constancia y grandeza. Eres imparable.",
      "Tu único límite eres tú. ¡Bienvenido a LEGENDS!",
      "Cada repetición cuenta para tu mejor versión."
    ];

    const DEFAULT_MEMBERS = [
      {
        id: 'MEM-001',
        fullName: 'Carlos Mendoza',
        documentId: '45892011',
        plan: 'Membresía Black VIP Anual',
        daysRemaining: 95,
        status: 'active'
      },
      {
        id: 'MEM-002',
        fullName: 'Valeria Ríos Gómez',
        documentId: '78291034',
        plan: 'Mensualidad Estándar',
        daysRemaining: 18,
        status: 'active'
      },
      {
        id: 'MEM-008',
        fullName: 'Juan Solis',
        documentId: '55892018',
        plan: 'Mensualidad Estándar',
        daysRemaining: 30,
        status: 'active'
      },
      {
        id: 'MEM-004',
        fullName: 'Sofía Domínguez',
        documentId: '89104523',
        plan: 'Mensualidad Estándar',
        daysRemaining: -5,
        status: 'expired'
      },
      {
        id: 'MEM-005',
        fullName: 'Mateo Guerrero',
        documentId: '32091487',
        plan: 'Plan Estudiante Gym',
        daysRemaining: 22,
        status: 'active'
      }
    ];

    function App() {
      const [currentBgIndex, setCurrentBgIndex] = useState(() => {
        return parseInt(localStorage.getItem('legends_bg_choice') || '0', 10);
      });
      const [bgDarkness, setBgDarkness] = useState(() => {
        return parseFloat(localStorage.getItem('legends_bg_darkness') || '0.35');
      });

      const [members, setMembers] = useState(() => {
        try {
          const saved = localStorage.getItem('legends_members_v1');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch {}
        return DEFAULT_MEMBERS;
      });

      const [accessLogs, setAccessLogs] = useState(() => {
        try {
          const saved = localStorage.getItem('legends_access_logs_v1');
          if (saved) return JSON.parse(saved);
        } catch {}
        return [];
      });

      const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | granted | denied
      const [verifiedClient, setVerifiedClient] = useState(null);
      const [currentQuote, setCurrentQuote] = useState('');
      const [searchQuery, setSearchQuery] = useState('');
      const [isMuted, setIsMuted] = useState(false);
      const [isFullScreen, setIsFullScreen] = useState(false);
      const [relaySeconds, setRelaySeconds] = useState(0);
      const [showHistoryModal, setShowHistoryModal] = useState(false);
      const [showConfigModal, setShowConfigModal] = useState(false);
      const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('legends_server_url') || 'https://legends-gym-gold.vercel.app');
      const [serverOnline, setServerOnline] = useState(false);

      const relayTimerRef = useRef(null);
      const keyBufferRef = useRef('');
      const lastKeyTimeRef = useRef(0);

      // Save access logs
      useEffect(() => {
        try {
          localStorage.setItem('legends_access_logs_v1', JSON.stringify(accessLogs));
        } catch {}
      }, [accessLogs]);

      const toggleBackground = () => {
        const next = currentBgIndex === 0 ? 1 : 0;
        setCurrentBgIndex(next);
        localStorage.setItem('legends_bg_choice', String(next));
      };

      // Check server health
      const checkServer = useCallback(async () => {
        try {
          const res = await fetch(\`\${serverUrl}/api/sync/status\`, { mode: 'cors' });
          if (res.ok) {
            setServerOnline(true);
            const mRes = await fetch(\`\${serverUrl}/api/sync/members\`);
            if (mRes.ok) {
              const mData = await mRes.json();
              if (Array.isArray(mData.members) && mData.members.length > 0) {
                setMembers(mData.members);
              }
            }
            return;
          }
        } catch {}
        setServerOnline(false);
      }, [serverUrl]);

      useEffect(() => {
        checkServer();
        const interval = setInterval(checkServer, 5000);
        return () => clearInterval(interval);
      }, [checkServer]);

      // Turnstile relay pulse
      const triggerTurnstile = (sec = 4) => {
        if (relayTimerRef.current) clearInterval(relayTimerRef.current);
        setRelaySeconds(sec);
        relayTimerRef.current = setInterval(() => {
          setRelaySeconds(prev => {
            if (prev <= 1) {
              clearInterval(relayTimerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      };

      // Voice TTS
      const speak = (text) => {
        if (isMuted || !('speechSynthesis' in window)) return;
        try {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(text);
          u.lang = 'es-MX';
          u.rate = 1.05;
          window.speechSynthesis.speak(u);
        } catch {}
      };

      // Execute scan logic
      const executeScan = (query) => {
        if (scanStatus === 'scanning') return;
        const q = String(query).trim().toLowerCase();
        if (!q) return;

        if (!isMuted) soundManager.playScanBlip();
        setScanStatus('scanning');
        setVerifiedClient(null);

        setTimeout(() => {
          const found = members.find(m => 
            (m.id && m.id.toLowerCase() === q) ||
            (m.documentId && m.documentId.toLowerCase() === q) ||
            (m.fullName && m.fullName.toLowerCase().includes(q)) ||
            (m.biometricHash && m.biometricHash.toLowerCase() === q)
          );

          const nowIso = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          if (found) {
            const isGranted = (found.membership?.status === 'active' || found.status === 'active') && 
                              (found.membership?.daysRemaining !== undefined ? found.membership.daysRemaining >= 0 : (found.daysRemaining === undefined || found.daysRemaining >= 0));

            const clientData = {
              name: found.fullName,
              plan: found.membership?.planName || found.plan || 'Membresía Activa',
              daysRemaining: found.membership?.daysRemaining ?? found.daysRemaining ?? 30,
              avatarUrl: found.avatarUrl,
              granted: isGranted,
              reason: isGranted ? 'Membresía Vigente' : 'Membresía Expirada'
            };

            setVerifiedClient(clientData);

            if (isGranted) {
              if (!isMuted) soundManager.playAccessGranted();
              speak(\`Bienvenido \${found.fullName}, acceso concedido\`);
              triggerTurnstile(4);
              const quote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
              setCurrentQuote(quote);

              try {
                confetti({
                  particleCount: 50,
                  spread: 70,
                  origin: { y: 0.5, x: 0.5 },
                  colors: ['#F59E0B', '#10B981', '#FFFFFF', '#E4E4E7']
                });
              } catch {}

              setScanStatus('granted');
            } else {
              if (!isMuted) soundManager.playAccessDenied();
              speak(\`Acceso restringido para \${found.fullName}\`);
              setScanStatus('denied');
            }

            // Register log
            const newLog = {
              id: 'LOG-' + Date.now(),
              time: nowIso,
              name: found.fullName,
              status: isGranted ? 'granted' : 'denied',
              reason: isGranted ? 'Acceso Autorizado' : 'Cuota Vencida',
              plan: clientData.plan
            };
            setAccessLogs(prev => [newLog, ...prev].slice(0, 100));

            // Sync with LAN server if connected
            if (serverOnline) {
              fetch(\`\${serverUrl}/api/sync/access-log\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ log: { id: newLog.id, clientName: found.fullName, status: newLog.status, reason: newLog.reason, timestamp: new Date().toISOString() } })
              }).catch(() => {});
            }

          } else {
            if (!isMuted) soundManager.playAccessDenied();
            speak('Socio no registrado');
            setVerifiedClient({
              name: 'Credencial No Registrada',
              plan: 'Sin Membresía',
              granted: false,
              reason: 'No existe registro en la base de datos'
            });
            setScanStatus('denied');

            const newLog = {
              id: 'LOG-' + Date.now(),
              time: nowIso,
              name: 'Desconocido (' + query + ')',
              status: 'denied',
              reason: 'No Registrado',
              plan: '-'
            };
            setAccessLogs(prev => [newLog, ...prev].slice(0, 100));
          }

          setTimeout(() => {
            setScanStatus('idle');
            setVerifiedClient(null);
          }, 4500);

        }, 850);
      };

      // Hardware Barcode / RFID Keyboard Wedge scanner
      useEffect(() => {
        const handleKey = (e) => {
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
          const now = Date.now();
          if (now - lastKeyTimeRef.current > 300) {
            keyBufferRef.current = '';
          }
          lastKeyTimeRef.current = now;

          if (e.key === 'Enter') {
            const code = keyBufferRef.current.trim();
            if (code.length >= 2) executeScan(code);
            keyBufferRef.current = '';
          } else if (e.key.length === 1) {
            keyBufferRef.current += e.key;
          }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
      }, [scanStatus, members]);

      // Fullscreen
      const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          setIsFullScreen(true);
        } else {
          document.exitFullscreen().catch(() => {});
          setIsFullScreen(false);
        }
      };

      const selectedBg = currentBgIndex === 0 ? BG_PHOTO_1 : BG_PHOTO_2;

      return (
        <div className="relative min-h-screen h-screen w-full overflow-y-auto bg-black text-[#F4F4F6] flex flex-col justify-between p-3 sm:p-4 lg:p-5 gap-3">
          
          {/* 100% COVER REAL WHATSAPP GYM PHOTO BACKGROUND */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <img 
              src={selectedBg}
              alt="Fondo Gym Legends" 
              className="w-full h-full object-cover object-center filter brightness-110 contrast-105"
            />
            {/* Elegant glassmorphism dark vignette so photo is clearly visible yet text has optimal readability */}
            <div 
              className="absolute inset-0 bg-black backdrop-blur-[1px] transition-opacity duration-300"
              style={{ opacity: bgDarkness }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />
          </div>

          {/* Top Header Card with Glassmorphism */}
          <header className="w-full max-w-6xl mx-auto shrink-0 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black/65 backdrop-blur-2xl px-5 py-3.5 rounded-2xl border border-white/20 shadow-2xl relative overflow-hidden">
              
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-black/80 border border-white/30 p-1 flex items-center justify-center shrink-0 shadow-lg">
                  <img src={LOGO_IMG} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <h1 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase drop-shadow-md">
                      CONTROL DE ACCESO
                    </h1>
                    <span className="text-xs bg-amber-500/25 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-md font-bold shadow-sm">
                      Lector Activo
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-300 mt-0.5 drop-shadow">
                    Validación instantánea de huella digital y vigencia de cuota en acceso principal.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center flex-wrap gap-2">
                
                {/* Toggle Background Photo button */}
                <button
                  onClick={toggleBackground}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-100 border border-white/25 transition-all shadow-md"
                  title="Cambiar entre Foto 1 (Rótulo Oficial) y Foto 2 (Lema del Gym)"
                >
                  <span>🖼️</span>
                  <span className="hidden sm:inline">Cambiar Foto</span>
                </button>

                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-bold text-amber-300 hover:text-white transition-all shadow-md"
                >
                  <span>⏱️</span>
                  <span>Ver Registro</span>
                  <span className="bg-amber-500/40 text-white px-2 py-0.5 rounded-full text-[11px] font-mono font-bold">
                    {accessLogs.length}
                  </span>
                </button>

                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 border border-white/25 transition-colors shadow-md"
                  title={isMuted ? 'Activar sonido' : 'Silenciar sonido'}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>

                <button
                  onClick={() => setShowConfigModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 border border-white/25 transition-colors shadow-md"
                  title="Configuración de Red y Fondo"
                >
                  <span>⚙️</span>
                  <span className={\`w-2 h-2 rounded-full \${serverOnline ? 'bg-emerald-400' : 'bg-amber-400'}\`} />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 border border-white/25 transition-colors shadow-md"
                  title="Pantalla Completa Kiosco (F11)"
                >
                  <span>{isFullScreen ? '↙️ Salir' : '⛶ Pantalla Completa'}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Scanner Container with Glassmorphism so photo is visible */}
          <main className="w-full max-w-2xl mx-auto flex-1 flex flex-col justify-center items-center gap-3 relative z-10 my-auto">
            <div className="w-full bg-black/65 backdrop-blur-2xl rounded-3xl border border-white/20 p-6 sm:p-8 shadow-2xl relative flex flex-col justify-center items-center gap-4">
              
              {/* Sensor Subheader */}
              <div className="flex items-center justify-between border-b border-white/15 pb-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">⚡</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-100">
                    SENSOR BIOMÉTRICO ÓPTICO USB
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={\`text-[10px] font-mono px-2.5 py-0.5 rounded-lg border flex items-center gap-1 font-bold \${
                    serverOnline ? 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30' : 'text-amber-300 bg-amber-500/20 border-amber-500/30'
                  }\`}>
                    {serverOnline ? '📶 LAN Activa' : '💾 Caché Local'}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 font-bold">
                    500 DPI • Online
                  </span>
                </div>
              </div>

              {/* Turnstile Active Banner */}
              {relaySeconds > 0 && (
                <div className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500/30 via-emerald-500/40 to-emerald-500/30 border border-emerald-400/80 shadow-glow-green text-center animate-pulse shrink-0">
                  <div className="flex items-center justify-center gap-2.5 text-emerald-200 font-black text-sm uppercase tracking-wider">
                    <span>🔓 ACCESO CONCEDIDO (PASO LIBRE)</span>
                    <span className="bg-emerald-400 text-black px-2.5 py-0.5 rounded-full font-mono text-xs font-black">
                      {relaySeconds}s
                    </span>
                  </div>
                </div>
              )}

              {/* Central Interactive Scanner Pad */}
              <div className="flex flex-col items-center justify-center py-2 px-4 shrink-0 my-auto">
                <div 
                  onClick={() => executeScan('MEM-001')}
                  className={\`relative w-32 h-32 sm:w-36 sm:h-36 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 select-none shrink-0 \${
                    scanStatus === 'scanning'
                      ? 'bg-amber-500/20 border-2 border-amber-400 shadow-glow-gold'
                      : scanStatus === 'granted'
                      ? 'bg-emerald-500/30 border-2 border-emerald-400 shadow-glow-green'
                      : scanStatus === 'denied'
                      ? 'bg-red-500/30 border-2 border-red-500 shadow-glow-red'
                      : 'bg-black/60 border-2 border-white/30 hover:border-amber-400 hover:shadow-glow-gold'
                  }\`}
                >
                  {/* Radar Ring */}
                  {scanStatus === 'scanning' && (
                    <div className="absolute inset-0 rounded-full border border-amber-400/50 scanner-ring" />
                  )}

                  {/* Laser Scan Line */}
                  {scanStatus === 'scanning' && (
                    <div className="absolute left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_15px_#FFF] animate-scan-line z-20" />
                  )}

                  {/* Corner Alignment Markers */}
                  <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
                  <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
                  <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
                  <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

                  {/* Icon or Status */}
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    {scanStatus === 'granted' ? (
                      <span className="text-5xl text-emerald-400 font-black">✓</span>
                    ) : scanStatus === 'denied' ? (
                      <span className="text-5xl text-red-500 font-black">✗</span>
                    ) : (
                      <div className="text-5xl text-gray-200 hover:text-amber-400 transition-colors filter drop-shadow">
                        <svg className="w-16 h-16 sm:w-20 sm:h-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
                          <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
                          <path d="M2 16h.01"/>
                          <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
                          <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2"/>
                          <path d="M4 10.8a10 10 0 0 1 14.8-4.8"/>
                          <path d="M5 14.8c0 1.25.1 3.25.32 4.2"/>
                          <path d="M10 22a7.6 7.6 0 0 0 2-4"/>
                          <path d="M8 15a4 4 0 0 0 5 3.8"/>
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Instruction / Name Status */}
                <div className="mt-3 text-center w-full max-w-lg">
                  <p className={\`text-base sm:text-xl font-black tracking-wide uppercase drop-shadow-md \${
                    scanStatus === 'scanning' ? 'text-amber-400 animate-pulse' :
                    scanStatus === 'granted' ? 'text-emerald-400' :
                    scanStatus === 'denied' ? 'text-red-400' : 'text-white'
                  }\`}>
                    {scanStatus === 'scanning' && 'Escaneando Huella Digital...'}
                    {scanStatus === 'granted' && (verifiedClient ? \`¡Bienvenido, \${verifiedClient.name}!\` : '¡Acceso Concedido!')}
                    {scanStatus === 'denied' && (verifiedClient ? \`Acceso Denegado: \${verifiedClient.name}\` : 'Acceso Restringido')}
                    {scanStatus === 'idle' && 'COLOQUE SU DEDO SOBRE EL SENSOR'}
                  </p>

                  <p className="text-xs sm:text-sm text-gray-200 mt-1 font-medium drop-shadow">
                    {scanStatus === 'idle' && 'Escanee su huella digital, código de barras o pase su tarjeta RFID'}
                    {scanStatus === 'scanning' && 'Leyendo minucias biométricas...'}
                    {scanStatus === 'granted' && (currentQuote || '¡Acceso autorizado!')}
                    {scanStatus === 'denied' && (verifiedClient?.reason || 'Consulte en recepción')}
                  </p>
                </div>
              </div>

            </div>
          </main>

          {/* History Modal */}
          {showHistoryModal && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0D0E15] border border-white/20 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>⏱️</span> Registro de Accesos del Día
                  </h3>
                  <button 
                    onClick={() => setShowHistoryModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {accessLogs.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No hay accesos registrados hoy todavía.</p>
                  ) : (
                    accessLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
                        <div className="flex items-center gap-3">
                          <span className={\`w-2.5 h-2.5 rounded-full \${log.status === 'granted' ? 'bg-emerald-400' : 'bg-red-400'}\`} />
                          <div>
                            <p className="text-sm font-bold text-white">{log.name}</p>
                            <p className="text-xs text-gray-400">{log.plan} • {log.reason}</p>
                          </div>
                        </div>
                        <span className="font-mono text-xs text-amber-400 font-bold">{log.time}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/15 flex justify-end">
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Config Modal */}
          {showConfigModal && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0D0E15] border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <h3 className="text-lg font-black text-white uppercase mb-4 flex items-center gap-2">
                  <span>⚙️</span> Ajustes de Pantalla y Red
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-300 block mb-1">Oscurecimiento de Fondo (Brillo del fondo):</label>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="0.1" 
                        max="0.8" 
                        step="0.05"
                        value={bgDarkness}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setBgDarkness(val);
                          localStorage.setItem('legends_bg_darkness', String(val));
                        }}
                        className="flex-1 accent-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-mono text-amber-400 font-bold">{Math.round((1 - bgDarkness) * 100)}% Brillo</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-300 block mb-1">Foto de Fondo Actual:</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setCurrentBgIndex(0); localStorage.setItem('legends_bg_choice', '0'); }}
                        className={\`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all \${currentBgIndex === 0 ? 'bg-amber-500 text-black border-amber-400' : 'bg-white/10 text-white border-white/20'}\`}
                      >
                        Foto 1: Rótulo Legends
                      </button>
                      <button 
                        onClick={() => { setCurrentBgIndex(1); localStorage.setItem('legends_bg_choice', '1'); }}
                        className={\`flex-1 py-2 px-2 rounded-xl text-xs font-bold border transition-all \${currentBgIndex === 1 ? 'bg-amber-500 text-black border-amber-400' : 'bg-white/10 text-white border-white/20'}\`}
                      >
                        Foto 2: Lema Límites
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-300 block mb-1">URL Servidor LAN:</label>
                    <input 
                      type="text" 
                      value={serverUrl} 
                      onChange={(e) => setServerUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-xl text-sm text-white" 
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-gray-300">Conexión LAN:</span>
                    <span className={\`font-bold \${serverOnline ? 'text-emerald-400' : 'text-amber-400'}\`}>
                      {serverOnline ? '● Conectado (En línea)' : '● Modo Autónomo Local'}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => {
                      localStorage.setItem('legends_server_url', serverUrl);
                      checkServer();
                      setShowConfigModal(false);
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      );
    }

    ReactDOM.render(<App />, document.getElementById('root'));
  </script>
</body>
</html>
`;

const dest1 = 'C:/Users/DELL/Desktop/gym leyends/Control_De_Acceso_Web.html';
const dest2 = 'C:/Users/DELL/Desktop/Control_De_Acceso_Web.html';

fs.writeFileSync(dest1, htmlContent, 'utf8');
fs.writeFileSync(dest2, htmlContent, 'utf8');

console.log('✓ Successfully generated: ' + dest1);
console.log('✓ Successfully generated: ' + dest2);
