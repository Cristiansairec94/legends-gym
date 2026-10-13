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

  const roles: { id: UserRole; label: string; fullLabel: string; icon: React.ReactNode; color: string }[] = [
    { id: 'admin', label: 'Admin', fullLabel: 'Administrador', icon: <ShieldCheck className="w-3.5 h-3.5 shrink-0" />, color: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
    { id: 'receptionist', label: 'Recepción', fullLabel: 'Recepción / Caja', icon: <UserCheck className="w-3.5 h-3.5 shrink-0" />, color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
    { id: 'trainer', label: 'Coach', fullLabel: 'Coach / Entrenador', icon: <Activity className="w-3.5 h-3.5 shrink-0" />, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  ];

  return (
    <header className="bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.08] sticky top-0 z-40 px-4 sm:px-6 py-2.5 shadow-md">
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Brand Logo (Interactive 3D Spin) */}
        <div className="flex items-center shrink-0">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer group select-none whitespace-nowrap"
            title="LEYENDS GYM • Clic para girar"
          >
            <div className={`w-10 h-10 rounded-xl bg-black border border-white/25 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.15)] ring-1 ring-white/10 transition-all duration-700 overflow-hidden shrink-0 ${
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
                <span className="font-black text-lg tracking-wider text-white">LEYENDS</span>
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

        {/* Right / Controls Bar: Unified Single-Line Layout */}
        <div className="flex items-center gap-2 xl:gap-2.5">
          
          {/* Real-time Clock */}
          <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="font-mono text-zinc-200 font-semibold tracking-tight">
              {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Today Check-Ins */}
          <div 
            onClick={() => setActiveTab('access')}
            className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 cursor-pointer hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-all text-xs shadow-sm whitespace-nowrap shrink-0"
            title="Socios ingresados hoy"
          >
            <Flame className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span className="text-zinc-300 font-medium">Accesos hoy:</span>
            <span className="font-bold text-emerald-400 font-mono text-sm">{todayCheckInsCount}</span>
          </div>

          {/* Cash Status */}
          <div 
            onClick={() => setActiveTab('cash')}
            className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] cursor-pointer hover:bg-white/[0.08] hover:border-white/25 transition-all text-xs whitespace-nowrap shrink-0"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${cashSession.status === 'open' ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-rose-500'}`} />
            <span className="text-zinc-400 font-medium">Caja:</span>
            <span className="font-bold text-zinc-200">
              {cashSession.status === 'open' ? 'Abierta' : 'Cerrada'}
            </span>
          </div>

          {/* Offline / Cloud Sync Pill Button */}
          <button
            onClick={onOpenSync}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              syncState.isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
            }`}
            title="Estado de sincronización y base de datos"
          >
            {syncState.isOnline ? (
              <Cloud className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <CloudOff className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {syncState.isOnline ? 'En línea' : 'Local'}
            </span>
          </button>

          {/* Notifications Bell Button */}
          <button
            onClick={onOpenNotifications}
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-amber-500/50 hover:bg-white/[0.08] transition-all text-gray-200 shrink-0"
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
            className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-amber-500/50 hover:bg-white/[0.08] transition-all text-gray-200 shrink-0"
            title="Ver carrito de venta"
          >
            <ShoppingCart className="w-4 h-4 text-amber-400" />
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-glow-gold animate-bounce">
                {cartItemsCount}
              </span>
            )}
          </button>

          {/* Interactive Role Switcher Selector */}
          <div className="hidden xl:flex items-center h-9 bg-white/[0.04] rounded-xl p-1 border border-white/[0.08] whitespace-nowrap shrink-0">
            <span className="text-[11px] font-semibold text-zinc-400 px-2">
              Rol:
            </span>
            <div className="flex items-center gap-1">
              {roles.map((r) => {
                const isActive = currentRole === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setCurrentRole(r.id)}
                    className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                      isActive 
                        ? `${r.color} shadow-sm border` 
                        : 'text-zinc-400 hover:text-gray-200 hover:bg-white/[0.05] border border-transparent'
                    }`}
                    title={`Cambiar vista a rol ${r.fullLabel}`}
                  >
                    {r.icon}
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Logged-in User Profile Card */}
          {currentUser && (
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-white/[0.1] whitespace-nowrap shrink-0">
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.fullName}
                className="w-8 h-8 rounded-xl object-cover border border-amber-500/40 shadow-sm shrink-0"
              />
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-white max-w-[140px] truncate">
                  {currentUser.fullName}
                </p>
                <p className="text-[10px] text-amber-400 capitalize font-semibold">
                  {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'trainer' ? 'Coach' : 'Recepción'}
                </p>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all group whitespace-nowrap shrink-0"
            title="Cerrar sesión del sistema"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>

        </div>

      </div>
    </header>
  );
};
