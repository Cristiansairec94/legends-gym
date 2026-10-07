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

export const IncomeHistoryView: React.FC = () => {
  const { sales, todaySalesTotal, cashSession } = useGym();

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  // Totales
  const todayStr = new Date().toISOString().slice(0, 10);
  const totalSalesCount = sales.length;
  const grandTotalSales = sales.reduce((acc, s) => acc + s.total, 0);

  // Breakdown by payment method
  const totalCash = sales.filter(s => s.paymentMethod === 'cash').reduce((acc, s) => acc + s.total, 0);
  const totalCard = sales.filter(s => s.paymentMethod === 'card').reduce((acc, s) => acc + s.total, 0);
  const totalTransfer = sales.filter(s => s.paymentMethod === 'transfer').reduce((acc, s) => acc + s.total, 0);

  const averageTicket = totalSalesCount > 0 ? Math.round(grandTotalSales / totalSalesCount) : 0;

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.cashierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'all' || s.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

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
              Registro consolidado de cobro de membresías, pases diarios y ventas de mostrador en la tienda de suplementos.
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
        
        {/* Total Ingresos Hoy */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Ingresos de Hoy</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400">
              ${todaySalesTotal.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Cobros procesados durante el día</p>
        </div>

        {/* Efectivo en Caja */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Cobrado en Efectivo</span>
            <Banknote className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">
              ${totalCash.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">En resguardo de gaveta</p>
        </div>

        {/* Tarjeta & Bancario */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Terminal & SPEI</span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-blue-400">
              ${(totalCard + totalTransfer).toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Abonos directos a cuenta bancaria</p>
        </div>

        {/* Ticket Promedio */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Ticket Promedio</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">
              ${averageTicket.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Monto medio por transacción</p>
        </div>

      </div>

      {/* Filtros & Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gym-card p-3 rounded-2xl border border-gym-border">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por folio, atleta o cajero..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gym-surface border border-gym-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gym-muted focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Method Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setMethodFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              methodFilter === 'all'
                ? 'bg-emerald-500 text-black'
                : 'bg-gym-surface text-gym-muted hover:text-white'
            }`}
          >
            Todos ({sales.length})
          </button>
          <button
            onClick={() => setMethodFilter('cash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              methodFilter === 'cash'
                ? 'bg-emerald-500 text-black'
                : 'bg-gym-surface text-gym-muted hover:text-white'
            }`}
          >
            Efectivo
          </button>
          <button
            onClick={() => setMethodFilter('card')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              methodFilter === 'card'
                ? 'bg-emerald-500 text-black'
                : 'bg-gym-surface text-gym-muted hover:text-white'
            }`}
          >
            Tarjeta
          </button>
          <button
            onClick={() => setMethodFilter('transfer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              methodFilter === 'transfer'
                ? 'bg-emerald-500 text-black'
                : 'bg-gym-surface text-gym-muted hover:text-white'
            }`}
          >
            Transferencia
          </button>
        </div>

      </div>

      {/* Tabla de Ingresos */}
      <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gym-surface/80 border-b border-gym-border text-gym-muted uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Folio / Fecha</th>
                <th className="py-3 px-4">Cliente / Socio</th>
                <th className="py-3 px-4">Artículos / Detalle</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-4">Cajero</th>
                <th className="py-3 px-4 text-right">Total Cobrado</th>
                <th className="py-3 px-4 text-center">Ticket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gym-muted">
                    No se han registrado cobros o ventas en este periodo.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => {
                  const dateObj = new Date(sale.timestamp);
                  const itemsCount = sale.items.reduce((acc, i) => acc + i.quantity, 0);

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
