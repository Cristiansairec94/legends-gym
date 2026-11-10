import React, { useState, useEffect, useRef } from 'react';
import { useGym } from '../../context/GymContext';
import { storage } from '../../services/storage';
import gymBg from '../../assets/gym-background.jpg';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Users,
  ShieldAlert,
  Timer,
  X,
  Delete,
  Check,
  Clock,
  ChevronRight,
  KeyRound,
  Grid3X3,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const LoginScreen: React.FC = () => {
  const { login, employees, securityAlert, clearSecurityAlert } = useGym();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);
  const [showPinPad, setShowPinPad] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const identifierInputRef = useRef<HTMLInputElement>(null);

  // Live reception clock
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Sync lockout timer
  useEffect(() => {
    const checkLockout = () => {
      const { lockoutUntil } = storage.getLoginLockout();
      if (lockoutUntil && lockoutUntil > Date.now()) {
        setLockoutSeconds(Math.ceil((lockoutUntil - Date.now()) / 1000));
      } else {
        setLockoutSeconds(0);
      }
    };

    checkLockout();
    const timer = setInterval(checkLockout, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleKeyModifiers = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (lockoutSeconds > 0) {
      setErrorMessage(`Acceso bloqueado temporalmente. Espera ${lockoutSeconds}s para volver a intentar.`);
      return;
    }

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu usuario/correo y tu contraseña o PIN personal.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      try {
        const result = login(identifier, password);
        setIsLoading(false);

        if (result.success) {
          clearSecurityAlert();
          setIsSuccess(true);
          confetti({
            particleCount: 55,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#38BDF8', '#3B82F6', '#FFFFFF', '#34D399'],
          });
        } else {
          setErrorMessage(result.message || 'Credenciales incorrectas');
          setPassword('');
          if (result.lockedOut && result.lockoutUntil) {
            setLockoutSeconds(Math.ceil((result.lockoutUntil - Date.now()) / 1000));
          }
        }
      } catch (err: unknown) {
        setIsLoading(false);
        setErrorMessage('Error al procesar el inicio de sesión. Por favor reintenta.');
        console.error('Error during login:', err);
      }
    }, 350);
  };

  const handleSelectOperator = (empId: string, empEmail: string) => {
    if (isLoading || isSuccess || lockoutSeconds > 0) return;
    setSelectedEmpId(empId);
    setIdentifier(empEmail);
    setPassword('');
    setErrorMessage('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleClearOperator = () => {
    if (isLoading || isSuccess || lockoutSeconds > 0) return;
    setSelectedEmpId(null);
    setIdentifier('');
    setPassword('');
    setErrorMessage('');
    setTimeout(() => {
      identifierInputRef.current?.focus();
    }, 50);
  };

  const handlePinPadDigit = (digit: string) => {
    if (isLoading || isSuccess || lockoutSeconds > 0) return;
    if (password.length < 12) {
      setPassword((prev) => prev + digit);
      setErrorMessage('');
    }
  };

  const handlePinPadBackspace = () => {
    setPassword((prev) => prev.slice(0, -1));
  };

  const activeEmployees = employees.filter((emp) => emp.status !== 'inactive');

  const selectedEmployee = activeEmployees.find(
    (emp) =>
      selectedEmpId === emp.id ||
      (identifier.trim() !== '' &&
        (identifier.toLowerCase() === emp.email.toLowerCase() ||
          (emp.username && identifier.toLowerCase() === emp.username.toLowerCase())))
  );

  const formattedTime = currentTime.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = currentTime.toLocaleDateString('es-MX', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const getShiftLabel = (shift?: string) => {
    if (!shift) return null;
    if (shift.toLowerCase().includes('completo')) return 'Completo';
    return shift.split(' ')[0];
  };

  return (
    <div className="min-h-screen bg-[#05070c] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Crisp Real Club Architectural Backdrop (Obsidian & Cool Sapphire Tone — Zero Brown Cast) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src={gymBg}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center scale-105 opacity-[0.26] blur-[2px] saturate-75"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05070c]/80 via-[#070a12]/88 to-[#04060a]/96" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.10)_0%,rgba(5,7,12,0.90)_70%)]" />
      </div>

      {/* Cool Sapphire & Indigo Ambient Blooms */}
      <div className="absolute top-[-12%] left-[12%] w-[540px] h-[420px] bg-sky-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[10%] w-[520px] h-[420px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Subtle Precision Grid */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #E2E8F0 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Floating Live Terminal Clock (Top-Right on Desktop, keeps Brand Crown 100% centered) */}
      <div className="hidden lg:flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-[#0b0f19]/90 border border-white/[0.12] backdrop-blur-xl shadow-[0_16px_40px_-8px_rgba(0,0,0,0.9),0_0_24px_-6px_rgba(56,189,248,0.18)] absolute top-6 right-8 z-20">
        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(56,189,248,0.2)]">
          <Clock className="w-5 h-5 text-sky-400" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-white font-mono tabular-nums tracking-wider leading-none">
            {formattedTime}
          </span>
          <span className="h-5 w-[1px] bg-white/15" />
          <span className="text-sm font-bold text-slate-300 capitalize tracking-wide leading-none">
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Main Centered Portal */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-5 sm:py-7">
        <div className="w-full max-w-[1000px] space-y-5">
          {/* Centered Luxury Brand Crown */}
          <div className="flex flex-col items-center text-center relative">
            {/* Cool Platinum-Sky Halo Behind Emblem */}
            <div className="absolute -top-3 w-36 h-28 bg-sky-400/15 rounded-full blur-2xl pointer-events-none" />

            {/* Obsidian & Platinum-Silver Crest Medallion */}
            <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-b from-white/80 via-sky-300/40 to-white/10 shadow-[0_14px_40px_-6px_rgba(56,189,248,0.3)] transition-transform duration-300 hover:scale-105">
              <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-[15px] bg-black flex items-center justify-center p-1.5 overflow-hidden relative">
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/[0.14] to-transparent pointer-events-none" />
                <img
                  src="/logo.png"
                  alt="LEYENDS FITNESS GYM"
                  className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.28)]"
                />
              </div>
            </div>

            {/* Centered Brand Wordmark & Sapphire-Platinum Badge */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
              <span className="font-black text-2xl sm:text-3xl tracking-[0.18em] text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 drop-shadow-[0_2px_14px_rgba(255,255,255,0.15)]">
                LEYENDS
              </span>
              <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-[0.18em] px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-500/20 via-blue-500/15 to-cyan-400/20 text-sky-300 border border-sky-400/40 shadow-[0_0_22px_-4px_rgba(56,189,248,0.35)]">
                FITNESS GYM
              </span>
            </div>

            {/* Ornamental Platinum-Cyan Hairlines + Subtitle */}
            <div className="mt-1.5 flex items-center justify-center gap-3">
              <span className="h-[1px] w-8 sm:w-14 bg-gradient-to-r from-transparent via-sky-400/45 to-white/70" />
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-slate-300/90 font-bold">
                Sistema Integral de Operaciones &amp; Control
              </p>
              <span className="h-[1px] w-8 sm:w-14 bg-gradient-to-l from-transparent via-sky-400/45 to-white/70" />
            </div>
          </div>

          {/* Security Alert Banner (Only visible if an active multi-tab violation occurs) */}
          {securityAlert && (
            <div className="p-4 rounded-2xl bg-red-950/80 backdrop-blur-xl border border-red-500/50 text-red-100 shadow-[0_12px_40px_rgba(239,68,68,0.25)] flex items-start justify-between gap-3 animate-shake">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-red-300">
                    Sesión Cerrada por Seguridad
                  </h3>
                  <p className="text-xs text-red-200/90 mt-0.5 leading-relaxed">
                    {securityAlert}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearSecurityAlert}
                className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors shrink-0"
                title="Descartar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Unified Midnight-Obsidian & Sapphire Split Container */}
          <div className="rounded-[30px] bg-[#0a0e17]/94 backdrop-blur-2xl border border-white/[0.12] shadow-[0_35px_100px_-15px_rgba(0,0,0,0.95),0_0_55px_-15px_rgba(56,189,248,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] overflow-hidden relative">
            {/* Top Platinum-Cyan Specular Edge */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400/85 to-transparent" />
            <div className="absolute inset-x-24 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              {/* LEFT PANEL: Executive Authentication Cockpit (7 Cols) */}
              <div className="lg:col-span-7 p-6 sm:p-8 lg:p-9 flex flex-col justify-between relative bg-[radial-gradient(circle_at_0%_0%,rgba(56,189,248,0.06),transparent_55%)]">
                <div>
                  {/* Welcome Header */}
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-sky-300 text-[11px] font-extrabold uppercase tracking-wider mb-3 shadow-[0_0_20px_rgba(56,189,248,0.12)]">
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      <span>Acceso Ejecutivo • Estación Central</span>
                    </div>
                    <h1 className="text-2xl sm:text-[32px] font-black text-white tracking-tight leading-tight">
                      Iniciar Sesión
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                      Identifícate con tu cuenta o selecciona tu perfil activo en turno a la derecha.
                    </p>
                  </div>

                  {/* Selected Employee Quick Chip */}
                  {selectedEmployee && (
                    <div className="mb-5 p-2.5 pr-3 rounded-2xl bg-gradient-to-r from-sky-500/[0.14] via-blue-500/[0.06] to-transparent border border-sky-400/35 flex items-center justify-between gap-3 shadow-[0_8px_24px_-8px_rgba(56,189,248,0.25)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={selectedEmployee.avatarUrl}
                          alt={selectedEmployee.fullName}
                          className="w-9 h-9 rounded-xl object-cover border border-sky-400/60 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-white truncate">
                            {selectedEmployee.fullName}
                          </p>
                          <p className="text-[11px] text-sky-300/90 font-medium truncate">
                            {selectedEmployee.jobTitle || 'Personal Autorizado'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearOperator}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[10px] font-bold text-slate-300 hover:text-white transition-colors shrink-0"
                      >
                        Cambiar
                      </button>
                    </div>
                  )}

                  {/* Brute-Force Lockout Banner */}
                  {lockoutSeconds > 0 && (
                    <div className="mb-5 p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Timer className="w-5 h-5 text-red-400 animate-spin shrink-0" />
                        <div>
                          <p className="font-bold text-red-300">Bloqueo Temporal de Seguridad</p>
                          <p className="text-[11px] text-red-200/80 mt-0.5">
                            Demasiados intentos fallidos. Espera para volver a intentar.
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 rounded-xl bg-black/50 border border-red-500/40 font-mono font-black text-sm text-red-300 shrink-0">
                        {lockoutSeconds}s
                      </span>
                    </div>
                  )}

                  {/* Error Message Alert */}
                  {errorMessage && lockoutSeconds === 0 && (
                    <div className="mb-5 p-3.5 rounded-2xl border border-red-500/40 bg-red-500/15 text-red-200 text-xs flex items-center gap-2.5 animate-shake">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span className="font-semibold">{errorMessage}</span>
                    </div>
                  )}

                  {/* Success Feedback Alert */}
                  {isSuccess && (
                    <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-pulse">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold">
                        Acceso autorizado. Abriendo estación de trabajo...
                      </span>
                    </div>
                  )}

                  {/* Credentials Form */}
                  <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    {/* Identifier Input with Framed Icon Capsule */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-300 mb-2">
                        Usuario, Correo o Cédula
                      </label>
                      <div className="relative flex items-center h-[52px] rounded-2xl bg-[#111726] hover:bg-[#141b2d] focus-within:bg-[#0d121f] border border-white/[0.10] hover:border-white/[0.18] focus-within:border-sky-400/80 focus-within:ring-4 focus-within:ring-sky-500/15 transition-all group">
                        <div className="ml-2.5 w-9 h-9 rounded-xl bg-white/[0.05] group-focus-within:bg-sky-500/20 border border-white/[0.07] group-focus-within:border-sky-400/40 flex items-center justify-center text-slate-400 group-focus-within:text-sky-300 transition-all shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          ref={identifierInputRef}
                          type="text"
                          value={identifier}
                          onChange={(e) => {
                            setIdentifier(e.target.value);
                            setSelectedEmpId(null);
                          }}
                          placeholder="ej. admin.roberto o correo electrónico"
                          autoFocus
                          autoComplete="off"
                          disabled={isLoading || isSuccess || lockoutSeconds > 0}
                          className="w-full h-full bg-transparent px-3.5 pr-10 text-sm font-medium text-white placeholder-slate-500 focus:outline-none disabled:opacity-50"
                        />
                        {identifier && !isLoading && !isSuccess && (
                          <button
                            type="button"
                            onClick={handleClearOperator}
                            tabIndex={-1}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-200 transition-colors"
                            title="Limpiar usuario"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Password / PIN Input with Framed Icon Capsule */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                          Contraseña o PIN Personal
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPinPad(!showPinPad)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                            showPinPad
                              ? 'bg-sky-500/20 text-sky-300 border-sky-400/45 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                              : 'bg-white/[0.04] hover:bg-white/[0.09] text-sky-400 border-white/[0.10]'
                          }`}
                        >
                          <Grid3X3 className="w-3 h-3" />
                          <span>{showPinPad ? 'Ocultar PIN' : 'Teclado PIN'}</span>
                        </button>
                      </div>
                      <div className="relative flex items-center h-[52px] rounded-2xl bg-[#111726] hover:bg-[#141b2d] focus-within:bg-[#0d121f] border border-white/[0.10] hover:border-white/[0.18] focus-within:border-sky-400/80 focus-within:ring-4 focus-within:ring-sky-500/15 transition-all group">
                        <div className="ml-2.5 w-9 h-9 rounded-xl bg-white/[0.05] group-focus-within:bg-sky-500/20 border border-white/[0.07] group-focus-within:border-sky-400/40 flex items-center justify-center text-slate-400 group-focus-within:text-sky-300 transition-all shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          ref={passwordInputRef}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onKeyUp={handleKeyModifiers}
                          onKeyDown={handleKeyModifiers}
                          onCopy={(e) => e.preventDefault()}
                          onPaste={(e) => e.preventDefault()}
                          onCut={(e) => e.preventDefault()}
                          autoComplete="new-password"
                          placeholder="Ingresa tu clave o PIN de 4 dígitos"
                          disabled={isLoading || isSuccess || lockoutSeconds > 0}
                          className="w-full h-full bg-transparent px-3.5 pr-11 text-sm font-medium text-white placeholder-slate-500 focus:outline-none disabled:opacity-50 tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-white transition-colors"
                          title={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Caps Lock Warning */}
                      {capsLockOn && (
                        <p className="text-[11px] text-sky-300 font-semibold mt-2 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Bloq Mayús (Caps Lock) está activado.</span>
                        </p>
                      )}
                    </div>

                    {/* Optional On-Screen Numeric PIN Pad */}
                    {showPinPad && (
                      <div className="p-3.5 rounded-2xl bg-[#070a12]/90 border border-white/[0.10] space-y-2.5 shadow-inner">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                          <span className="font-semibold text-slate-200">Teclado Numérico Táctil</span>
                          <span className="text-[10px] text-slate-500">Máx. 12 dígitos</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                            <button
                              key={digit}
                              type="button"
                              onClick={() => handlePinPadDigit(digit)}
                              disabled={lockoutSeconds > 0}
                              className="py-2.5 rounded-xl bg-[#111726] hover:bg-sky-500/20 hover:border-sky-400/50 border border-white/[0.08] text-sm font-black text-white transition-all active:scale-95"
                            >
                              {digit}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPassword('')}
                            disabled={lockoutSeconds > 0}
                            className="py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-xs font-bold text-red-300 transition-all active:scale-95"
                          >
                            Limpiar
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePinPadDigit('0')}
                            disabled={lockoutSeconds > 0}
                            className="py-2.5 rounded-xl bg-[#111726] hover:bg-sky-500/20 hover:border-sky-400/50 border border-white/[0.08] text-sm font-black text-white transition-all active:scale-95"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={handlePinPadBackspace}
                            disabled={lockoutSeconds > 0}
                            className="py-2.5 rounded-xl bg-[#111726] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-slate-300 transition-all active:scale-95"
                            title="Borrar último dígito"
                          >
                            <Delete className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Primary Sapphire-Cyan Luxury Submit CTA */}
                    <button
                      type="submit"
                      disabled={isLoading || isSuccess || lockoutSeconds > 0}
                      className="w-full h-[52px] mt-2 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 hover:from-blue-500 hover:via-sky-400 hover:to-cyan-400 text-white font-black text-sm tracking-wide flex items-center justify-center gap-3 shadow-[0_14px_34px_-6px_rgba(14,165,233,0.55),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_18px_42px_-4px_rgba(56,189,248,0.7)] transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verificando credenciales...</span>
                        </div>
                      ) : lockoutSeconds > 0 ? (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Terminal Bloqueada ({lockoutSeconds}s)</span>
                        </>
                      ) : (
                        <>
                          <span>Ingresar al Sistema</span>
                          <span className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-1">
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Clean Status Strip */}
                <div className="mt-7 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span className="font-medium">LEYENDS GYM • Panel de Gestión</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
                    Sistema en línea
                  </span>
                </div>
              </div>

              {/* RIGHT PANEL: Authorized Staff Quick-Selector (5 Cols) */}
              <div className="lg:col-span-5 bg-[#070a11]/90 border-t lg:border-t-0 lg:border-l border-white/[0.09] p-6 sm:p-7 lg:p-8 flex flex-col justify-between">
                <div>
                  {/* Right Panel Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.15)]">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-xs font-black uppercase tracking-wider text-white">
                          Personal en Turno
                        </h2>
                        <p className="text-[11px] text-slate-400">
                          Selección rápida de operador
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/25 text-sky-300 font-bold">
                      {activeEmployees.length} activos
                    </span>
                  </div>

                  {/* Operator Cards List (Sized cleanly so 5 operators fit with zero top/bottom clipping) */}
                  <div className="mt-3.5 space-y-2 max-h-[375px] overflow-y-auto pr-1 py-0.5">
                    {activeEmployees.map((emp) => {
                      const isSelected =
                        selectedEmpId === emp.id ||
                        (identifier.trim() !== '' &&
                          (identifier.toLowerCase() === emp.email.toLowerCase() ||
                            (emp.username &&
                              identifier.toLowerCase() === emp.username.toLowerCase())));

                      const roleBadge =
                        emp.role === 'admin'
                          ? {
                              label: 'Administrador',
                              color: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/35',
                            }
                          : emp.role === 'receptionist'
                          ? {
                              label: 'Recepción',
                              color: 'bg-sky-500/20 text-sky-300 border-sky-400/35',
                            }
                          : {
                              label: 'Entrenador',
                              color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/35',
                            };

                      const shiftTag = getShiftLabel(emp.shift);

                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectOperator(emp.id, emp.email)}
                          disabled={isLoading || isSuccess || lockoutSeconds > 0}
                          className={`w-full text-left px-3 py-2.5 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 group cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-sky-500/[0.20] via-blue-500/[0.10] to-white/[0.02] border-sky-400/75 shadow-[0_8px_24px_-6px_rgba(56,189,248,0.35)]'
                              : 'bg-[#0e1320]/90 hover:bg-[#131a2b] border-white/[0.07] hover:border-sky-400/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={emp.avatarUrl}
                                alt={emp.fullName}
                                className={`w-10 h-10 rounded-xl object-cover border transition-transform duration-200 group-hover:scale-105 ${
                                  isSelected ? 'border-sky-400' : 'border-white/15'
                                }`}
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#070a11]" />
                            </div>

                            <div className="min-w-0">
                              <p
                                className={`text-[13px] font-extrabold truncate transition-colors ${
                                  isSelected
                                    ? 'text-sky-200'
                                    : 'text-white group-hover:text-sky-300'
                                }`}
                              >
                                {emp.fullName}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md border font-bold tracking-wide ${roleBadge.color}`}
                                >
                                  {roleBadge.label}
                                </span>
                                {shiftTag && (
                                  <span className="text-[9px] text-slate-300 bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 rounded-md font-medium">
                                    {shiftTag}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'bg-sky-400 text-slate-950 shadow-[0_0_14px_rgba(56,189,248,0.6)]'
                                : 'bg-white/[0.04] text-slate-500 group-hover:text-sky-400 group-hover:bg-sky-500/15 group-hover:translate-x-0.5'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subtle Helper Footer */}
                <div className="mt-5 pt-4 border-t border-white/[0.08] flex items-center justify-between gap-2 text-[11px] text-slate-400">
                  <span>Selecciona tu perfil e ingresa tu PIN</span>
                  <KeyRound className="w-3.5 h-3.5 text-sky-400/85 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimalist Footer */}
      <footer className="relative z-10 px-6 py-3 border-t border-white/[0.06] bg-black/30 backdrop-blur-sm text-center text-[11px] text-slate-500">
        <p>© 2026 LEYENDS FITNESS GYM • Club Fitness &amp; Control Operativo</p>
      </footer>
    </div>
  );
};
