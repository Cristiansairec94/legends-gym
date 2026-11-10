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
            colors: ['#F59E0B', '#10B981', '#FFFFFF', '#FBBF24'],
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
    <div className="min-h-screen bg-black text-white flex flex-col justify-between relative overflow-hidden select-none">
      {/* Full-Definition Real Gym Architectural Background (Matching Terminal Kiosk Style) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <img
          src={gymBg}
          alt="LEYENDS GYM Club Fitness"
          style={{
            filter: 'brightness(1.03) contrast(1.08) saturate(1.06)',
            objectPosition: 'center 22%',
          }}
          className="w-full h-full object-cover"
        />
        {/* Clean cinema vignettes so the LED wall sign & treadmills stay crisp and visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/35 pointer-events-none" />
        {/* Subtle spotlight on the illuminated LEYENDS GYM wall sign */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_32%,rgba(245,158,11,0.16)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />
        {/* Deep lower gradient so foreground cards stand out with high contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-transparent pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
      </div>

      {/* Floating Enlarged Live Terminal Clock (Top-Right) */}
      <div className="hidden lg:flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-black/80 border border-amber-400/60 backdrop-blur-xl shadow-[0_14px_36px_rgba(0,0,0,0.9),0_0_24px_rgba(245,158,11,0.22)] absolute top-5 right-7 z-20">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-[0_0_14px_rgba(245,158,11,0.25)]">
          <Clock className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-white font-mono tabular-nums tracking-wider leading-none drop-shadow">
            {formattedTime}
          </span>
          <span className="h-5 w-[1px] bg-white/20" />
          <span className="text-sm font-bold text-zinc-200 capitalize tracking-wide leading-none">
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Main Centered Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-5 sm:py-6">
        <div className="w-full max-w-[1020px] space-y-5">
          {/* Centered Luxury Brand Crown */}
          <div className="flex flex-col items-center text-center relative">
            {/* Soft Dark Contrast Backdrop so White & Gold Text Pops Over the Bright LED Sign */}
            <div className="absolute -inset-x-10 -inset-y-3 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.78)_0%,rgba(0,0,0,0.42)_55%,transparent_80%)] pointer-events-none rounded-full" />

            {/* Obsidian & Metallic Gold Crest Medallion */}
            <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-b from-amber-300 via-amber-500/60 to-amber-500/20 shadow-[0_12px_36px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.35)] transition-transform duration-300 hover:scale-105">
              <div className="w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-[15px] bg-black flex items-center justify-center p-1.5 overflow-hidden relative">
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/[0.12] to-transparent pointer-events-none" />
                <img
                  src="/logo.png"
                  alt="LEYENDS FITNESS GYM"
                  className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.28)]"
                />
              </div>
            </div>

            {/* Centered Brand Wordmark & Gold Kiosk Badge */}
            <div className="relative mt-2.5 flex flex-wrap items-center justify-center gap-2.5">
              <span className="font-black text-2xl sm:text-3xl tracking-[0.18em] text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)]">
                LEYENDS
              </span>
              <span className="text-[10px] sm:text-[11px] uppercase font-black tracking-[0.18em] px-3 py-1 rounded-full bg-black/85 text-amber-400 border border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                FITNESS GYM
              </span>
            </div>

            {/* Ornamental Gold Hairlines + Subtitle */}
            <div className="relative mt-1.5 flex items-center justify-center gap-3">
              <span className="h-[1.5px] w-8 sm:w-14 bg-gradient-to-r from-transparent via-amber-400/70 to-amber-400" />
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-zinc-100 font-extrabold drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                Sistema Integral de Operaciones &amp; Control
              </p>
              <span className="h-[1.5px] w-8 sm:w-14 bg-gradient-to-l from-transparent via-amber-400/70 to-amber-400" />
            </div>
          </div>

          {/* Security Alert Banner (Only visible if an active multi-tab violation occurs) */}
          {securityAlert && (
            <div className="p-4 rounded-2xl bg-black/90 backdrop-blur-xl border-2 border-red-500/70 text-red-100 shadow-[0_0_35px_rgba(239,68,68,0.35)] flex items-start justify-between gap-3 animate-shake">
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

          {/* Dual Equal-Height Kiosk-Style Jet-Black Glass Cards (Amber Card + Emerald Card) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">
            {/* LEFT CARD: Login Form (Jet-Black Glass + Crisp Glowing Amber Border) */}
            <div className="lg:col-span-7 rounded-3xl bg-black/80 backdrop-blur-xl border-2 border-amber-400/65 hover:border-amber-400/90 transition-colors duration-300 shadow-[0_24px_70px_rgba(0,0,0,0.92),0_0_30px_rgba(245,158,11,0.22)] p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden">
              {/* Subtle Inner Top Specular Highlight */}
              <div className="absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/80 to-transparent pointer-events-none" />

              <div>
                {/* Card Top Header Row */}
                <div className="flex items-start justify-between gap-3 mb-5">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                      Iniciar Sesión
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-300 mt-1 leading-relaxed">
                      Ingresa tus credenciales o elige tu perfil en turno a la derecha.
                    </p>
                  </div>

                  {/* Kiosk-Style Pill Badge */}
                  <div className="shrink-0 px-3.5 py-1 rounded-full bg-black/85 border border-amber-400/80 flex items-center gap-1.5 text-white font-black text-[11px] uppercase tracking-wider shadow-lg">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Acceso</span>
                  </div>
                </div>

                {/* Selected Employee Quick Chip */}
                {selectedEmployee && (
                  <div className="mb-4 p-2.5 pr-3 rounded-2xl bg-zinc-950/95 border border-emerald-400/50 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.18)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={selectedEmployee.avatarUrl}
                        alt={selectedEmployee.fullName}
                        className="w-9 h-9 rounded-xl object-cover border border-emerald-400/70 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-white truncate">
                          {selectedEmployee.fullName}
                        </p>
                        <p className="text-[11px] text-emerald-400 font-semibold truncate">
                          {selectedEmployee.jobTitle || 'Personal Autorizado'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearOperator}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-[10px] font-bold text-zinc-200 hover:text-white transition-colors shrink-0"
                    >
                      Cambiar
                    </button>
                  </div>
                )}

                {/* Brute-Force Lockout Banner */}
                {lockoutSeconds > 0 && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Timer className="w-5 h-5 text-red-400 animate-spin shrink-0" />
                      <div>
                        <p className="font-bold text-red-300">Bloqueo Temporal de Seguridad</p>
                        <p className="text-[11px] text-red-200/80 mt-0.5">
                          Demasiados intentos fallidos. Espera para volver a intentar.
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1.5 rounded-xl bg-black/70 border border-red-500/40 font-mono font-black text-sm text-red-300 shrink-0">
                      {lockoutSeconds}s
                    </span>
                  </div>
                )}

                {/* Error Message Alert */}
                {errorMessage && lockoutSeconds === 0 && (
                  <div className="mb-4 p-3.5 rounded-2xl border border-red-500/50 bg-red-950/75 text-red-200 text-xs flex items-center gap-2.5 animate-shake">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="font-semibold">{errorMessage}</span>
                  </div>
                )}

                {/* Success Feedback Alert */}
                {isSuccess && (
                  <div className="mb-4 p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-400/60 text-emerald-200 text-xs flex items-center gap-2.5 animate-pulse">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-semibold">
                      Acceso autorizado. Abriendo estación de trabajo...
                    </span>
                  </div>
                )}

                {/* Credentials Form */}
                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                  {/* Identifier Input (Pure Jet-Black Interior — Zero Muddy Cast) */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-200 mb-2">
                      Usuario, Correo o Cédula
                    </label>
                    <div className="relative flex items-center h-[52px] rounded-2xl bg-zinc-950/95 hover:bg-zinc-900/95 focus-within:bg-black border border-white/15 hover:border-amber-400/50 focus-within:border-amber-400 focus-within:shadow-[0_0_20px_rgba(245,158,11,0.22)] transition-all group">
                      <div className="ml-2.5 w-9 h-9 rounded-xl bg-white/[0.05] group-focus-within:bg-amber-500/20 border border-white/10 group-focus-within:border-amber-400/50 flex items-center justify-center text-zinc-400 group-focus-within:text-amber-400 transition-all shrink-0">
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
                        className="w-full h-full bg-transparent px-3.5 pr-10 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50"
                      />
                      {identifier && !isLoading && !isSuccess && (
                        <button
                          type="button"
                          onClick={handleClearOperator}
                          tabIndex={-1}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-white transition-colors"
                          title="Limpiar usuario"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Password / PIN Input */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-black uppercase tracking-wider text-zinc-200">
                        Contraseña o PIN Personal
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowPinPad(!showPinPad)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all border ${
                          showPinPad
                            ? 'bg-amber-500/20 text-amber-300 border-amber-400/70 shadow-[0_0_14px_rgba(245,158,11,0.25)]'
                            : 'bg-zinc-950/90 hover:bg-zinc-900 text-amber-400 border-amber-400/40'
                        }`}
                      >
                        <Grid3X3 className="w-3 h-3" />
                        <span>{showPinPad ? 'Ocultar PIN' : 'Teclado PIN'}</span>
                      </button>
                    </div>
                    <div className="relative flex items-center h-[52px] rounded-2xl bg-zinc-950/95 hover:bg-zinc-900/95 focus-within:bg-black border border-white/15 hover:border-amber-400/50 focus-within:border-amber-400 focus-within:shadow-[0_0_20px_rgba(245,158,11,0.22)] transition-all group">
                      <div className="ml-2.5 w-9 h-9 rounded-xl bg-white/[0.05] group-focus-within:bg-amber-500/20 border border-white/10 group-focus-within:border-amber-400/50 flex items-center justify-center text-zinc-400 group-focus-within:text-amber-400 transition-all shrink-0">
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
                        className="w-full h-full bg-transparent px-3.5 pr-11 text-sm font-medium text-white placeholder-zinc-500 focus:outline-none disabled:opacity-50 tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex={-1}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition-colors"
                        title={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Caps Lock Warning */}
                    {capsLockOn && (
                      <p className="text-[11px] text-amber-400 font-semibold mt-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Bloq Mayús (Caps Lock) está activado.</span>
                      </p>
                    )}
                  </div>

                  {/* Optional On-Screen Numeric PIN Pad */}
                  {showPinPad && (
                    <div className="p-3.5 rounded-2xl bg-zinc-950/95 border border-white/15 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
                        <span className="font-bold text-zinc-200">Teclado Numérico Táctil</span>
                        <span className="text-[10px] text-zinc-500">Máx. 12 dígitos</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                          <button
                            key={digit}
                            type="button"
                            onClick={() => handlePinPadDigit(digit)}
                            disabled={lockoutSeconds > 0}
                            className="py-2.5 rounded-xl bg-zinc-900 hover:bg-amber-500/20 hover:border-amber-400/60 border border-white/10 text-sm font-black text-white transition-all active:scale-95"
                          >
                            {digit}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setPassword('')}
                          disabled={lockoutSeconds > 0}
                          className="py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-xs font-bold text-red-300 transition-all active:scale-95"
                        >
                          Limpiar
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePinPadDigit('0')}
                          disabled={lockoutSeconds > 0}
                          className="py-2.5 rounded-xl bg-zinc-900 hover:bg-amber-500/20 hover:border-amber-400/60 border border-white/10 text-sm font-black text-white transition-all active:scale-95"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={handlePinPadBackspace}
                          disabled={lockoutSeconds > 0}
                          className="py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300 transition-all active:scale-95"
                          title="Borrar último dígito"
                        >
                          <Delete className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Kiosk-Inspired High-Impact Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || isSuccess || lockoutSeconds > 0}
                    className="w-full h-[54px] mt-2 pl-6 pr-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-500 to-amber-600 hover:from-amber-400 hover:via-amber-500 hover:to-amber-500 text-black font-black text-sm uppercase tracking-wider flex items-center justify-between shadow-[0_10px_30px_rgba(245,158,11,0.4)] hover:shadow-[0_14px_40px_rgba(245,158,11,0.6)] transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {isLoading ? (
                      <div className="w-full flex items-center justify-center gap-2.5">
                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        <span>Verificando acceso...</span>
                      </div>
                    ) : lockoutSeconds > 0 ? (
                      <div className="w-full flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" />
                        <span>Terminal Bloqueada ({lockoutSeconds}s)</span>
                      </div>
                    ) : (
                      <>
                        <span>Ingresar al Sistema</span>
                        <span className="w-9 h-9 rounded-xl bg-black/85 text-amber-400 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Clean Status Strip */}
              <div className="mt-6 pt-3.5 border-t border-white/15 flex items-center justify-between gap-2 text-[11px] text-zinc-300">
                <span className="font-bold text-amber-400">LEYENDS GYM • Estación Central</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                  Sistema en línea
                </span>
              </div>
            </div>

            {/* RIGHT CARD: Staff Quick-Selector (Jet-Black Glass + Crisp Glowing Emerald Border, Matching Middle Kiosk Card) */}
            <div className="lg:col-span-5 rounded-3xl bg-black/80 backdrop-blur-xl border-2 border-emerald-400/60 hover:border-emerald-400/85 transition-colors duration-300 shadow-[0_24px_70px_rgba(0,0,0,0.92),0_0_30px_rgba(16,185,129,0.22)] p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
              {/* Subtle Inner Top Specular Highlight */}
              <div className="absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent pointer-events-none" />

              <div>
                {/* Right Card Header */}
                <div className="flex items-center justify-between gap-2 mb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-wider text-white">
                        Personal en Turno
                      </h2>
                      <p className="text-[11px] text-zinc-300">
                        Acceso directo por perfil
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-black/85 border border-emerald-400/80 text-emerald-300 text-[10px] font-black uppercase tracking-wider shadow-lg">
                    {activeEmployees.length} activos
                  </span>
                </div>

                {/* Operator Cards List (Fits 5 profiles cleanly with zero clipping) */}
                <div className="space-y-2 max-h-[375px] overflow-y-auto pr-1 py-0.5">
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
                            color: 'bg-amber-500/20 text-amber-300 border-amber-400/45',
                          }
                        : emp.role === 'receptionist'
                        ? {
                            label: 'Recepción',
                            color: 'bg-sky-500/20 text-sky-300 border-sky-400/45',
                          }
                        : {
                            label: 'Entrenador',
                            color: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/45',
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
                            ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.3)]'
                            : 'bg-zinc-950/90 hover:bg-zinc-900/95 border-white/10 hover:border-emerald-400/55'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={emp.avatarUrl}
                              alt={emp.fullName}
                              className={`w-10 h-10 rounded-xl object-cover border transition-transform duration-200 group-hover:scale-105 ${
                                isSelected ? 'border-emerald-400' : 'border-white/20'
                              }`}
                            />
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
                          </div>

                          <div className="min-w-0">
                            <p
                              className={`text-[13px] font-extrabold truncate transition-colors ${
                                isSelected
                                  ? 'text-emerald-300'
                                  : 'text-white group-hover:text-emerald-300'
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
                                <span className="text-[9px] text-zinc-300 bg-white/[0.07] border border-white/10 px-1.5 py-0.5 rounded-md font-medium">
                                  {shiftTag}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_14px_rgba(16,185,129,0.6)] scale-105'
                              : 'bg-white/[0.06] text-zinc-400 group-hover:text-emerald-300 group-hover:bg-emerald-500/20 group-hover:translate-x-0.5'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Kiosk-Style Bottom Strip */}
              <div className="mt-5 pt-3.5 border-t border-white/15 flex items-center justify-between gap-2 text-[11px] text-emerald-400 font-bold">
                <span>Selecciona tu perfil e ingresa tu PIN &rarr;</span>
                <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Crisp Minimalist Bottom Bar (Matching Kiosk Footer Contrast) */}
      <footer className="relative z-10 px-6 py-2.5 text-center text-[11px] text-zinc-300 font-medium drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
        <p>© 2026 LEYENDS FITNESS GYM • Club Fitness &amp; Control Operativo</p>
      </footer>
    </div>
  );
};
