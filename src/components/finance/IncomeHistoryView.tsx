import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { Sale, PaymentMethod } from '../../types';
import { 
  TrendingUp, 
  Search, 
  DollarSign, 
  CreditCard, 
  Banknote, 
  Calendar, 
  Clock,
  Filter, 
  Download, 
  FileText, 
  CheckCircle2, 
  Dumbbell, 
  ShoppingBag,
  UserCheck,
  Eye,
  X,
  Printer
} from 'lucide-react';
import { ReceiptModal } from '../pos/ReceiptModal';
import { exportIncomeReportToExcel } from '../../utils/excelExport';

export const IncomeHistoryView: React.FC = () => {
  const { sales, todaySalesTotal, cashSession, gymSettings } = useGym();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'membership' | 'store'>('all');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  type PeriodFilterType = 'all' | 'today' | 'week' | 'month' | 'year';
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>('all');

  const isSaleInPeriod = (saleTimestamp: string, period: PeriodFilterType): boolean => {
    if (period === 'all') return true;
    const saleTime = new Date(saleTimestamp).getTime();
    if (isNaN(saleTime)) return true;
    
    const nowTime = Date.now();
    const diffMs = nowTime - saleTime;

    if (period === 'today') {
      const saleDate = new Date(saleTimestamp);
      const nowDate = new Date();
      return saleDate.getDate() === nowDate.getDate() &&
             saleDate.getMonth() === nowDate.getMonth() &&
             saleDate.getFullYear() === nowDate.getFullYear();
    }
    if (period === 'week') {
      return diffMs >= -60000 && diffMs <= 7 * 24 * 60 * 60 * 1000;
    }
    if (period === 'month') {
      const saleDate = new Date(saleTimestamp);
      const nowDate = new Date();
      const isCurrentMonth = saleDate.getMonth() === nowDate.getMonth() && saleDate.getFullYear() === nowDate.getFullYear();
      return (diffMs >= -60000 && diffMs <= 30 * 24 * 60 * 60 * 1000) || isCurrentMonth;
    }
    if (period === 'year') {
      const saleDate = new Date(saleTimestamp);
      const nowDate = new Date();
      const isCurrentYear = saleDate.getFullYear() === nowDate.getFullYear();
      return (diffMs >= -60000 && diffMs <= 365 * 24 * 60 * 60 * 1000) || isCurrentYear;
    }
    return true;
  };

  // Totales del periodo seleccionado
  const periodSales = sales.filter(s => isSaleInPeriod(s.timestamp, periodFilter));
  const periodTotalSales = periodSales.reduce((acc, s) => acc + s.total, 0);
  const periodCash = periodSales.filter(s => s.paymentMethod === 'cash').reduce((acc, s) => acc + s.total, 0);
  const periodCard = periodSales.filter(s => s.paymentMethod === 'card').reduce((acc, s) => acc + s.total, 0);
  const periodTransfer = periodSales.filter(s => s.paymentMethod === 'transfer').reduce((acc, s) => acc + s.total, 0);
  const periodAverageTicket = periodSales.length > 0 ? Math.round(periodTotalSales / periodSales.length) : 0;

  const periodLabel = periodFilter === 'all' 
    ? 'Histórico Completo' 
    : periodFilter === 'today' 
    ? 'Hoy' 
    : periodFilter === 'week' 
    ? 'Esta Semana' 
    : periodFilter === 'month' 
    ? 'Este Mes' 
    : 'Este Año';

  const filteredSales = sales.filter(s => {
    const matchesPeriod = isSaleInPeriod(s.timestamp, periodFilter);
    const matchesSearch = s.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.cashierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.planName && s.planName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesMethod = methodFilter === 'all' || s.paymentMethod === methodFilter;
    const matchesType = typeFilter === 'all' || 
                        (typeFilter === 'membership' && s.saleType === 'membership') ||
                        (typeFilter === 'store' && s.saleType !== 'membership');
    return matchesPeriod && matchesSearch && matchesMethod && matchesType;
  });

  const handleExportToExcel = () => {
    if (filteredSales.length === 0) {
      alert('No hay cobros en este periodo o filtro para generar el reporte.');
      return;
    }
    exportIncomeReportToExcel(filteredSales, periodLabel, gymSettings);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500/20 via-gym-card to-gym-surface p-6 rounded-2xl border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                AUDITORÍA DE INGRESOS & COBROS
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              <TrendingUp className="w-7 h-7 text-emerald-400" />
              Historial de Ingresos y Facturación
            </h1>
            <p className="text-xs text-gym-muted mt-1 max-w-xl">
              Registro consolidado de cobro de membresías, pases diarios y ventas en el punto de venta.
            </p>
          </div>

          <div className="text-right bg-gym-surface/80 px-4 py-2 rounded-xl border border-gym-border">
            <span className="text-[11px] text-gym-muted uppercase font-bold block">Gimnasio</span>
            <span className="text-sm font-black text-emerald-400">LEYENDS FITNESS</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Ingresos Periodo */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase truncate max-w-[170px]" title={periodLabel}>
              Ingresos ({periodLabel})
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400">
              ${periodTotalSales.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">{periodSales.length} cobro(s) en este periodo</p>
        </div>

        {/* Efectivo en Caja */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase truncate max-w-[170px]">
              Cobrado en Efectivo
            </span>
            <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">
              ${periodCash.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">En resguardo de gaveta ({periodFilter === 'all' ? 'todo' : periodLabel})</p>
        </div>

        {/* Tarjeta & Bancario */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase truncate max-w-[170px]">
              Terminal & SPEI
            </span>
            <CreditCard className="w-4 h-4 text-blue-400 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-400">
              ${(periodCard + periodTransfer).toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Abonos directos a cuenta bancaria</p>
        </div>

        {/* Ticket Promedio */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase truncate max-w-[170px]">
              Ticket Promedio
            </span>
            <ShoppingBag className="w-4 h-4 text-purple-400 shrink-0" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">
              ${periodAverageTicket.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Monto medio por transacción</p>
        </div>

      </div>

      {/* Filtros & Búsqueda */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-gym-card p-3 rounded-2xl border border-gym-border shadow-sm">
        
        {/* Search Input */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por folio, atleta o cajero..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gym-surface border border-gym-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gym-muted focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Type, Period & Method Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Period Filter (12h, Semana, Mes, Año, Todo) */}
          <div className="flex items-center gap-1 bg-gym-surface p-1 rounded-xl border border-gym-border">
            <div className="hidden sm:flex items-center gap-1 px-2 text-gym-muted text-xs font-bold border-r border-gym-border/60 mr-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Periodo:</span>
            </div>
            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                periodFilter === 'all'
                  ? 'bg-emerald-500 text-black shadow-sm'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setPeriodFilter('today')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                periodFilter === 'today'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-gym-muted hover:text-white'
              }`}
              title="Cobros registrados el día de hoy"
            >
              Hoy
            </button>
            <button
              onClick={() => setPeriodFilter('week')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                periodFilter === 'week'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-gym-muted hover:text-white'
              }`}
              title="Cobros de los últimos 7 días"
            >
              Semana
            </button>
            <button
              onClick={() => setPeriodFilter('month')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                periodFilter === 'month'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-gym-muted hover:text-white'
              }`}
              title="Cobros de este mes / últimos 30 días"
            >
              Mes
            </button>
            <button
              onClick={() => setPeriodFilter('year')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                periodFilter === 'year'
                  ? 'bg-amber-500 text-black shadow-sm'
                  : 'text-gym-muted hover:text-white'
              }`}
              title="Cobros de este año"
            >
              Año
            </button>
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1 bg-gym-surface p-1 rounded-xl border border-gym-border">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                typeFilter === 'all'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('membership')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                typeFilter === 'membership'
                  ? 'bg-purple-500 text-white'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              <Dumbbell className="w-3 h-3" />
              <span>Membresías</span>
            </button>
            <button
              onClick={() => setTypeFilter('store')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                typeFilter === 'store'
                  ? 'bg-amber-500 text-black'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Punto Venta</span>
            </button>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1 bg-gym-surface p-1 rounded-xl border border-gym-border">
            <button
              onClick={() => setMethodFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                methodFilter === 'all'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              Métodos ({sales.length})
            </button>
            <button
              onClick={() => setMethodFilter('cash')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                methodFilter === 'cash'
                  ? 'bg-emerald-500 text-black'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              Efectivo
            </button>
            <button
              onClick={() => setMethodFilter('card')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                methodFilter === 'card'
                  ? 'bg-blue-500 text-white'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              Tarjeta
            </button>
            <button
              onClick={() => setMethodFilter('transfer')}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                methodFilter === 'transfer'
                  ? 'bg-purple-500 text-white'
                  : 'text-gym-muted hover:text-white'
              }`}
            >
              Transfer
            </button>
          </div>

          {/* Botón Descargar Reporte Detallado */}
          <button
            onClick={handleExportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-xs shadow-md shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
            title={`Descargar reporte detallado de ingresos (${periodLabel}) en Excel (.xlsx)`}
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Descargar Reporte</span>
          </button>
        </div>

      </div>

      {/* Resumen del periodo activo y contador de cobros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white">Detalle de Cobros:</span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold text-[11px] inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" />
            {periodLabel}
          </span>
          <span className="text-gym-muted">
            ({filteredSales.length} {filteredSales.length === 1 ? 'cobro encontrado' : 'cobros encontrados'})
          </span>
        </div>
        <div className="flex items-center gap-2 text-gym-muted">
          <span>Total en vista:</span>
          <span className="text-emerald-400 font-mono font-black text-sm">
            ${filteredSales.reduce((acc, s) => acc + s.total, 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
          </span>
        </div>
      </div>

      {/* Tabla de Ingresos */}
      <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gym-surface/80 border-b border-gym-border text-gym-muted uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Folio / Fecha</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Cliente / Socio</th>
                <th className="py-3 px-4">Detalle de Cobro</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-4">Cajero</th>
                <th className="py-3 px-4 text-right">Total Cobrado</th>
                <th className="py-3 px-4 text-center">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gym-muted">
                    <Clock className="w-8 h-8 mx-auto text-gym-muted/40 mb-2" />
                    <p className="font-semibold text-gray-300 text-sm">
                      No se encontraron cobros registrados en {periodLabel.toLowerCase()}.
                    </p>
                    <p className="text-[11px] text-gym-muted mt-1">
                      Puedes cambiar el filtro de tiempo a &quot;Todo&quot; o seleccionar otro periodo (Hoy, Semana, Mes, Año).
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const dateObj = new Date(sale.timestamp);
                  const itemsCount = sale.items.reduce((acc, i) => acc + i.quantity, 0);
                  const isMembership = sale.saleType === 'membership';

                  return (
                    <tr key={sale.id} className="hover:bg-gym-surface/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white block">
                          {sale.folio}
                        </span>
                        <span className="text-[11px] text-gym-muted">
                          {dateObj.toLocaleDateString('es-MX')} {dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isMembership ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            <Dumbbell className="w-3 h-3" />
                            Membresía
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 whitespace-nowrap">
                            <ShoppingBag className="w-3 h-3" />
                            Punto Venta
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-200">
                          {sale.clientName}
                        </div>
                        {sale.clientId && (
                          <span className="text-[10px] text-gym-muted font-mono">
                            ID: {sale.clientId}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-gray-300">
                          {itemsCount} artículo(s)
                        </div>
                        <p className="text-[10px] text-gym-muted truncate max-w-xs" title={sale.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}>
                          {sale.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                        </p>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {sale.paymentMethod === 'cash' && <Banknote className="w-3.5 h-3.5 text-emerald-400" />}
                          {sale.paymentMethod === 'card' && <CreditCard className="w-3.5 h-3.5 text-blue-400" />}
                          {sale.paymentMethod === 'transfer' && <DollarSign className="w-3.5 h-3.5 text-purple-400" />}
                          <span className="capitalize font-medium text-gray-300">
                            {sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-gym-muted font-medium">
                        {sale.cashierName}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-sm text-emerald-400">
                          ${sale.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setSelectedSaleForReceipt(sale)}
                          className="p-1.5 rounded-lg bg-gym-surface hover:bg-emerald-500/20 text-gym-muted hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                          title="Reimprimir o ver ticket"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-bold">Ticket</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reimpresión de Ticket */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}

    </div>
  );
};
