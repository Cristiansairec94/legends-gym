import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import {  
  Clock, 
  Bell, 
  Cloud, 
  CloudOff, 
  LogOut,
  ShieldCheck
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
  onOpenCart: _onOpenCart, 
  onOpenNotifications,
  onOpenSync,
  activeTab: _activeTab,
  setActiveTab 
}) => {
  const { 
    currentUser,
    currentRole,
    setCurrentRole,
    firstAllowedTab,
    isAdmin,
    logout,
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
      colors: ['#FF4757', '#E11D38', '#10B981', '#F8FAFC']
    });
    setTimeout(() => setIsLogoSpinning(false), 900);
    if (firstAllowedTab !== 'none') {
      setActiveTab(firstAllowedTab);
    }
  };


  return (
    <header className="relative bg-gradient-to-r from-[#141518]/95 via-[#1a1c20]/95 to-[#141518]/95 concrete-panel backdrop-blur-xl border-b border-neutral-800 sticky top-0 z-40 px-4 sm:px-6 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* LED White/Gold architectural strip accent */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-crimson-400/55 to-transparent pointer-events-none" />
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Brand Logo (Interactive 3D Spin) */}
        <div className="flex items-center shrink-0">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer group select-none whitespace-nowrap"
            title="LEYENDS GYM • Clic para girar"
          >
            <div className={`w-10 h-10 rounded-xl bg-[#0e0f11] border border-crimson-400/45 p-1 flex items-center justify-center shadow-[0_0_16px_rgba(225,29,56,0.2)] ring-1 ring-crimson-400/15 transition-all duration-700 overflow-hidden shrink-0 ${
              isLogoSpinning ? 'rotate-[360deg] scale-110 border-crimson-300 ring-2 ring-crimson-400/50' : 'group-hover:scale-105 group-hover:border-crimson-400/80'
            }`}>
              <img 
                src="/logo.png" 
                alt="LEYENDS GYM Logo" 
                className="w-full h-full object-contain filter drop-shadow" 
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-wider text-neutral-100">LEYENDS</span>
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-crimson-500/15 text-crimson-300 border border-crimson-400/40 tracking-wider shadow-sm">
                  FITNESS GYM
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium tracking-wide hidden sm:block">
                Sistema ERP & Control en Vivo
              </p>
            </div>
          </div>
        </div>

        {/* Right / Controls Bar: Unified Single-Line Layout */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Real-time Clock */}
          <div 
            className="hidden md:flex items-center gap-2.5 h-10 px-4 rounded-xl bg-gradient-to-r from-crimson-500/15 via-white/[0.06] to-white/[0.04] border border-crimson-500/35 shadow-[0_0_15px_rgba(225,29,56,0.12)] whitespace-nowrap shrink-0"
            title="Hora actual del sistema en vivo"
          >
            <Clock className="w-4 h-4 text-crimson-400 shrink-0" />
            <span className="font-mono text-sm sm:text-base font-black text-white tracking-wider">
              {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>


          {/* Admin Role Preview Return Pill */}
          {currentUser?.role === 'admin' && currentRole !== 'admin' && (
            <button
              onClick={() => {
                setCurrentRole('admin');
                setActiveTab('config_roles');
              }}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl bg-crimson-500 hover:bg-crimson-400 text-white text-xs font-extrabold shadow-glow-crimson transition-all whitespace-nowrap shrink-0"
              title="Salir de vista previa y restaurar acceso total de Administrador"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Volver a Admin</span>
            </button>
          )}

          {/* Offline / Cloud Sync Pill Button */}
          {onOpenSync ? (
            <button
              onClick={onOpenSync}
              className={`flex items-center gap-2 h-10 px-3.5 rounded-xl border text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                syncState.isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Estado de sincronización y base de datos"
            >
              {syncState.isOnline ? (
                <Cloud className="w-4 h-4 shrink-0" />
              ) : (
                <CloudOff className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {syncState.isOnline ? 'En línea' : 'Local'}
              </span>
            </button>
          ) : (
            <div
              className={`flex items-center gap-2 h-10 px-3.5 rounded-xl border text-xs font-bold whitespace-nowrap shrink-0 select-none ${
                syncState.isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
              title="Estado de conexión del sistema"
            >
              {syncState.isOnline ? (
                <Cloud className="w-4 h-4 shrink-0" />
              ) : (
                <CloudOff className="w-4 h-4 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {syncState.isOnline ? 'En línea' : 'Local'}
              </span>
            </div>
          )}

          {/* Notifications Bell Button (Solo Administrador) */}
          {isAdmin && (
            <button
              onClick={onOpenNotifications}
              className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-crimson-500/50 hover:bg-white/[0.08] transition-all text-gray-200 shrink-0"
              title="Centro de notificaciones y avisos"
            >
              <Bell className="w-4.5 h-4.5 text-crimson-400" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-crimson-500 text-white font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
          )}


          {/* Current Logged-in User Profile Card */}
          {currentUser && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.12] whitespace-nowrap shrink-0">
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.fullName}
                className="w-9 h-9 rounded-xl object-cover border border-crimson-500/40 shadow-sm shrink-0"
              />
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-xs font-bold text-white max-w-[140px] truncate">
                  {currentUser.fullName}
                </p>
                <p className="text-[10px] text-crimson-400 capitalize font-semibold">
                  {currentRole === 'admin' ? 'Administrador' : 'Recepción'}
                </p>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={logout}
            className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all group whitespace-nowrap shrink-0"
            title="Cerrar sesión del sistema"
          >
            <LogOut className="w-4 h-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>

        </div>

      </div>
    </header>
  );
};
