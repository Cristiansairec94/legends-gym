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
  Cloud
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { currentRole, lowStockProductsCount } = useGym();
  const [isConfigOpen, setIsConfigOpen] = useState(true);

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard / Inicio',
      icon: <LayoutDashboard className="w-5 h-5" />,
      badge: null,
      roles: ['admin', 'trainer', 'receptionist'],
    },
    {
      id: 'access',
      label: 'Acceso Torniquete (Huella)',
      icon: <Fingerprint className="w-5 h-5" />,
      badge: 'Biométrico',
      roles: ['admin', 'receptionist', 'trainer'],
      highlight: true,
    },
    {
      id: 'pos',
      label: 'Punto de Venta (POS)',
      icon: <ShoppingBag className="w-5 h-5" />,
      badge: 'Tienda Fit',
      roles: ['admin', 'receptionist'],
    },
    {
      id: 'clients',
      label: 'Socios & Atletas',
      icon: <Users className="w-5 h-5" />,
      badge: null,
      roles: ['admin', 'receptionist', 'trainer'],
    },
    {
      id: 'catalog',
      label: 'Catálogo de Suplementos',
      icon: <Layers className="w-5 h-5" />,
      badge: null,
      roles: ['admin', 'receptionist'],
    },
    {
      id: 'inventory',
      label: 'Inventario & Stock',
      icon: <Package className="w-5 h-5" />,
      badge: lowStockProductsCount > 0 ? `${lowStockProductsCount} bajos` : null,
      badgeColor: 'bg-red-500/20 text-red-400 border border-red-500/30',
      roles: ['admin', 'receptionist'],
    },
    {
      id: 'incomes',
      label: 'Registro de Ingresos',
      icon: <TrendingUp className="w-5 h-5" />,
      badge: 'Abonos',
      roles: ['admin', 'receptionist'],
    },
    {
      id: 'expenses',
      label: 'Registro de Gastos',
      icon: <Receipt className="w-5 h-5" />,
      badge: 'Control',
      roles: ['admin', 'receptionist'],
    },
    {
      id: 'cash',
      label: 'Corte de Caja & Turno',
      icon: <Wallet className="w-5 h-5" />,
      badge: null,
      roles: ['admin', 'receptionist'],
    },
  ];

  return (
    <aside className="w-64 bg-gym-card border-r border-gym-border flex flex-col justify-between shrink-0 h-[calc(100vh-61px)]">
      {/* Navigation Links */}
      <div className="p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-gym-muted flex items-center justify-between">
          <span>Módulos del Sistema</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" title="Sistema en línea" />
        </div>

        {menuItems.map((item) => {
          const isAllowed = item.roles.includes(currentRole);
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => isAllowed && setActiveTab(item.id)}
              disabled={!isAllowed}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium text-xs transition-all text-left ${
                !isAllowed
                  ? 'opacity-35 cursor-not-allowed text-gym-muted hover:bg-transparent'
                  : isActive
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm font-bold'
                  : 'text-gray-300 hover:bg-gym-surface hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-amber-400' : 'text-gym-muted'}>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge && isAllowed && (
                <span className={`text-[9px] px-2 py-0.5 rounded font-extrabold ${
                  item.badgeColor || (item.highlight ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-gym-surface text-gym-muted border border-gym-border')
                }`}>
                  {item.badge}
                </span>
              )}

              {!isAllowed && (
                <span className="text-[9px] text-gym-muted uppercase font-semibold">
                  Bloq
                </span>
              )}
            </button>
          );
        })}

        {/* Section Divider: Configuración */}
        <div className="pt-2">
          <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gym-muted">
            Administración
          </div>

          {/* Configuración Header (Accordion) */}
          <div className="mt-1">
            <button
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold text-xs text-white hover:bg-gym-surface/80 transition-colors group select-none"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600/80 to-amber-900/90 border border-amber-500/50 flex items-center justify-center shadow-sm">
                  <Settings className="w-3.5 h-3.5 text-amber-200" />
                </div>
                <span className="font-bold text-white text-xs">Configuración</span>
              </div>

              <span className="text-gym-muted group-hover:text-white transition-colors">
                {isConfigOpen ? (
                  <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
              </span>
            </button>

            {/* Tree Submenu */}
            {isConfigOpen && (
              <div className="ml-4 pl-2.5 border-l-2 border-gym-border/80 space-y-1 mt-1">
                
                {/* Subitem 1: Catálogos de sistema */}
                <button
                  onClick={() => setActiveTab('config_catalogs')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                    activeTab === 'config_catalogs'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gym-surface'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-gym-muted" />
                    <span>Catálogos de sistema</span>
                  </div>
                </button>

                {/* Subitem 2: Roles */}
                <button
                  onClick={() => setActiveTab('config_roles')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                    activeTab === 'config_roles'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gym-surface'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-gym-muted" />
                    <span>Roles & Permisos</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[#1B2030] text-gray-300 border border-gym-border">
                    Roles
                  </span>
                </button>

                {/* Subitem 3: Empleados */}
                <button
                  onClick={() => setActiveTab('config_employees')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-left ${
                    activeTab === 'config_employees'
                      ? 'bg-gradient-to-r from-amber-950/70 to-gym-surface border border-amber-600/80 text-white shadow-glow-gold/20'
                      : 'text-gray-300 hover:text-white hover:bg-gym-surface'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCheck className={`w-3.5 h-3.5 ${activeTab === 'config_employees' ? 'text-amber-400' : 'text-gym-muted'}`} />
                    <span>Empleados</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-[#4a1827] text-rose-200 border border-rose-500/30">
                    Personal
                  </span>
                </button>

                {/* Subitem 4: Sincronización & Offline */}
                <button
                  onClick={() => setActiveTab('config_sync')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all text-left ${
                    activeTab === 'config_sync'
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'text-gray-300 hover:text-white hover:bg-gym-surface'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Cloud className="w-3.5 h-3.5 text-gym-muted" />
                    <span>Sincronización & Datos</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    Offline
                  </span>
                </button>

              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Profile / Terminal Active Info */}
      <div className="p-3 border-t border-gym-border bg-gym-surface/30">
        <div className="p-2.5 rounded-xl bg-gym-surface/60 border border-gym-border">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-gray-200">Terminal Activa</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <p className="text-[11px] text-gym-muted leading-tight">
            Club: <strong className="text-white">LEYENDS FITNESS GYM</strong>
          </p>
          <p className="text-[10px] text-gym-muted mt-0.5">
            Rol: <strong className="text-amber-400 capitalize">{currentRole}</strong>
          </p>
        </div>
      </div>
    </aside>
  );
};
