import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { 
  Wallet, 
  Banknote, 
  CreditCard, 
  ArrowRightLeft, 
  Lock, 
  Unlock, 
  Printer 
} from 'lucide-react';

export const CashRegisterView: React.FC = () => {
  const { cashSession, closeCashSession, openCashSession } = useGym();

  const [countedCashStr, setCountedCashStr] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [initialCashStr, setInitialCashStr] = useState('1500');

  const totalStoreSales = cashSession.totalSalesCash + cashSession.totalSalesCard + cashSession.totalSalesTransfer;
  const totalMemberships = cashSession.totalMembershipsCash + cashSession.totalMembershipsCard;
  const grandTotalShift = totalStoreSales + totalMemberships;

  const totalCashCollected = cashSession.totalSalesCash + cashSession.totalMembershipsCash;
  const expectedCashInDrawer = cashSession.initialCash + totalCashCollected;

  const countedCash = parseFloat(countedCashStr) || 0;
  const cashDifference = countedCash - expectedCashInDrawer;

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!countedCashStr) return;
    closeCashSession(countedCash, closingNotes);
  };

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const init = parseFloat(initialCashStr) || 1000;
    openCashSession(init);
    setCountedCashStr('');
    setClosingNotes('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gym-card p-5 rounded-2xl border border-gym-border shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-black text-white tracking-wide uppercase">
              Corte de Caja & Arqueo de Turno
            </h1>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
              cashSession.status === 'open' 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {cashSession.status === 'open' ? 'Caja Abierta' : 'Caja Cerrada (Corte Hecho)'}
            </span>
          </div>
          <p className="text-sm text-gym-muted mt-1">
            Control de cobros por membresías, venta de suplementos en mostrador y cuadre de efectivo.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gray-200 transition-colors"
        >
          <Printer className="w-4 h-4 text-amber-400" />
          <span>Imprimir Reporte de Turno</span>
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total General */}
        <div className="p-5 rounded-2xl bg-gym-card border border-gym-border shadow-md">
          <span className="text-xs text-gym-muted block uppercase font-bold">Total Ingresado en Turno</span>
          <span className="text-3xl font-black text-amber-400 font-mono mt-1 block">
            ${grandTotalShift.toLocaleString()} MXN
          </span>
          <div className="flex justify-between text-xs text-gym-muted mt-2 pt-2 border-t border-gym-border/60">
            <span>Membresías: ${totalMemberships.toLocaleString()}</span>
            <span>Tienda: ${totalStoreSales.toLocaleString()}</span>
          </div>
        </div>

        {/* Efectivo en Caja */}
        <div className="p-5 rounded-2xl bg-gym-card border border-gym-border shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gym-muted uppercase font-bold">Efectivo Físico Esperado</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">
            ${expectedCashInDrawer.toLocaleString()} MXN
          </span>
          <span className="text-xs text-gym-muted mt-2 block">
            Fondo inicial: ${cashSession.initialCash} + Cobros: ${totalCashCollected}
          </span>
        </div>

        {/* Tarjetas Bancarias */}
        <div className="p-5 rounded-2xl bg-gym-card border border-gym-border shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gym-muted uppercase font-bold">Cobros con Tarjeta</span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-3xl font-black text-blue-400 font-mono mt-1 block">
            ${(cashSession.totalSalesCard + cashSession.totalMembershipsCard).toLocaleString()} MXN
          </span>
          <span className="text-xs text-gym-muted mt-2 block">
            Terminal POS / Débito & Crédito
          </span>
        </div>

        {/* Transferencias */}
        <div className="p-5 rounded-2xl bg-gym-card border border-gym-border shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gym-muted uppercase font-bold">Transferencias / SPEI</span>
            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-3xl font-black text-purple-400 font-mono mt-1 block">
            ${cashSession.totalSalesTransfer.toLocaleString()} MXN
          </span>
          <span className="text-xs text-gym-muted mt-2 block">
            Depósitos directos a cuenta
          </span>
        </div>

      </div>

      {/* Main Grid: Breakdown & Cash Register Action (Open / Close) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Breakdown Left Box */}
        <div className="lg:col-span-7 bg-gym-card rounded-2xl border border-gym-border p-6 shadow-md space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <span>Desglose Detallado del Turno Actual</span>
            <span className="text-xs font-mono text-gym-muted">({cashSession.id})</span>
          </h3>

          <div className="space-y-3 font-mono text-sm">
            <div className="p-3 rounded-xl bg-gym-surface/60 border border-gym-border flex justify-between items-center">
              <div>
                <span className="text-xs text-gym-muted block">Apertura de turno:</span>
                <span className="font-bold text-white text-xs">{new Date(cashSession.openedAt).toLocaleString('es-MX')}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gym-muted block">Responsable:</span>
                <span className="text-xs font-bold text-amber-400">{cashSession.openedBy}</span>
              </div>
            </div>

            <div className="divide-y divide-gym-border/40 text-xs text-gym-muted">
              <div className="py-2.5 flex justify-between">
                <span>( + ) Fondo Inicial de Caja:</span>
                <span className="text-white font-bold">${cashSession.initialCash.toFixed(2)}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span>( + ) Ventas de Suplementos (Efectivo):</span>
                <span className="text-white font-bold">${cashSession.totalSalesCash.toFixed(2)}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span>( + ) Membresías y Cuotas (Efectivo):</span>
                <span className="text-white font-bold">${cashSession.totalMembershipsCash.toFixed(2)}</span>
              </div>
              <div className="py-2.5 flex justify-between text-emerald-400 font-bold bg-emerald-500/5 px-2 rounded-lg">
                <span>( = ) Total Efectivo Físico que debe haber:</span>
                <span className="text-sm font-black">${expectedCashInDrawer.toFixed(2)} MXN</span>
              </div>
            </div>

            {/* Electronic Breakdown */}
            <div className="pt-2 border-t border-gym-border/60">
              <span className="text-[11px] font-bold text-gym-muted uppercase tracking-wider block mb-2">
                Ingresos Electrónicos (No suman a caja física):
              </span>
              <div className="space-y-1.5 text-xs text-gym-muted">
                <div className="flex justify-between">
                  <span>Membresías (Tarjeta):</span>
                  <span className="text-white">${cashSession.totalMembershipsCard.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Suplementos (Tarjeta):</span>
                  <span className="text-white">${cashSession.totalSalesCard.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Suplementos (Transferencia):</span>
                  <span className="text-white">${cashSession.totalSalesTransfer.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {cashSession.status === 'closed' && (
              <div className="mt-4 p-4 rounded-xl bg-gym-surface/80 border border-gym-border space-y-2">
                <span className="text-xs font-bold text-amber-400 block">Resultado del Cierre:</span>
                <div className="flex justify-between text-xs">
                  <span>Efectivo Contado por Cajero:</span>
                  <span className="text-white font-bold">${cashSession.actualCash?.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Diferencia:</span>
                  <span className={`font-black ${
                    (cashSession.cashDifference || 0) === 0 
                      ? 'text-emerald-400' 
                      : (cashSession.cashDifference || 0) > 0 
                      ? 'text-blue-400' 
                      : 'text-red-400'
                  }`}>
                    ${(cashSession.cashDifference || 0).toFixed(2)} MXN 
                    {(cashSession.cashDifference || 0) === 0 ? ' (Cuadre Perfecto ✓)' : (cashSession.cashDifference || 0) > 0 ? ' (Sobrante)' : ' (Faltante)'}
                  </span>
                </div>
                {cashSession.notes && (
                  <p className="text-[11px] text-gym-muted pt-1 border-t border-gym-border">
                    Nota: {cashSession.notes}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Action: Arqueo / Cierre / Apertura */}
        <div className="lg:col-span-5 bg-gym-card rounded-2xl border border-gym-border p-6 shadow-md">
          {cashSession.status === 'open' ? (
            <form onSubmit={handleCloseSession} className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400 border-b border-gym-border pb-3">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Realizar Corte de Caja (Corte Z)</h3>
              </div>
              <p className="text-xs text-gym-muted">
                Cuenta el dinero en el cajón de dinero e ingrésalo para calcular si hay diferencias.
              </p>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Efectivo Total Contado en Caja ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gym-muted font-mono font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={countedCashStr}
                    onChange={(e) => setCountedCashStr(e.target.value)}
                    placeholder={expectedCashInDrawer.toString()}
                    className="w-full pl-8 pr-3 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-base font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {countedCashStr && (
                <div className={`p-3 rounded-xl border ${
                  cashDifference === 0 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                    : cashDifference > 0 
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                    : 'bg-red-500/10 border-red-500/40 text-red-400'
                }`}>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold">Diferencia:</span>
                    <span className="font-mono font-black text-sm">
                      {cashDifference > 0 ? `+$${cashDifference.toFixed(2)} (Sobrante)` : cashDifference < 0 ? `-$${Math.abs(cashDifference).toFixed(2)} (Faltante)` : '$0.00 (Exacto)'}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Observaciones / Notas del Cajero
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  rows={2}
                  placeholder="Ej. Billetes de $500 entregados a gerencia..."
                  className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-xs text-white placeholder-gym-muted focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm shadow-glow-gold transition-all"
              >
                Cerrar Turno y Guardar Corte
              </button>
            </form>
          ) : (
            <form onSubmit={handleOpenSession} className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 border-b border-gym-border pb-3">
                <Unlock className="w-5 h-5" />
                <h3 className="font-bold text-base text-white">Abrir Nuevo Turno de Caja</h3>
              </div>
              <p className="text-xs text-gym-muted">
                Ingresa el fondo inicial en monedas y billetes para comenzar operaciones.
              </p>

              <div>
                <label className="text-xs font-semibold text-gym-muted block mb-1">
                  Fondo Inicial de Caja ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gym-muted font-mono font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={initialCashStr}
                    onChange={(e) => setInitialCashStr(e.target.value)}
                    placeholder="1500"
                    className="w-full pl-8 pr-3 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-base font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm shadow-glow-green transition-all"
              >
                Abrir Caja de Turno
              </button>
            </form>
          )}
        </div>

      </div>

    </div>
  );
};
