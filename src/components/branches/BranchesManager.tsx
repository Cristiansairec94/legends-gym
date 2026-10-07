import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { Branch } from '../../types';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Users, 
  Clock, 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  TrendingUp, 
  X,
  Radio,
  Dumbbell
} from 'lucide-react';

export const BranchesManager: React.FC = () => {
  const { 
    branches, 
    activeBranchId, 
    setActiveBranchId, 
    updateBranch, 
    activeMembersCount 
  } = useGym();

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Totales de la red
  const totalOccupancy = branches.reduce((acc, b) => acc + b.currentOccupancy, 0);
  const totalCapacity = branches.reduce((acc, b) => acc + b.maxCapacity, 0);
  const totalRevenue = branches.reduce((acc, b) => acc + b.todaySalesTotal, 0);
  const totalTurnstiles = branches.reduce((acc, b) => acc + b.activeTurnstiles, 0);

  const handleEditBranch = (b: Branch) => {
    setSelectedBranch(b);
    setIsEditModalOpen(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    updateBranch(selectedBranch.id, selectedBranch);
    setIsEditModalOpen(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-amber-500/20 via-gym-card to-gym-surface p-6 rounded-2xl border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                RED METROPOLITANA DE SEDES
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-amber-400" />
              Control Central de Sucursales
            </h1>
            <p className="text-xs text-gym-muted mt-1 max-w-2xl">
              Monitoreo unificado de aforo en vivo, estado de torniquetes biométricos, facturación y cambio de sede asignada a tu turno.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right bg-gym-surface/80 px-4 py-2 rounded-xl border border-gym-border">
              <p className="text-[11px] text-gym-muted font-bold uppercase">Sede Asignada Actual</p>
              <p className="text-sm font-black text-amber-400">
                {branches.find(b => b.id === activeBranchId)?.name || 'Sede Central'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Globales de la Franquicia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Aforo Total */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Aforo Global en Vivo</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{totalOccupancy}</span>
            <span className="text-xs text-gym-muted">/ {totalCapacity} atletas max</span>
          </div>
          <div className="w-full bg-gym-surface h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-amber-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round((totalOccupancy / totalCapacity) * 100))}%` }}
            />
          </div>
        </div>

        {/* Facturación de la Red */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Ventas Red Hoy</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400">
              ${totalRevenue.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Suma consolidada de todas las sedes</p>
        </div>

        {/* Torniquetes Activos */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Torniquetes Online</span>
            <Radio className="w-4 h-4 text-blue-400 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-400">{totalTurnstiles}</span>
            <span className="text-xs text-gym-muted">de {branches.reduce((acc, b) => acc + b.turnstileCount, 0)} terminales</span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% sincronización biométrica
          </p>
        </div>

        {/* Socios Activos */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Atletas en Cartera</span>
            <Dumbbell className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">
              {branches.reduce((acc, b) => acc + b.activeMembersCount, 0)}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Membresías activas registradas</p>
        </div>

      </div>

      {/* Grid de Sedes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {branches.map((b) => {
          const isCurrentActive = b.id === activeBranchId;
          const occupancyPct = Math.round((b.currentOccupancy / b.maxCapacity) * 100);

          return (
            <div 
              key={b.id}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                isCurrentActive 
                  ? 'bg-gradient-to-b from-gym-card to-[#10131d] border-amber-500/80 shadow-glow-gold/20 shadow-lg' 
                  : 'bg-gym-card border-gym-border hover:border-gym-border/80'
              }`}
            >
              {/* Card Header */}
              <div className="p-5 border-b border-gym-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-gym-surface text-amber-400 border border-gym-border">
                        {b.code}
                      </span>
                      {b.isMainBranch && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Matriz
                        </span>
                      )}
                      {isCurrentActive && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Asignada a tu Turno
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-lg text-white mt-1.5">
                      {b.name}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleEditBranch(b)}
                    className="p-1.5 rounded-lg bg-gym-surface hover:bg-gym-border text-gym-muted hover:text-white transition-colors"
                    title="Editar información de sucursal"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-gym-muted">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{b.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gym-muted shrink-0" />
                    <span>{b.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-gym-muted shrink-0" />
                    <span>Horario: {b.openTime} - {b.closeTime} hrs</span>
                  </div>
                </div>
              </div>

              {/* Card Body: Occupancy & Hardware */}
              <div className="p-5 space-y-4">
                
                {/* Aforo Gauge */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-gray-300">Aforo en sala de entrenamiento</span>
                    <span className="font-extrabold text-amber-400">
                      {b.currentOccupancy} / {b.maxCapacity} ({occupancyPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gym-surface h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        occupancyPct > 85 ? 'bg-red-500' : occupancyPct > 65 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                      style={{ width: `${Math.min(100, occupancyPct)}%` }}
                    />
                  </div>
                </div>

                {/* Submetrics Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-gym-surface/60 border border-gym-border/40">
                    <span className="text-[10px] text-gym-muted font-bold uppercase block">Torniquetes</span>
                    <span className="font-extrabold text-white">
                      {b.activeTurnstiles} / {b.turnstileCount} Operativos
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gym-surface/60 border border-gym-border/40">
                    <span className="text-[10px] text-gym-muted font-bold uppercase block">Venta Mostrador</span>
                    <span className="font-extrabold text-emerald-400">
                      ${b.todaySalesTotal.toLocaleString('es-MX')}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-gym-muted bg-gym-surface/30 p-2.5 rounded-xl border border-gym-border/30 flex items-center justify-between">
                  <span>Encargado: <strong className="text-gray-200">{b.managerName}</strong></span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>

              </div>

              {/* Card Footer: Switch Branch Button */}
              <div className="p-4 bg-gym-surface/40 border-t border-gym-border/60">
                {isCurrentActive ? (
                  <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold text-center flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Sede Seleccionada
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveBranchId(b.id)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gym-surface hover:bg-amber-500 hover:text-black text-white text-xs font-bold transition-all border border-gym-border hover:border-amber-500 flex items-center justify-center gap-2"
                  >
                    <span>Cambiar a esta Sede</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Edit Branch Modal */}
      {isEditModalOpen && selectedBranch && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gym-card border border-gym-border rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gym-border pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-lg text-white">Editar Información de Sede</h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-gym-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBranch} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gym-muted block mb-1">Nombre de la Sucursal</label>
                <input 
                  type="text" 
                  value={selectedBranch.name}
                  onChange={(e) => setSelectedBranch({ ...selectedBranch, name: e.target.value })}
                  className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gym-muted block mb-1">Dirección Completa</label>
                <input 
                  type="text" 
                  value={selectedBranch.address}
                  onChange={(e) => setSelectedBranch({ ...selectedBranch, address: e.target.value })}
                  className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gym-muted block mb-1">Teléfono</label>
                  <input 
                    type="text" 
                    value={selectedBranch.phone}
                    onChange={(e) => setSelectedBranch({ ...selectedBranch, phone: e.target.value })}
                    className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gym-muted block mb-1">Encargado / Head Coach</label>
                  <input 
                    type="text" 
                    value={selectedBranch.managerName}
                    onChange={(e) => setSelectedBranch({ ...selectedBranch, managerName: e.target.value })}
                    className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gym-muted block mb-1">Aforo Máximo (Atletas)</label>
                  <input 
                    type="number" 
                    value={selectedBranch.maxCapacity}
                    onChange={(e) => setSelectedBranch({ ...selectedBranch, maxCapacity: Number(e.target.value) })}
                    className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    min="10"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gym-muted block mb-1">Atletas en Sala (Aforo Vivo)</label>
                  <input 
                    type="number" 
                    value={selectedBranch.currentOccupancy}
                    onChange={(e) => setSelectedBranch({ ...selectedBranch, currentOccupancy: Number(e.target.value) })}
                    className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gym-surface text-gym-muted hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold shadow-glow-gold"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
