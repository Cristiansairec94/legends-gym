import React from 'react';
import { useGym } from '../../context/GymContext';
import { 
  Users, 
  Flame, 
  ShoppingBag, 
  Wallet, 
  Clock, 
  Fingerprint, 
  AlertTriangle, 
  ArrowUpRight,
  Dumbbell,
  Building2
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
    cashSession,
    activeBranch,
    todayExpensesTotal
  } = useGym();


  // Peak hours mock data for gym crowd
  const peakHours = [
    { hour: '06:00', count: 18, pct: 45 },
    { hour: '07:00', count: 32, pct: 80 },
    { hour: '08:00', count: 28, pct: 70 },
    { hour: '09:00', count: 15, pct: 38 },
    { hour: '11:00', count: 12, pct: 30 },
    { hour: '13:00', count: 20, pct: 50 },
    { hour: '16:00', count: 19, pct: 48 },
    { hour: '18:00', count: 38, pct: 95, peak: true },
    { hour: '19:00', count: 40, pct: 100, peak: true },
    { hour: '20:00', count: 30, pct: 75 },
    { hour: '21:00', count: 14, pct: 35 },
  ];

  const totalMembershipsRevenue = cashSession.totalMembershipsCash + cashSession.totalMembershipsCard;
  const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-amber-500/20 via-gym-card to-gym-surface p-6 rounded-2xl border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black border border-amber-500/40 p-1 shrink-0 hidden sm:flex items-center justify-center shadow-glow-gold">
              <img src="/logo.png" alt="Logo LEYENDS GYM" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs uppercase font-extrabold tracking-wider text-amber-400">
                  SISTEMA OPERATIVO EN VIVO
                </span>
              </div>
              <h1 className="text-2xl font-black text-white mt-1">
                Panel de Control Central • LEYENDS FITNESS GYM
              </h1>
              <p className="text-xs text-gym-muted mt-1 max-w-xl">
                Monitoreo en tiempo real de torniquetes biométricos, cartera de clientes y ventas de la tienda de suplementos.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('access')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold flex items-center gap-1.5 transition-all"
            >
              <Fingerprint className="w-4 h-4 stroke-[2.5]" />
              <span>Torniquete Huella</span>
            </button>
            <button
              onClick={() => setActiveTab('pos')}
              className="px-4 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Punto de Venta</span>
            </button>
          </div>
        </div>

        {/* Decorative corner watermark */}
        <img 
          src="/logo.png" 
          alt="Watermark" 
          className="absolute -right-6 -bottom-10 w-48 h-48 opacity-15 pointer-events-none object-contain" 
        />
      </div>

      {/* Multi-Branch & Net Profit Ribbon */}
      <div className="bg-gym-card rounded-2xl border border-gym-border p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Branch quick info */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-200">{activeBranch.name}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-extrabold">
                {activeBranch.currentOccupancy} atletas en sala
              </span>
            </div>
            <p className="text-[11px] text-gym-muted">
              Capacidad: {Math.round((activeBranch.currentOccupancy / activeBranch.maxCapacity) * 100)}% de ocupación ({activeBranch.maxCapacity} max)
            </p>
          </div>
        </div>

        {/* Quick balance of the day */}
        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gym-border pt-3 md:pt-0">
          <div className="text-right">
            <span className="text-[10px] text-gym-muted uppercase font-bold block">Gastos Hoy</span>
            <span className="text-sm font-bold text-red-400 font-mono">
              -${todayExpensesTotal.toLocaleString('es-MX')}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-gym-muted uppercase font-bold block">Utilidad Neta Hoy</span>
            <span className={`text-base font-black font-mono ${
              todaySalesTotal - todayExpensesTotal >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              ${(todaySalesTotal - todayExpensesTotal).toLocaleString('es-MX')}
            </span>
          </div>

          <button
            onClick={() => setActiveTab('branches')}
            className="px-3 py-1.5 rounded-xl bg-gym-surface hover:bg-amber-500 hover:text-black text-white text-xs font-bold transition-colors border border-gym-border"
          >
            Ver Sedes
          </button>
        </div>

      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Socios Activos */}
        <div 
          onClick={() => setActiveTab('clients')}
          className="p-5 rounded-2xl bg-gym-card border border-gym-border hover:border-amber-400/50 transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gym-muted">Socios Activos</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-white mt-2 block">{activeMembersCount}</span>
          <div className="flex items-center gap-1 text-xs text-emerald-400 mt-2">
            <span>De {members.length} socios registrados</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Accesos de Hoy */}
        <div 
          onClick={() => setActiveTab('access')}
          className="p-5 rounded-2xl bg-gym-card border border-gym-border hover:border-amber-400/50 transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gym-muted">Check-ins Hoy</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <span className="text-3xl font-black text-amber-400 mt-2 block">{todayCheckInsCount}</span>
          <span className="text-xs text-gym-muted mt-2 block">
            Entradas verificadas en torniquete
          </span>
        </div>

        {/* Ventas Tienda Suplementos */}
        <div 
          onClick={() => setActiveTab('pos')}
          className="p-5 rounded-2xl bg-gym-card border border-gym-border hover:border-amber-400/50 transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gym-muted">Venta Suplementos</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-blue-400 mt-2 block font-mono">
            ${todaySalesTotal.toLocaleString('es-MX')}
          </span>
          <span className="text-xs text-gym-muted mt-2 block">
            {sales.length} tickets emitidos hoy
          </span>
        </div>

        {/* Membresías Cobradas */}
        <div 
          onClick={() => setActiveTab('incomes')}
          className="p-5 rounded-2xl bg-gym-card border border-gym-border hover:border-amber-400/50 transition-all cursor-pointer shadow-md group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-gym-muted">Ingresos Cuotas</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-black text-purple-400 mt-2 block font-mono">
            ${totalMembershipsRevenue.toLocaleString('es-MX')}
          </span>
          <span className="text-xs text-gym-muted mt-2 block">
            Mensualidades y renovaciones
          </span>
        </div>

      </div>


      {/* Main Grid: Peak Hours Chart + Recent Accesses */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Peak Hours Chart */}
        <div className="lg:col-span-8 bg-gym-card rounded-2xl border border-gym-border p-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Afluencia & Horas Pico en el Gimnasio</span>
              </h3>
              <p className="text-xs text-gym-muted mt-0.5">
                Capacidad y distribución de atletas a lo largo de la jornada
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Pico Máximo: 19:00 hrs
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-6 pb-2">
            <div className="flex items-end justify-between gap-2 h-44 border-b border-gym-border pb-2">
              {peakHours.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <span className="text-[10px] font-mono text-gym-muted opacity-0 group-hover:opacity-100 transition-opacity">
                    {h.count}
                  </span>
                  <div 
                    style={{ height: `${h.pct}%` }} 
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      h.peak 
                        ? 'bg-gradient-to-t from-amber-600 to-amber-400 shadow-glow-gold' 
                        : 'bg-gym-surface hover:bg-amber-500/40'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-gym-muted">{h.hour}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gym-muted pt-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-gym-surface" /> Aforo Normal
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 shadow-glow-gold" /> Hora Pico (Prime Time)
              </span>
            </div>
            <span className="text-amber-400 font-semibold text-[11px]">
              Recomendación: Reforzar piso a las 18:30 hrs
            </span>
          </div>
        </div>

        {/* Low Stock & Alerts Column */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Low Stock Warning Card */}
          <div className="bg-gym-card rounded-2xl border border-gym-border p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <h4 className="font-bold text-xs uppercase tracking-wider text-white">Alertas de Stock</h4>
              </div>
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                {lowStockCount} por agotarse
              </span>
            </div>

            <div className="space-y-2.5">
              {products.filter(p => p.stock <= p.minStock).slice(0, 3).map(p => (
                <div key={p.id} className="p-2.5 rounded-xl bg-gym-surface/60 border border-gym-border/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={p.image} alt={p.name} className="w-8 h-8 rounded-lg object-cover" />
                    <div>
                      <span className="text-xs font-bold text-white block truncate max-w-[130px]">{p.name}</span>
                      <span className="text-[10px] text-gym-muted">{p.brand}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                    {p.stock} pzas
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveTab('inventory')}
              className="w-full mt-3 py-2 bg-gym-surface hover:bg-gym-surface/80 text-xs font-bold text-gray-200 rounded-xl border border-gym-border transition-colors text-center"
            >
              Gestionar Almacén
            </button>
          </div>

          {/* Quick Turnstile Activity Mini-feed */}
          <div className="bg-gym-card rounded-2xl border border-gym-border p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white">Últimos Accesos</span>
              <button onClick={() => setActiveTab('access')} className="text-[11px] text-amber-400 hover:underline">
                Ver todos
              </button>
            </div>

            <div className="space-y-2">
              {accessLogs.slice(0, 3).map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gym-border/40 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${log.status === 'granted' ? 'bg-emerald-400' : 'bg-red-500'}`} />
                    <span className="font-semibold text-white">{log.clientName}</span>
                  </div>
                  <span className="font-mono text-gym-muted text-[10px]">
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
