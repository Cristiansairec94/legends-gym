import React, { useState, useEffect, useRef } from 'react';
import { useGym } from '../../context/GymContext';
import { storage } from '../../services/storage';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  LogIn,
  Sparkles,
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
            colors: ['#F59E0B', '#FBBF24', '#FFFFFF', '#E4E4E7'],
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
    <div className="min-h-screen bg-[#070709] text-gym-text flex flex-col justify-between relative overflow-hidden select-none">
      {/* Cinematic Architectural Club Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img
          src="/pos-banner.jpg"
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover object-center scale-105 opacity-[0.22] blur-[3px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070709]/80 via-[#09090c]/88 to-[#060608]/96" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.08)_0%,rgba(7,7,9,0.88)_72%)]" />
      </div>

      {/* Subtle Ambient Gold Blooms */}
      <div className="absolute top-[-12%] left-[15%] w-[520px] h-[420px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[10%] w-[500px] h-[400px] bg-amber-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Fine Architectural Dot Matrix */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #FFFFFF 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Top Executive Header */}
      <header className="relative z-10 px-6 sm:px-10 py-4 flex items-center justify-between border-b border-white/[0.06] bg-black/25 backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-black/95 border border-amber-500/40 p-1.5 flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.2)] ring-1 ring-white/5">
            <img src="/logo.png" alt="LEYENDS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg sm:text-xl tracking-wider text-white">
                LEYENDS
              </span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/20 to-amber-400/10 text-amber-400 border border-amber-500/30 tracking-widest">
                FITNESS GYM
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium tracking-wide">
              Sistema Integral de Operaciones & Control
            </p>
          </div>
        </div>

        {/* Live Terminal Clock Pill */}
        <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-md shadow-inner">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-black text-white font-mono tabular-nums tracking-wider">
            {formattedTime}
          </span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-[11px] font-semibold text-zinc-400 capitalize">
            {formattedDate}
          </span>
        </div>
      </header>

      {/* Main Centered Portal */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[980px] space-y-4">
          {/* Security Alert Banner (Only visible if an active multi-tab violation occurs) */}
          {securityAlert && (
            <div className="p-4 rounded-2xl bg-red-950/70 backdrop-blur-xl border border-red-500/50 text-red-100 shadow-[0_12px_40px_rgba(239,68,68,0.25)] flex items-start justify-between gap-3 animate-shake">
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

          {/* Unified Glassmorphic Split Container */}
          <div className="rounded-[30px] bg-[#0d0d12]/88 backdrop-blur-2xl border border-white/[0.09] shadow-[0_35px_90px_-15px_rgba(0,0,0,0.92)] overflow-hidden relative">
            {/* Top Gold Specular Hairline */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              {/* LEFT PANEL: Authentication Form (7 Cols) */}
              <div className="lg:col-span-7 p-6 sm:p-9 lg:p-10 flex flex-col justify-between relative">
                <div>
                  {/* Welcome Header */}
                  <div className="mb-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[11px] font-extrabold uppercase tracking-wider mb-3.5 shadow-[0_0_20px_rgba(245,158,11,0.12)]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Estación Operativa</span>
                    </div>
                    <h1 className="text-2xl sm:text-[32px] font-black text-white tracking-tight leading-tight">
                      Iniciar Sesión
                    </h1>
                    <p className="text-xs sm:text-sm text-zinc-400 mt-1.5 leading-relaxed">
                      Ingresa tus credenciales o selecciona tu perfil en turno para acceder al panel.
                    </p>
                  </div>

                  {/* Selected Employee Quick Chip */}
                  {selectedEmployee && (
                    <div className="mb-5 p-2.5 pr-3 rounded-2xl bg-gradient-to-r from-amber-500/[0.12] via-amber-500/[0.05] to-transparent border border-amber-500/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={selectedEmployee.avatarUrl}
                          alt={selectedEmployee.fullName}
                          className="w-9 h-9 rounded-xl object-cover border border-amber-400/50 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-white truncate">
                            {selectedEmployee.fullName}
                          </p>
                          <p className="text-[11px] text-amber-300/90 font-medium truncate">
                            {selectedEmployee.jobTitle || 'Personal Autorizado'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearOperator}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-zinc-300 hover:text-white transition-colors shrink-0"
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
                    {/* Identifier Input */}
                    <div>
                      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-zinc-300 mb-2">
                        Usuario, Correo o Cédula
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-400 transition-colors">
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
                          className="w-full h-12 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-black/60 border border-white/[0.1] rounded-2xl pl-11 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/80 focus:ring-4 focus:ring-amber-500/15 transition-all disabled:opacity-50"
                        />
                        {identifier && !isLoading && !isSuccess && (
                          <button
                            type="button"
                            onClick={handleClearOperator}
                            tabIndex={-1}
                            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-500 hover:text-zinc-200 transition-colors"
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
                        <label className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-300">
                          Contraseña o PIN Personal
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPinPad(!showPinPad)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                            showPinPad
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-white/[0.04] hover:bg-white/[0.08] text-amber-400 border-white/[0.08]'
                          }`}
                        >
                          <Grid3X3 className="w-3 h-3" />
                          <span>{showPinPad ? 'Ocultar PIN' : 'Teclado PIN'}</span>
                        </button>
                      </div>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-amber-400 transition-colors">
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
                          className="w-full h-12 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-black/60 border border-white/[0.1] rounded-2xl pl-11 pr-11 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/80 focus:ring-4 focus:ring-amber-500/15 transition-all disabled:opacity-50 tracking-wider"
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
                      <div className="p-3.5 rounded-2xl bg-black/50 border border-white/[0.08] space-y-2.5 shadow-inner">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
                          <span className="font-semibold text-zinc-300">Teclado Numérico Táctil</span>
                          <span className="text-[10px] text-zinc-500">Máx. 12 dígitos</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                            <button
                              key={digit}
                              type="button"
                              onClick={() => handlePinPadDigit(digit)}
                              disabled={lockoutSeconds > 0}
                              className="py-2.5 rounded-xl bg-white/[0.05] hover:bg-amber-500/20 hover:border-amber-500/40 border border-white/[0.08] text-sm font-black text-white transition-all active:scale-95"
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
                            className="py-2.5 rounded-xl bg-white/[0.05] hover:bg-amber-500/20 hover:border-amber-500/40 border border-white/[0.08] text-sm font-black text-white transition-all active:scale-95"
                          >
                            0
                          </button>
                          <button
                            type="button"
                            onClick={handlePinPadBackspace}
                            disabled={lockoutSeconds > 0}
                            className="py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.08] flex items-center justify-center text-zinc-300 transition-all active:scale-95"
                            title="Borrar último dígito"
                          >
                            <Delete className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Primary Gold Submit CTA */}
                    <button
                      type="submit"
                      disabled={isLoading || isSuccess || lockoutSeconds > 0}
                      className="w-full h-12 mt-2 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:via-yellow-300 hover:to-amber-400 text-zinc-950 font-black text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-[0_12px_32px_-6px_rgba(245,158,11,0.45)] hover:shadow-[0_16px_38px_-4px_rgba(245,158,11,0.65)] transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2.5">
                          <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                          <span>Verificando acceso...</span>
                        </div>
                      ) : lockoutSeconds > 0 ? (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Terminal Bloqueada ({lockoutSeconds}s)</span>
                        </>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                          <span>Ingresar al Sistema</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Clean Status Strip */}
                <div className="mt-7 pt-4 border-t border-white/[0.07] flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                  <span className="font-medium">LEYENDS GYM • Panel de Gestión</span>
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                    Sistema en línea
                  </span>
                </div>
              </div>

              {/* RIGHT PANEL: Authorized Staff Quick-Selector (5 Cols) */}
              <div className="lg:col-span-5 bg-gradient-to-b from-white/[0.025] via-black/45 to-black/65 border-t lg:border-t-0 lg:border-l border-white/[0.08] p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  {/* Right Panel Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h2 className="text-xs font-black uppercase tracking-wider text-white">
                          Personal en Turno
                        </h2>
                        <p className="text-[11px] text-zinc-400">
                          Selección rápida de operador
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.09] text-zinc-300 font-bold">
                      {activeEmployees.length} activos
                    </span>
                  </div>

                  {/* Operator Cards List */}
                  <div className="mt-4 space-y-2.5 max-h-[340px] overflow-y-auto pr-0.5">
                    {activeEmployees.slice(0, 6).map((emp) => {
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
                              color: 'bg-amber-500/20 text-amber-300 border-amber-500/35',
                            }
                          : emp.role === 'receptionist'
                          ? {
                              label: 'Recepción',
                              color: 'bg-sky-500/20 text-sky-300 border-sky-500/35',
                            }
                          : {
                              label: 'Entrenador',
                              color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35',
                            };

                      const shiftTag = getShiftLabel(emp.shift);

                      return (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => handleSelectOperator(emp.id, emp.email)}
                          disabled={isLoading || isSuccess || lockoutSeconds > 0}
                          className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 group cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500/[0.16] via-amber-500/[0.06] to-white/[0.02] border-amber-400/70 shadow-[0_8px_24px_-6px_rgba(245,158,11,0.3)]'
                              : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.07] hover:border-amber-500/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={emp.avatarUrl}
                                alt={emp.fullName}
                                className={`w-11 h-11 rounded-xl object-cover border transition-transform duration-200 group-hover:scale-105 ${
                                  isSelected ? 'border-amber-400' : 'border-white/15'
                                }`}
                              />
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0b0b0f]" />
                            </div>

                            <div className="min-w-0">
                              <p
                                className={`text-[13px] font-extrabold truncate transition-colors ${
                                  isSelected
                                    ? 'text-amber-300'
                                    : 'text-white group-hover:text-amber-300'
                                }`}
                              >
                                {emp.fullName}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md border font-bold tracking-wide ${roleBadge.color}`}
                                >
                                  {roleBadge.label}
                                </span>
                                {shiftTag && (
                                  <span className="text-[9px] text-zinc-300 bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 rounded-md font-medium">
                                    {shiftTag}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? 'bg-amber-400 text-zinc-950 shadow-[0_0_14px_rgba(251,191,36,0.5)]'
                                : 'bg-white/[0.04] text-zinc-500 group-hover:text-amber-400 group-hover:bg-amber-500/15 group-hover:translate-x-0.5'
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
                <div className="mt-6 pt-4 border-t border-white/[0.07] flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                  <span>Selecciona tu perfil e ingresa tu PIN</span>
                  <KeyRound className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimalist Footer */}
      <footer className="relative z-10 px-6 py-3.5 border-t border-white/[0.05] bg-black/20 backdrop-blur-sm text-center text-[11px] text-zinc-500">
        <p>© 2026 LEYENDS FITNESS GYM • Club Fitness & Control Operativo</p>
      </footer>
    </div>
  );
};
