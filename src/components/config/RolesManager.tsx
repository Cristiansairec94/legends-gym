import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { UserRole, RolePermissions } from '../../types';
import { 
  ShieldCheck, 
  Lock, 
  Check, 
  X, 
  UserCheck, 
  Activity, 
  Fingerprint, 
  ShoppingBag, 
  Users, 
  Wallet, 
  Sliders, 
  Save 
} from 'lucide-react';

export const RolesManager: React.FC = () => {
  const { roles, updateRolePermissions, currentRole, setCurrentRole } = useGym();
  const [selectedRole, setSelectedRole] = useState<UserRole>('receptionist');
  const [saveToast, setSaveToast] = useState(false);

  const activeRoleDef = roles.find(r => r.id === selectedRole) || roles[0];

  const permissionLabels: { key: keyof RolePermissions; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: 'accessTurnstile', label: 'Torniquete & Acceso Biométrico', desc: 'Permite operar el terminal de huella dactilar de entrada', icon: <Fingerprint className="w-4 h-4 text-amber-400" /> },
    { key: 'manageClients', label: 'Gestión de Cartera de Clientes', desc: 'Consultar expedientes, dar de alta socios y ver fichas médicas', icon: <Users className="w-4 h-4 text-blue-400" /> },
    { key: 'enrollBiometrics', label: 'Enrolamiento de Huellas Dactilares', desc: 'Capturar y registrar muestras biométricas de socios', icon: <Fingerprint className="w-4 h-4 text-emerald-400" /> },
    { key: 'posSales', label: 'Punto de Venta (POS) Suplementos', desc: 'Vender productos, cobrar en mostrador y emitir tickets térmicos', icon: <ShoppingBag className="w-4 h-4 text-amber-400" /> },
    { key: 'manageInventory', label: 'Control y Ajuste de Inventario', desc: 'Modificar existencias, dar de alta suplementos y costos', icon: <Sliders className="w-4 h-4 text-purple-400" /> },
    { key: 'cashRegister', label: 'Caja & Arqueo de Turno', desc: 'Apertura y cierre de caja (Corte X y Z), cuadre de efectivo', icon: <Wallet className="w-4 h-4 text-emerald-400" /> },
    { key: 'viewReports', label: 'Reportes Ejecutivos & Afluencia', desc: 'Consultar métricas de ingresos y horas pico del gimnasio', icon: <Activity className="w-4 h-4 text-blue-400" /> },
    { key: 'manageEmployees', label: 'Gestión de Empleados (Personal)', desc: 'Administrar staff, sueldos, turnos y altas/bajas', icon: <UserCheck className="w-4 h-4 text-amber-400" /> },
    { key: 'manageSettings', label: 'Configuración y Catálogos', desc: 'Modificar precios de planes, datos fiscales y tolerancias', icon: <ShieldCheck className="w-4 h-4 text-red-400" /> },
  ];

  const handleTogglePermission = (key: keyof RolePermissions) => {
    const currentVal = activeRoleDef.permissions[key];
    updateRolePermissions(selectedRole, { [key]: !currentVal });
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gym-card p-5 rounded-2xl border border-gym-border shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-wide uppercase">
                  Roles & Permisos del Sistema
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-gym-surface text-gray-300 border border-gym-border">
                  Roles
                </span>
              </div>
              <p className="text-xs text-gym-muted mt-0.5">
                Definición de perfiles de usuario, niveles de seguridad y permisos de acceso a módulos.
              </p>
            </div>
          </div>
        </div>

        {saveToast && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold animate-fade-in">
            <Check className="w-4 h-4" />
            <span>Permisos actualizados</span>
          </div>
        )}
      </div>

      {/* Role Selector Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((r) => {
          const isSelected = selectedRole === r.id;
          const isCurrentActive = currentRole === r.id;

          return (
            <div
              key={r.id}
              onClick={() => setSelectedRole(r.id)}
              className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-400 shadow-glow-gold'
                  : 'bg-gym-card border-gym-border hover:border-gym-border/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md ${r.color}`}>
                  {r.badgeText}
                </span>
                {isCurrentActive && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                    Tu rol actual
                  </span>
                )}
              </div>

              <h3 className="font-bold text-base text-white mt-1">{r.name}</h3>
              <p className="text-xs text-gym-muted mt-1 leading-relaxed">{r.description}</p>

              <div className="mt-4 pt-3 border-t border-gym-border/60 flex items-center justify-between text-xs">
                <span className="text-gym-muted">
                  {Object.values(r.permissions).filter(Boolean).length} permisos activos
                </span>
                {currentRole !== r.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentRole(r.id);
                    }}
                    className="text-amber-400 hover:underline font-bold text-xs"
                  >
                    Activar este rol
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Permission Matrix */}
      <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden shadow-lg p-6">
        <div className="flex items-center justify-between border-b border-gym-border pb-4 mb-4">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <span>Matriz de Permisos para:</span>
              <span className="text-amber-400">{activeRoleDef.name}</span>
            </h3>
            <p className="text-xs text-gym-muted mt-0.5">
              Haz clic en cualquier interruptor para habilitar o denegar el acceso al módulo correspondiente.
            </p>
          </div>

          <span className="text-xs font-mono text-gym-muted bg-gym-surface px-2.5 py-1 rounded-lg border border-gym-border">
            ID: {activeRoleDef.id}
          </span>
        </div>

        <div className="divide-y divide-gym-border/40">
          {permissionLabels.map((perm) => {
            const hasPermission = activeRoleDef.permissions[perm.key];
            const isAdminRole = activeRoleDef.id === 'admin';

            return (
              <div 
                key={perm.key}
                className="py-3.5 flex items-center justify-between gap-4 hover:bg-gym-surface/30 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-gym-surface border border-gym-border shrink-0 mt-0.5">
                    {perm.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">{perm.label}</h4>
                    <p className="text-xs text-gym-muted mt-0.5">{perm.desc}</p>
                  </div>
                </div>

                <button
                  onClick={() => !isAdminRole && handleTogglePermission(perm.key)}
                  disabled={isAdminRole}
                  className={`w-12 h-6 rounded-full transition-colors p-1 relative flex items-center shrink-0 ${
                    hasPermission ? 'bg-amber-500' : 'bg-gym-surface border border-gym-border'
                  } ${isAdminRole ? 'opacity-80 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={isAdminRole ? 'El administrador siempre tiene todos los permisos activos' : 'Alternar permiso'}
                >
                  <div className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                    hasPermission ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            );
          })}
        </div>

        {activeRoleDef.id === 'admin' && (
          <p className="text-xs text-amber-400/80 mt-4 pt-3 border-t border-gym-border/60">
            * El perfil de Administrador cuenta con todos los permisos habilitados por diseño para garantizar la supervisión total del gimnasio.
          </p>
        )}
      </div>

    </div>
  );
};
