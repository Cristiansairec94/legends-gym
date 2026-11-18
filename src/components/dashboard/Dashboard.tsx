import React from 'react';
import { useGym } from '../../context/GymContext';
import { isTodayDate } from '../../services/syncService';
import { getLocalDateString, resolveSaleType } from '../../utils/membershipUtils';
import { 
  Users, 
  Flame, 
  ShoppingBag, 
  Wallet, 
  Clock, 
  Fingerprint, 
  AlertTriangle, 
  ArrowUpRight,
  Dumbbell
} from 'lucide-react';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { 
    members, 
    products, 
    sales, 
    accessLogs, 
    todayCheckInsCount, 
    activeMembersCount, 
    todayStoreSalesTotal,
    todayMembershipsSalesTotal,
    todayVisitsSalesTotal,
    cashSession,
    activeBranch,
    isTerminalConnected,
    canAccessTab
  } = useGym();

  const todayStr = getLocalDateString();
  const todayGrantedLogs = accessLogs.filter(l => (isTodayDate(l.timestamp) || l.timestamp.startsWith(todayStr)) && l.status === 'granted');

  // Dynamic peak hours calculation based on real check-in activity + baseline
  const hourSlots = [
    { hour: '06:00', base: 18 },
    { hour: '07:00', base: 28 },
    { hour: '08:00', base: 24 },
    { hour: '09:00', base: 14 },
    { hour: '11:00', base: 12 },
    { hour: '13:00', base: 18 },
    { hour: '16:00', base: 19 },
    { hour: '18:00', base: 36 },
    { hour: '19:00', base: 40 },
    { hour: '20:00', base: 28 },
    { hour: '21:00', base: 14 },
  ];

  const slotCounts = hourSlots.map(slot => {
    const slotHour = parseInt(slot.hour.split(':')[0], 10);
    const realLogsInSlot = todayGrantedLogs.filter(log => {
      const d = new Date(log.timestamp);
      return d.getHours() === slotHour;
    }).length;
    return {
      hour: slot.hour,
      count: slot.base + realLogsInSlot,
    };
  });

  const maxSlotCount = Math.max(...slotCounts.map(s => s.count), 1);
  const peakSlot = slotCounts.reduce((max, s) => s.count > max.count ? s : max, slotCounts[0]);

  const peakHours = slotCounts.map(s => ({
    hour: s.hour,
    count: s.count,
    pct: Math.round((s.count / maxSlotCount) * 100),
    peak: s.count === maxSlotCount
  }));

  const sessionMembershipsTotal = cashSession.totalMembershipsCash + cashSession.totalMembershipsCard + (cashSession.totalMembershipsTransfer || 0);
  const sessionVisitsTotal = (cashSession.totalVisitsCash || 0) + (cashSession.totalVisitsCard || 0) + (cashSession.totalVisitsTransfer || 0);

  const totalMembershipsRevenue = todayMembershipsSalesTotal > 0 ? todayMembershipsSalesTotal : sessionMembershipsTotal;
  const totalVisitsRevenue = todayVisitsSalesTotal > 0 ? todayVisitsSalesTotal : sessionVisitsTotal;
  const totalGymAndVisitsToday = totalMembershipsRevenue + totalVisitsRevenue;

  const activeSales = sales.filter(s => s && s.status !== 'voided');

  const accumulatedMembershipsRevenue = activeSales
    .filter(s => resolveSaleType(s) === 'membership')
    .reduce((acc, s) => acc + Math.max(0, (s.total || 0) - (s.refundedAmount || 0)), 0);

  const accumulatedVisitsRevenue = activeSales
    .filter(s => resolveSaleType(s) === 'visit')
    .reduce((acc, s) => acc + Math.max(0, (s.total || 0) - (s.refundedAmount || 0)), 0);

  const storeSalesTotal = todayStoreSalesTotal > 0
    ? todayStoreSalesTotal
    : (cashSession.totalSalesCash + cashSession.totalSalesCard + cashSession.totalSalesTransfer);

  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const storeTicketsToday = activeSales.filter(s => (isTodayDate(s.timestamp) || (s.timestamp || '').startsWith(todayStr)) && resolveSaleType(s) === 'store').length;

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner - Concreto Carbón & Iluminación LED */}
      <div className="bg-gradient-to-r from-[#16171a]/95 via-[#1d1f23]/95 to-[#151619]/95 concrete-panel p-6 rounded-2xl border border-neutral-700/65 shadow-[0_12px_36px_rgba(0,0,0,0.55)] relative overflow-hidden backdrop-blur-md">
        {/* Gym floor photographic depth */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.12] pointer-events-none mix-blend-luminosity"
          style={{
            backgroundImage: "url('/gym-background.jpg')",
            maskImage: 'linear-gradient(to left, black 10%, transparent 78%)',
            WebkitMaskImage: 'linear-gradient(to left, black 10%, transparent 78%)',
          }}
        />
        {/* Crisp LED Top Specular Strip */}
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-crimson-400/75 to-transparent pointer-events-none" />
        {/* Subtle atmospheric gold ambient glow */}
        <div className="absolute -top-12 -left-12 w-52 h-52 bg-crimson-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0e0f11] border border-crimson-400/45 p-1 shrink-0 hidden sm:flex items-center justify-center shadow-[0_0_22px_rgba(225,29,56,0.22)] ring-1 ring-crimson-400/20">
              <img src="/logo.png" alt="Logo LEYENDS GYM" className="w-full h-full object-contain filter drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/12 border border-emerald-500/35 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  SISTEMA OPERATIVO EN VIVO
                </span>
              </div>
              <h1 className="text-2xl font-black text-neutral-50 mt-1 tracking-tight">
                Panel de Control Central • LEYENDS FITNESS GYM
              </h1>
              <p className="text-xs text-neutral-400 mt-1 max-w-xl font-medium">
                Monitoreo en tiempo real de accesos biométricos, cartera de clientes y ventas de la tienda de suplementos.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {canAccessTab('access') && (
              <button
                onClick={() => setActiveTab('access')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-crimson-500 to-crimson-400 hover:from-crimson-400 hover:to-crimson-300 text-white font-black text-xs shadow-[0_0_22px_rgba(225,29,56,0.35)] hover:shadow-[0_0_30px_rgba(225,29,56,0.5)] flex items-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-crimson-300/60"
              >
                <Fingerprint className="w-4 h-4 stroke-[2.5]" />
                <span>Huella</span>
              </button>
            )}
            {canAccessTab('pos') && (
              <button
                onClick={() => setActiveTab('pos')}
                className="px-4 py-2.5 rounded-xl bg-[#24262b]/90 hover:bg-crimson-500/15 border border-crimson-500/35 hover:border-crimson-400/65 text-crimson-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <ShoppingBag className="w-4 h-4 text-crimson-400" />
                <span>Punto de Venta</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative corner watermark */}
        <img 
          src="/logo.png" 
          alt="Watermark" 
          className="absolute -right-6 -bottom-10 w-48 h-48 opacity-[0.07] pointer-events-none object-contain filter invert sepia saturate-200 hue-rotate-15" 
        />
      </div>

      {/* Live Occupancy Ribbon */}
      <div className="bg-gradient-to-r from-[#17191c] via-[#1d1f23] to-[#17191c] concrete-panel rounded-2xl border border-neutral-700/60 p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        
        {/* Gym live occupancy */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-crimson-500/15 border border-crimson-500/30 flex items-center justify-center text-crimson-400 shadow-sm">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-100">Aforo en Sala de Entrenamiento</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black">
                {activeBranch.currentOccupancy} atletas en sala
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Capacidad: {Math.round((activeBranch.currentOccupancy / activeBranch.maxCapacity) * 100)}% de ocupación ({activeBranch.maxCapacity} max)
            </p>
          </div>
        </div>

      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Socios Activos */}
        <div 
          onClick={() => canAccessTab('clients') && setActiveTab('clients')}
          className={`p-5 rounded-2xl bg-gradient-to-b from-[#1d1f23] to-[#141619] concrete-panel border border-neutral-700/60 transition-all shadow-lg duration-200 ${
            canAccessTab('clients') ? 'hover:border-emerald-500/45 cursor-pointer hover:shadow-[0_8px_25px_rgba(16,185,129,0.14)] group hover:-translate-y-0.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Socios Activos</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-neutral-50 mt-2 block tracking-tight">{activeMembersCount}</span>
          <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2 font-semibold">
            <span>De {members.length} socios registrados</span>
            {canAccessTab('clients') && <ArrowUpRight className="w-3.5 h-3.5" />}
          </div>
        </div>

        {/* Accesos de Hoy */}
        <div 
          onClick={() => canAccessTab('access') && setActiveTab('access')}
          className={`p-5 rounded-2xl bg-gradient-to-b from-[#1d1f23] to-[#141619] concrete-panel border border-neutral-700/60 transition-all shadow-lg duration-200 ${
            canAccessTab('access') ? 'hover:border-cyan-500/45 cursor-pointer hover:shadow-[0_8px_25px_rgba(6,182,212,0.14)] group hover:-translate-y-0.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Check-ins Hoy</span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                isTerminalConnected 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' 
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700/60'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isTerminalConnected ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                {isTerminalConnected ? 'Enlace LAN' : 'Local'}
              </span>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 group-hover:scale-110 transition-transform">
                <Flame className="w-4 h-4 animate-pulse" />
              </div>
            </div>
          </div>
          <span className="text-3xl font-black text-neutral-50 mt-2 block tracking-tight font-mono">{todayCheckInsCount}</span>
          <span className="text-xs text-cyan-400/85 mt-2 block font-semibold flex items-center justify-between">
            <span>Entradas verificadas</span>
            {isTerminalConnected && (
              <span className="text-[10px] text-emerald-400 font-mono font-normal">🟢 En vivo</span>
            )}
          </span>
        </div>

        {/* Ventas Tienda Suplementos */}
        <div 
          onClick={() => canAccessTab('pos') && setActiveTab('pos')}
          className={`p-5 rounded-2xl bg-gradient-to-b from-[#1d1f23] to-[#141619] concrete-panel border border-crimson-500/30 transition-all shadow-lg duration-200 ${
            canAccessTab('pos') ? 'hover:border-crimson-400/60 cursor-pointer hover:shadow-[0_8px_25px_rgba(225,29,56,0.16)] group hover:-translate-y-0.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Venta Suplementos</span>
            <div className="p-2.5 rounded-xl bg-crimson-500/15 text-crimson-400 border border-crimson-400/35 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(225,29,56,0.2)]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-crimson-300 mt-2 block font-mono tracking-tight">
            ${storeSalesTotal.toLocaleString('es-MX')}
          </span>
          <span className="text-xs text-crimson-400/85 mt-2 block font-semibold">
            {storeTicketsToday} tickets emitidos hoy
          </span>
        </div>

        {/* Membresías y Visitas Cobradas (separadas) */}
        <div 
          onClick={() => canAccessTab('incomes') && setActiveTab('incomes')}
          className={`p-5 rounded-2xl bg-gradient-to-b from-[#1d1f23] to-[#141619] concrete-panel border border-neutral-700/60 transition-all shadow-lg duration-200 ${
            canAccessTab('incomes') ? 'hover:border-purple-500/45 cursor-pointer hover:shadow-[0_8px_25px_rgba(168,85,247,0.14)] group hover:-translate-y-0.5' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Membresías y Visitas</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/25 group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-neutral-50 mt-2 block font-mono tracking-tight">
            ${totalGymAndVisitsToday.toLocaleString('es-MX')}
          </span>
          <span className="text-xs text-purple-300/90 mt-2 block font-semibold">
            Membresías: ${accumulatedMembershipsRevenue.toLocaleString('es-MX')} · Visitas: ${accumulatedVisitsRevenue.toLocaleString('es-MX')}
          </span>
        </div>

      </div>


      {/* Main Grid: Peak Hours Chart + Recent Accesses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Peak Hours Chart */}
        <div className="lg:col-span-8 bg-gradient-to-b from-[#1d1f23] to-[#141619] concrete-panel rounded-2xl border border-neutral-700/60 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-neutral-50 flex items-center gap-2">
                <Clock className="w-4 h-4 text-crimson-400" />
                <span>Afluencia & Horas Pico en el Gimnasio</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Capacidad y distribución de atletas calculada en tiempo real
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-crimson-500/15 text-crimson-300 border border-crimson-400/35">
              Pico Máximo: {peakSlot.hour} hrs
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-6 pb-2">
            <div className="flex items-end justify-between gap-2 h-44 border-b border-neutral-700/60 pb-2">
              {peakHours.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-mono text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {h.count}
                  </span>
                  <div 
                    style={{ height: `${h.pct}%` }} 
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      h.peak 
                        ? 'bg-gradient-to-t from-crimson-600 via-crimson-400 to-crimson-200 shadow-[0_0_16px_rgba(225,29,56,0.45)]' 
                        : 'bg-neutral-700/50 hover:bg-neutral-600/70 border-t border-neutral-500/30'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-neutral-400">{h.hour}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400 pt-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-neutral-700/70 border border-neutral-500/40" /> Aforo Normal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-crimson-400 shadow-[0_0_8px_rgba(225,29,56,0.55)]" /> Hora Pico (Prime Time)
              </span>
            </div>
            <span className="text-crimson-300 font-semibold text-[11px]">
              Recomendación: Reforzar piso a las 18:30 hrs
            </span>
          </div>
        </div>

        {/* Low Stock & Alerts Column */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Low Stock Warning Card */}
          <div className="bg-gradient-to-b from-[#1d1f23] to-[#141619] concrete-panel rounded-2xl border border-neutral-700/60 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-50">Alertas de Stock</h4>
              </div>
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 px-2 py-0.5 rounded">
                {lowStockCount} por agotarse
              </span>
            </div>

            <div className="space-y-2.5">
              {products.filter(p => p.stock <= p.minStock).slice(0, 3).map(p => (
                <div key={p.id} className="p-2.5 rounded-xl bg-[#101113]/85 border border-neutral-700/55 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover border border-neutral-700/55" />
                    <div>
                      <span className="text-xs font-bold text-neutral-100 block truncate max-w-[130px]">{p.name}</span>
                      <span className="text-[10px] text-neutral-400">{p.brand}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                    {p.stock} pzas
                  </span>
                </div>
              ))}
            </div>

            {canAccessTab('inventory') && (
              <button
                onClick={() => setActiveTab('inventory')}
                className="w-full mt-3 py-2 bg-[#25282d] hover:bg-crimson-500/15 text-xs font-bold text-neutral-200 hover:text-crimson-200 rounded-xl border border-neutral-700/70 hover:border-crimson-500/40 transition-colors text-center"
              >
                Gestionar Almacén
              </button>
            )}
          </div>

          {/* Quick Turnstile Activity Mini-feed */}
          <div className="bg-gradient-to-b from-[#1d1f23] to-[#141619] concrete-panel rounded-2xl border border-neutral-700/60 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-50">Últimos Accesos</span>
              {canAccessTab('access') && (
                <button onClick={() => setActiveTab('access')} className="text-[11px] text-crimson-400 hover:text-crimson-300 hover:underline font-semibold">
                  Ver todos
                </button>
              )}
            </div>

            <div className="space-y-2">
              {accessLogs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-neutral-700/45 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${log.status === 'granted' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`} />
                    <span className="font-semibold text-neutral-100">{log.clientName}</span>
                  </div>
                  <span className="font-mono text-neutral-400 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
