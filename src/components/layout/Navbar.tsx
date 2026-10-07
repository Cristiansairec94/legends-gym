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
  Building2, 
  Bell, 
  Cloud, 
  CloudOff, 
  RefreshCw,
  ChevronDown
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
    currentRole, 
    setCurrentRole, 
    cartItemsCount, 
    todayCheckInsCount, 
    cashSession,
    activeBranch,
    branches,
    setActiveBranchId,
    unreadNotificationsCount,
    syncState
  } = useGym();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLogoSpinning, setIsLogoSpinning] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);

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
      colors: ['#FFB800', '#FF8A00', '#FFFFFF']
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
    <header className="bg-gym-card/95 backdrop-blur-md border-b border-gym-border sticky top-0 z-40 px-3 sm:px-5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        
        {/* Left: Brand Logo (Interactive 3D Spin matching Panadería Brito) */}
        <div className="flex items-center gap-4">
          <div 
            onClick={handleLogoClick}
            className="flex items-center gap-3 cursor-pointer group select-none"
            title="LEGENDS PRO GYM • Clic para girar"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-glow-gold transition-all duration-700 ${
              isLogoSpinning ? 'rotate-[360deg] scale-110' : 'group-hover:scale-105'
            }`}>
              <Dumbbell className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl tracking-wider text-white">LEGENDS</span>
                <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  PRO GYM
                </span>
              </div>
              <p className="text-[10px] text-gym-muted font-medium tracking-wide hidden sm:block">
                Sistema ERP & Control en Vivo
              </p>
            </div>
          </div>

          {/* Sede / Sucursal Selector (Like Panadería Brito Branch Selector) */}
          <div className="relative">
            <button
              onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gym-surface/90 hover:bg-gym-surface border border-gym-border text-xs text-white transition-colors"
              title="Sucursal asignada a tu turno • Clic para cambiar"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <div className="text-left hidden md:block">
                <span className="text-[10px] text-gym-muted font-bold block uppercase leading-none">
                  Sucursal:
                </span>
                <span className="font-bold text-gray-200 truncate max-w-[140px] block leading-tight">
                  {activeBranch.name.split('-')[0].trim()}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gym-muted" />
            </button>

            {/* Dropdown Menu */}
            {isBranchDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 bg-gym-card border border-gym-border rounded-xl shadow-2xl z-50 p-2 space-y-1 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] font-bold text-gym-muted uppercase">
                  Cambiar Sede Activa
                </div>
                {branches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setActiveBranchId(b.id);
                      setIsBranchDropdownOpen(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      b.id === activeBranch.id
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-gray-300 hover:bg-gym-surface hover:text-white'
                    }`}
                  >
                    <span className="truncate">{b.name}</span>
                    <span className="text-[10px] text-gym-muted font-mono">{b.code}</span>
                  </button>
                ))}
                <div className="border-t border-gym-border pt-1 mt-1">
                  <button
                    onClick={() => {
                      setActiveTab('branches');
                      setIsBranchDropdownOpen(false);
                    }}
                    className="w-full text-center py-1.5 text-xs text-amber-400 font-bold hover:underline"
                  >
                    Ver todas las sedes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center / Middle: Real-time Stats & Badges */}
        <div className="hidden lg:flex items-center gap-4 text-xs">
          
          {/* Real-time Clock */}
          <div className="flex items-center gap-2 text-gym-muted bg-gym-surface/60 px-3 py-1.5 rounded-lg border border-gym-border/60">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-gray-200">
              {currentTime.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Today Check-Ins */}
          <div 
            onClick={() => setActiveTab('access')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gym-surface/60 border border-gym-border/60 cursor-pointer hover:border-emerald-500/40 transition-colors"
            title="Socios ingresados hoy"
          >
            <Flame className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-gym-muted">Accesos hoy:</span>
            <span className="font-bold text-emerald-400">{todayCheckInsCount}</span>
          </div>

          {/* Cash Status */}
          <div 
            onClick={() => setActiveTab('cash')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gym-surface/60 border border-gym-border/60 cursor-pointer hover:border-amber-500/40 transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${cashSession.status === 'open' ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]' : 'bg-red-500'}`} />
            <span className="text-gym-muted">Caja:</span>
            <span className="font-semibold text-gray-200">
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

          {/* Interactive Role Switcher Selector */}
          <div className="flex items-center bg-gym-surface rounded-xl p-1 border border-gym-border">
            <span className="text-[10px] font-semibold text-gym-muted px-1.5 hidden md:inline">
              Rol:
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
                    title={`Cambiar a rol ${r.label}`}
                  >
                    {r.icon}
                    <span className="hidden 2xl:inline">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </header>
  );
};
