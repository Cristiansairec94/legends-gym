import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { 
  Fingerprint, 
  ShoppingBag, 
  Users, 
  Package, 
  Wallet, 
  LayoutDashboard, 
  Sparkles,
  Settings,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ShieldCheck,
  UserCheck,
  Layers,
  Receipt,
  TrendingUp,
  Cloud,
  Palette,
  Building2,
  Clock,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentRole, canAccessTab, lowStockProductsCount, currentUser, logout } = useGym();
  const [isConfigOpen, setIsConfigOpen] = useState(true);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard / Inicio',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
      badge: null,
    },
    {
      id: 'access',
      label: 'Control de Acceso',
      icon: <Fingerprint className="w-4 h-4 shrink-0" />,
      badge: 'Biométrico',
      highlight: true,
    },
    {
      id: 'pos',
      label: 'Punto de Venta',
      icon: <ShoppingBag className="w-4 h-4 shrink-0" />,
      badge: null,
    },
    {
      id: 'clients',
      label: 'Clientes / Membresías',
      icon: <Users className="w-4 h-4 shrink-0" />,
      badge: null,
    },
    {
      id: 'catalog',
      label: 'Catálogo de Productos',
      icon: <Layers className="w-4 h-4 shrink-0" />,
      badge: null,
    },
    {
      id: 'inventory',
      label: 'Inventario & Stock',
      icon: <Package className="w-4 h-4 shrink-0" />,
      badge: lowStockProductsCount > 0 ? `${lowStockProductsCount} bajos` : null,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
    },
    {
      id: 'incomes',
      label: 'Registro de Ingresos',
      icon: <TrendingUp className="w-4 h-4 shrink-0" />,
      badge: 'Abonos',
    },
    {
      id: 'expenses',
      label: 'Registro de Gastos',
      icon: <Receipt className="w-4 h-4 shrink-0" />,
      badge: 'Control',
    },
    {
      id: 'cash',
      label: 'Corte de Caja & Turno',
      icon: <Wallet className="w-4 h-4 shrink-0" />,
      badge: null,
    },
  ];

  const allowedMenuItems = menuItems.filter((item) => canAccessTab(item.id));
  const canConfigCatalogs = canAccessTab('config_catalogs');
  const canConfigRoles = canAccessTab('config_roles');
  const canConfigEmployees = canAccessTab('config_employees');
  const canConfigSync = canAccessTab('config_sync');
  const hasAnyConfigAccess = canConfigCatalogs || canConfigRoles || canConfigEmployees || canConfigSync;

  return (
    <aside className="w-[272px] bg-gym-card concrete-panel border-r border-gym-border flex flex-col justify-between shrink-0 h-[calc(100vh-61px)] overflow-hidden">
      {/* Navigation Links */}
      <div className="px-2.5 py-2 space-y-0.5 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-wider text-gym-muted flex items-center justify-between">
          <span>Módulos del Sistema</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" title="Sistema en línea" />
        </div>

        {allowedMenuItems.length === 0 && !hasAnyConfigAccess && (
          <div className="px-3 py-3 rounded-xl bg-gym-surface/40 border border-gym-border text-[11px] text-gym-muted text-center">
            Sin módulos asignados a este perfil.
          </div>
        )}

        {allowedMenuItems.map((item) => {
          const isActive = activeTab === item.id;
          const isPos = item.id === 'pos';

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl font-medium text-[11.5px] leading-tight transition-all text-left whitespace-nowrap ${
                isActive
                  ? isPos
                    ? 'bg-gradient-to-r from-crimson-500/25 via-crimson-500/12 to-transparent text-crimson-200 border-l-4 border-l-crimson-400 border-y border-r border-crimson-500/40 shadow-[0_0_20px_rgba(225,29,56,0.25)] font-black'
                    : 'bg-gradient-to-r from-crimson-500/[0.16] via-crimson-500/[0.06] to-[#232529]/85 text-crimson-100 border-l-4 border-l-crimson-400 border-y border-r border-crimson-500/25 shadow-[0_0_16px_rgba(225,29,56,0.12)] font-black'
                  : isPos
                  ? 'bg-crimson-500/[0.09] text-crimson-300 hover:text-crimson-200 hover:bg-crimson-500/[0.18] border border-crimson-500/35 hover:border-crimson-400/60 shadow-[0_0_12px_rgba(225,29,56,0.1)] font-bold'
                  : 'text-neutral-400 hover:bg-neutral-800/70 hover:text-neutral-100 border border-transparent hover:border-neutral-700/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={
                  isActive
                    ? isPos
                      ? 'text-crimson-400 drop-shadow-[0_0_10px_rgba(225,29,56,0.7)] shrink-0'
                      : 'text-crimson-400 drop-shadow-[0_0_8px_rgba(225,29,56,0.45)] shrink-0'
                    : isPos
                    ? 'text-crimson-400 drop-shadow-[0_0_6px_rgba(225,29,56,0.4)] shrink-0'
                    : 'text-neutral-400 shrink-0'
                }>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && (
                <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-extrabold shrink-0 ${
                  item.badgeColor || (
                    isPos
                      ? isActive
                        ? 'bg-crimson-400/25 text-crimson-200 border border-crimson-400/60'
                        : 'bg-crimson-500/20 text-crimson-300 border border-crimson-500/40'
                      : item.highlight
                      ? 'bg-crimson-500/15 text-crimson-300 border border-crimson-500/30'
                      : 'bg-neutral-800/80 text-neutral-300 border border-neutral-700/70'
                  )
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Section Divider: Configuración (Only if user has at least one admin/config permission) */}
        {hasAnyConfigAccess && (
          <div className="pt-1.5">
            <div className="px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wider text-gym-muted">
              Administración
            </div>

            {/* Configuración Header (Accordion) */}
            <div className="mt-0.5">
              <button
                onClick={() => setIsConfigOpen(!isConfigOpen)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl font-bold text-[11.5px] text-white hover:bg-gym-surface/80 transition-colors group select-none whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-crimson-600/80 to-crimson-900/90 border border-crimson-500/50 flex items-center justify-center shadow-sm shrink-0">
                    <Settings className="w-3.5 h-3.5 text-crimson-200" />
                  </div>
                  <span className="font-bold text-white text-[11.5px]">Configuración</span>
                </div>

                <span className="text-gym-muted group-hover:text-white transition-colors shrink-0">
                  {isConfigOpen ? (
                    <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                  )}
                </span>
              </button>

              {/* Tree Submenu */}
              {isConfigOpen && (
                <div className="ml-2.5 pl-2 border-l-2 border-gym-border/80 space-y-0.5 mt-0.5">
                  
                  {/* Subitem 1: Diseño Visual de Pantalla de Acceso */}
                  {canConfigCatalogs && (
                    <button
                      onClick={() => setActiveTab('config_terminal_design')}
                      className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[11px] leading-tight font-semibold transition-all text-left whitespace-nowrap ${
                        activeTab === 'config_terminal_design'
                          ? 'bg-crimson-500/15 text-crimson-200 border border-crimson-500/35 font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Palette className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'config_terminal_design' ? 'text-crimson-400' : 'text-neutral-400'}`} />
                        <span className="truncate">Diseño de Entrada</span>
                      </div>
                      <span className="text-[8.5px] px-1.5 py-0.5 rounded font-bold bg-crimson-500/20 text-crimson-300 border border-crimson-400/30 shrink-0">
                        Editor
                      </span>
                    </button>
                  )}

                  {/* Subitem 2: Catálogos de sistema (Planes & Membresías) */}
                  {canConfigCatalogs && (
                    <button
                      onClick={() => setActiveTab('config_catalogs')}
                      className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[11px] leading-tight font-semibold transition-all text-left whitespace-nowrap ${
                        activeTab === 'config_catalogs'
                          ? 'bg-crimson-500/15 text-crimson-200 border border-crimson-500/35 font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <SlidersHorizontal className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'config_catalogs' ? 'text-crimson-400' : 'text-neutral-400'}`} />
                        <span className="truncate">Catálogos de sistema</span>
                      </div>
                    </button>
                  )}

                  {/* Subitem 3: Datos del Gimnasio & Tickets */}
                  {canConfigCatalogs && (
                    <button
                      onClick={() => setActiveTab('config_gym_tickets')}
                      className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[11px] leading-tight font-semibold transition-all text-left whitespace-nowrap ${
                        activeTab === 'config_gym_tickets'
                          ? 'bg-crimson-500/15 text-crimson-200 border border-crimson-500/35 font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'config_gym_tickets' ? 'text-crimson-400' : 'text-neutral-400'}`} />
                        <span className="truncate">Gimnasio & Tickets</span>
                      </div>
                    </button>
                  )}

                  {/* Subitem 4: Parámetros Biométricos & Tolerancia */}
                  {canConfigCatalogs && (
                    <button
                      onClick={() => setActiveTab('config_biometrics')}
                      className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[11px] leading-tight font-semibold transition-all text-left whitespace-nowrap ${
                        activeTab === 'config_biometrics'
                          ? 'bg-crimson-500/15 text-crimson-200 border border-crimson-500/35 font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'config_biometrics' ? 'text-crimson-400' : 'text-neutral-400'}`} />
                        <span className="truncate">Biometría & Tolerancia</span>
                      </div>
                    </button>
                  )}

                  {/* Subitem 5: Roles */}
                  {canConfigRoles && (
                    <button
                      onClick={() => setActiveTab('config_roles')}
                      className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[11px] leading-tight font-semibold transition-all text-left whitespace-nowrap ${
                        activeTab === 'config_roles'
                          ? 'bg-crimson-500/15 text-crimson-200 border border-crimson-500/35 font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'config_roles' ? 'text-crimson-400' : 'text-neutral-400'}`} />
                        <span className="truncate">Roles & Permisos</span>
                      </div>
                      <span className="text-[8.5px] px-1.5 py-0.5 rounded font-bold bg-neutral-800/80 text-neutral-300 border border-neutral-700/70 shrink-0">
                        Roles
                      </span>
                    </button>
                  )}

                  {/* Subitem 6: Empleados */}
                  {canConfigEmployees && (
                    <button
                      onClick={() => setActiveTab('config_employees')}
                      className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[11px] leading-tight font-bold transition-all text-left whitespace-nowrap ${
                        activeTab === 'config_employees'
                          ? 'bg-crimson-500/15 text-crimson-200 border border-crimson-500/35 shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <UserCheck className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'config_employees' ? 'text-crimson-400' : 'text-neutral-400'}`} />
                        <span className="truncate">Empleados</span>
                      </div>
                      <span className="text-[8.5px] px-1.5 py-0.5 rounded font-bold bg-neutral-800/80 text-neutral-300 border border-neutral-700/70 shrink-0">
                        Personal
                      </span>
                    </button>
                  )}

                  {/* Subitem 7: Sincronización & Offline */}
                  {canConfigSync && (
                    <button
                      onClick={() => setActiveTab('config_sync')}
                      className={`w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-lg text-[11px] leading-tight font-semibold transition-all text-left whitespace-nowrap ${
                        activeTab === 'config_sync'
                          ? 'bg-crimson-500/15 text-crimson-200 border border-crimson-500/35 font-bold shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Cloud className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'config_sync' ? 'text-crimson-400' : 'text-neutral-400'}`} />
                        <span className="truncate">Sincronización & Datos</span>
                      </div>
                      <span className="text-[8.5px] px-1.5 py-0.5 rounded font-bold bg-neutral-800/80 text-neutral-300 border border-neutral-700/70 shrink-0">
                        Offline
                      </span>
                    </button>
                  )}

                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Bottom Profile / Terminal Active Info */}
      <div className="px-2.5 py-2 border-t border-gym-border bg-gym-surface/30 shrink-0">
        <div className="px-2.5 py-2 rounded-xl bg-gym-surface/60 border border-gym-border flex items-center justify-between gap-2">
          {currentUser ? (
            <div className="flex items-center gap-2 min-w-0">
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.fullName}
                className="w-8 h-8 rounded-lg object-cover border border-crimson-500/40 shrink-0" 
              />
              <div className="overflow-hidden leading-tight min-w-0">
                <div className="flex items-center gap-1 text-[9px] text-neutral-400 font-semibold uppercase tracking-wide">
                  <Sparkles className="w-2.5 h-2.5 text-crimson-400 shrink-0" />
                  <span className="truncate">En turno</span>
                </div>
                <p className="text-[11.5px] font-bold text-white truncate">
                  {currentUser.fullName}
                </p>
                <p className="text-[9.5px] text-crimson-400 font-semibold truncate capitalize">
                  {currentUser.jobTitle || currentRole}
                </p>
              </div>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="text-[11px] text-gym-muted leading-tight truncate">
                Club: <strong className="text-white">LEYENDS GYM</strong>
              </p>
              <p className="text-[10px] text-gym-muted mt-0.5 truncate">
                Rol: <strong className="text-crimson-400 capitalize">{currentRole}</strong>
              </p>
            </div>
          )}

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
