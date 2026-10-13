import React from 'react';
import { useGym } from '../../context/GymContext';
import { isTodayDate } from '../../services/syncService';
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
    todaySalesTotal, 
    todaySalesCount,
    todayStoreSalesTotal,
    todayMembershipsSalesTotal,
    cashSession,
    activeBranch,
    todayExpensesTotal,
    isTerminalConnected
  } = useGym();

  const todayStr = new Date().toISOString().slice(0, 10);
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

  const totalMembershipsRevenue = todayMembershipsSalesTotal > 0 
    ? todayMembershipsSalesTotal 
    : (cashSession.totalMembershipsCash + cashSession.totalMembershipsCard + (cashSession.totalMembershipsTransfer || 0));

  const storeSalesTotal = todayStoreSalesTotal > 0
    ? todayStoreSalesTotal
    : (cashSession.totalSalesCash + cashSession.totalSalesCard + cashSession.totalSalesTransfer);

  const totalIncomeToday = todaySalesTotal > 0 ? todaySalesTotal : (storeSalesTotal + totalMembershipsRevenue);
  const netProfitToday = totalIncomeToday - todayExpensesTotal;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;
  const storeTicketsToday = sales.filter(s => s.timestamp.startsWith(todayStr) && s.saleType !== 'membership').length;

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-zinc-900/90 via-[#131317]/90 to-zinc-900/90 p-6 rounded-2xl border border-white/[0.12] shadow-2xl relative overflow-hidden backdrop-blur-md">
        {/* Subtle atmospheric ambient glow */}
        <div className="absolute -top-10 -left-10 w-44 h-44 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black border border-white/20 p-1 shrink-0 hidden sm:flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/10">
              <img src="/logo.png" alt="Logo LEYENDS GYM" className="w-full h-full object-contain filter drop-shadow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-black uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  SISTEMA OPERATIVO EN VIVO
                </span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">
                Panel de Control Central • LEYENDS FITNESS GYM
              </h1>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl font-medium">
                Monitoreo en tiempo real de accesos biométricos, cartera de clientes y ventas de la tienda de suplementos.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab('access')}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-white"
            >
              <Fingerprint className="w-4 h-4 stroke-[2.5]" />
              <span>Huella</span>
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 hover:border-white/35 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <ShoppingBag className="w-4 h-4 text-zinc-300" />
              <span>Punto de Venta</span>
            </button>
          </div>
        </div>

        {/* Decorative corner watermark */}
        <img 
          src="/logo.png" 
          alt="Watermark" 
          className="absolute -right-6 -bottom-10 w-48 h-48 opacity-10 pointer-events-none object-contain filter invert" 
        />
      </div>

      {/* Live Occupancy & Net Profit Ribbon */}
      <div className="bg-gradient-to-r from-[#141418] via-[#111114] to-[#141418] rounded-2xl border border-white/[0.08] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        
        {/* Gym live occupancy */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/15 flex items-center justify-center text-white shadow-sm">
            <Users className="w-5 h-5 text-zinc-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-200">Aforo en Sala de Entrenamiento</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-black">
                {activeBranch.currentOccupancy} atletas en sala
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Capacidad: {Math.round((activeBranch.currentOccupancy / activeBranch.maxCapacity) * 100)}% de ocupación ({activeBranch.maxCapacity} max)
            </p>
          </div>
        </div>

        {/* Quick balance of the day */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/[0.08] pt-3 md:pt-0">
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Gastos Hoy</span>
            <span className="text-sm font-bold text-rose-400 font-mono">
              -${todayExpensesTotal.toLocaleString('es-MX')}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider block">Utilidad Neta Hoy</span>
            <span className={`text-base font-black font-mono ${
              netProfitToday >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              ${netProfitToday.toLocaleString('es-MX')}
            </span>
          </div>

          <button
            onClick={() => setActiveTab('expenses')}
            className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-rose-500 hover:text-white text-zinc-300 text-xs font-bold transition-all border border-white/10 hover:border-rose-500 shadow-sm"
          >
            Ver Gastos
          </button>
        </div>

      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Socios Activos */}
        <div 
          onClick={() => setActiveTab('clients')}
          className="p-5 rounded-2xl bg-gradient-to-b from-[#151518] to-[#0f0f12] border border-white/[0.08] hover:border-emerald-500/40 transition-all cursor-pointer shadow-lg hover:shadow-[0_8px_25px_rgba(16,185,129,0.12)] group hover:-translate-y-0.5 duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Socios Activos</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-white mt-2 block tracking-tight">{activeMembersCount}</span>
          <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2 font-semibold">
            <span>De {members.length} socios registrados</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Accesos de Hoy */}
        <div 
          onClick={() => setActiveTab('access')}
          className="p-5 rounded-2xl bg-gradient-to-b from-[#151518] to-[#0f0f12] border border-white/[0.08] hover:border-cyan-500/40 transition-all cursor-pointer shadow-lg hover:shadow-[0_8px_25px_rgba(6,182,212,0.12)] group hover:-translate-y-0.5 duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Check-ins Hoy</span>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                isTerminalConnected 
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isTerminalConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                {isTerminalConnected ? 'Enlace LAN' : 'Local'}
              </span>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
                <Flame className="w-4 h-4 animate-pulse" />
              </div>
            </div>
          </div>
          <span className="text-3xl font-black text-white mt-2 block tracking-tight font-mono">{todayCheckInsCount}</span>
          <span className="text-xs text-cyan-400/80 mt-2 block font-semibold flex items-center justify-between">
            <span>Entradas verificadas</span>
            {isTerminalConnected && (
              <span className="text-[10px] text-emerald-400 font-mono font-normal">🟢 En vivo</span>
            )}
          </span>
        </div>

        {/* Ventas Tienda Suplementos */}
        <div 
          onClick={() => setActiveTab('pos')}
          className="p-5 rounded-2xl bg-gradient-to-b from-[#151518] to-[#0f0f12] border border-white/[0.08] hover:border-white/40 transition-all cursor-pointer shadow-lg hover:shadow-[0_8px_25px_rgba(255,255,255,0.12)] group hover:-translate-y-0.5 duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Venta Suplementos</span>
            <div className="p-2.5 rounded-xl bg-white/10 text-white border border-white/20 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(255,255,255,0.15)]">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-white mt-2 block font-mono tracking-tight">
            ${storeSalesTotal.toLocaleString('es-MX')}
          </span>
          <span className="text-xs text-zinc-300 mt-2 block font-semibold">
            {storeTicketsToday} tickets emitidos hoy
          </span>
        </div>

        {/* Membresías Cobradas */}
        <div 
          onClick={() => setActiveTab('incomes')}
          className="p-5 rounded-2xl bg-gradient-to-b from-[#151518] to-[#0f0f12] border border-white/[0.08] hover:border-purple-500/40 transition-all cursor-pointer shadow-lg hover:shadow-[0_8px_25px_rgba(168,85,247,0.12)] group hover:-translate-y-0.5 duration-200"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Ingresos Cuotas</span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-white mt-2 block font-mono tracking-tight">
            ${totalMembershipsRevenue.toLocaleString('es-MX')}
          </span>
          <span className="text-xs text-purple-400/80 mt-2 block font-semibold">
            Mensualidades y renovaciones
          </span>
        </div>

      </div>


      {/* Main Grid: Peak Hours Chart + Recent Accesses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Peak Hours Chart */}
        <div className="lg:col-span-8 bg-gradient-to-b from-[#151518] to-[#0f0f12] rounded-2xl border border-white/[0.08] p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-300" />
                <span>Afluencia & Horas Pico en el Gimnasio</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Capacidad y distribución de atletas calculada en tiempo real
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
              Pico Máximo: {peakSlot.hour} hrs
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-6 pb-2">
            <div className="flex items-end justify-between gap-2 h-44 border-b border-white/[0.08] pb-2">
              {peakHours.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-mono text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {h.count}
                  </span>
                  <div 
                    style={{ height: `${h.pct}%` }} 
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      h.peak 
                        ? 'bg-gradient-to-t from-zinc-300 to-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' 
                        : 'bg-white/[0.08] hover:bg-white/[0.2]'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-zinc-400">{h.hour}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-white/10" /> Aforo Normal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" /> Hora Pico (Prime Time)
              </span>
            </div>
            <span className="text-white font-semibold text-[11px]">
              Recomendación: Reforzar piso a las 18:30 hrs
            </span>
          </div>
        </div>

        {/* Low Stock & Alerts Column */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Low Stock Warning Card */}
          <div className="bg-gradient-to-b from-[#151518] to-[#0f0f12] rounded-2xl border border-white/[0.08] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-white">Alertas de Stock</h4>
              </div>
              <span className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                {lowStockCount} por agotarse
              </span>
            </div>

            <div className="space-y-2.5">
              {products.filter(p => p.stock <= p.minStock).slice(0, 3).map(p => (
                <div key={p.id} className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <span className="text-xs font-bold text-white block truncate max-w-[130px]">{p.name}</span>
                      <span className="text-[10px] text-zinc-400">{p.brand}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                    {p.stock} pzas
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('inventory')}
              className="w-full mt-3 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-xs font-bold text-zinc-200 rounded-xl border border-white/10 transition-colors text-center"
            >
              Gestionar Almacén
            </button>
          </div>

          {/* Quick Turnstile Activity Mini-feed */}
          <div className="bg-gradient-to-b from-[#151518] to-[#0f0f12] rounded-2xl border border-white/[0.08] p-5 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white">Últimos Accesos</span>
              <button onClick={() => setActiveTab('access')} className="text-[11px] text-zinc-300 hover:text-white hover:underline font-semibold">
                Ver todos
              </button>
            </div>

            <div className="space-y-2">
              {accessLogs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/[0.06] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${log.status === 'granted' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500'}`} />
                    <span className="font-semibold text-white">{log.clientName}</span>
                  </div>
                  <span className="font-mono text-zinc-400 text-[10px]">
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
