import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import {  
  Clock, 
  Bell, 
  Cloud, 
  CloudOff, 
  LogOut,
  Zap
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
  activeTab,
  setActiveTab 
}) => {
  const { 
    currentUser,
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
      colors: ['#FFFFFF', '#E4E4E7', '#A1A1AA', '#F4F4F6']
    });
    setTimeout(() => setIsLogoSpinning(false), 900);
    setActiveTab('dashboard');
  };


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
        <div className="flex items-center gap-2.5 sm:gap-3">
          
          {/* Real-time Clock */}
          <div 
            className="hidden md:flex items-center gap-2.5 h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-white/[0.06] to-white/[0.04] border border-amber-500/35 shadow-[0_0_15px_rgba(245,158,11,0.12)] whitespace-nowrap shrink-0"
            title="Hora actual del sistema en vivo"
          >
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-mono text-sm sm:text-base font-black text-white tracking-wider">
              {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>


          {/* Offline / Cloud Sync Pill Button */}
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

          {/* Notifications Bell Button */}
          <button
            onClick={onOpenNotifications}
            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-amber-500/50 hover:bg-white/[0.08] transition-all text-gray-200 shrink-0"
            title="Centro de notificaciones y avisos"
          >
            <Bell className="w-4.5 h-4.5 text-amber-400" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black font-black text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                {unreadNotificationsCount}
              </span>
            )}
          </button>


          {/* Current Logged-in User Profile Card */}
          {currentUser && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/[0.12] whitespace-nowrap shrink-0">
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.fullName}
                className="w-9 h-9 rounded-xl object-cover border border-amber-500/40 shadow-sm shrink-0"
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
