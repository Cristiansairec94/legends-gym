import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
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
  ArrowRight,
  Shield,
  KeyRound
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const LoginScreen: React.FC = () => {
  const { login, loginQuick, employees } = useGym();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu correo/usuario y contraseña o PIN.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = login(identifier, password);
      setIsLoading(false);

      if (result.success) {
        setIsSuccess(true);
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FFFFFF', '#E4E4E7', '#A1A1AA', '#71717A'],
        });
      } else {
        setErrorMessage(result.message || 'Credenciales incorrectas');
      }
    }, 400);
  };

  const handleQuickLogin = (empId: string) => {
    setErrorMessage('');
    setIsLoading(true);
    setTimeout(() => {
      const success = loginQuick(empId);
      setIsLoading(false);
      if (success) {
        setIsSuccess(true);
        confetti({
          particleCount: 60,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#FFFFFF', '#E4E4E7', '#A1A1AA'],
        });
      }
    }, 300);
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
      <header className="relative z-10 px-6 py-6 flex items-center justify-between border-b border-white/5 backdrop-blur-sm">
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

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gym-card/60 border border-gym-border text-xs text-gym-muted">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Acceso Restringido • Terminal Local Autorizada</span>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Form Card (7 cols) */}
          <div className="lg:col-span-7 bg-gym-card/90 backdrop-blur-xl border border-gym-border rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            
            {/* Top Accent Line */}
            <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Portal de Seguridad</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Iniciar Sesión
              </h1>
              <p className="text-xs sm:text-sm text-gym-muted mt-1">
                Ingresa tus credenciales autorizadas para desbloquear el sistema de caja, accesos y socios.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs flex items-center gap-2.5 animate-shake">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {/* Success Feedback Alert */}
            {isSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-pulse">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">Credenciales correctas. Iniciando entorno de trabajo...</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
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
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ej. roberto.garza@legendsgym.com"
                    autoFocus
                    disabled={isLoading || isSuccess}
                    className="w-full bg-gym-surface/80 border border-gym-border rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password / PIN Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-300">
                    Contraseña o PIN de Seguridad
                  </label>
                  <span className="text-[11px] text-amber-400/80 font-medium">
                    PIN por defecto: 1234
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gym-muted">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Contraseña o PIN de 4 dígitos"
                    disabled={isLoading || isSuccess}
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
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-black font-extrabold text-sm flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Verificando credenciales...</span>
                  </div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Ingresar al Sistema</span>
                  </>
                )}
              </button>

            </form>

            <div className="mt-6 pt-5 border-t border-gym-border flex items-center justify-between text-[11px] text-gym-muted">
              <span>LEYENDS ERP v2.4 • Base Offline</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Servidor listo
              </span>
            </div>

          </div>

          {/* Right Column: Quick Demo Switcher Cards (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="bg-gym-card/60 backdrop-blur-md border border-gym-border/80 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center gap-2 text-white font-extrabold text-xs uppercase tracking-wider mb-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Acceso Rápido de Prueba (1-Clic)</span>
              </div>
              <p className="text-[11px] text-gym-muted mb-3 leading-relaxed">
                Selecciona una de las cuentas configuradas para ingresar inmediatamente sin escribir credenciales:
              </p>

              <div className="space-y-2.5">
                {employees.slice(0, 4).map((emp) => {
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
                      onClick={() => handleQuickLogin(emp.id)}
                      disabled={isLoading || isSuccess}
                      className="w-full text-left p-3 rounded-xl bg-gym-surface/80 hover:bg-gym-surface border border-gym-border hover:border-amber-500/50 transition-all flex items-center justify-between group cursor-pointer"
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
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${roleBadge.color}`}>
                              {roleBadge.label}
                            </span>
                            <span className="text-[10px] text-gym-muted hidden sm:inline">
                              PIN: {emp.pin || '1234'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-1.5 rounded-lg bg-gym-card text-gym-muted group-hover:text-amber-400 group-hover:bg-amber-500/20 transition-all">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Helper Credentials Card */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold mb-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Credenciales Predeterminadas</span>
              </div>
              <p className="text-[11px] text-gym-muted leading-relaxed">
                Todas las cuentas están preparadas con la clave maestra <code className="text-amber-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">admin123</code> o el PIN de caja <code className="text-amber-300 font-mono bg-black/40 px-1.5 py-0.5 rounded">1234</code>.
              </p>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 border-t border-white/5 text-center text-xs text-gym-muted">
        <p>© 2026 LEYENDS FITNESS GYM • Todos los derechos reservados • Seguridad & Control Biométrico</p>
      </footer>

    </div>
  );
};
