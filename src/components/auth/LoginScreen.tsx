import React, { useState, useEffect, useRef } from 'react';
import { useGym } from '../../context/GymContext';
import { storage } from '../../services/storage';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  LogIn, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  Shield,
  KeyRound,
  ShieldAlert,
  Timer,
  History,
  X,
  Delete,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const LoginScreen: React.FC = () => {
  const { login, employees, securityAlert, clearSecurityAlert, securityAuditLogs } = useGym();

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
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showDemoHints, setShowDemoHints] = useState(false);
  const [requiresSupervisorOverride, setRequiresSupervisorOverride] = useState(false);
  const [supervisorOverridePin, setSupervisorOverridePin] = useState('');

  const passwordInputRef = useRef<HTMLInputElement>(null);

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
      setErrorMessage('Por favor ingresa tu correo/usuario y tu contraseña o PIN personal.');
      return;
    }

    if (requiresSupervisorOverride && !supervisorOverridePin.trim()) {
      setErrorMessage('Ingresa el PIN o contraseña del Supervisor/Administrador para autorizar el ingreso fuera de turno.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = login(
        identifier,
        password,
        requiresSupervisorOverride ? supervisorOverridePin : undefined
      );
      setIsLoading(false);

      if (result.success) {
        setIsSuccess(true);
        setRequiresSupervisorOverride(false);
        setSupervisorOverridePin('');
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFFFFF', '#E4E4E7', '#A1A1AA', '#71717A'],
        });
      } else {
        setErrorMessage(result.message || 'Credenciales incorrectas');
        if (result.requiresSupervisorOverride) {
          setRequiresSupervisorOverride(true);
          setSupervisorOverridePin('');
        } else {
          setRequiresSupervisorOverride(false);
          setSupervisorOverridePin('');
          setPassword('');
        }
        if (result.lockedOut && result.lockoutUntil) {
          setLockoutSeconds(Math.ceil((result.lockoutUntil - Date.now()) / 1000));
        }
      }
    }, 350);
  };

  const handleSelectOperator = (empId: string, empEmail: string) => {
    if (isLoading || isSuccess || lockoutSeconds > 0) return;
    setSelectedEmpId(empId);
    setIdentifier(empEmail);
    setPassword('');
    setRequiresSupervisorOverride(false);
    setSupervisorOverridePin('');
    setErrorMessage('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handlePinPadDigit = (digit: string) => {
    if (isLoading || isSuccess || lockoutSeconds > 0) return;
    if (requiresSupervisorOverride) {
      if (supervisorOverridePin.length < 12) {
        setSupervisorOverridePin((prev) => prev + digit);
        setErrorMessage('');
      }
      return;
    }
    if (password.length < 12) {
      setPassword((prev) => prev + digit);
      setErrorMessage('');
    }
  };

  const handlePinPadBackspace = () => {
    if (requiresSupervisorOverride) {
      setSupervisorOverridePin((prev) => prev.slice(0, -1));
      return;
    }
    setPassword((prev) => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen bg-gym-bg text-gym-text flex flex-col justify-between relative overflow-hidden select-none">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-[-15%] left-[-10%] w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[550px] h-[550px] bg-amber-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[350px] h-[350px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #FFF 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }}
      />

      {/* Top Header / Branding Bar */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between border-b border-white/5 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black border border-amber-500/50 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.25)]">
            <img src="/logo.png" alt="LEYENDS Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-wider text-white">LEYENDS</span>
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                FITNESS GYM
              </span>
            </div>
            <p className="text-[10px] text-gym-muted font-medium">Sistema Integral de Operaciones & Control</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gym-card/80 hover:bg-gym-surface border border-gym-border text-xs text-gray-300 transition-colors"
            title="Ver bitácora de auditoría de seguridad"
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Bitácora de Seguridad</span>
            {securityAuditLogs.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-bold text-white">
                {securityAuditLogs.length}
              </span>
            )}
          </button>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>Blindaje Anti-Multitab & Firma Activos</span>
          </div>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl space-y-5">

          {/* Critical Security Alert Banner (Triggered on URL copy/paste in another tab or DevTools tampering) */}
          {securityAlert && (
            <div className="p-4 rounded-2xl bg-red-500/15 border-2 border-red-500/50 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.25)] flex items-start justify-between gap-3 animate-shake">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-red-300">
                    Protocolo de Seguridad Ejecutado
                  </h3>
                  <p className="text-xs text-red-200/90 mt-1 leading-relaxed">
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Form Card (7 cols) */}
            <div className="lg:col-span-7 bg-gym-card/90 backdrop-blur-xl border border-gym-border rounded-3xl p-6 sm:p-8 shadow-2xl relative">
              
              {/* Top Accent Line */}
              <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Portal de Acceso Blindado</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Iniciar Sesión
                </h1>
                <p className="text-xs sm:text-sm text-gym-muted mt-1">
                  Sesión vinculada a pestaña única con firma criptográfica. Ingresa tus credenciales personales para desbloquear la terminal.
                </p>
              </div>

              {/* Brute-Force Lockout Banner */}
              {lockoutSeconds > 0 && (
                <div className="mb-5 p-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Timer className="w-5 h-5 text-red-400 animate-spin shrink-0" />
                    <div>
                      <p className="font-bold text-red-300">Bloqueo Temporal Anti-Fuerza Bruta</p>
                      <p className="text-[11px] text-red-200/80">
                        Demasiados intentos fallidos. El formulario se desbloqueará automáticamente.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-black/50 border border-red-500/40 font-mono font-black text-sm text-red-300 shrink-0">
                    {lockoutSeconds}s
                  </span>
                </div>
              )}

              {/* Error Message Alert */}
              {errorMessage && lockoutSeconds === 0 && (
                <div className={`mb-5 p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-shake ${
                  requiresSupervisorOverride
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-red-500/15 border-red-500/40 text-red-300'
                }`}>
                  <AlertCircle className={`w-4 h-4 shrink-0 ${requiresSupervisorOverride ? 'text-amber-400' : 'text-red-400'}`} />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* Success Feedback Alert */}
              {isSuccess && (
                <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-pulse">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">Identidad y firma criptográfica verificadas. Generando token de pestaña única...</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                
                {/* Identifier Input (Email / DNI / User) */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Correo Electrónico, Usuario o Cédula
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gym-muted">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setSelectedEmpId(null);
                        setRequiresSupervisorOverride(false);
                        setSupervisorOverridePin('');
                      }}
                      placeholder="ej. roberto.garza@legendsgym.com"
                      autoFocus
                      autoComplete="off"
                      disabled={isLoading || isSuccess || lockoutSeconds > 0}
                      className="w-full bg-gym-surface/80 border border-gym-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Password / PIN Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-gray-300">
                      Contraseña o PIN Personal
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPinPad(!showPinPad)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                    >
                      {showPinPad ? 'Ocultar Teclado PIN' : 'Usar Teclado PIN en Pantalla'}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gym-muted">
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
                      placeholder="Ingresa tu contraseña o PIN de seguridad"
                      disabled={isLoading || isSuccess || lockoutSeconds > 0}
                      className="w-full bg-gym-surface/80 border border-gym-border rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all disabled:opacity-50 tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gym-muted hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Caps Lock Warning */}
                  {capsLockOn && (
                    <p className="text-[11px] text-amber-400 font-semibold mt-1.5 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Advertencia: Tienes activada la tecla Bloq Mayús (Caps Lock).</span>
                    </p>
                  )}
                </div>

                {/* Shift-Based Access Control: Supervisor Override Input */}
                {requiresSupervisorOverride && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-2.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Autorización de Turno por Supervisor</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setRequiresSupervisorOverride(false);
                          setSupervisorOverridePin('');
                          setErrorMessage('');
                        }}
                        className="text-[10px] text-zinc-400 hover:text-white underline"
                      >
                        Cancelar
                      </button>
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      Este operador intenta ingresar fuera de su horario asignado. Ingresa el <strong>PIN o Contraseña de un Administrador</strong> para autorizar el acceso extraordinario:
                    </p>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={supervisorOverridePin}
                        onChange={(e) => setSupervisorOverridePin(e.target.value)}
                        onCopy={(e) => e.preventDefault()}
                        onPaste={(e) => e.preventDefault()}
                        placeholder="PIN de Administrador / Gerente (ej. 1234)"
                        autoFocus
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-amber-500/40 text-white text-xs font-mono tracking-widest focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}

                {/* Optional On-Screen Numeric PIN Pad */}
                {showPinPad && (
                  <div className="p-3.5 rounded-2xl bg-gym-surface/60 border border-gym-border space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-gym-muted mb-1">
                      <span>
                        {requiresSupervisorOverride
                          ? 'Teclado Táctil (Capturando PIN de Supervisor)'
                          : 'Teclado Táctil de Seguridad'}
                      </span>
                      <span>Copia/Pega bloqueado</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                        <button
                          key={digit}
                          type="button"
                          onClick={() => handlePinPadDigit(digit)}
                          disabled={lockoutSeconds > 0}
                          className="py-2.5 rounded-xl bg-gym-card hover:bg-white/10 border border-gym-border text-sm font-black text-white transition-all active:scale-95"
                        >
                          {digit}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          requiresSupervisorOverride ? setSupervisorOverridePin('') : setPassword('')
                        }
                        disabled={lockoutSeconds > 0}
                        className="py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-bold text-red-300 transition-all"
                      >
                        Limpiar
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePinPadDigit('0')}
                        disabled={lockoutSeconds > 0}
                        className="py-2.5 rounded-xl bg-gym-card hover:bg-white/10 border border-gym-border text-sm font-black text-white transition-all active:scale-95"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        onClick={handlePinPadBackspace}
                        disabled={lockoutSeconds > 0}
                        className="py-2.5 rounded-xl bg-gym-card hover:bg-white/10 border border-gym-border flex items-center justify-center text-gray-300 transition-all"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || isSuccess || lockoutSeconds > 0}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Verificando credenciales...</span>
                    </div>
                  ) : lockoutSeconds > 0 ? (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Terminal Bloqueada ({lockoutSeconds}s)</span>
                    </>
                  ) : requiresSupervisorOverride ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Autorizar Turno con PIN de Supervisor</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Autenticar e Ingresar</span>
                    </>
                  )}
                </button>

              </form>

              <div className="mt-6 pt-5 border-t border-gym-border flex flex-wrap items-center justify-between gap-2 text-[11px] text-gym-muted">
                <span>Token de Pestaña Única • Hash Criptográfico & Anti-DevTools</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Protección Activa
                </span>
              </div>

            </div>

            {/* Right Column: Secure Operator Selector & Active Security Policies (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              <div className="bg-gym-card/60 backdrop-blur-md border border-gym-border/80 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-white font-extrabold text-xs uppercase tracking-wider">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span>Personal Autorizado en Turno</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gym-muted font-semibold">
                    Requiere PIN / Clave
                  </span>
                </div>
                <p className="text-[11px] text-gym-muted mb-3 leading-relaxed">
                  Selecciona tu perfil para autocompletar tu usuario e ingresa tu contraseña o PIN personal para confirmar tu identidad:
                </p>

                <div className="space-y-2.5">
                  {employees.slice(0, 4).map((emp) => {
                    const isSelected = selectedEmpId === emp.id || identifier.toLowerCase() === emp.email.toLowerCase();
                    const roleBadge = 
                      emp.role === 'admin' 
                        ? { label: 'Administrador', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
                        : emp.role === 'receptionist'
                        ? { label: 'Recepción', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' }
                        : { label: 'Entrenador', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };

                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelectOperator(emp.id, emp.email)}
                        disabled={isLoading || isSuccess || lockoutSeconds > 0}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                          isSelected
                            ? 'bg-white/10 border-amber-400 ring-1 ring-amber-400/40'
                            : 'bg-gym-surface/80 hover:bg-gym-surface border-gym-border hover:border-amber-500/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img 
                            src={emp.avatarUrl} 
                            alt={emp.fullName}
                            className="w-9 h-9 rounded-lg object-cover border border-amber-500/30 group-hover:scale-105 transition-transform" 
                          />
                          <div>
                            <p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                              {emp.fullName}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${roleBadge.color}`}>
                                {roleBadge.label}
                              </span>
                              <span className="text-[10px] text-gym-muted font-mono">
                                @{emp.username || emp.email.split('@')[0]}
                              </span>
                              {emp.shift && (
                                <span className="text-[9px] text-zinc-400 bg-white/5 px-1.5 py-0.2 rounded">
                                  {emp.shift.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={`p-1.5 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-black'
                            : 'bg-gym-card text-gym-muted group-hover:text-amber-400 group-hover:bg-amber-500/20'
                        }`}>
                          {isSelected ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Security Shields Summary Card */}
              <div className="p-4 rounded-2xl bg-gym-card/60 border border-gym-border text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Blindaje de Seguridad Activo</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDemoHints(!showDemoHints)}
                    className="text-[10px] text-gym-muted hover:text-white underline flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{showDemoHints ? 'Ocultar ayuda' : 'Ayuda de prueba'}</span>
                  </button>
                </div>

                <ul className="space-y-1.5 text-[11px] text-gym-muted">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span><strong className="text-gray-200">Anti-Copia de Enlace:</strong> Abrir el link en otra pestaña cierra la sesión en ambas.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span><strong className="text-gray-200">Hash & Anti-DevTools (F12):</strong> Claves cifradas y firma criptográfica contra cambio de rol.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span><strong className="text-gray-200">Anti-Fuerza Bruta:</strong> Bloqueo de 30s al 3er intento fallido.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span><strong className="text-gray-200">Control de Turno & PIN Supervisor:</strong> Validación horaria y aval gerencial en bajas.</span>
                  </li>
                </ul>

                {showDemoHints && (
                  <div className="mt-2 pt-2.5 border-t border-gym-border/80 text-[11px] text-gym-muted space-y-1">
                    <p className="font-bold text-gray-300">Credenciales para entorno de evaluación:</p>
                    <p>• Admin (Roberto): Clave <code className="text-white font-mono">admin123</code> | PIN <code className="text-white font-mono">1234</code></p>
                    <p>• Recepción (Camila): Clave <code className="text-white font-mono">camila123</code> | PIN <code className="text-white font-mono">2222</code></p>
                    <p>• Coach (Marcos): Clave <code className="text-white font-mono">coach123</code> | PIN <code className="text-white font-mono">3333</code></p>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      </main>

      {/* Security Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gym-card border border-gym-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gym-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wide">
                  Bitácora de Auditoría de Seguridad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="p-1 rounded-lg text-gym-muted hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto space-y-2.5">
              {securityAuditLogs.length === 0 ? (
                <p className="text-xs text-gym-muted text-center py-8">
                  No hay eventos de seguridad registrados todavía.
                </p>
              ) : (
                securityAuditLogs.map((log) => {
                  const isDanger =
                    log.type === 'MULTI_TAB_BREACH' ||
                    log.type === 'SESSION_TAMPER' ||
                    log.type === 'BRUTE_FORCE_LOCK' ||
                    log.type === 'SHIFT_BLOCKED' ||
                    log.type === 'LOGIN_FAILED';
                  const isSuccessLog =
                    log.type === 'LOGIN_SUCCESS' || log.type === 'SUPERVISOR_AUTH';

                  return (
                    <div
                      key={log.id}
                      className={`p-3 rounded-xl border text-xs ${
                        isDanger
                          ? 'bg-red-500/10 border-red-500/30 text-red-200'
                          : isSuccessLog
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-gym-surface border-gym-border text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-[10px] uppercase tracking-wider">
                          {log.type === 'MULTI_TAB_BREACH' && '🚨 Violación Multi-Pestaña'}
                          {log.type === 'SESSION_TAMPER' && '🚨 Manipulación DevTools (F12)'}
                          {log.type === 'BRUTE_FORCE_LOCK' && '🔒 Bloqueo Fuerza Bruta'}
                          {log.type === 'SHIFT_BLOCKED' && '⏰ Bloqueo Fuera de Turno'}
                          {log.type === 'SUPERVISOR_AUTH' && '🛡️ Aval de Supervisor'}
                          {log.type === 'LOGIN_FAILED' && '⚠️ Intento Fallido'}
                          {log.type === 'LOGIN_SUCCESS' && '✅ Acceso Autorizado'}
                          {log.type === 'MANUAL_LOGOUT' && '👋 Cierre de Sesión Manual'}
                        </span>
                        <span className="text-[10px] opacity-75 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString('es-MX')}
                        </span>
                      </div>
                      <p className="text-[11px] leading-snug">{log.details}</p>
                      {(log.userName || log.userIdentifier) && (
                        <p className="text-[10px] opacity-75 mt-1 font-mono">
                          Usuario: {log.userName || log.userIdentifier}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 border-t border-white/5 text-center text-xs text-gym-muted">
        <p>© 2026 LEYENDS FITNESS GYM • Todos los derechos reservados • Seguridad & Control Biométrico</p>
      </footer>

    </div>
  );
};
