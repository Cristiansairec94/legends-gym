const fs = require('fs');
const path = require('path');

const img1Base64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '../public/gym-background.jpg')).toString('base64');
const img2Base64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '../public/gym-background-motto.jpg')).toString('base64');
const logoBase64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/logo.png')).toString('base64');
const cardNuevoBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '../src/assets/card-cliente-nuevo.jpg')).toString('base64');
const cardVisitaBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '../src/assets/card-visita.jpg')).toString('base64');
const cardHuellaBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '../src/assets/card-huella.jpg')).toString('base64');
const modalBgBase64 = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '../src/assets/modal-gym-bg.jpg')).toString('base64');
const biometricRingsBase64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/biometric-rings-opt.png')).toString('base64');
const biometricFpBase64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/biometric-fingerprint-opt.png')).toString('base64');
const biometricGreenFpBase64 = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, '../public/biometric-green-fp-opt.png')).toString('base64');
const avatarTsContent = fs.readFileSync(path.join(__dirname, '../src/assets/avatars/avatarBase64.ts'), 'utf8');
const femaleAvatarMatch = avatarTsContent.match(/\bfemaleClientBase64\s*=\s*["']([^"']+)["']/);
const maleAvatarMatch = avatarTsContent.match(/\bmaleClientBase64\s*=\s*["']([^"']+)["']/);
const femaleAvatarBase64 = femaleAvatarMatch ? femaleAvatarMatch[1] : '';
const maleAvatarBase64 = maleAvatarMatch ? maleAvatarMatch[1] : '';

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
  <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin="anonymous"></script>

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
    const BG_PHOTO_3 = "${modalBgBase64}";
    const MODAL_GYM_BG = "${modalBgBase64}";
    const IMG_MODAL_BG = MODAL_GYM_BG;
    const LOGO_IMG = "${logoBase64}";
    const IMG_CARD_NUEVO = "${cardNuevoBase64}";
    const IMG_CARD_VISITA = "${cardVisitaBase64}";
    const IMG_CARD_HUELLA = "${cardHuellaBase64}";
    const IMG_AVATAR_FEMALE = "${femaleAvatarBase64}";
    const IMG_AVATAR_MALE = "${maleAvatarBase64}";

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
      { id: 'CAT-PLAN-002', type: 'weekly', name: 'Pase Semanal (Semana por persona)', price: 150, durationDays: 7 },
      { id: 'CAT-PLAN-003', type: 'biweekly', name: 'Pase Quincenal (15 Días)', price: 250, durationDays: 15 },
      { id: 'CAT-PLAN-004', type: 'monthly', name: 'Mensualidad Individual', price: 420, durationDays: 30 },
      { id: 'CAT-PLAN-005', type: 'group', name: 'Paquete 3 Personas (Mensual)', price: 1100, durationDays: 30 },
      { id: 'CAT-PLAN-006', type: 'group', name: 'Paquete 4 Personas (Mensual)', price: 1500, durationDays: 30 }
    ];
    const availablePlans = AVAILABLE_PLANS;

    function getGroupPackageSize(planName, planType) {
      const name = String(planName || '').toLowerCase();
      const match = name.match(/([2-6])[ ]*personas?/);
      if (match) return parseInt(match[1], 10);
      if (String(planType || '').toLowerCase() === 'group') {
        return name.includes('4') ? 4 : 3;
      }
      return 1;
    }

    function detectGender(name) {
      const first = (String(name || '').toLowerCase().trim().split(/[ ]+/)[0] || '');
      const clean = first.normalize ? first.normalize('NFD').replace(/[^a-z]/g, '') : first;
      const females = [
        'alondra','maria','mary','carmen','ana','valeria','sofia','andrea','valentina','camila',
        'isabella','isabela','lucia','natalia','daniela','mariana','fernanda','gabriela','laura',
        'paula','patricia','claudia','diana','carolina','brenda','alejandra','sara','sarah','monica',
        'elena','rosa','jessica','yesica','vanessa','vanesa','karen','karla','carla','guadalupe',
        'lupita','ximena','jimena','paulina','adriana','lorena','esmeralda','rocio','beatriz','teresa',
        'gloria','margarita','leticia','silvia','yolanda','miriam','myriam','veronica','elizabeth',
        'raquel','ruth','susana','ivonne','fatima','estefania','stephanie','montserrat','rebeca',
        'nayeli','marisol','araceli','aracely','arely','areli','clara','cecilia','blanca','alma',
        'alicia','luz','olga','irma','juana','abigail','noemi','sarai','anahi','rubi','itzel',
        'yazmin','yasmin','lizbeth','lizeth','jaqueline','kimberly','ashley','melanie','nancy',
        'jennifer','marifer','pilar','mercedes','dolores','lourdes','isabel','maribel','esther',
        'belen','rosario','milagros','wendy','ingrid','astrid','edith','judith','perla','dulce',
        'estrella','cynthia','nadia','sonia','tania','katia','kenia','regina','renata','romina',
        'aitana','alexa','alexandra','amanda','angela','angelica','ariana','aurora','barbara',
        'catalina','celeste','chloe','cristina','dalia','danna','denisse','elisa','emilia','emily',
        'emma','erika','eva','evelyn','fabiola','florencia','frida','genesis','georgina','graciela',
        'helena','ines','irene','iris','ivana','ivette','julieta','julia','karina','lara','liliana',
        'lidia','luciana','luisa','magdalena','marcela','marina','marta','martha','martina','mayra',
        'melissa','mia','michelle','miranda','naomi','nicole','nina','nora','olivia','paloma',
        'pamela','paola','priscila','reina','reyna','roxana','sabrina','salma','samantha','sandra',
        'selena','silvana','tamara','tatiana','violeta','virginia','viviana'
      ];
      if (females.includes(clean)) return 'female';
      if (clean.endsWith('a') && clean.length > 2 && !['joshua','luca','elias','garcia'].includes(clean)) return 'female';
      return 'male';
    }

    function createEmptyGroupCompanion() {
      return {
        fullName: '',
        gender: 'male',
        genderManuallySelected: false,
        birthDate: '',
        birthDateDisplay: '',
        age: '',
        phone: ''
      };
    }

    function resizeGroupCompanions(list, requiredCount) {
      if (requiredCount <= 0) return [];
      const next = Array.isArray(list) ? list.slice(0, requiredCount) : [];
      while (next.length < requiredCount) {
        next.push(createEmptyGroupCompanion());
      }
      return next;
    }

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
        plan: 'Mensualidad Individual',
        daysRemaining: 15,
        status: 'active'
      },
      {
        id: 'MEM-002',
        fullName: 'Valeria Ríos Gómez',
        documentId: '78291034',
        plan: 'Mensualidad Individual',
        daysRemaining: 2,
        status: 'active'
      },
      {
        id: 'MEM-004',
        fullName: 'Sofía Domínguez',
        documentId: '89104523',
        plan: 'Mensualidad Individual',
        daysRemaining: -5,
        status: 'expired'
      }
    ];

    function App() {
      const [currentBgIndex, setCurrentBgIndex] = useState(() => {
        if (typeof window !== 'undefined' && localStorage.getItem('legends_bg_version') !== 'v9_bright') {
          localStorage.setItem('legends_bg_version', 'v10_clear_photo');
          localStorage.setItem('legends_bg_choice', '0');
          localStorage.setItem('legends_bg_darkness', '0.05');
          return 0;
        }
        return parseInt(localStorage.getItem('legends_bg_choice') || '0', 10);
      });
      const [bgDarkness, setBgDarkness] = useState(() => {
        return parseFloat(localStorage.getItem('legends_bg_darkness') || '0.05');
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
      const [newMemberStep, setNewMemberStep] = useState(1);
      const [stepError, setStepError] = useState('');

      const handleNextStep1 = () => {
        if (!newClientName.trim()) {
          setStepError('Por favor ingresa el nombre completo del socio');
          return;
        }
        setStepError('');
        setNewMemberStep(2);
      };

      const [showVisitModal, setShowVisitModal] = useState(false);
      const [showDirectAccessModal, setShowDirectAccessModal] = useState(false);
      const [showHistoryModal, setShowHistoryModal] = useState(false);
      const [showConfigModal, setShowConfigModal] = useState(false);

      // New Client Form State
      const [newClientName, setNewClientName] = useState('');
      const [newClientGender, setNewClientGender] = useState('male');
      const [genderManuallySelected, setGenderManuallySelected] = useState(false);
      const [newClientBirthDate, setNewClientBirthDate] = useState('');
      const [newClientBirthDateDisplay, setNewClientBirthDateDisplay] = useState('');
      const [newClientAge, setNewClientAge] = useState('');
      const [isBirthPickerOpen, setIsBirthPickerOpen] = useState(false);
      const [birthPickerTarget, setBirthPickerTarget] = useState('primary');
      const [pickerDecade, setPickerDecade] = useState(1990);
      const [pickerYear, setPickerYear] = useState(null);
      const [pickerMonth, setPickerMonth] = useState(null);
      const [pickerDay, setPickerDay] = useState(null);
      const [newClientEmail, setNewClientEmail] = useState('');
      const [newClientPhone, setNewClientPhone] = useState('');
      const [newClientId, setNewClientId] = useState('');
      const [newClientPlan, setNewClientPlan] = useState('Mensualidad Individual');
      const [newClientFingerprintEnrolled, setNewClientFingerprintEnrolled] = useState(false);
      const [showBiometricDashboard, setShowBiometricDashboard] = useState(false);
      const [biometricScanState, setBiometricScanState] = useState('idle'); // idle | scanning | completed
      const [selectedFinger, setSelectedFinger] = useState('Pulgar Derecho');
      const [groupCompanions, setGroupCompanions] = useState([]);
      const [showGroupCompanionsModal, setShowGroupCompanionsModal] = useState(false);
      const [activeCompanionIdx, setActiveCompanionIdx] = useState(0);
      const [companionError, setCompanionError] = useState('');

      const isGroupCompanionComplete = (comp) => {
        if (!comp || !String(comp.fullName || '').trim()) return false;
        const hasBirth = Boolean(parseBirthDateParts(comp.birthDateDisplay || comp.birthDate));
        const ageNum = Number(comp.age);
        return hasBirth || (!isNaN(ageNum) && ageNum >= 8 && ageNum <= 110);
      };

      const selectedPlanObjForFlow = AVAILABLE_PLANS.find(p => p.name === newClientPlan);
      const activeGroupSize = getGroupPackageSize(newClientPlan, selectedPlanObjForFlow?.type);
      const requiredCompanionsCount = Math.max(0, activeGroupSize - 1);
      const activeGroupCompanions = requiredCompanionsCount > 0
        ? resizeGroupCompanions(groupCompanions, requiredCompanionsCount)
        : [];
      const completedCompanionsCount = activeGroupCompanions.filter(isGroupCompanionComplete).length;
      const allGroupCompanionsReady = requiredCompanionsCount === 0 || completedCompanionsCount === requiredCompanionsCount;

      const handleNextStep2 = () => {
        if (!newClientPlan) {
          setStepError('Por favor selecciona un plan o mensualidad');
          return;
        }
        if (requiredCompanionsCount > 0 && !allGroupCompanionsReady) {
          setStepError('');
          setGroupCompanions(resizeGroupCompanions(groupCompanions, requiredCompanionsCount));
          const firstIncomplete = activeGroupCompanions.findIndex(c => !isGroupCompanionComplete(c));
          setActiveCompanionIdx(firstIncomplete >= 0 ? firstIncomplete : 0);
          setCompanionError('');
          setShowGroupCompanionsModal(true);
          return;
        }
        setStepError('');
        setNewMemberStep(3);
      };

      // Visit Form State
      const [visitClientName, setVisitClientName] = useState('');
      const [visitCost, setVisitCost] = useState(50);

      // Scanner & Access Feedback State
      const [scanStatus, setScanStatus] = useState('idle'); // idle | scanning | granted | denied
      const [verifiedClient, setVerifiedClient] = useState(null);
      const [currentQuote, setCurrentQuote] = useState('');
      const [searchQuery, setSearchQuery] = useState('');
      const [directAccessError, setDirectAccessError] = useState('');
      const directAccessInputRef = useRef(null);
      const executeScanRef = useRef(() => {});
      const isModalBlockingScanRef = useRef(false);
      const hasEscapeClosableModalRef = useRef(false);
      const scanStatusRef = useRef('idle');
      const lastRandomScanIdRef = useRef('');
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
        const next = (currentBgIndex + 1) % 3;
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

      // Multi-Window & Background Sync: BroadcastChannel + storage event + 1.5s live sync
      useEffect(() => {
        let channel = null;
        try {
          channel = new BroadcastChannel('legends_gym_sync_bus_v1');
          channel.onmessage = (event) => {
            const data = event.data;
            if (!data) return;
            if (data.type === 'MEMBER_ADDED' && data.member) {
              setMembers(prev => {
                const next = [data.member, ...prev.filter(m => m.id !== data.member.id)];
                try { localStorage.setItem('legends_members_v1', JSON.stringify(next)); } catch {}
                return next;
              });
            } else if (data.type === 'MEMBER_UPDATED' && data.member) {
              setMembers(prev => {
                const next = prev.map(m => m.id === data.member.id ? { ...m, ...data.member } : m);
                try { localStorage.setItem('legends_members_v1', JSON.stringify(next)); } catch {}
                return next;
              });
            } else if (data.type === 'MEMBER_DELETED' && data.memberId) {
              setMembers(prev => {
                const next = prev.filter(m => m.id !== data.memberId);
                try { localStorage.setItem('legends_members_v1', JSON.stringify(next)); } catch {}
                return next;
              });
            } else if (data.type === 'MEMBERS_REPLACED' && Array.isArray(data.members)) {
              setMembers(data.members);
              try { localStorage.setItem('legends_members_v1', JSON.stringify(data.members)); } catch {}
            }
          };
        } catch {}

        const handleStorage = (e) => {
          if (e.key === 'legends_members_v1' && e.newValue) {
            try {
              const parsed = JSON.parse(e.newValue);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setMembers(parsed);
              }
            } catch {}
          }
        };

        const pollLocalMembers = setInterval(() => {
          try {
            const raw = localStorage.getItem('legends_members_v1');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setMembers(prev => {
                  if (prev.length !== parsed.length) return parsed;
                  return prev;
                });
              }
            }
          } catch {}
        }, 1500);

        window.addEventListener('storage', handleStorage);
        return () => {
          window.removeEventListener('storage', handleStorage);
          clearInterval(pollLocalMembers);
          if (channel) channel.close();
        };
      }, []);

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

      // Execute scan / verify access with multi-attribute normalized matching
      const executeScan = (rawIdentifier) => {
        const rawStr = String(rawIdentifier || '').trim();
        if (!rawStr) return;

        setScanStatus('scanning');
        setVerifiedClient(null);

        // Fetch latest pool directly from state and localStorage
        let currentPool = members;
        try {
          const stored = localStorage.getItem('legends_members_v1');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) currentPool = parsed;
          }
        } catch {}

        const norm = (str) => String(str || '')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

        const q = norm(rawStr);
        const qCompact = q.replace(/[\s_\-]/g, '');
        const qWords = q.split(/[\s\t]+/).filter(Boolean);
        const qDigits = q.replace(/[^0-9]/g, '');

        setTimeout(() => {
          const found = currentPool.find(m => {
            if (!q) return false;
            const idNorm = norm(m.id);
            const idCompact = idNorm.replace(/[\s_\-]/g, '');
            const docNorm = norm(m.documentId);
            const docCompact = docNorm.replace(/[\s_\-]/g, '');
            const nameNorm = norm(m.fullName);
            const emailNorm = norm(m.email);
            const hashNorm = norm(m.biometricHash);
            const tplNorm = norm(m.biometricTemplate);
            const phoneDigits = String(m.phone || '').replace(/[^0-9]/g, '');

            if (hashNorm && hashNorm === q) return true;
            if (tplNorm && tplNorm === q) return true;
            if (idNorm === q || idCompact === qCompact) return true;
            if (docNorm === q || (docCompact && docCompact === qCompact)) return true;
            if (emailNorm === q) return true;
            if (qDigits.length >= 6 && phoneDigits.endsWith(qDigits)) return true;
            const nameWords = nameNorm.split(/[ ]+/).filter(Boolean);
            if (nameNorm === q || nameWords.some(w => w === q)) return true;
            if (q.length >= 3 && nameNorm.includes(q)) return true;
            if (qWords.length > 1 && qWords.every(w => nameNorm.includes(w))) return true;
            return false;
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

          const planName = found.membership?.planName || found.plan || 'Mensualidad Individual';
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
          plan: 'Pase de Visita ($' + visitCost + ')',
          reason: '¡Bienvenido! Disfruta tu entrenamiento',
          status: 'granted',
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

        if (requiredCompanionsCount > 0 && !allGroupCompanionsReady) {
          setNewMemberStep(2);
          setGroupCompanions(resizeGroupCompanions(groupCompanions, requiredCompanionsCount));
          setShowGroupCompanionsModal(true);
          return;
        }

        if (!newClientFingerprintEnrolled) {
          setStepError('Registro obligatorio: captura tu huella digital para enviar autorización al RP.');
          return;
        }
        setStepError('');

        const selectedPlanObj = AVAILABLE_PLANS.find(p => p.name === newClientPlan) || AVAILABLE_PLANS[0];
        const groupMembersPayload = activeGroupCompanions.map((comp) => {
          const compBirthIso = comp.birthDateDisplay
            ? (parseBirthDateParts(comp.birthDateDisplay) ? formatBirthDateToISO(comp.birthDateDisplay) : comp.birthDate)
            : comp.birthDate;
          const fallbackBirth = compBirthIso || (comp.age ? (new Date().getFullYear() - Number(comp.age)) + '-01-01' : '1998-01-01');
          return {
            fullName: comp.fullName.trim(),
            gender: comp.gender || 'male',
            birthDate: fallbackBirth,
            phone: (comp.phone || '').trim() || newClientPhone.trim() || '+52 55 0000 0000',
            biometricEnrolled: false
          };
        });

        const reqId = 'REG_' + Date.now();
        const registrationRequest = {
          id: reqId,
          memberData: {
            id: newClientId.trim() || undefined,
            fullName: newClientName.trim(),
            documentId: newClientId.trim() || undefined,
            email: newClientEmail.trim() || 'socio@legendsgym.com',
            phone: newClientPhone.trim() || '+52 55 0000 0000',
            birthDate: newClientBirthDate || '1998-01-01',
            gender: newClientGender,
            planName: selectedPlanObj.name,
            planType: selectedPlanObj.type || 'monthly',
            planPrice: selectedPlanObj.price,
            durationDays: selectedPlanObj.durationDays,
            biometricEnrolled: Boolean(newClientFingerprintEnrolled),
            selectedFinger,
            groupMembers: groupMembersPayload.length > 0 ? groupMembersPayload : undefined
          },
          paymentMethod: 'cash',
          timestamp: Date.now(),
          status: 'pending'
        };

        try {
          const ch = new BroadcastChannel('legends_gym_sync_bus_v1');
          ch.postMessage({ type: 'MEMBER_REGISTRATION_REQUESTED', registrationRequest });
          ch.close();
        } catch {}

        if (serverOnline) {
          fetch(\`\${serverUrl}/api/sync/registration-request\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registrationRequest)
          }).catch(() => {});
        }

        setShowNewMemberModal(false);
        setShowGroupCompanionsModal(false);
        setNewMemberStep(1);
        setStepError('');
        setNewClientName('');
        setNewClientBirthDate('');
        setNewClientBirthDateDisplay('');
        setNewClientAge('');
        setNewClientEmail('');
        setNewClientPhone('');
        setNewClientId('');
        setNewClientFingerprintEnrolled(false);
        setGroupCompanions([]);

        speakCustomMessage("Por favor diríjase a recepción para completar su registro");
      };

      // Helper date parsers and age calculators
      function parseBirthDateParts(input) {
        if (!input || typeof input !== 'string') return null;
        const clean = input.trim();
        if (!clean) return null;
        const parts = clean.replace(/[/.]/g, '-').replace(/\s+/g, '-').split('-').filter(Boolean);
        if (parts.length === 3) {
          const p1 = parseInt(parts[0], 10);
          const p2 = parseInt(parts[1], 10);
          const p3 = parseInt(parts[2], 10);
          if (isNaN(p1) || isNaN(p2) || isNaN(p3)) return null;
          let year = 0, month = 0, day = 0;
          if (parts[0].length === 4) {
            year = p1;
            month = p2;
            day = p3;
            if (year < 100) {
              const curYear = new Date().getFullYear();
              const century = Math.floor(curYear / 100) * 100;
              year = (century + year <= curYear) ? (century + year) : (century - 100 + year);
            }
          } else if (parts[2].length === 4 || parts[2].length === 2) {
            day = p1;
            month = p2;
            year = p3;
            if (year < 100) {
              const curYear = new Date().getFullYear();
              const century = Math.floor(curYear / 100) * 100;
              year = (century + year <= curYear) ? (century + year) : (century - 100 + year);
            }
          } else {
            return null;
          }
          if (month < 1 || month > 12 || day < 1 || day > 31) return null;
          const curYear = new Date().getFullYear();
          if (year < 1900 || year > curYear) return null;
          return { year, month, day };
        }
        if (/^[0-9]{8}$/.test(clean)) {
          const day = parseInt(clean.slice(0, 2), 10);
          const month = parseInt(clean.slice(2, 4), 10);
          const year = parseInt(clean.slice(4, 8), 10);
          const curYear = new Date().getFullYear();
          if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= curYear) {
            return { year, month, day };
          }
        }
        return null;
      }

      function calculateAgeFromBirthDate(input) {
        const parts = parseBirthDateParts(input);
        if (!parts) return null;
        const today = new Date();
        const cYear = today.getFullYear();
        const cMonth = today.getMonth() + 1;
        const cDay = today.getDate();
        let age = cYear - parts.year;
        if (cMonth < parts.month || (cMonth === parts.month && cDay < parts.day)) {
          age--;
        }
        if (age >= 0 && age <= 120) {
          return age;
        }
        return null;
      }

      function formatBirthDateToISO(input) {
        const parts = parseBirthDateParts(input);
        if (!parts) return input;
        const y = String(parts.year).padStart(4, '0');
        const m = String(parts.month).padStart(2, '0');
        const d = String(parts.day).padStart(2, '0');
        return y + '-' + m + '-' + d;
      }

      function formatBirthDateToDisplay(input) {
        const parts = parseBirthDateParts(input);
        if (!parts) return input;
        const d = String(parts.day).padStart(2, '0');
        const m = String(parts.month).padStart(2, '0');
        const y = String(parts.year).padStart(4, '0');
        return d + '/' + m + '/' + y;
      }

      // Birthday change: auto-calculate Age in real time from typed or selected date
      const handleBirthDateInputChange = (rawVal) => {
        let val = rawVal;
        const onlyDigits = val.replace(/[^0-9]/g, '');
        if (/^[0-9]{8}$/.test(onlyDigits) && !val.includes('/') && !val.includes('-')) {
          val = onlyDigits.slice(0, 2) + '/' + onlyDigits.slice(2, 4) + '/' + onlyDigits.slice(4, 8);
        }
        setNewClientBirthDateDisplay(val);
        if (!val.trim()) {
          setNewClientBirthDate('');
          setNewClientAge('');
          return;
        }
        const calculatedAge = calculateAgeFromBirthDate(val);
        if (calculatedAge !== null) {
          setNewClientAge(String(calculatedAge));
          setNewClientBirthDate(formatBirthDateToISO(val));
          if (stepError) setStepError('');
        } else {
          const iso = formatBirthDateToISO(val);
          setNewClientBirthDate(iso || val);
        }
      };

      const handleCalendarDateChange = (isoDate) => {
        if (!isoDate) {
          setNewClientBirthDate('');
          setNewClientBirthDateDisplay('');
          setNewClientAge('');
          return;
        }
        setNewClientBirthDate(isoDate);
        setNewClientBirthDateDisplay(formatBirthDateToDisplay(isoDate));
        const calculatedAge = calculateAgeFromBirthDate(isoDate);
        if (calculatedAge !== null) {
          setNewClientAge(String(calculatedAge));
          if (stepError) setStepError('');
        }
      };

      const BIRTH_DECADES = [
        { start: 2010, label: '2010+', years: [2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010] },
        { start: 2000, label: '2000s', years: [2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000] },
        { start: 1990, label: '90s',   years: [1999, 1998, 1997, 1996, 1995, 1994, 1993, 1992, 1991, 1990] },
        { start: 1980, label: '80s',   years: [1989, 1988, 1987, 1986, 1985, 1984, 1983, 1982, 1981, 1980] },
        { start: 1970, label: '70s',   years: [1979, 1978, 1977, 1976, 1975, 1974, 1973, 1972, 1971, 1970] },
        { start: 1960, label: '60s',   years: [1969, 1968, 1967, 1966, 1965, 1964, 1963, 1962, 1961, 1960] },
        { start: 1950, label: '50s',   years: [1959, 1958, 1957, 1956, 1955, 1954, 1953, 1952, 1951, 1950] },
        { start: 1940, label: '40s',   years: [1949, 1948, 1947, 1946, 1945, 1944, 1943, 1942, 1941, 1940] }
      ];

      const BIRTH_MONTHS = [
        { num: 1, short: '01 · Ene' },
        { num: 2, short: '02 · Feb' },
        { num: 3, short: '03 · Mar' },
        { num: 4, short: '04 · Abr' },
        { num: 5, short: '05 · May' },
        { num: 6, short: '06 · Jun' },
        { num: 7, short: '07 · Jul' },
        { num: 8, short: '08 · Ago' },
        { num: 9, short: '09 · Sep' },
        { num: 10, short: '10 · Oct' },
        { num: 11, short: '11 · Nov' },
        { num: 12, short: '12 · Dic' }
      ];

      const getDaysInBirthMonth = (year, month) => {
        if (!month) return 31;
        return new Date(year || 2000, month, 0).getDate();
      };

      const openBirthPicker = (targetArg) => {
        const resolvedTarget = typeof targetArg === 'number' ? targetArg : 'primary';
        setBirthPickerTarget(resolvedTarget);
        const sourceValue = resolvedTarget === 'primary'
          ? (newClientBirthDate || newClientBirthDateDisplay)
          : ((activeGroupCompanions[resolvedTarget]?.birthDate) || (activeGroupCompanions[resolvedTarget]?.birthDateDisplay) || '');
        const parts = parseBirthDateParts(sourceValue);
        if (parts) {
          setPickerYear(parts.year);
          setPickerMonth(parts.month);
          setPickerDay(parts.day);
          const matchedDecade = BIRTH_DECADES.find((d) => parts.year >= d.start && parts.year <= d.start + 9);
          setPickerDecade(matchedDecade ? matchedDecade.start : 1990);
        } else {
          setPickerDecade(1990);
          setPickerYear(null);
          setPickerMonth(null);
          setPickerDay(null);
        }
        setIsBirthPickerOpen(true);
      };

      const applyBirthPickerParts = (y, m, d) => {
        const maxDay = getDaysInBirthMonth(y, m);
        const safeDay = d !== null && d > maxDay ? maxDay : d;
        setPickerYear(y);
        setPickerMonth(m);
        setPickerDay(safeDay);
        if (y !== null && m !== null && safeDay !== null) {
          const iso = String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0') + '-' + String(safeDay).padStart(2, '0');
          if (typeof birthPickerTarget === 'number') {
            const calcAge = calculateAgeFromBirthDate(iso);
            const disp = formatBirthDateToDisplay(iso);
            setGroupCompanions((prev) =>
              resizeGroupCompanions(prev, Math.max(birthPickerTarget + 1, requiredCompanionsCount)).map((item, idx) =>
                idx === birthPickerTarget
                  ? { ...item, birthDate: iso, birthDateDisplay: disp, age: calcAge !== null ? String(calcAge) : item.age }
                  : item
              )
            );
            if (companionError) setCompanionError('');
          } else {
            handleCalendarDateChange(iso);
          }
        }
      };

      const handleClearBirthPicker = () => {
        setPickerYear(null);
        setPickerMonth(null);
        setPickerDay(null);
        if (typeof birthPickerTarget === 'number') {
          setGroupCompanions((prev) =>
            resizeGroupCompanions(prev, Math.max(birthPickerTarget + 1, requiredCompanionsCount)).map((item, idx) =>
              idx === birthPickerTarget
                ? { ...item, birthDate: '', birthDateDisplay: '', age: '' }
                : item
            )
          );
        } else {
          setNewClientBirthDate('');
          setNewClientBirthDateDisplay('');
          setNewClientAge('');
        }
      };

      const updateCompanionField = (idx, patch) => {
        setGroupCompanions((prev) =>
          resizeGroupCompanions(prev, Math.max(idx + 1, requiredCompanionsCount)).map((item, i) =>
            i === idx ? { ...item, ...patch } : item
          )
        );
        if (companionError) setCompanionError('');
      };

      const handleCompanionBirthInput = (idx, rawVal) => {
        let val = rawVal;
        const onlyDigits = val.replace(/[^0-9]/g, '');
        if (/^[0-9]{8}$/.test(onlyDigits) && !val.includes('/') && !val.includes('-')) {
          val = onlyDigits.slice(0, 2) + '/' + onlyDigits.slice(2, 4) + '/' + onlyDigits.slice(4, 8);
        }
        if (!val.trim()) {
          updateCompanionField(idx, { birthDateDisplay: '', birthDate: '', age: '' });
          return;
        }
        const calcAge = calculateAgeFromBirthDate(val);
        if (calcAge !== null) {
          updateCompanionField(idx, {
            birthDateDisplay: val,
            birthDate: formatBirthDateToISO(val),
            age: String(calcAge)
          });
        } else {
          updateCompanionField(idx, {
            birthDateDisplay: val,
            birthDate: '',
            age: ''
          });
        }
      };

      const handleAgeChange = (val) => {
        setNewClientAge(val);
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0 && num < 120 && !newClientBirthDateDisplay) {
          const approxYear = new Date().getFullYear() - num;
          setNewClientBirthDate(approxYear + '-01-01');
          setNewClientBirthDateDisplay('01/01/' + approxYear);
        }
      };

      executeScanRef.current = executeScan;
      scanStatusRef.current = scanStatus;
      hasEscapeClosableModalRef.current = Boolean(
        showNewMemberModal ||
        showVisitModal ||
        showDirectAccessModal ||
        showGroupCompanionsModal ||
        isBirthPickerOpen ||
        showBiometricDashboard ||
        showHistoryModal ||
        showConfigModal
      );
      isModalBlockingScanRef.current = Boolean(
        hasEscapeClosableModalRef.current ||
        verifiedClient ||
        scanStatus === 'scanning'
      );

      const handleDirectAccessSubmit = (explicitId) => {
        const targetQuery = String(explicitId !== undefined ? explicitId : searchQuery).trim();
        if (targetQuery) {
          setDirectAccessError('');
          setSearchQuery('');
          setShowDirectAccessModal(false);
          executeScan(targetQuery);
          return;
        }
        const pool = Array.isArray(members) ? members : [];
        if (pool.length === 0) {
          setDirectAccessError('No hay socios registrados en el sistema todavía.');
          return;
        }
        const activePool = pool.filter((m) => m && (!m.membership || m.membership.status !== 'expired'));
        const candidates = activePool.length > 0 ? activePool : pool;
        const withoutLast = candidates.length > 1 && lastRandomScanIdRef.current
          ? candidates.filter((m) => m.id !== lastRandomScanIdRef.current)
          : candidates;
        const pickFrom = withoutLast.length > 0 ? withoutLast : candidates;
        const chosen = pickFrom[Math.floor(Math.random() * pickFrom.length)];
        if (chosen && chosen.id) {
          lastRandomScanIdRef.current = chosen.id;
          setDirectAccessError('');
          setSearchQuery('');
          setShowDirectAccessModal(false);
          executeScan(chosen.id);
        }
      };

      // Clear buffered wedge keys whenever any modal opens or closes
      useEffect(() => {
        keyBufferRef.current = '';
        lastKeyTimeRef.current = 0;
      }, [
        showNewMemberModal,
        showVisitModal,
        showDirectAccessModal,
        showGroupCompanionsModal,
        isBirthPickerOpen,
        showBiometricDashboard,
        showHistoryModal,
        showConfigModal,
      ]);

      // Global Hardware Barcode / RFID Keyboard Wedge Listener (hardware burst speed only, idle screen only)
      useEffect(() => {
        const clearKeyBuffer = () => {
          keyBufferRef.current = '';
          lastKeyTimeRef.current = 0;
        };

        const handleKeyDown = (e) => {
          if (e.key === 'Escape') {
            clearKeyBuffer();
            if (hasEscapeClosableModalRef.current) {
              setShowNewMemberModal(false);
              setShowVisitModal(false);
              setShowDirectAccessModal(false);
              setShowConfigModal(false);
              setShowHistoryModal(false);
              setShowGroupCompanionsModal(false);
              setIsBirthPickerOpen(false);
              setShowBiometricDashboard(false);
              setDirectAccessError('');
              setSearchQuery('');
              return;
            }
            exitFullscreen();
            return;
          }
          if (e.key === 'F2' && !isModalBlockingScanRef.current) { setShowConfigModal(true); return; }
          if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isModalBlockingScanRef.current) {
            clearKeyBuffer();
            return;
          }
          const target = e.target;
          if (
            target &&
            (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'BUTTON', 'A'].includes(target.tagName) ||
              target.isContentEditable ||
              (typeof target.closest === 'function' && target.closest('button, a, [role="button"], input, textarea, select')))
          ) {
            clearKeyBuffer();
            return;
          }
          if (e.key === 'Shift' || e.key === 'CapsLock') return;

          const now = Date.now();
          if (now - lastKeyTimeRef.current > 80) {
            keyBufferRef.current = '';
          }
          lastKeyTimeRef.current = now;

          if (e.key === 'Enter') {
            const scanned = keyBufferRef.current.trim();
            clearKeyBuffer();
            if (scanned.length >= 3 && /[a-zA-Z0-9]/.test(scanned) && scanStatusRef.current !== 'scanning') {
              executeScanRef.current(scanned);
            }
          } else if (e.key.length === 1 && e.key !== ' ') {
            keyBufferRef.current += e.key;
          } else {
            clearKeyBuffer();
          }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }, []);

      // Synchronize Fullscreen state on ESC, Electron IPC or browser toggle
      useEffect(() => {
        const handleFsChange = () => {
          setIsFullScreen(Boolean(document.fullscreenElement || document.webkitFullscreenElement));
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('webkitfullscreenchange', handleFsChange);

        let removeElectronListener;
        if (window.electronAPI?.onFullscreenChange) {
          removeElectronListener = window.electronAPI.onFullscreenChange((isFull) => {
            setIsFullScreen(Boolean(isFull));
          });
        }
        if (window.electronAPI?.isFullScreen) {
          window.electronAPI.isFullScreen().then((isFull) => {
            setIsFullScreen(Boolean(isFull));
          }).catch(() => {});
        }

        return () => {
          document.removeEventListener('fullscreenchange', handleFsChange);
          document.removeEventListener('webkitfullscreenchange', handleFsChange);
          if (removeElectronListener) removeElectronListener();
        };
      }, []);

      const exitFullscreen = () => {
        if (window.electronAPI?.exitFullScreen) {
          window.electronAPI.exitFullScreen();
        }
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullScreen(false);
      };

      const toggleFullscreen = () => {
        if (isFullScreen) {
          exitFullscreen();
          return;
        }
        if (window.electronAPI?.toggleFullScreen) {
          window.electronAPI.toggleFullScreen();
          setIsFullScreen(true);
          return;
        }
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
          setIsFullScreen(true);
        } else {
          exitFullscreen();
        }
      };

      const selectedBg = currentBgIndex === 0 ? BG_PHOTO_1 : (currentBgIndex === 1 ? BG_PHOTO_2 : BG_PHOTO_3);

      return (
        <div onDoubleClick={(e) => { if (e.target === e.currentTarget) setShowConfigModal(true); }} className="relative min-h-screen h-screen w-full overflow-y-auto bg-black text-[#F4F4F6] flex flex-col justify-between items-center p-3 sm:p-4 lg:p-6">

          {/* BOTÓN PANTALLA COMPLETA (Aparece al pasar el ratón por la esquina superior derecha) */}
          {!isFullScreen && (
            <div className="fixed top-2 right-3 z-40 flex items-center gap-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={toggleBackground}
                className="px-3.5 py-2 rounded-2xl bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/20 text-white font-bold text-xs flex items-center gap-2 shadow-2xl transition-all cursor-pointer select-none"
                title="Cambiar Foto de Fondo"
              >
                <span>🖼️</span>
                <span className="hidden sm:inline">CAMBIAR FONDO</span>
              </button>
              <button
                onClick={toggleFullscreen}
                className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black text-xs flex items-center gap-2 shadow-2xl shadow-amber-500/40 transition-all cursor-pointer select-none"
                title="Activar Pantalla Completa (Presiona ESC para salir)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
                <span>PANTALLA COMPLETA</span>
              </button>
            </div>
          )}

          {/* 100% COVER REAL GYM PHOTO BACKGROUND */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#07090d]">
            <img 
              src={selectedBg}
              alt="Fondo Gym Legends" 
              style={{ objectPosition: "center center" }} 
              className={currentBgIndex === 0 ? "w-full h-full object-fill" : "w-full h-full object-cover"}
            />
          </div>

          {/* TURNSTILE PASS ACTIVE BANNER */}
          {relaySeconds > 0 && (
            <div className="w-full max-w-4xl mx-auto z-20 shrink-0">
              <div className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500/40 via-emerald-500/60 to-emerald-500/40 border border-emerald-400 shadow-glow-green text-center animate-pulse">
                <div className="flex items-center justify-center gap-3 text-emerald-100 font-black text-base sm:text-lg uppercase tracking-wider">
                  <span>🔓 PASO LIBRE CONCEDIDO (TORNIQUETE ABIERTO)</span>
                  <span className="bg-emerald-500 text-white px-3 py-0.5 rounded-full font-mono text-sm font-black shadow-md">
                    {relaySeconds}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ACCESS FEEDBACK BANNER WHEN SCANNING */}
          {verifiedClient && (
            <div className="w-full max-w-4xl mx-auto z-20 shrink-0">
              <div className={"px-5 py-3.5 rounded-[24px] border backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.55)] flex items-center justify-between gap-4 animate-in zoom-in-95 duration-200 " + (
                verifiedClient.status === 'granted'
                  ? 'bg-[#131b18]/95 border-emerald-500/30 text-white'
                  : 'bg-[#1e1316]/95 border-rose-500/30 text-white'
              )}>
                <div className="flex items-center gap-3.5">
                  <div className={"w-11 h-11 rounded-full flex items-center justify-center text-xl font-semibold shrink-0 " + (
                    verifiedClient.status === 'granted' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  )}>
                    {verifiedClient.status === 'granted' ? '✓' : '✗'}
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                      {verifiedClient.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-300">
                      {verifiedClient.plan} · <span className={verifiedClient.status === 'granted' ? 'text-emerald-300 font-medium' : 'text-rose-300 font-medium'}>{verifiedClient.reason}</span>
                    </p>
                    {verifiedClient.status === 'granted' && currentQuote && (
                      <p className="text-xs text-amber-300/90 italic mt-0.5">"{currentQuote}"</p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setVerifiedClient(null)}
                  className="px-4 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-xs font-medium text-white transition-colors shrink-0 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {/* Las 3 Tarjetas Interactivas ubicadas exactamente según la referencia de diseño */}
          <main 
            style={{
              position: 'fixed',
              top: '39.41%',
              left: '18.46%',
              width: '65.23%',
              height: '24.31%',
              zIndex: 10,
            }}
          >
            <div className="grid grid-cols-3 gap-3.5 sm:gap-5 lg:gap-6 w-full h-full">

              {/* Opción 1: CLIENTE NUEVO */}
              <div 
                onClick={() => { setNewMemberStep(1); setStepError(''); setShowNewMemberModal(true); }}
                className="group relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden border-2 border-amber-400/75 hover:border-amber-400 transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] flex flex-col justify-end p-2 sm:p-2.5 lg:p-3 cursor-pointer transform hover:-translate-y-1 select-none"
              >
                <img 
                  src={IMG_CARD_NUEVO} 
                  alt="Cliente Nuevo Gym" 
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />

                <div className="relative z-10 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-[#090a0f]/92 backdrop-blur-sm border border-zinc-700/75 shadow-lg group-hover:border-amber-400/50 transition-colors">
                  <h3 className="text-xs sm:text-sm lg:text-[15px] font-black text-white uppercase tracking-wider leading-tight group-hover:text-amber-300 transition-colors">
                    CLIENTE NUEVO
                  </h3>
                  <div className="mt-1 flex items-center">
                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                      Registrarme &rarr;
                    </span>
                  </div>
                </div>
              </div>

              {/* Opción 2: QUIERO VISITA */}
              <div 
                onClick={() => setShowVisitModal(true)}
                className="group relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden border-2 border-emerald-400/75 hover:border-emerald-400 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] flex flex-col justify-end p-2 sm:p-2.5 lg:p-3 cursor-pointer transform hover:-translate-y-1 select-none"
              >
                <img 
                  src={IMG_CARD_VISITA} 
                  alt="Pase de Visita Gym" 
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />

                <div className="relative z-10 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-[#090a0f]/92 backdrop-blur-sm border border-zinc-700/75 shadow-lg group-hover:border-emerald-400/50 transition-colors">
                  <h3 className="text-xs sm:text-sm lg:text-[15px] font-black text-white uppercase tracking-wider leading-tight group-hover:text-emerald-300 transition-colors">
                    QUIERO VISITA
                  </h3>
                  <div className="mt-1 flex items-center">
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center gap-1">
                      Pase de Visita &rarr;
                    </span>
                  </div>
                </div>
              </div>

              {/* Opción 3: YA TENGO MEMBRESÍA (ACCESO DIRECTO) */}
              <div 
                onClick={() => {
                  setSearchQuery('');
                  setDirectAccessError('');
                  setShowDirectAccessModal(true);
                }}
                className="group relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden border-2 border-amber-400/75 hover:border-amber-400 transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_40px_rgba(245,158,11,0.5)] flex flex-col justify-end p-2 sm:p-2.5 lg:p-3 cursor-pointer transform hover:-translate-y-1 select-none"
              >
                <img 
                  src={IMG_CARD_HUELLA} 
                  alt="Lector Biométrico de Huella Gym" 
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent pointer-events-none" />

                <div className="relative z-10 p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl bg-[#090a0f]/92 backdrop-blur-sm border border-zinc-700/75 shadow-lg group-hover:border-amber-400/50 transition-colors">
                  <h3 className="text-xs sm:text-sm lg:text-[15px] font-black text-white uppercase tracking-wider leading-tight group-hover:text-amber-300 transition-colors">
                    YA TENGO MEMBRESÍA
                  </h3>
                  <div className="mt-1 flex items-center">
                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 group-hover:text-amber-300 flex items-center gap-1">
                      Validar Huella &rarr;
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </main>

          {/* MODAL 1: REGISTRO CLIENTE NUEVO - MATERIAL 3 */}
          {showNewMemberModal && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              <div
                className="relative bg-[#12161f]/95 backdrop-blur-2xl border border-white/10 rounded-[28px] max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.75)] animate-in zoom-in-95 duration-200 my-auto"
                style={{ fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
              >
                {/* Subtle ambient texture */}
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[28px]">
                  <img 
                    src={IMG_MODAL_BG} onError={(e) => { e.currentTarget.src = './modal-gym-bg.jpg'; }} alt="Fondo Mancuernas Fitness" 
                    className="w-full h-full object-cover object-bottom opacity-20 select-none pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#12161f]/90 via-[#12161f]/85 to-[#0e1118]/95 pointer-events-none" />
                  <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-400/70 to-transparent pointer-events-none" />
                </div>
                
                {/* Header fijo con botón Atrás */}
                <div className="relative z-10 border-b border-white/[0.08] px-5 sm:px-6 pt-4 sm:pt-5 pb-3 shrink-0">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          setStepError('');
                          if (newMemberStep > 1) {
                            setNewMemberStep(newMemberStep - 1);
                          } else {
                            setShowNewMemberModal(false);
                            setNewMemberStep(1);
                          }
                        }}
                        className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                        title={newMemberStep > 1 ? 'Regresar al paso anterior' : 'Volver a la pantalla principal'}
                      >
                        <span className="text-amber-300">←</span>
                        <span>Atrás</span>
                      </button>
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight leading-tight truncate">
                          Registro de cliente nuevo
                        </h3>
                        <p className="text-[11px] sm:text-xs text-zinc-400 font-normal truncate">
                          {newMemberStep === 1 ? 'Datos personales del socio' : newMemberStep === 2 ? 'Selecciona mensualidad o plan' : 'Registro de huella digital'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewMemberModal(false);
                        setNewMemberStep(1);
                        setStepError('');
                      }}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                      title="Cancelar"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Progress Steps Indicators */}
                  <div className="grid grid-cols-3 gap-2.5 mt-3">
                    <button
                      type="button"
                      disabled={newMemberStep <= 1}
                      onClick={() => {
                        if (newMemberStep > 1) {
                          setStepError('');
                          setNewMemberStep(1);
                        }
                      }}
                      className={"flex flex-col gap-1 text-left " + (newMemberStep > 1 ? 'cursor-pointer' : 'cursor-default')}
                    >
                      <div className={"h-1 w-full rounded-full " + (newMemberStep >= 1 ? 'bg-amber-400' : 'bg-white/10')} />
                      <span className={"text-[11px] font-medium text-center w-full " + (newMemberStep === 1 ? 'text-amber-300' : 'text-zinc-400')}>1. Datos</span>
                    </button>
                    <button
                      type="button"
                      disabled={newMemberStep <= 2}
                      onClick={() => {
                        if (newMemberStep > 2) {
                          setStepError('');
                          setNewMemberStep(2);
                        }
                      }}
                      className={"flex flex-col gap-1 text-left " + (newMemberStep > 2 ? 'cursor-pointer' : 'cursor-default')}
                    >
                      <div className={"h-1 w-full rounded-full " + (newMemberStep >= 2 ? 'bg-amber-400' : 'bg-white/10')} />
                      <span className={"text-[11px] font-medium text-center w-full " + (newMemberStep === 2 ? 'text-amber-300' : 'text-zinc-400')}>2. Plan</span>
                    </button>
                    <div className="flex flex-col gap-1">
                      <div className={"h-1 w-full rounded-full " + (newMemberStep >= 3 ? 'bg-amber-400' : 'bg-white/10')} />
                      <span className={"text-[11px] font-medium text-center " + (newMemberStep === 3 ? 'text-amber-300' : 'text-zinc-400')}>3. Huella</span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleRegisterNewMember} className="relative z-10 flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 pt-3.5 pb-5 space-y-3.5">
                  
                  {/* PASO 1: DATOS PERSONALES */}
                  {newMemberStep === 1 && (
                    <div className="space-y-3.5 animate-in fade-in-50 duration-200">
                      <div>
                        <label className="text-xs font-medium text-zinc-300 block mb-1.5 flex items-center gap-1.5">
                          <span>Nombre completo *</span>
                        </label>
                        <input 
                          type="text"
                          required
                          autoFocus
                          value={newClientName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewClientName(val);
                            if (stepError) setStepError('');
                            if (!genderManuallySelected && val.trim()) {
                              setNewClientGender(detectGender(val));
                            }
                          }}
                          placeholder="Ej. Andrea García Morales"
                          className="w-full px-4 py-2.5 bg-[#1b202b] border border-white/15 rounded-2xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                        />
                      </div>

                      {/* Género */}
                      <div>
                        <label className="text-xs font-medium text-zinc-300 block mb-1.5 flex items-center justify-between">
                          <span>Género *</span>
                          <span className="text-[11px] text-zinc-400">Toca para seleccionar</span>
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setNewClientGender('female');
                              setGenderManuallySelected(true);
                            }}
                            className={"flex items-center gap-2.5 py-2 px-3.5 rounded-2xl font-medium text-sm transition-all border cursor-pointer " + (
                              newClientGender === 'female'
                                ? 'bg-pink-500/15 border-pink-400/70 text-white ring-1 ring-pink-400/30'
                                : 'bg-[#1b202b] border-white/10 text-zinc-300 hover:text-white hover:bg-[#222836]'
                            )}
                          >
                            <img src={IMG_AVATAR_FEMALE} alt="Mujer" className="w-8 h-8 rounded-full object-contain bg-white p-0.5 shrink-0" />
                            <span>Mujer</span>
                            {newClientGender === 'female' && (
                              <span className="w-2 h-2 rounded-full bg-pink-400 ml-auto" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setNewClientGender('male');
                              setGenderManuallySelected(true);
                            }}
                            className={"flex items-center gap-2.5 py-2 px-3.5 rounded-2xl font-medium text-sm transition-all border cursor-pointer " + (
                              newClientGender === 'male'
                                ? 'bg-blue-500/15 border-blue-400/70 text-white ring-1 ring-blue-400/30'
                                : 'bg-[#1b202b] border-white/10 text-zinc-300 hover:text-white hover:bg-[#222836]'
                            )}
                          >
                            <img src={IMG_AVATAR_MALE} alt="Hombre" className="w-8 h-8 rounded-full object-contain bg-white p-0.5 shrink-0" />
                            <span>Hombre</span>
                            {newClientGender === 'male' && (
                              <span className="w-2 h-2 rounded-full bg-blue-400 ml-auto" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Fecha de Cumpleaños y Edad */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-zinc-300 block mb-1.5 flex items-center justify-between">
                            <span>Fecha de cumpleaños *</span>
                            <span className="text-[11px] text-zinc-400">dd/mm/aaaa</span>
                          </label>
                          <div className="relative flex items-center bg-[#1b202b] border border-white/15 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 rounded-2xl transition-colors">
                            <input 
                              type="text"
                              required
                              value={newClientBirthDateDisplay}
                              onChange={(e) => {
                                handleBirthDateInputChange(e.target.value);
                                if (stepError) setStepError('');
                              }}
                              placeholder="dd/mm/aaaa"
                              maxLength={10}
                              className="w-full min-w-0 pl-4 pr-2 py-2.5 bg-transparent text-sm font-medium text-white placeholder-zinc-500 focus:outline-none font-mono"
                            />
                            <button
                              type="button"
                              onClick={openBirthPicker}
                              title="Desplegar números para elegir fecha sin escribir"
                              className="shrink-0 mr-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-amber-300 hover:text-amber-200 text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <span>📅</span>
                              <span>Elegir</span>
                              <span className="text-[10px]">▾</span>
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-zinc-300 block mb-1.5 flex items-center justify-between">
                            <span>Edad *</span>
                            {newClientAge ? (
                              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                                ✓ Calculada ({newClientAge} años)
                              </span>
                            ) : (
                              <span className="text-[11px] text-amber-400 font-medium">(Automática)</span>
                            )}
                          </label>
                          <div className="relative">
                            <input 
                              type="number"
                              required
                              min="8"
                              max="110"
                              value={newClientAge}
                              onChange={(e) => {
                                handleAgeChange(e.target.value);
                                if (stepError) setStepError('');
                              }}
                              placeholder="Ej. 25"
                              className={"w-full px-4 py-2.5 bg-[#1b202b] border rounded-2xl text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all pr-16 tabular-nums " + (newClientAge ? "border-emerald-500/45 text-emerald-300" : "border-white/15")}
                            />
                            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-300 font-medium bg-white/[0.07] px-2.5 py-0.5 rounded-full pointer-events-none">
                              años
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Correo y Teléfono */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                            Correo (Opcional)
                          </label>
                          <input 
                            type="email"
                            value={newClientEmail}
                            onChange={(e) => setNewClientEmail(e.target.value)}
                            placeholder="andrea@ejemplo.com"
                            className="w-full px-4 py-2.5 bg-[#1b202b] border border-white/15 rounded-2xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                            Teléfono / WhatsApp
                          </label>
                          <input 
                            type="tel"
                            value={newClientPhone}
                            onChange={(e) => setNewClientPhone(e.target.value)}
                            placeholder="Ej. 8888-9999"
                            className="w-full px-4 py-2.5 bg-[#1b202b] border border-white/15 rounded-2xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all"
                          />
                        </div>
                      </div>

                      {stepError && (
                        <div className="px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-center gap-2">
                          <span>⚠️</span>
                          <span>{stepError}</span>
                        </div>
                      )}

                      {/* Botones Paso 1 */}
                      <div className="pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewMemberModal(false);
                            setNewMemberStep(1);
                            setStepError('');
                          }}
                          className="flex-1 py-2.5 px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-sm font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep1}
                          className="flex-1 py-2.5 px-5 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-sm font-semibold text-[#1a1200] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span>Continuar (Paso 2/3)</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASO 2: MENSUALIDAD / PLAN */}
                  {newMemberStep === 2 && (
                    <div className="space-y-3.5 animate-in fade-in-50 duration-200">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                          <span>Mensualidad o plan *</span>
                        </label>
                        <span className="text-[11px] text-zinc-400">Toca para seleccionar</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[210px] overflow-y-auto pr-1">
                        {availablePlans.map((plan) => {
                          const isSelected = newClientPlan === plan.name;
                          const planSize = getGroupPackageSize(plan.name, plan.type);
                          return (
                            <div
                              key={plan.id}
                              onClick={() => {
                                setNewClientPlan(plan.name);
                                const nextReq = Math.max(0, planSize - 1);
                                setGroupCompanions((prev) => resizeGroupCompanions(prev, nextReq));
                                if (stepError) setStepError('');
                              }}
                              className={"p-2.5 rounded-2xl border cursor-pointer flex flex-col justify-between " + (
                                isSelected
                                  ? 'bg-amber-500/15 border-amber-400/75 ring-1 ring-amber-400/30'
                                  : 'bg-[#1b202b] border-white/10 hover:border-white/20 hover:bg-[#222836]'
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={"text-xs font-semibold leading-tight " + (isSelected ? 'text-amber-200' : 'text-white')}>
                                  {plan.name}
                                </span>
                                {isSelected ? (
                                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shrink-0 border-2 border-amber-200" />
                                ) : (
                                  <span className="w-3.5 h-3.5 rounded-full border border-zinc-500 shrink-0" />
                                )}
                              </div>
                              <div className="mt-2 flex items-baseline justify-between gap-1.5 flex-wrap">
                                <span className={"text-base font-semibold tabular-nums " + (isSelected ? 'text-amber-300' : 'text-amber-400')}>
                                  {'$' + plan.price.toLocaleString('es-MX')}
                                </span>
                                <div className="flex items-center gap-1">
                                  {planSize > 1 && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-400/30">
                                      {'👥 ' + planSize + ' personas'}
                                    </span>
                                  )}
                                  <span className={"text-[11px] font-medium px-2 py-0.5 rounded-full " + (
                                    isSelected 
                                      ? 'text-amber-200 bg-amber-500/20' 
                                      : 'text-zinc-300 bg-white/[0.06]'
                                  )}>
                                    {plan.durationDays} días
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {activeGroupSize > 1 && (
                        <div className={"p-3 rounded-2xl border space-y-2 " + (
                          allGroupCompanionsReady
                            ? 'bg-[#15221d] border-emerald-500/35'
                            : 'bg-amber-500/10 border-amber-400/40'
                        )}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white leading-tight">
                                {allGroupCompanionsReady
                                  ? ('✓ ' + activeGroupSize + ' integrantes registrados')
                                  : ('👥 Requiere registrar ' + requiredCompanionsCount + ' acompañantes más')}
                              </p>
                              <p className="text-[11px] text-zinc-300 leading-tight mt-0.5">
                                {allGroupCompanionsReady
                                  ? 'Todos quedaron listos sin volver atrás.'
                                  : ('Titular ya listo (' + (1 + completedCompanionsCount) + '/' + activeGroupSize + '). Agrégalos rápido antes de continuar.')}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setGroupCompanions(resizeGroupCompanions(groupCompanions, requiredCompanionsCount));
                                const firstInc = activeGroupCompanions.findIndex(c => !isGroupCompanionComplete(c));
                                setActiveCompanionIdx(firstInc >= 0 ? firstInc : 0);
                                setCompanionError('');
                                setShowGroupCompanionsModal(true);
                              }}
                              className={"px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer whitespace-nowrap shrink-0 " + (
                                allGroupCompanionsReady
                                  ? 'bg-white/[0.08] hover:bg-white/[0.15] text-emerald-300 border border-emerald-500/30'
                                  : 'bg-amber-400 hover:bg-amber-300 text-[#1a1200]'
                              )}
                            >
                              {allGroupCompanionsReady
                                ? 'Ver / Editar grupo →'
                                : ('Registrar ' + (requiredCompanionsCount - completedCompanionsCount) + ' ahora →')}
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 capitalize">
                              {'✓ 1. ' + ((newClientName || 'Titular').trim().split(' ')[0])}
                            </span>
                            {activeGroupCompanions.map((comp, cIdx) => {
                              const done = isGroupCompanionComplete(comp);
                              return (
                                <button
                                  key={cIdx}
                                  type="button"
                                  onClick={() => {
                                    setActiveCompanionIdx(cIdx);
                                    setCompanionError('');
                                    setShowGroupCompanionsModal(true);
                                  }}
                                  className={"text-[10px] font-medium px-2 py-0.5 rounded-full border cursor-pointer capitalize " + (
                                    done
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      : 'bg-[#1b202b] text-zinc-400 border-white/10 hover:text-white'
                                  )}
                                >
                                  {done ? ('✓ ' + (cIdx + 2) + '. ' + comp.fullName.trim().split(' ')[0]) : ((cIdx + 2) + '. Falta registrar')}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="bg-[#1b202b] border border-white/10 px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs">
                        <span className="text-zinc-400 font-medium">Plan seleccionado</span>
                        <span className="font-semibold text-amber-300 flex items-center gap-1.5 tabular-nums">
                          <span>{newClientPlan}</span>
                          <span className="text-zinc-400 font-normal">
                            {'($' + (availablePlans.find(p => p.name === newClientPlan)?.price.toLocaleString('es-MX') || 420) + ' MXN)'}
                          </span>
                        </span>
                      </div>

                      {stepError && (
                        <div className="px-3.5 py-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium flex items-center gap-2">
                          <span>⚠️</span>
                          <span>{stepError}</span>
                        </div>
                      )}

                      {/* Botones Paso 2 */}
                      <div className="pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setStepError('');
                            setNewMemberStep(1);
                          }}
                          className="flex-1 py-2.5 px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-sm font-medium text-zinc-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>←</span>
                          <span>Volver (Paso 1/3)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleNextStep2}
                          className="flex-1 py-2.5 px-5 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-sm font-semibold text-[#1a1200] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span>
                            {requiredCompanionsCount > 0 && !allGroupCompanionsReady
                              ? ('Registrar ' + (requiredCompanionsCount - completedCompanionsCount) + ' acompañantes')
                              : 'Continuar (Paso 3/3)'}
                          </span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASO 3: OPCIÓN DE PAGO & HUELLA */}
                  {newMemberStep === 3 && (
                    <div className="space-y-3.5 animate-in fade-in-50 duration-200">
                      {/* Resumen Material */}
                      <div className="bg-[#1b202b] border border-white/10 p-3.5 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={"w-10 h-10 rounded-full flex items-center justify-center text-lg " + (
                              newClientGender === 'female' ? 'bg-pink-500/15 text-pink-300 border border-pink-400/30' : 'bg-blue-500/15 text-blue-300 border border-blue-400/30'
                            )}>
                              {activeGroupSize > 1 ? '👥' : (newClientGender === 'female' ? '👩' : '👨')}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {activeGroupSize > 1 ? (newClientName + ' (+' + requiredCompanionsCount + ')') : newClientName}
                              </p>
                              <p className="text-xs text-zinc-300">{newClientAge ? (newClientAge + ' años') : ''} {newClientPhone ? ('· ' + newClientPhone) : ''}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-amber-300 block">{newClientPlan}</span>
                            <span className="text-xs text-zinc-400 font-medium tabular-nums">
                              {'$' + (availablePlans.find(p => p.name === newClientPlan)?.price.toLocaleString('es-MX') || 420) + ' MXN'}
                            </span>
                          </div>
                        </div>

                        {activeGroupSize > 1 && (
                          <div className="pt-2 border-t border-white/[0.08] flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 capitalize">
                              {'1. ' + newClientName.trim()}
                            </span>
                            {activeGroupCompanions.map((comp, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-200 border border-white/10 capitalize"
                              >
                                {(idx + 2) + '. ' + comp.fullName.trim()}
                              </span>
                            ))}
                            <button
                              type="button"
                              onClick={() => setShowGroupCompanionsModal(true)}
                              className="ml-auto text-[10px] font-semibold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                            >
                              Editar integrantes
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Fingerprint Capture Dashboard Launcher */}
                      <div 
                        onClick={() => {
                          setBiometricScanState('idle');
                          setShowBiometricDashboard(true);
                        }}
                        className={"p-3.5 rounded-2xl border transition-all cursor-pointer group flex items-center justify-between gap-3 " + (
                          newClientFingerprintEnrolled
                            ? 'bg-[#15221d] border-emerald-500/35'
                            : 'bg-[#1b202b] border-white/10 hover:border-amber-400/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={"w-10 h-10 rounded-full flex items-center justify-center text-lg " + (
                            newClientFingerprintEnrolled 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/35'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                          )}>
                            <span>{newClientFingerprintEnrolled ? '✓' : '⚡'}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs sm:text-sm font-semibold text-white">
                                Escáner de huella
                              </p>
                              <span className={"text-[11px] font-medium px-2.5 py-0.5 rounded-full " + (
                                newClientFingerprintEnrolled
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/15 text-amber-300'
                              )}>
                                {newClientFingerprintEnrolled ? '✓ Enrolada' : 'Obligatorio'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {newClientFingerprintEnrolled 
                                ? ('✓ Huella vinculada (' + selectedFinger + ')') 
                                : 'Haz clic para abrir el escáner óptico'}
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
                          className={"px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer " + (
                            newClientFingerprintEnrolled 
                              ? 'bg-emerald-500 text-[#04140d]' 
                              : 'bg-amber-400 hover:bg-amber-300 text-[#1a1200]'
                          )}
                        >
                          {newClientFingerprintEnrolled ? 'Ver escáner' : 'Abrir escáner'}
                        </button>
                      </div>

                      {/* Botones Paso 3 */}
                      <div className="pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setStepError('');
                            setNewMemberStep(2);
                          }}
                          className="flex-1 py-2.5 px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-sm font-medium text-zinc-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>←</span>
                          <span>Volver (Paso 2/3)</span>
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2.5 px-5 rounded-full bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-sm font-semibold text-[#1a1200] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span>Enviar registro</span>
                        </button>
                      </div>
                    </div>
                  )}

                </form>
              </div>
            </div>
          )}

          {/* MODAL RÁPIDO DE INTEGRANTES PARA PAQUETES GRUPALES (3 o 4 PERSONAS) */}
          {showNewMemberModal && showGroupCompanionsModal && requiredCompanionsCount > 0 && (() => {
            const safeIdx = Math.min(activeCompanionIdx, requiredCompanionsCount - 1);
            const currentComp = activeGroupCompanions[safeIdx] || createEmptyGroupCompanion();
            const nextIncIdx = activeGroupCompanions.findIndex((c, idx) => idx !== safeIdx && !isGroupCompanionComplete(c));
            const totalReady = 1 + completedCompanionsCount;

            const validateCompIdx = (idx) => {
              const t = activeGroupCompanions[idx];
              const label = 'Acompañante ' + (idx + 2);
              if (!t || !String(t.fullName || '').trim()) {
                return 'Ingresa el nombre completo de ' + label;
              }
              if (t.birthDateDisplay && String(t.birthDateDisplay).trim() && !parseBirthDateParts(t.birthDateDisplay)) {
                return 'Fecha de cumpleaños inválida (dd/mm/aaaa) para ' + label;
              }
              const hasB = Boolean(parseBirthDateParts(t.birthDateDisplay || t.birthDate));
              const aNum = Number(t.age);
              if (!hasB && (isNaN(aNum) || aNum < 8 || aNum > 110)) {
                return 'Elige cumpleaños o edad válida para ' + label;
              }
              return null;
            };

            const handleCompanionNextOrDone = () => {
              const err = validateCompIdx(safeIdx);
              if (err) {
                setCompanionError(err);
                return;
              }
              if (nextIncIdx >= 0) {
                setActiveCompanionIdx(nextIncIdx);
                setCompanionError('');
                return;
              }
              for (let i = 0; i < requiredCompanionsCount; i++) {
                const checkErr = validateCompIdx(i);
                if (checkErr) {
                  setActiveCompanionIdx(i);
                  setCompanionError(checkErr);
                  return;
                }
              }
              setCompanionError('');
              setShowGroupCompanionsModal(false);
              setStepError('');
              setNewMemberStep(3);
            };

            return (
              <div
                onClick={() => setShowGroupCompanionsModal(false)}
                className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-[520px] max-h-[94vh] overflow-y-auto bg-[#141822] border border-white/15 rounded-[26px] p-4 sm:p-5 shadow-2xl text-white space-y-3.5 my-auto"
                  style={{ fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
                        👥
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate">
                            Integrantes del paquete
                          </h4>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30 tabular-nums">
                            {totalReady}/{activeGroupSize} listos
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                          {newClientPlan} · Regístralos aquí mismo sin volver atrás
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGroupCompanionsModal(false)}
                      className="w-7 h-7 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white flex items-center justify-center text-xs cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Roster Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    <div className="px-2.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-medium whitespace-nowrap shrink-0 capitalize">
                      {'✓ 1. ' + ((newClientName || 'Titular').trim().split(' ')[0])}
                    </div>
                    {activeGroupCompanions.map((comp, idx) => {
                      const done = isGroupCompanionComplete(comp);
                      const isActive = idx === safeIdx;
                      const labelWord = (comp.fullName || '').trim().split(' ')[0] || ('Persona ' + (idx + 2));
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveCompanionIdx(idx);
                            setCompanionError('');
                          }}
                          className={"px-3 py-1.5 rounded-full text-[11px] font-medium border cursor-pointer whitespace-nowrap shrink-0 capitalize " + (
                            isActive
                              ? 'bg-amber-400 text-[#1a1200] border-amber-300 font-semibold shadow-sm'
                              : done
                                ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/35'
                                : 'bg-[#1b202b] text-zinc-300 border-white/10 hover:text-white'
                          )}
                        >
                          {(done ? '✓ ' : '') + (idx + 2) + '. ' + labelWord}
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Companion Form */}
                  <div className="p-3.5 rounded-2xl bg-[#181c28] border border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-amber-300">
                        {'Datos de Persona ' + (safeIdx + 2) + ' de ' + activeGroupSize}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {isGroupCompanionComplete(currentComp) ? '✓ Datos completos' : 'Campos obligatorios *'}
                      </span>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1">Nombre completo *</label>
                      <input
                        type="text"
                        value={currentComp.fullName}
                        onChange={(e) => {
                          const val = e.target.value;
                          const patch = { fullName: val };
                          if (!currentComp.genderManuallySelected && val.trim()) {
                            patch.gender = detectGender(val);
                          }
                          updateCompanionField(safeIdx, patch);
                        }}
                        placeholder={'Ej. Nombre de la persona ' + (safeIdx + 2)}
                        className="w-full px-3.5 py-2 bg-[#1b202b] border border-white/15 rounded-2xl text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1 flex items-center justify-between">
                        <span>Género *</span>
                        <span className="text-[11px] text-zinc-400">Toca para seleccionar</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => updateCompanionField(safeIdx, { gender: 'female', genderManuallySelected: true })}
                          className={"flex items-center gap-2 py-1.5 px-3 rounded-2xl font-medium text-xs sm:text-sm border cursor-pointer " + (
                            currentComp.gender === 'female'
                              ? 'bg-pink-500/15 border-pink-400/70 text-white ring-1 ring-pink-400/30'
                              : 'bg-[#1b202b] border-white/10 text-zinc-300 hover:text-white'
                          )}
                        >
                          <img src={IMG_AVATAR_FEMALE} alt="Mujer" className="w-7 h-7 rounded-full object-contain bg-white p-0.5 shrink-0" />
                          <span>Mujer</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCompanionField(safeIdx, { gender: 'male', genderManuallySelected: true })}
                          className={"flex items-center gap-2 py-1.5 px-3 rounded-2xl font-medium text-xs sm:text-sm border cursor-pointer " + (
                            currentComp.gender === 'male'
                              ? 'bg-blue-500/15 border-blue-400/70 text-white ring-1 ring-blue-400/30'
                              : 'bg-[#1b202b] border-white/10 text-zinc-300 hover:text-white'
                          )}
                        >
                          <img src={IMG_AVATAR_MALE} alt="Hombre" className="w-7 h-7 rounded-full object-contain bg-white p-0.5 shrink-0" />
                          <span>Hombre</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-medium text-zinc-300 block mb-1 flex items-center justify-between">
                          <span>Cumpleaños *</span>
                          <span className="text-[10px] text-zinc-400">dd/mm/aaaa</span>
                        </label>
                        <div className="relative flex items-center bg-[#1b202b] border border-white/15 focus-within:border-amber-400 rounded-2xl">
                          <input
                            type="text"
                            value={currentComp.birthDateDisplay}
                            onChange={(e) => handleCompanionBirthInput(safeIdx, e.target.value)}
                            placeholder="dd/mm/aaaa"
                            maxLength={10}
                            className="w-full min-w-0 pl-3 pr-1.5 py-2 bg-transparent text-xs sm:text-sm font-medium text-white placeholder-zinc-500 focus:outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => openBirthPicker(safeIdx)}
                            className="shrink-0 mr-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/35 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <span>📅</span>
                            <span>Elegir</span>
                            <span className="text-[9px]">▾</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-zinc-300 block mb-1 flex items-center justify-between">
                          <span>Edad *</span>
                          {currentComp.age ? (
                            <span className="text-[10px] text-emerald-400 font-medium">{'✓ ' + currentComp.age + ' años'}</span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-medium">(Automática)</span>
                          )}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="8"
                            max="110"
                            value={currentComp.age}
                            onChange={(e) => {
                              const v = e.target.value;
                              const num = parseInt(v, 10);
                              const patch = { age: v };
                              if (!isNaN(num) && num > 0 && num < 120 && !currentComp.birthDateDisplay) {
                                const yr = new Date().getFullYear() - num;
                                patch.birthDate = yr + '-01-01';
                                patch.birthDateDisplay = '01/01/' + yr;
                              }
                              updateCompanionField(safeIdx, patch);
                            }}
                            placeholder="Ej. 25"
                            className={"w-full px-3.5 py-2 bg-[#1b202b] border rounded-2xl text-xs sm:text-sm font-semibold text-white placeholder-zinc-500 focus:outline-none pr-14 tabular-nums " + (
                              currentComp.age ? 'border-emerald-500/45 text-emerald-300' : 'border-white/15'
                            )}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-zinc-300 font-medium bg-white/[0.07] px-2 py-0.5 rounded-full pointer-events-none">
                            años
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-zinc-300 block mb-1">Teléfono / WhatsApp (Opcional)</label>
                      <input
                        type="tel"
                        value={currentComp.phone}
                        onChange={(e) => updateCompanionField(safeIdx, { phone: e.target.value })}
                        placeholder="Opcional (o usa el del titular)"
                        className="w-full px-3.5 py-2 bg-[#1b202b] border border-white/15 rounded-2xl text-xs sm:text-sm font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {companionError && (
                    <div className="px-3.5 py-2 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs font-medium">
                      {'⚠️ ' + companionError}
                    </div>
                  )}

                  <div className="pt-1 flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowGroupCompanionsModal(false)}
                      className="px-4 py-2.5 rounded-full bg-white/[0.07] hover:bg-white/[0.14] text-xs sm:text-sm font-medium text-zinc-200 cursor-pointer shrink-0"
                    >
                      Volver al plan
                    </button>
                    <button
                      type="button"
                      onClick={handleCompanionNextOrDone}
                      className={"flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold cursor-pointer shadow-sm " + (
                        nextIncIdx < 0
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-[#04140d]'
                          : 'bg-amber-400 hover:bg-amber-300 text-[#1a1200]'
                      )}
                    >
                      {nextIncIdx < 0
                        ? ('Confirmar ' + activeGroupSize + ' integrantes y continuar →')
                        : ('Siguiente (Persona ' + (nextIncIdx + 2) + '/' + activeGroupSize + ') →')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* MODAL SELECTOR NUMÉRICO DE FECHA DE CUMPLEAÑOS (SIN ESCRIBIR) */}
          {isBirthPickerOpen && (() => {
            const activeDecadeObj = BIRTH_DECADES.find((d) => d.start === pickerDecade) || BIRTH_DECADES[2];
            const maxDaysInMonth = getDaysInBirthMonth(pickerYear, pickerMonth);
            const allPicked = pickerYear !== null && pickerMonth !== null && pickerDay !== null;
            const previewIso = allPicked
              ? (String(pickerYear).padStart(4, '0') + '-' + String(pickerMonth).padStart(2, '0') + '-' + String(pickerDay).padStart(2, '0'))
              : '';
            const previewDisplay = allPicked
              ? (String(pickerDay).padStart(2, '0') + '/' + String(pickerMonth).padStart(2, '0') + '/' + pickerYear)
              : '';
            const previewAge = previewIso ? calculateAgeFromBirthDate(previewIso) : null;

            return (
              <div
                onClick={() => setIsBirthPickerOpen(false)}
                className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#141822] border border-white/15 rounded-[26px] max-w-[460px] w-full max-h-[94vh] overflow-y-auto p-4 shadow-2xl text-white space-y-2.5"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Fecha de cumpleaños</h4>
                      <p className="text-[11px] text-zinc-400">Toca los números para elegir sin escribir</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBirthPickerOpen(false)}
                      className="w-7 h-7 rounded-full bg-white/[0.07] hover:bg-white/[0.15] text-zinc-300 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Preview Pill */}
                  <div className={"px-3 py-1.5 rounded-2xl border flex items-center justify-between gap-2 " + (
                    allPicked
                      ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-200'
                      : 'bg-[#1b202b] border-white/10 text-zinc-300'
                  )}>
                    <div className="flex items-center gap-2 text-xs font-semibold tabular-nums">
                      <span>📅</span>
                      <span>
                        {allPicked
                          ? (previewDisplay + (previewAge !== null ? (' · ' + previewAge + ' años') : ''))
                          : (
                              (pickerDay ? String(pickerDay).padStart(2, '0') : '__') + '/' +
                              (pickerMonth ? String(pickerMonth).padStart(2, '0') : '__') + '/' +
                              (pickerYear ? pickerYear : '____')
                            )
                        }
                      </span>
                    </div>
                    {allPicked && previewAge !== null ? (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300">
                        Edad lista
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-400">Elige año, mes y día</span>
                    )}
                  </div>

                  {/* 1. Año */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-300">1. Año</span>
                      {pickerYear && <span className="text-[11px] font-semibold text-amber-300 tabular-nums">{pickerYear}</span>}
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {BIRTH_DECADES.map((dec) => (
                        <button
                          key={dec.start}
                          type="button"
                          onClick={() => setPickerDecade(dec.start)}
                          className={"py-1 px-1 rounded-full text-[10px] font-semibold border cursor-pointer tabular-nums " + (
                            pickerDecade === dec.start
                              ? 'bg-amber-400/20 text-amber-300 border-amber-400/45'
                              : 'bg-[#1b202b] text-zinc-400 border-white/10 hover:bg-[#222836] hover:text-white'
                          )}
                        >
                          {dec.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {activeDecadeObj.years.map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => applyBirthPickerParts(yr, pickerMonth, pickerDay)}
                          className={"py-1.5 rounded-xl text-xs font-semibold border cursor-pointer tabular-nums " + (
                            pickerYear === yr
                              ? 'bg-amber-400 text-[#1a1200] border-amber-300 shadow-sm'
                              : 'bg-[#1b202b] text-zinc-200 border-white/10 hover:bg-[#222836] hover:text-white'
                          )}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Mes */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-300">2. Mes</span>
                      {pickerMonth && (
                        <span className="text-[11px] font-semibold text-amber-300 tabular-nums">
                          {BIRTH_MONTHS.find((m) => m.num === pickerMonth)?.short}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BIRTH_MONTHS.map((m) => (
                        <button
                          key={m.num}
                          type="button"
                          onClick={() => applyBirthPickerParts(pickerYear, m.num, pickerDay)}
                          className={"py-1.5 px-1.5 rounded-xl text-[11px] font-semibold border cursor-pointer tabular-nums " + (
                            pickerMonth === m.num
                              ? 'bg-amber-400 text-[#1a1200] border-amber-300 shadow-sm'
                              : 'bg-[#1b202b] text-zinc-200 border-white/10 hover:bg-[#222836] hover:text-white'
                          )}
                        >
                          {m.short}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Día */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-300">3. Día</span>
                      {pickerDay && <span className="text-[11px] font-semibold text-amber-300 tabular-nums">Día {String(pickerDay).padStart(2, '0')}</span>}
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((dayNum) => {
                        const isDisabled = dayNum > maxDaysInMonth;
                        const isSelected = pickerDay === dayNum && !isDisabled;
                        return (
                          <button
                            key={dayNum}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => applyBirthPickerParts(pickerYear, pickerMonth, dayNum)}
                            className={"py-1.5 rounded-xl text-xs font-semibold border tabular-nums " + (
                              isDisabled
                                ? 'bg-white/[0.02] text-zinc-600 border-white/5 cursor-not-allowed opacity-40'
                                : isSelected
                                  ? 'bg-emerald-500 text-[#04140d] border-emerald-400 shadow-sm cursor-pointer'
                                  : 'bg-[#1b202b] text-zinc-200 border-white/10 hover:bg-[#222836] hover:text-white cursor-pointer'
                            )}
                          >
                            {String(dayNum).padStart(2, '0')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2 flex items-center justify-between gap-2.5 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleClearBirthPicker}
                      className="px-4 py-2 rounded-full bg-white/[0.07] hover:bg-white/[0.14] text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Limpiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBirthPickerOpen(false)}
                      className="px-6 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-xs font-semibold text-[#1a1200] transition-all cursor-pointer shadow-sm"
                    >
                      Listo
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

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
                  <div className="grid grid-cols-2 gap-2">
                    {['Pulgar Derecho', 'Índice Derecho'].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setSelectedFinger(f)}
                        className={"py-2 px-2.5 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer " + (
                          selectedFinger === f
                            ? "bg-cyan-600 text-white font-bold border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
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
                        ? "bg-emerald-500 text-white font-black shadow-glow-green"
                        : "bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 text-white font-black shadow-[0_0_25px_rgba(245,158,11,0.5)]"
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
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
              <div
                className="relative bg-[#12161f]/95 backdrop-blur-2xl border border-white/10 rounded-[28px] max-w-md w-full p-6 shadow-[0_24px_64px_rgba(0,0,0,0.75)] animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
                style={{ fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
              >
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-[28px]">
                  <img 
                    src={MODAL_GYM_BG} 
                    alt="Fondo Mancuernas Fitness" 
                    className="w-full h-full object-cover object-bottom opacity-15 select-none pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#12161f]/90 via-[#12161f]/90 to-[#0e1118]/95 pointer-events-none" />
                  <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent pointer-events-none" />
                </div>
                <div className="relative z-10 flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setShowVisitModal(false)}
                      className="px-3 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                    >
                      <span className="text-emerald-300">←</span>
                      <span>Atrás</span>
                    </button>
                    <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-base hidden sm:flex">
                      🎟️
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white tracking-tight leading-tight">
                        Acceso de visita
                      </h3>
                      <p className="text-xs text-zinc-400">Acceso único sin fecha de vencimiento</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowVisitModal(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>

                <div className="relative z-10 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-300 block mb-1.5">Nombre del visitante (Opcional)</label>
                    <input 
                      type="text"
                      value={visitClientName}
                      onChange={(e) => setVisitClientName(e.target.value)}
                      placeholder="Ej. Juan Pérez (o dejar vacío)"
                      className="w-full px-4 py-2.5 bg-[#1b202b] border border-white/15 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-[#16231e] border border-emerald-500/25 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-emerald-300/90">Tarifa de visita</p>
                      <p className="text-3xl font-semibold text-white tabular-nums mt-0.5">{'$' + visitCost}</p>
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 font-medium border border-emerald-500/25">
                      Paso inmediato
                    </span>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowVisitModal(false)}
                      className="flex-1 py-2.5 px-5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] text-sm font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleRegisterVisit}
                      className="flex-1 py-2.5 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-sm font-semibold text-[#04140d] shadow-sm cursor-pointer transition-all"
                    >
                      Conceder acceso
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 3: YA TENGO MEMBRESÍA (ACCESO DIRECTO) - MATERIAL 3 */}
          {showDirectAccessModal && (
            <div
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setDirectAccessError('');
                  setSearchQuery('');
                  setShowDirectAccessModal(false);
                }
              }}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
            >
              <div className="relative bg-[#11151d] border border-white/10 rounded-[28px] p-5 sm:p-6 w-full max-w-md shadow-[0_24px_64px_rgba(0,0,0,0.85)] animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col items-center justify-center">
                <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent pointer-events-none" />
                <div className="w-full flex items-center justify-between mb-3 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-200 truncate">
                    Acceso Directo • Validar Socio
                  </span>
                  <button 
                    type="button"
                    onClick={() => {
                      setDirectAccessError('');
                      setSearchQuery('');
                      setShowDirectAccessModal(false);
                    }}
                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center shrink-0"
                  >
                    ✕
                  </button>
                </div>

                <div className="w-full mb-3">
                  <div className="flex gap-2">
                    <input
                      ref={directAccessInputRef}
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (directAccessError) setDirectAccessError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleDirectAccessSubmit();
                        }
                      }}
                      placeholder="Escanea credencial o toca el lector abajo..."
                      className="flex-1 px-3.5 py-2.5 bg-[#090d11] border border-white/15 focus:border-emerald-400 rounded-2xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                    />
                    <button
                      type="button"
                      disabled={scanStatus === 'scanning'}
                      onClick={() => handleDirectAccessSubmit()}
                      className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      Validar
                    </button>
                  </div>

                  {directAccessError && (
                    <p className="mt-2 text-xs text-amber-300 font-medium text-center">
                      {directAccessError}
                    </p>
                  )}

                  <p className="mt-2.5 text-[11px] text-emerald-300/85 text-center font-medium">
                    Coloca tu huella en el sensor verde • Lectura automática instantánea
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-1 select-none">
                  <div 
                    onClick={() => handleDirectAccessSubmit()}
                    className="relative w-44 h-44 sm:w-48 sm:h-48 rounded-3xl bg-[#090d11] border border-emerald-500/35 hover:border-emerald-400/80 flex items-center justify-center cursor-pointer group shadow-lg transition-all duration-300 overflow-hidden my-1"
                  >
                    <div className="absolute inset-4 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-400/20 transition-all duration-500 pointer-events-none" />

                    <div className="relative w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center">
                      <img 
                        src="${biometricGreenFpBase64}" 
                        alt="Huella Biométrica Neón Verde" 
                        className="w-full h-full object-contain filter drop-shadow-[0_0_18px_rgba(34,197,94,0.95)] group-hover:scale-105 transition-transform duration-300"
                      />

                      <div className="absolute left-0 right-0 pointer-events-none animate-green-laser z-20">
                        <div className="h-10 w-full bg-gradient-to-t from-emerald-400/35 via-emerald-400/15 to-transparent" />
                        <div className="h-1 w-full bg-white shadow-[0_0_12px_#22c55e,0_0_24px_#10b981,0_0_36px_#22c55e]" />
                      </div>
                    </div>

                    <div className="absolute w-32 h-32 rounded-full border border-emerald-400/25 animate-ping pointer-events-none opacity-25" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODAL 4: REGISTRO DE ACCESOS DEL DÍA - MATERIAL 3 */}
          {showHistoryModal && (
            <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-[#12161f] border border-white/10 rounded-[28px] max-w-2xl w-full p-6 shadow-[0_24px_64px_rgba(0,0,0,0.75)] flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
                    <span>⏱️</span> Registro de accesos del día
                  </h3>
                  <button 
                    onClick={() => setShowHistoryModal(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white cursor-pointer flex items-center justify-center"
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
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-white font-bold rounded-xl transition-colors cursor-pointer"
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
                      className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
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

const dest1 = path.resolve(__dirname, '../../_ARCHIVOS_RESPALDO/Control_De_Acceso_Web.html');
const dest2 = path.resolve(__dirname, '../../_ARCHIVOS_RESPALDO/ACCESO_WEB_FITNESS_LEGENDS.html');
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
