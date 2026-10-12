import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { UserRole } from '../../types';
import { 
  Dumbbell, 
  ShieldCheck, 
  UserCheck, 
  Activity, 
  ShoppingCart, 
  Flame, 
  Clock, 
  Bell, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  LogOut
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface NavbarProps {
  onOpenCart?: () => void;
  onOpenNotifications?: () => void;
  onOpenSync?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenCart, 
  onOpenNotifications,
  onOpenSync,
  activeTab,
  setActiveTab 
}) => {
  const { 
    currentUser,
    logout,
    currentRole, 
    setCurrentRole, 
    cartItemsCount, 
    todayCheckInsCount, 
    cashSession,
    unreadNotificationsCount,
    syncState
  } = useGym();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogoClick = () => {
    setIsLogoSpinning(true);
    confetti({
      particleCount: 35,
      spread: 60,
      origin: { y: 0.1, x: 0.1 },
      colors: ['#FFFFFF', '#E4E4E7', '#A1A1AA', '#F4F4F6']
    });
    setTimeout(() => setIsLogoSpinning(false), 900);
    setActiveTab('dashboard');
  };

  const roles: { id: UserRole; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'admin', label: 'Administrador', icon: <ShieldCheck className="w-4 h-4" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { id: 'receptionist', label: 'Recepción / Caja', icon: <UserCheck className="w-4 h-4" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    { id: 'trainer', label: 'Coach / Entrenador', icon: <Activity className="w-4 h-4" />, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  ];

  return (
    <header className="bg-[#09090b]/90 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-40 px-3 sm:px-5 py-2.5 shadow-md">
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Brand Logo (Interactive 3D Spin) */}
        <div className="flex items-center gap-4">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer group select-none"
            title="LEYENDS GYM • Clic para girar"
          >
            <div className={`w-11 h-11 rounded-xl bg-black border border-white/25 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.15)] ring-1 ring-white/10 transition-all duration-700 overflow-hidden ${
              isLogoSpinning ? 'rotate-[360deg] scale-110 border-white ring-2 ring-white/40' : 'group-hover:scale-105 group-hover:border-white/50'
            }`}>
              <img 
                src="/logo.png" 
                alt="LEYENDS GYM Logo" 
                className="w-full h-full object-contain filter drop-shadow" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-wider text-white">LEYENDS</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-white/10 text-white border border-white/20 tracking-wider shadow-sm">
                  FITNESS GYM
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium tracking-wide hidden sm:block">
                Sistema ERP & Control en Vivo
              </p>
            </div>
          </div>
        </div>

        {/* Center / Middle: Real-time Stats & Badges */}
        <div className="hidden lg:flex items-center gap-3 text-xs">
          
          {/* Real-time Clock */}
          <div className="flex items-center gap-2 text-zinc-400 bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/[0.08]">
            <Clock className="w-3.5 h-3.5 text-zinc-300" />
            <span className="font-mono text-zinc-200 font-medium">
              {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Today Check-Ins */}
          <div 
            onClick={() => setActiveTab('access')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 cursor-pointer hover:border-emerald-500/50 transition-colors shadow-sm"
            title="Socios ingresados hoy"
          >
            <Flame className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-zinc-400">Accesos hoy:</span>
            <span className="font-bold text-emerald-400 font-mono">{todayCheckInsCount}</span>
          </div>

          {/* Cash Status */}
          <div 
            onClick={() => setActiveTab('cash')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] cursor-pointer hover:border-white/30 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${cashSession.status === 'open' ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-rose-500'}`} />
            <span className="text-zinc-400">Caja:</span>
            <span className="font-semibold text-zinc-200">
              {cashSession.status === 'open' ? 'Abierta' : 'Cerrada'}
            </span>
          </div>

        </div>

        {/* Right side: Sync Pill + Notifications + Cart + Role Selector */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Offline / Cloud Sync Pill Button */}
          <button
            onClick={onOpenSync}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              syncState.isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
            title="Estado de sincronización y base de datos"
          >
            {syncState.isOnline ? (
              <Cloud className="w-4 h-4" />
            ) : (
              <CloudOff className="w-4 h-4" />
            )}
            <span className="hidden xl:inline">
              {syncState.isOnline ? 'En línea' : 'Local'}
            </span>
          </button>

          {/* Notifications Bell Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl bg-gym-surface border border-gym-border hover:border-amber-500/50 hover:bg-gym-surface/80 transition-all text-gray-200"
            title="Centro de notificaciones y avisos"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Quick POS Cart Button */}
          <button
            onClick={onOpenCart}
            className="relative p-2 rounded-xl bg-gym-surface border border-gym-border hover:border-amber-500/50 hover:bg-gym-surface/80 transition-all text-gray-200"
            title="Ver carrito de venta"
          >
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-glow-gold animate-bounce">
                {cartItemsCount}
              </span>
            )}
          </button>

          {/* Interactive Role Switcher Selector (for admin testing/simulation) */}
          <div className="hidden lg:flex items-center bg-gym-surface rounded-xl p-1 border border-gym-border">
            <span className="text-[10px] font-semibold text-gym-muted px-1.5">
              Simular Rol:
            </span>
            <div className="flex gap-1">
              {roles.map((r) => {
                const isActive = currentRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setCurrentRole(r.id)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                      isActive 
                        ? `${r.color} shadow-sm border` 
                        : 'text-gym-muted hover:text-gray-200 hover:bg-gym-card/60 border border-transparent'
                    }`}
                    title={`Cambiar vista a rol ${r.label}`}
                  >
                    {r.icon}
                    <span className="hidden 2xl:inline">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Logged-in User Profile Card */}
          {currentUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-gym-border/70">
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.fullName}
                className="w-8 h-8 rounded-xl object-cover border border-amber-500/40 shadow-sm"
              />
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-white max-w-[130px] truncate">
                  {currentUser.fullName}
                </p>
                <p className="text-[10px] text-amber-400 capitalize font-medium">
                  {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'trainer' ? 'Coach' : 'Recepción'}
                </p>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all group"
            title="Cerrar sesión del sistema"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>

        </div>

      </div>
    </header>
  );
};
