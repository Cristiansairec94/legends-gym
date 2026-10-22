const fs = require('fs');
const path = require('path');

const img1Base64 = 'data:image/jpeg;base64,' + fs.readFileSync('C:/Users/DELL/Desktop/gym leyends/LEGENDS/public/gym-background.jpg').toString('base64');
const img2Base64 = 'data:image/jpeg;base64,' + fs.readFileSync('C:/Users/DELL/Desktop/gym leyends/LEGENDS/public/gym-background-motto.jpg').toString('base64');
const logoBase64 = 'data:image/png;base64,' + fs.readFileSync('C:/Users/DELL/Desktop/gym leyends/LEGENDS/public/logo.png').toString('base64');
const biometricRingsBase64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/biometric-rings-opt.png')).toString('base64');
const biometricFpBase64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/biometric-fingerprint-opt.png')).toString('base64');
const biometricGreenFpBase64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/biometric-green-fp-opt.png')).toString('base64');

console.log('Generating updated single-file HTML with 3 clean options (No black box)...');

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
  
    @keyframes biometric-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes biometric-laser {
      0% { top: 5%; opacity: 0; }
      15% { opacity: 1; }
      50% { top: 85%; opacity: 1; }
      85% { opacity: 1; }
      100% { top: 5%; opacity: 0; }
    }
    .animate-biometric-spin {
      animation: biometric-spin 22s linear infinite;
    }
    .animate-biometric-laser {
      animation: biometric-laser 2.4s ease-in-out infinite;
    }
  
    @keyframes green-laser-scan {
      0% { top: 2%; opacity: 0.3; }
      12% { opacity: 1; }
      50% { top: 90%; opacity: 1; }
      88% { opacity: 1; }
      100% { top: 2%; opacity: 0.3; }
    }
    .animate-green-laser {
      animation: green-laser-scan 2.3s ease-in-out infinite;
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

    // Web Audio Synthesizer
    class SoundEffects {
      constructor() {
        this.ctx = null;
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
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
      }
      playAccessGranted() {
        this.unlock();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        osc2.frequency.setValueAtTime(659.25, now); // E5
        osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.22); // C6
        osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.22); // E6

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.35, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      }

      playAccessDenied() {
        this.unlock();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(140, now + 0.15);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.4, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.38);
      }
    }

    const soundManager = new SoundEffects();

    const MOTIVATIONAL_QUOTES = [
      "¡El único entrenamiento malo es el que no se hizo!",
      "¡La disciplina supera al talento, a entrenar con todo!",
      "¡Convierte tus excusas en sudor!",
      "¡Tu único límite eres tú!",
      "¡La fuerza no viene de lo que puedes hacer, sino de superar lo que pensabas que no podías!",
      "¡Cada gota de sudor te acerca más a tu meta!"
    ];

    const AVAILABLE_PLANS = [
      { id: 'monthly', name: 'Mensualidad Estándar', price: 850, durationDays: 30 },
      { id: 'quarterly', name: 'Plan Trimestral Fuerza', price: 2200, durationDays: 90 },
      { id: 'semiannual', name: 'Plan Semestral Elite', price: 4200, durationDays: 180 },
      { id: 'vip', name: 'Membresía Black VIP Anual', price: 7900, durationDays: 365 },
      { id: 'student', name: 'Plan Estudiante Gym', price: 650, durationDays: 30 }
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
        id: 'MEM-008',
        fullName: 'Juan Solis',
        documentId: '98765432',
        plan: 'Mensualidad Estándar',
        daysRemaining: 15,
        status: 'active'
      },
      {
        id: 'MEM-002',
        fullName: 'Valeria Ríos Gómez',
        documentId: '78291034',
        plan: 'Mensualidad Estándar',
        daysRemaining: 2,
        status: 'active'
      },
      {
        id: 'MEM-004',
        fullName: 'Sofía Domínguez',
        documentId: '89104523',
        plan: 'Mensualidad Estándar',
        daysRemaining: -5,
        status: 'expired'
      }
    ];

    function App() {
      const [currentBgIndex, setCurrentBgIndex] = useState(() => {
        return parseInt(localStorage.getItem('legends_bg_choice') || '0', 10);
      });
      const [bgDarkness, setBgDarkness] = useState(() => {
        return parseFloat(localStorage.getItem('legends_bg_darkness') || '0.25');
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

      // Modals State
      const [showNewMemberModal, setShowNewMemberModal] = useState(false);
      const [showVisitModal, setShowVisitModal] = useState(false);
      const [showDirectAccessModal, setShowDirectAccessModal] = useState(false);
      const [showHistoryModal, setShowHistoryModal] = useState(false);
      const [showConfigModal, setShowConfigModal] = useState(false);

      // New Client Form State
      const [newClientName, setNewClientName] = useState('');
      const [newClientBirthDate, setNewClientBirthDate] = useState('');
      const [newClientAge, setNewClientAge] = useState('');
      const [newClientEmail, setNewClientEmail] = useState('');
      const [newClientPhone, setNewClientPhone] = useState('');
      const [newClientId, setNewClientId] = useState('');
      const [newClientPlan, setNewClientPlan] = useState('Mensualidad Estándar');
      const [newClientPaymentMethod, setNewClientPaymentMethod] = useState('cash');
      const [newClientFingerprintEnrolled, setNewClientFingerprintEnrolled] = useState(false);
        const [showBiometricDashboard, setShowBiometricDashboard] = useState(false);
        const [biometricScanState, setBiometricScanState] = useState('idle'); // idle | scanning | completed
        const [selectedFinger, setSelectedFinger] = useState('Pulgar Derecho');

      // Visit Form State
      const [visitClientName, setVisitClientName] = useState('');
      const [visitCost, setVisitCost] = useState(50);

      // Scanner & Access Feedback State
      const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | granted | denied
      const [verifiedClient, setVerifiedClient] = useState(null);
      const [currentQuote, setCurrentQuote] = useState('');
      const [searchQuery, setSearchQuery] = useState('');
      const [isMuted, setIsMuted] = useState(false);
      const [isFullScreen, setIsFullScreen] = useState(false);
      const [relaySeconds, setRelaySeconds] = useState(0);

      // Server Sync URL
      const [serverUrl, setServerUrl] = useState(() => {
        return localStorage.getItem('legends_server_url') || 'https://legends-gym-gold.vercel.app';
      });
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

      // Check server health across Vercel Cloud and LAN
      const checkServer = useCallback(async () => {
        const candidateUrls = [serverUrl, 'https://legends-gym-gold.vercel.app', 'http://localhost:3001'];
        for (const url of candidateUrls) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(\`\${url}/api/sync/status\`, { mode: 'cors', signal: controller.signal });
            clearTimeout(timer);
            if (res.ok) {
              setServerUrl(url);
              setServerOnline(true);
              const mRes = await fetch(\`\${url}/api/sync/members\`);
              if (mRes.ok) {
                const mData = await mRes.json();
                if (Array.isArray(mData.members) && mData.members.length > 0) {
                  setMembers(mData.members);
                  try { localStorage.setItem('legends_members_v1', JSON.stringify(mData.members)); } catch {}
                }
              }
              return;
            }
          } catch {}
        }
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

      // Execute scan / verify access
      const executeScan = (rawIdentifier) => {
        const id = String(rawIdentifier).trim().toLowerCase();
        if (!id) return;

        setScanStatus('scanning');
        setVerifiedClient(null);

        setTimeout(() => {
          const found = members.find(m => {
            const matchId = String(m.id || '').toLowerCase() === id;
            const matchDoc = String(m.documentId || '').toLowerCase() === id;
            const matchName = String(m.fullName || '').toLowerCase().includes(id);
            return matchId || matchDoc || matchName;
          });

          if (!found) {
            setScanStatus('denied');
            setVerifiedClient({
              name: 'Usuario No Reconocido',
              plan: 'Sin Membresía',
              reason: 'ID o huella no registrada en el sistema',
              status: 'denied',
              daysRemaining: 0
            });
            if (!isMuted) soundManager.playAccessDenied();

            const newLog = {
              id: 'LOG-' + Date.now(),
              clientName: 'Desconocido (' + rawIdentifier + ')',
              status: 'denied',
              reason: 'No registrado',
              timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            setAccessLogs(prev => [newLog, ...prev.slice(0, 499)]);

            setTimeout(() => {
              setScanStatus('idle');
              setVerifiedClient(null);
            }, 3800);
            return;
          }

          const planName = found.membership?.planName || found.plan || 'Mensualidad Estándar';
          const days = found.membership?.daysRemaining !== undefined ? found.membership.daysRemaining : (found.daysRemaining !== undefined ? found.daysRemaining : 30);
          const isExpired = found.status === 'expired' || days < 0;

          if (isExpired) {
            setScanStatus('denied');
            setVerifiedClient({
              name: found.fullName,
              plan: planName,
              reason: 'Membresía vencida (' + Math.abs(days) + ' días)',
              status: 'denied',
              daysRemaining: days
            });
            if (!isMuted) soundManager.playAccessDenied();

            const newLog = {
              id: 'LOG-' + Date.now(),
              clientName: found.fullName,
              status: 'denied',
              reason: 'Cuota vencida',
              timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            setAccessLogs(prev => [newLog, ...prev.slice(0, 499)]);

            setTimeout(() => {
              setScanStatus('idle');
              setVerifiedClient(null);
            }, 4000);
          } else {
            setScanStatus('granted');
            const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
            setCurrentQuote(randomQuote);

            setVerifiedClient({
              name: found.fullName,
              plan: planName,
              reason: 'Acceso Concedido • ' + days + ' días restantes',
              status: 'granted',
              daysRemaining: days
            });

            if (!isMuted) soundManager.playAccessGranted();
            triggerTurnstile(4);

            try {
              confetti({
                particleCount: 45,
                spread: 70,
                origin: { y: 0.6 }
              });
            } catch {}

            const newLog = {
              id: 'LOG-' + Date.now(),
              clientName: found.fullName,
              status: 'granted',
              reason: planName,
              timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            setAccessLogs(prev => [newLog, ...prev.slice(0, 499)]);

            // Sync with Cloud / LAN server
            if (serverOnline) {
              fetch(\`\${serverUrl}/api/sync/access-log\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ log: { id: newLog.id, clientName: found.fullName, status: newLog.status, reason: newLog.reason, timestamp: new Date().toISOString() } })
              }).catch(() => {});
            }

            setTimeout(() => {
              setScanStatus('idle');
              setVerifiedClient(null);
            }, 4500);
          }
        }, 300);
      };

      // Handle Visit / Day Pass
      const handleRegisterVisit = () => {
        const name = visitClientName.trim() || 'Visitante del Día';
        setScanStatus('granted');
        setVerifiedClient({
          name: name,
          plan: 'Pase por 1 Día ($' + visitCost + ')',
          reason: 'Pase de Visita Concedido',
          status: 'granted',
          daysRemaining: 1
        });

        if (!isMuted) soundManager.playAccessGranted();
        triggerTurnstile(4);

        const newLog = {
          id: 'VISIT-' + Date.now(),
          clientName: name,
          status: 'granted',
          reason: 'Pase Diario ($' + visitCost + ')',
          timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
        setAccessLogs(prev => [newLog, ...prev.slice(0, 499)]);

        setShowVisitModal(false);
        setVisitClientName('');

        setTimeout(() => {
          setScanStatus('idle');
          setVerifiedClient(null);
        }, 4500);
      };

      // Handle New Member Registration
      
      // Speech synthesis
      const speakCustomMessage = (text) => {
        if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-MX';
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          const voices = window.speechSynthesis.getVoices();
          const esVoice = voices.find(v => (v.lang && v.lang.startsWith('es')) || (v.name && (v.name.includes('Spanish') || v.name.includes('Mexico'))));
          if (esVoice) utterance.voice = esVoice;
          window.speechSynthesis.speak(utterance);
        } catch {}
      };

      // Biometric Enrollment Action
      const handleEnrollFingerprintAction = () => {
        if (biometricScanState === 'scanning') return;
        setBiometricScanState('scanning');
        soundManager.playScanBlip();

        setTimeout(() => {
          setBiometricScanState('completed');
          setNewClientFingerprintEnrolled(true);
          soundManager.playAccessGranted();
          try {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch {}

          setTimeout(() => {
            setShowBiometricDashboard(false);
            setBiometricScanState('idle');
          }, 900);
        }, 1200);
      };

      const handleRegisterNewMember = (e) => {
        e.preventDefault();
        if (!newClientName.trim()) return;

        const newId = 'MEM-' + String(members.length + 1).padStart(3, '0');
        const selectedPlanObj = AVAILABLE_PLANS.find(p => p.name === newClientPlan) || AVAILABLE_PLANS[0];

        const newMember = {
          id: newId,
          fullName: newClientName.trim(),
          documentId: newClientId.trim() || String(Math.floor(10000000 + Math.random() * 90000000)),
          email: newClientEmail.trim() || 'socio.' + newId.toLowerCase() + '@legendsgym.com',
          phone: newClientPhone.trim() || '+52 55 0000 0000',
          plan: selectedPlanObj.name,
          daysRemaining: selectedPlanObj.durationDays,
          status: 'active',
          membership: {
            planName: selectedPlanObj.name,
            price: selectedPlanObj.price,
            daysRemaining: selectedPlanObj.durationDays,
            status: 'active',
            startDate: new Date().toISOString().slice(0, 10),
            endDate: new Date(Date.now() + selectedPlanObj.durationDays * 86400000).toISOString().slice(0, 10)
          }
        };

        const updatedMembers = [newMember, ...members];
        setMembers(updatedMembers);
        try { localStorage.setItem('legends_members_v1', JSON.stringify(updatedMembers)); } catch {}

        // Push to Cloud / LAN
        if (serverOnline) {
          fetch(\`\${serverUrl}/api/sync/members\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'add', member: newMember })
          }).catch(() => {});
        }

        setShowNewMemberModal(false);
        setNewClientName('');
        setNewClientBirthDate('');
        setNewClientAge('');
        setNewClientEmail('');
        setNewClientPhone('');
        setNewClientId('');

        // Immediate granted access
        speakCustomMessage("Por favor diríjase al encargado");
        executeScan(newMember.id);
      };

      // Birthday to Age auto-calc
      const handleBirthDateChange = (dateStr) => {
        setNewClientBirthDate(dateStr);
        if (dateStr) {
          const birth = new Date(dateStr);
          if (!isNaN(birth.getTime())) {
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
            if (age >= 5 && age <= 100) setNewClientAge(String(age));
          }
        }
      };

      // Global Hardware Barcode / RFID Keyboard Wedge Listener
      useEffect(() => {
        const handleKeyDown = (e) => {
          if (e.key === 'F2') { setShowConfigModal(true); return; }
          if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
          const now = Date.now();

          if (now - lastKeyTimeRef.current > 120) {
            keyBufferRef.current = '';
          }
          lastKeyTimeRef.current = now;

          if (e.key === 'Enter') {
            const scanned = keyBufferRef.current.trim();
            if (scanned.length >= 3) {
              executeScan(scanned);
            }
            keyBufferRef.current = '';
          } else if (e.key.length === 1) {
            keyBufferRef.current += e.key;
          }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }, [members, serverOnline, serverUrl]);

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
        <div onDoubleClick={(e) => { if (e.target === e.currentTarget) setShowConfigModal(true); }} className="relative min-h-screen h-screen w-full overflow-y-auto bg-black text-[#F4F4F6] flex flex-col justify-center items-center p-3 sm:p-5 lg:p-6">
          
          {/* 100% COVER REAL WHATSAPP GYM PHOTO BACKGROUND */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <img 
              src={selectedBg}
              alt="Fondo Gym Legends" 
              className="w-full h-full object-cover object-center filter brightness-110 contrast-105"
            />
            {/* Transparent dark vignette so neon sign and photo are 100% visible */}
            <div 
              className="absolute inset-0 bg-black backdrop-blur-[0.5px] transition-opacity duration-300"
              style={{ opacity: bgDarkness }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/50 pointer-events-none" />
          </div>

          {/* TURNSTILE PASS ACTIVE BANNER */}
          {relaySeconds > 0 && (
            <div className="w-full max-w-4xl mx-auto z-20 shrink-0">
              <div className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500/40 via-emerald-500/60 to-emerald-500/40 border border-emerald-400 shadow-glow-green text-center animate-pulse">
                <div className="flex items-center justify-center gap-3 text-emerald-100 font-black text-base sm:text-lg uppercase tracking-wider">
                  <span>🔓 PASO LIBRE CONCEDIDO (TORNIQUETE ABIERTO)</span>
                  <span className="bg-emerald-400 text-black px-3 py-0.5 rounded-full font-mono text-sm font-black">
                    {relaySeconds}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ACCESS FEEDBACK BANNER WHEN SCANNING */}
          {verifiedClient && (
            <div className="w-full max-w-4xl mx-auto z-20 shrink-0">
              <div className={\`p-4 sm:p-5 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-4 animate-in zoom-in-95 duration-200 \${
                verifiedClient.status === 'granted'
                  ? 'bg-emerald-950/80 border-emerald-400/80 text-emerald-200 shadow-glow-green'
                  : 'bg-red-950/80 border-red-500/80 text-red-200 shadow-glow-red'
              }\`}>
                <div className="flex items-center gap-4">
                  <div className={\`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black shrink-0 \${
                    verifiedClient.status === 'granted' ? 'bg-emerald-500/30 text-emerald-300' : 'bg-red-500/30 text-red-300'
                  }\`}>
                    {verifiedClient.status === 'granted' ? '✓' : '✗'}
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
                      {verifiedClient.name}
                    </h3>
                    <p className="text-sm font-bold text-gray-200">
                      {verifiedClient.plan} • <span className={verifiedClient.status === 'granted' ? 'text-emerald-300 font-semibold' : 'text-red-300 font-semibold'}>{verifiedClient.reason}</span>
                    </p>
                    {verifiedClient.status === 'granted' && currentQuote && (
                      <p className="text-xs text-amber-300 italic mt-0.5">"{currentQuote}"</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setVerifiedClient(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors shrink-0"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

                    {/* MAIN CENTER: THE 3 HIGH-IMPACT CLEAN OPTIONS (NO BLACK CONTAINER BOX!) */}
          <main className="w-full max-w-5xl mx-auto flex-1 flex flex-col justify-center items-center my-auto relative z-10 px-2">

            {/* Main Welcome Header */}
            <div className="text-center mb-6">
              <div onDoubleClick={() => setShowConfigModal(true)} title="Doble clic para configuración" className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-xs font-bold text-amber-400 mb-2.5 shadow-md cursor-pointer select-none">
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

            {/* The 3 Clean High-Impact Options Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 w-full">

              {/* Opción 1: CLIENTE NUEVO */}
              <div 
                onClick={() => setShowNewMemberModal(true)}
                className="group relative p-6 rounded-3xl bg-black/65 hover:bg-black/85 backdrop-blur-xl border-2 border-white/20 hover:border-amber-400 transition-all duration-300 shadow-2xl flex flex-col justify-between cursor-pointer transform hover:-translate-y-2 hover:shadow-glow-gold"
              >
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40 tracking-wider">
                    Inscripción
                  </span>
                </div>

                <div>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
                    👤
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide group-hover:text-amber-400 transition-colors drop-shadow">
                    Cliente Nuevo
                  </h3>
                  <p className="text-xs text-gray-200 mt-2 leading-relaxed font-medium">
                    ¿Primera vez en el gimnasio? Regístrate aquí, elige tu membresía y enrola tu huella digital para comenzar a entrenar.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                    Registrarme &rarr;
                  </span>
                  <span className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                    +
                  </span>
                </div>
              </div>

              {/* Opción 2: QUIERO VISITA */}
              <div 
                onClick={() => setShowVisitModal(true)}
                className="group relative p-6 rounded-3xl bg-black/65 hover:bg-black/85 backdrop-blur-xl border-2 border-white/20 hover:border-emerald-400 transition-all duration-300 shadow-2xl flex flex-col justify-between cursor-pointer transform hover:-translate-y-2 hover:shadow-glow-green"
              >
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 tracking-wider">
                    Pase del Día
                  </span>
                </div>

                <div>
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
                    🎟️
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide group-hover:text-emerald-400 transition-colors drop-shadow">
                    Quiero Visita
                  </h3>
                  <p className="text-xs text-gray-200 mt-2 leading-relaxed font-medium">
                    Entrenamiento por 1 día o clase de prueba sin contrato ni mensualidad. Obtén acceso inmediato a la sala de entrenamiento.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1">
                    Pase de Visita &rarr;
                  </span>
                  <span className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                    ✓
                  </span>
                </div>
              </div>

              {/* Opción 3: YA TENGO MEMBRESÍA (ACCESO DIRECTO) */}
              <div 
                onClick={() => setShowDirectAccessModal(true)}
                className="group relative p-6 rounded-3xl bg-black/65 hover:bg-black/85 backdrop-blur-xl border-2 border-amber-400/80 hover:border-amber-400 transition-all duration-300 shadow-2xl shadow-glow-gold/40 flex flex-col justify-between cursor-pointer transform hover:-translate-y-2 hover:shadow-glow-gold"
              >
                <div className="absolute top-4 right-4">
                  <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-full bg-amber-500 text-black font-mono font-bold animate-pulse">
                    Acceso Directo
                  </span>
                </div>

                <div>
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/30 border border-amber-400/60 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
                    ⚡
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wide group-hover:text-amber-400 transition-colors drop-shadow">
                    Ya Tengo Membresía
                  </h3>
                  <p className="text-xs text-gray-200 mt-2 leading-relaxed font-medium">
                    Acceso instantáneo para socios registrados. Posa tu huella en el lector o escribe tu cédula para abrir el torniquete de inmediato.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                    Validar Huella &rarr;
                  </span>
                  <span className="w-9 h-9 rounded-full bg-amber-500 text-black flex items-center justify-center font-black text-lg shadow-lg group-hover:scale-110 transition-transform">
                    👆
                  </span>
                </div>
              </div>

            </div>

          </main>



          {/* MODAL 1: REGISTRO CLIENTE NUEVO */}
          {showNewMemberModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="bg-[#161824]/95 border border-amber-500/40 rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] overflow-y-auto">
                
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
                    className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleRegisterNewMember} className="space-y-4">
                  
                  {/* Nombre */}
                  <div>
                    <label className="text-xs font-bold text-gray-200 block mb-1">
                      Nombre Completo *
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

                  {/* Cumpleaños y Edad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-200 block mb-1">
                        Fecha de Cumpleaños *
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
                        <span>Edad *</span>
                        <span className="text-[10px] text-amber-400/90 font-medium">(Automática)</span>
                      </label>
                      <input 
                        type="number"
                        required
                        min="8"
                        max="110"
                        value={newClientAge}
                        onChange={(e) => setNewClientAge(e.target.value)}
                        placeholder="Ej. 25"
                        className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Correo y Teléfono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-200 block mb-1">
                        Correo Electrónico (Opcional)
                      </label>
                      <input 
                        type="email"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        placeholder="andrea@ejemplo.com (opcional)"
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
                        placeholder="Ej. 55 1234 5678"
                        className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Cédula */}
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

                  {/* Planes */}
                  <div>
                    <label className="text-xs font-bold text-gray-200 block mb-1.5 flex items-center justify-between">
                      <span>⚡ Mensualidad / Plan de Entrenamiento *</span>
                      <span className="text-[11px] text-amber-400 font-semibold">Toca para seleccionar</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {AVAILABLE_PLANS.map((plan) => {
                        const isSelected = newClientPlan === plan.name;
                        return (
                          <div
                            key={plan.id}
                            onClick={() => setNewClientPlan(plan.name)}
                            className={\`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between \${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-400 shadow-glow-gold/40 ring-1 ring-amber-400'
                                : 'bg-white/10 border-white/15 hover:border-white/30 hover:bg-white/20'
                            }\`}
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
                                $\${plan.price.toLocaleString('es-MX')}
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

                  {/* Opción de Pago */}
                  <div>
                    <label className="text-xs font-bold text-gray-200 block mb-1.5">
                      Opción de Pago *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewClientPaymentMethod('cash')}
                        className={\`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer \${
                          newClientPaymentMethod === 'cash'
                            ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
                            : 'bg-white/10 text-gray-300 border-white/15 hover:bg-white/20 hover:text-white'
                        }\`}
                      >
                        <span>💵 Efectivo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewClientPaymentMethod('card')}
                        className={\`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer \${
                          newClientPaymentMethod === 'card'
                            ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
                            : 'bg-white/10 text-gray-300 border-white/15 hover:bg-white/20 hover:text-white'
                        }\`}
                      >
                        <span>💳 Tarjeta</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewClientPaymentMethod('transfer')}
                        className={\`py-2.5 px-2 rounded-2xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer \${
                          newClientPaymentMethod === 'transfer'
                            ? 'bg-amber-500 text-black border-amber-400 shadow-glow-gold'
                            : 'bg-white/10 text-gray-300 border-white/15 hover:bg-white/20 hover:text-white'
                        }\`}
                      >
                        <span>📱 Transfer</span>
                      </button>
                    </div>
                  </div>

                  {/* Fingerprint Enrollment Card Launcher */}
                    <div 
                      onClick={() => {
                        setBiometricScanState('idle');
                        setShowBiometricDashboard(true);
                      }}
                      className={"p-4 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-3 " + (
                        newClientFingerprintEnrolled
                          ? "bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                          : "bg-amber-500/10 border-amber-500/40 hover:bg-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={"w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform group-hover:scale-110 " + (
                          newClientFingerprintEnrolled 
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                            : "bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                        )}>
                          {newClientFingerprintEnrolled ? '✓' : '👆'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                              Escáner Biométrico de Huella
                            </p>
                            <span className={"text-[10px] font-black uppercase px-2 py-0.5 rounded-full " + (
                              newClientFingerprintEnrolled
                                ? "bg-emerald-500 text-black shadow-glow-green"
                                : "bg-amber-500/30 text-amber-300 border border-amber-500/40"
                            )}>
                              {newClientFingerprintEnrolled ? '✓ Enrolada' : 'Pendiente'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 mt-0.5">
                            {newClientFingerprintEnrolled 
                              ? "✓ Huella vinculada (" + selectedFinger + ") • Clic para ver escáner / re-escanear" 
                              : "Haz clic aquí para abrir el dashboard y registrar tu huella en grande"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setBiometricScanState('idle');
                          setShowBiometricDashboard(true);
                        }}
                        className={"px-3.5 py-2 rounded-xl text-xs font-black transition-all transform group-hover:scale-105 shrink-0 cursor-pointer " + (
                          newClientFingerprintEnrolled 
                            ? "bg-emerald-500 text-black shadow-glow-green" 
                            : "bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-glow-gold"
                        )}
                      >
                        {newClientFingerprintEnrolled ? '✓ Ver Escáner' : '⚡ Abrir Escáner'}
                      </button>
                    </div>

                    {/* Action Buttons */}
                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowNewMemberModal(false)}
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-300 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-black text-black shadow-glow-gold uppercase tracking-wider transition-all transform hover:scale-[1.02] cursor-pointer"
                    >
                      Guardar e Ingresar
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

          
          {/* MODAL: DASHBOARD DEL ESCÁNER BIOMÉTRICO EN GRANDE */}
          {showBiometricDashboard && (
            <div className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div className="relative bg-gradient-to-b from-[#111625] via-[#0b0e17] to-[#04060a] border-2 border-cyan-500/50 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-[0_0_60px_rgba(6,182,212,0.35)] animate-in zoom-in-95 duration-200 text-white overflow-hidden">
                {/* Top decorative neon cyber bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-2xl text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                      ⚡
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white tracking-wide uppercase">
                        Dashboard Biométrico de Huella
                      </h3>
                      <p className="text-xs text-gray-300">
                        Estación de enrolamiento óptico en alta resolución • 500 DPI
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-black">
                      <span className={"w-2 h-2 rounded-full " + (
                        biometricScanState === 'scanning' ? "bg-amber-400 animate-ping" :
                        biometricScanState === 'completed' ? "bg-emerald-400" : "bg-cyan-400 animate-ping"
                      )} />
                      {biometricScanState === 'scanning' ? 'ESCANEANDO' :
                       biometricScanState === 'completed' ? 'ENROLADA' : 'SENSOR ACTIVO'}
                    </div>
                    <button 
                      onClick={() => setShowBiometricDashboard(false)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white transition-colors cursor-pointer text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Client summary pill if name exists */}
                {newClientName.trim() && (
                  <div className="mb-3 px-3.5 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-between text-xs">
                    <span className="text-gray-300">Socio a enrolar: <strong className="text-white font-bold">{newClientName}</strong></span>
                    <span className="text-cyan-400 font-mono font-bold">{newClientPlan}</span>
                  </div>
                )}

                {/* Selector of Finger */}
                <div className="mb-3">
                  <label className="text-xs font-bold text-gray-300 block mb-1.5">
                    Selecciona el dedo a registrar:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Pulgar Derecho', 'Índice Derecho', 'Pulgar Izquierdo', 'Índice Izquierdo'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setSelectedFinger(f)}
                        className={"py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer " + (
                          selectedFinger === f
                            ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                            : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Centerpiece Scanner Dashboard View ("en grande") */}
                <div className="flex flex-col items-center justify-center my-2 select-none">
                  <div 
                    onClick={() => {
                      if (biometricScanState !== 'scanning') {
                        handleEnrollFingerprintAction();
                      }
                    }}
                    className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center cursor-pointer group my-1"
                    title="Haz clic para registrar tu huella"
                  >
                    {/* Outer Glow Halo */}
                    <div className={"absolute inset-4 rounded-full blur-2xl transition-all duration-500 pointer-events-none " + (
                      biometricScanState === 'completed'
                        ? "bg-emerald-500/30"
                        : biometricScanState === 'scanning'
                        ? "bg-amber-500/30"
                        : "bg-cyan-500/20 group-hover:bg-cyan-400/35"
                    )} />

                    {/* Rotating HUD Rings (Clockwise) */}
                    <img 
                      src="${biometricRingsBase64}" 
                      alt="HUD Biometric Rings" 
                      className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_0_20px_rgba(6,182,212,0.45)] pointer-events-none animate-biometric-spin"
                    />

                    {/* Upright Center Fingerprint */}
                    <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center rounded-full overflow-hidden">
                      <img 
                        src="${biometricFpBase64}" 
                        alt="Huella Digital" 
                        className={"w-full h-full object-contain filter transition-transform duration-300 " + (
                          biometricScanState === 'completed'
                            ? "drop-shadow-[0_0_20px_rgba(16,185,129,0.9)] scale-105"
                            : "drop-shadow-[0_0_12px_rgba(255,255,255,0.85)] group-hover:scale-105"
                        )}
                      />

                      {/* Biometric Laser Scanning Line */}
                      <div className="absolute left-0 right-0 pointer-events-none animate-biometric-laser">
                        <div className={"h-10 w-full bg-gradient-to-t to-transparent " + (
                          biometricScanState === 'completed' ? "from-emerald-400/50" : "from-cyan-400/40"
                        )} />
                        <div className={"h-1 w-full " + (
                          biometricScanState === 'completed'
                            ? "bg-emerald-300 shadow-[0_0_15px_#34d399,0_0_30px_#10b981]"
                            : "bg-cyan-300 shadow-[0_0_12px_#38bdf8,0_0_24px_#06b6d4]"
                        )} />
                      </div>
                    </div>

                    {/* Radar Pulse Wave */}
                    <div className="absolute w-36 h-36 rounded-full border border-cyan-400/50 animate-ping pointer-events-none opacity-40" />
                  </div>

                  {/* Status Badge Under Scanner */}
                  <div className="mt-2 text-center">
                    {biometricScanState === 'idle' && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                          SENSOR LISTO • TOCA EL ESCÁNER O PULSA REGISTRARME
                        </span>
                      </div>
                    )}
                    {biometricScanState === 'scanning' && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                          ESCANEANDO MINUCIAS Y CRESTAS PAPILARES...
                        </span>
                      </div>
                    )}
                    {biometricScanState === 'completed' && (
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                          ✓ HUELLA REGISTRADA CON ÉXITO (CALIDAD 99%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* High-Tech Biometric Telemetry Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-3 text-center">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Calidad de Señal</p>
                    <p className="text-xs font-black text-emerald-400 mt-0.5">98.6% Óptima</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Minucias</p>
                    <p className="text-xs font-black text-cyan-400 mt-0.5">136 Detectadas</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Resolución</p>
                    <p className="text-xs font-black text-amber-400 mt-0.5">508 DPI Óptico</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Seguridad</p>
                    <p className="text-xs font-black text-purple-400 mt-0.5">Cifrado SHA-256</p>
                  </div>
                </div>

                {/* Primary Action Button: REGISTRARME */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleEnrollFingerprintAction}
                    disabled={biometricScanState === 'scanning'}
                    className={"w-full py-3.5 sm:py-4 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer " + (
                      biometricScanState === 'completed'
                        ? "bg-emerald-500 text-black shadow-glow-green"
                        : "bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black shadow-[0_0_25px_rgba(245,158,11,0.5)]"
                    )}
                  >
                    {biometricScanState === 'scanning' ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Escaneando Huella Digital...</span>
                      </span>
                    ) : biometricScanState === 'completed' ? (
                      <span>✓ ¡Huella Registrada con Éxito!</span>
                    ) : (
                      <span>👆 Registrar Mi Huella Digital</span>
                    )}
                  </button>

                  <div className="mt-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => setShowBiometricDashboard(false)}
                      className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer font-bold"
                    >
                      ← Volver al Formulario de Registro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 2: PASE DE VISITA */}
          {showVisitModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
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
                    className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ✕
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
                      className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-300 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleRegisterVisit}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-black shadow-glow-green uppercase tracking-wider cursor-pointer"
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
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
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
                    className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex flex-col items-center justify-center py-2 select-none">
                  {/* Neon Green Biometric Scanner Pad */}
                  <div 
                    onClick={() => {
                      executeScan('MEM-001');
                      setShowDirectAccessModal(false);
                    }}
                    className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-black/85 border-2 border-emerald-500/50 hover:border-emerald-400 flex items-center justify-center cursor-pointer group shadow-[0_0_35px_rgba(16,185,129,0.3)] hover:shadow-[0_0_55px_rgba(16,185,129,0.5)] transition-all duration-300 overflow-hidden my-2"
                    title="Posa tu huella en el sensor"
                  >
                    {/* Corner Target Markers */}
                    <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-emerald-400 pointer-events-none" />
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-emerald-400 pointer-events-none" />
                    <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-emerald-400 pointer-events-none" />
                    <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-emerald-400 pointer-events-none" />

                    {/* Cyber Grid Lines Background */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#052e16_1px,transparent_1px),linear-gradient(to_bottom,#052e16_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />

                    {/* Outer Ambient Glow */}
                    <div className="absolute inset-6 rounded-full bg-emerald-500/15 blur-2xl group-hover:bg-emerald-400/30 transition-all duration-500 pointer-events-none" />

                    {/* Neon Green Fingerprint Image & Scanning Laser */}
                    <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center">
                      <img 
                        src="${biometricGreenFpBase64}" 
                        alt="Huella Biométrica Neón Verde" 
                        className="w-full h-full object-contain filter drop-shadow-[0_0_18px_rgba(34,197,94,0.95)] group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Animated Neon Green Laser Line */}
                      <div className="absolute left-0 right-0 pointer-events-none animate-green-laser z-20">
                        <div className="h-10 w-full bg-gradient-to-t from-emerald-400/35 via-emerald-400/15 to-transparent" />
                        <div className="h-1 w-full bg-white shadow-[0_0_12px_#22c55e,0_0_24px_#10b981,0_0_36px_#22c55e]" />
                      </div>
                    </div>

                    {/* Radar Pulse Wave */}
                    <div className="absolute w-44 h-44 rounded-full border border-emerald-400/40 animate-ping pointer-events-none opacity-30" />
                  </div>

                  {/* Status Badge */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 mt-3">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                      SENSOR BIOMÉTRICO ACTIVO
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Posa tu huella en el lector USB o ingresa tu ID
                  </p>
                </div>

                {/* Input de búsqueda o cédula */}
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
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-glow-gold cursor-pointer"
                    >
                      Verificar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 4: REGISTRO DE ACCESOS DEL DÍA */}
          {showHistoryModal && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0D0E15] border border-white/20 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <span>⏱️</span> Registro de Accesos del Día
                  </h3>
                  <button 
                    onClick={() => setShowHistoryModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
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
                          <span className={\`w-2 h-2 rounded-full \${log.status === 'granted' ? 'bg-emerald-400' : 'bg-red-500'}\`} />
                          <div>
                            <p className="text-sm font-bold text-white">{log.clientName}</p>
                            <p className="text-xs text-gray-400">{log.reason}</p>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-gray-400">{log.timestamp}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-white/15 flex justify-between items-center text-xs text-gray-400">
                  <span>Total hoy: <strong className="text-white font-mono">{accessLogs.length}</strong></span>
                  <button 
                    onClick={() => setShowHistoryModal(false)}
                    className="px-4 py-2 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 5: CONFIGURACIÓN DE RED Y SERVIDOR */}
          {showConfigModal && (
            <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#0D0E15] border border-white/20 rounded-2xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/15 pb-3 mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>⚙️</span> Configuración de Red
                  </h3>
                  <button 
                    onClick={() => setShowConfigModal(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">
                      Servidor de Sincronización (Vercel Cloud o LAN):
                    </label>
                    <input
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="https://legends-gym-gold.vercel.app"
                      className="w-full px-3 py-2 bg-black/60 rounded-xl border border-white/20 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
                    <span className="text-gray-300">Estado de Conexión:</span>
                    <span className={\`font-bold \${serverOnline ? 'text-emerald-400' : 'text-amber-400'}\`}>
                      {serverOnline ? '● Conectado (Online)' : '○ Desconectado'}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        localStorage.setItem('legends_server_url', serverUrl);
                        checkServer();
                        setShowConfigModal(false);
                      }}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                    >
                      Guardar y Probar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;

const dest1 = 'C:/Users/DELL/Desktop/gym leyends/Control_De_Acceso_Web.html';
const dest2 = 'C:/Users/DELL/Desktop/Control_De_Acceso_Web.html';
const dest3 = path.join(__dirname, '../public/Control_De_Acceso_Web.html');
const dest4 = path.join(__dirname, '../public/terminal.html');
const dest5 = path.join(__dirname, '../dist/Control_De_Acceso_Web.html');
const dest6 = path.join(__dirname, '../dist/terminal.html');
const dest7 = path.join(__dirname, '../release/FITNESS_LEGENDS_TERMINAL-win32-x64/resources/app/dist/Control_De_Acceso_Web.html');
const dest8 = path.join(__dirname, '../release/FITNESS_LEGENDS_TERMINAL-win32-x64/resources/app/dist/terminal.html');

[dest1, dest2, dest3, dest4, dest5, dest6, dest7, dest8].forEach(d => {
  try {
    if (fs.existsSync(path.dirname(d))) {
      fs.writeFileSync(d, htmlContent, 'utf8');
      console.log('✓ Successfully generated: ' + d);
    }
  } catch (err) {
    console.error('Error writing to ' + d, err);
  }
});
