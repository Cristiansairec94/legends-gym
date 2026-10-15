import React, { useState, useEffect } from 'react';
import { useGym } from '../../context/GymContext';
import { 
  Wallet, 
  Banknote, 
  CreditCard, 
  ArrowRightLeft, 
  Lock, 
  Unlock, 
  Printer,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { exportShiftReportToExcel } from '../../utils/excelExport';

export const CashRegisterView: React.FC = () => {
  const { cashSession, closeCashSession, openCashSession, expenses, sales, gymSettings } = useGym();

  const [countedCashStr, setCountedCashStr] = useState('');
  const [leaveCashInDrawer, setLeaveCashInDrawer] = useState<boolean>(false);
  const [remanentCashStr, setRemanentCashStr] = useState('');
  const [confirmCloseInput, setConfirmCloseInput] = useState('');
  const [initialCashStr, setInitialCashStr] = useState<string>(() => {
    if (cashSession.status === 'closed') {
      return cashSession.leaveCashInDrawer && cashSession.remanentCash !== undefined 
        ? cashSession.remanentCash.toString() 
        : '0';
    }
    return '0';
  });

  useEffect(() => {
    if (cashSession.status === 'closed') {
      if (cashSession.leaveCashInDrawer && cashSession.remanentCash !== undefined) {
        setInitialCashStr(cashSession.remanentCash.toString());
      } else {
        setInitialCashStr('0');
      }
    }
  }, [cashSession.status, cashSession.leaveCashInDrawer, cashSession.remanentCash]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCashExpenses = expenses
    .filter(e => e.date.startsWith(todayStr) && e.paidFromCashRegister)
    .reduce((sum, e) => sum + e.amount, 0);

  const totalStoreSales = cashSession.totalSalesCash + cashSession.totalSalesCard + cashSession.totalSalesTransfer;
  const totalMemberships = cashSession.totalMembershipsCash + cashSession.totalMembershipsCard + (cashSession.totalMembershipsTransfer || 0);
  const grandTotalShift = totalStoreSales + totalMemberships;

  const totalCashCollected = cashSession.totalSalesCash + cashSession.totalMembershipsCash;
  const expectedCashInDrawer = cashSession.expectedCash;

  const totalTransfers = cashSession.totalSalesTransfer + (cashSession.totalMembershipsTransfer || 0);

  const countedCash = parseFloat(countedCashStr) || 0;
  const cashDifference = countedCash - expectedCashInDrawer;

  const remanentCash = leaveCashInDrawer ? (parseFloat(remanentCashStr) || 0) : 0;
  const cashToWithdraw = Math.max(0, countedCash - remanentCash);

  const isConfirmedYes = confirmCloseInput.trim().toUpperCase() === 'SI' || confirmCloseInput.trim().toUpperCase() === 'SÍ';
  const isConfirmedNo = confirmCloseInput.trim().toUpperCase() === 'NO';

  const isRemanentValid = !leaveCashInDrawer || (remanentCash >= 0 && remanentCash <= countedCash && remanentCashStr.trim() !== '');
  const canSubmitClose = Boolean(countedCashStr) && isRemanentValid && isConfirmedYes;

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitClose) return;

    closeCashSession(
      countedCash,
      undefined,
      leaveCashInDrawer,
      leaveCashInDrawer ? remanentCash : 0,
      cashToWithdraw
    );

    setCountedCashStr('');
    setLeaveCashInDrawer(false);
    setRemanentCashStr('');
    setConfirmCloseInput('');
  };

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(initialCashStr);
    const init = isNaN(parsed) ? 0 : parsed;
    openCashSession(init);
    setCountedCashStr('');
    setLeaveCashInDrawer(false);
    setRemanentCashStr('');
    setConfirmCloseInput('');
  };

  const handleDownloadExcel = () => {
    exportShiftReportToExcel(cashSession, expenses, sales, gymSettings);
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-xs font-extrabold text-emerald-300 hover:text-emerald-200 transition-all shadow-sm"
            title="Descargar reporte completo en formato Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Descargar Reporte en Excel</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gray-300 hover:text-white transition-colors"
            title="Imprimir pantalla"
          >
            <Printer className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
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
            <span className="text-xs text-gym-muted uppercase font-bold">
              {cashSession.status === 'open' ? 'Efectivo Físico Esperado' : 'Efectivo Físico en Caja'}
            </span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">
            ${cashSession.status === 'open' 
              ? expectedCashInDrawer.toLocaleString() 
              : (cashSession.leaveCashInDrawer ? (cashSession.remanentCash || 0) : 0).toLocaleString()
            } MXN
          </span>
          <span className="text-xs text-gym-muted mt-2 block">
            {cashSession.status === 'open' 
              ? `Fondo inicial: $${cashSession.initialCash} + Cobros: $${totalCashCollected}`
              : cashSession.leaveCashInDrawer 
                ? `Fondo reservado para siguiente turno: $${cashSession.remanentCash || 0}`
                : 'Turno cerrado: 100% retirado a gerencia ($0.00 en caja)'
            }
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
            ${totalTransfers.toLocaleString()} MXN
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
            <span>{cashSession.status === 'closed' ? 'Desglose del Turno Cerrado' : 'Desglose Detallado del Turno Actual'}</span>
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
                <span>( + ) Fondo Inicial con que abrió este turno:</span>
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
              {todayCashExpenses > 0 && (
                <div className="py-2.5 flex justify-between text-rose-400">
                  <span>( - ) Gastos Pagados de Caja (Efectivo):</span>
                  <span className="font-bold">-${todayCashExpenses.toFixed(2)}</span>
                </div>
              )}
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
                  <span>Membresías (Transferencia):</span>
                  <span className="text-white">${(cashSession.totalMembershipsTransfer || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Suplementos (Transferencia):</span>
                  <span className="text-white">${cashSession.totalSalesTransfer.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {cashSession.status === 'closed' && (
              <div className="mt-4 p-4 rounded-xl bg-gym-surface/80 border border-gym-border space-y-2.5">
                <span className="text-xs font-bold text-amber-400 block uppercase tracking-wider">
                  Resultado del Cierre de Turno:
                </span>
                <div className="flex justify-between text-xs">
                  <span className="text-gym-muted">Efectivo Contado por Cajero:</span>
                  <span className="text-white font-bold">${cashSession.actualCash?.toFixed(2)} MXN</span>
                </div>
                {cashSession.leaveCashInDrawer ? (
                  <>
                    <div className="flex justify-between text-xs text-amber-300">
                      <span>( - ) Fondo Dejado en Caja (Próx. Turno):</span>
                      <span className="font-bold">${cashSession.remanentCash?.toFixed(2)} MXN</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1.5 rounded-lg border border-emerald-500/20">
                      <span>( = ) Efectivo Retirado (Entregado a Gerencia):</span>
                      <span>${cashSession.withdrawnCash?.toFixed(2)} MXN</span>
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1.5 rounded-lg border border-emerald-500/20">
                      <span>( = ) Efectivo Retirado (100% a Gerencia):</span>
                      <span>${(cashSession.withdrawnCash ?? cashSession.actualCash)?.toFixed(2)} MXN</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-300 px-1 font-mono">
                      <span>Fondo que se quedó en caja:</span>
                      <span className="text-white font-bold">$0.00 MXN</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between text-xs pt-1 border-t border-gym-border/40">
                  <span className="text-gym-muted">Diferencia:</span>
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
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder={expectedCashInDrawer.toString()}
                    className="w-full pl-8 pr-3 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-base font-mono font-bold text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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

              {/* Opción de Dejar Efectivo en Caja */}
              <div className="p-3.5 rounded-xl bg-gym-surface/80 border border-gym-border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold text-gray-200 block">
                      ¿Se dejará fondo en caja?
                    </label>
                    <span className="text-[10px] text-gym-muted block">
                      Para el siguiente turno o cambio
                    </span>
                  </div>
                  <div className="flex items-center gap-1 bg-gym-card p-1 rounded-lg border border-gym-border">
                    <button
                      type="button"
                      onClick={() => {
                        setLeaveCashInDrawer(false);
                        setRemanentCashStr('');
                      }}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        !leaveCashInDrawer
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                          : 'text-gym-muted hover:text-white'
                      }`}
                    >
                      NO
                    </button>
                    <button
                      type="button"
                      onClick={() => setLeaveCashInDrawer(true)}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                        leaveCashInDrawer
                          ? 'bg-emerald-500 text-black border border-emerald-400 shadow-sm font-black'
                          : 'text-gym-muted hover:text-white'
                      }`}
                    >
                      SÍ
                    </button>
                  </div>
                </div>

                {leaveCashInDrawer && (
                  <div className="pt-2 border-t border-gym-border/60 space-y-2">
                    <label className="text-xs font-semibold text-amber-300 block">
                      Monto que se queda en caja ($) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gym-muted font-mono font-bold">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max={countedCash > 0 ? countedCash : undefined}
                        value={remanentCashStr}
                        onChange={(e) => setRemanentCashStr(e.target.value)}
                        onWheel={(e) => e.currentTarget.blur()}
                        placeholder="Ej. 1000"
                        className="w-full pl-8 pr-3 py-2 bg-gym-card rounded-xl border border-gym-border text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                    {remanentCash > countedCash && countedCash > 0 && (
                      <p className="text-[11px] text-rose-400 font-medium">
                        ⚠️ El monto que se queda no puede ser mayor al total contado (${countedCash.toFixed(2)}).
                      </p>
                    )}
                  </div>
                )}

                {/* Desglose visual */}
                <div className="p-3 rounded-lg bg-black/40 border border-gym-border/60 space-y-1.5 text-xs font-mono">
                  <span className="text-[10px] font-bold text-gym-muted uppercase tracking-wider block font-sans">
                    Desglose de Retiro y Fondo:
                  </span>
                  <div className="flex justify-between text-gray-300">
                    <span>Efectivo Total Contado:</span>
                    <span className="font-bold">${countedCash.toFixed(2)} MXN</span>
                  </div>
                  {leaveCashInDrawer ? (
                    <>
                      <div className="flex justify-between text-amber-400">
                        <span>( - ) Fondo que se queda en caja:</span>
                        <span className="font-bold">-${remanentCash.toFixed(2)} MXN</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-bold pt-1.5 border-t border-gym-border/50">
                        <span>( = ) Efectivo a Retirar (A Gerencia):</span>
                        <span className="text-sm font-black">${cashToWithdraw.toFixed(2)} MXN</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-emerald-400 font-bold pt-1.5 border-t border-gym-border/50">
                      <span>( = ) Efectivo a Retirar (100% a Gerencia):</span>
                      <span className="text-sm font-black">${countedCash.toFixed(2)} MXN</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Confirmación explícita SI / NO */}
              <div className="p-3.5 rounded-xl bg-gym-surface/80 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-200">
                    Confirmar Cierre de Turno *
                  </label>
                  <span className="text-[10px] text-gym-muted uppercase tracking-wider font-bold">
                    Escribe "SI" o "NO"
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    value={confirmCloseInput}
                    onChange={(e) => setConfirmCloseInput(e.target.value.toUpperCase())}
                    placeholder="Escribe SI o NO..."
                    className="w-full px-3 py-2 bg-gym-card rounded-xl border border-gym-border text-center font-black tracking-widest text-sm text-white uppercase placeholder-gym-muted focus:outline-none focus:border-amber-400"
                  />
                </div>
                {isConfirmedYes && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Confirmación aceptada. Botón de cierre habilitado.</span>
                  </div>
                )}
                {isConfirmedNo && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Cierre cancelado ("NO"). El turno continuará abierto.</span>
                  </div>
                )}
                {!isConfirmedYes && !isConfirmedNo && (
                  <p className="text-[11px] text-gym-muted text-center font-medium">
                    * Escribe <strong>SI</strong> para autorizar el cierre definitivo.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmitClose}
                className={`w-full py-3 rounded-xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                  canSubmitClose
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-glow-gold cursor-pointer'
                    : 'bg-gym-surface text-gym-muted/50 border border-gym-border cursor-not-allowed'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Cerrar Turno y Guardar Corte</span>
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
                  Fondo Inicial para este Nuevo Turno ($) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gym-muted font-mono font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={initialCashStr}
                    onChange={(e) => setInitialCashStr(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2.5 bg-gym-surface rounded-xl border border-gym-border text-base font-mono font-bold text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <p className="text-[11px] text-gym-muted mt-1.5 leading-relaxed">
                  {cashSession.leaveCashInDrawer 
                    ? `Fondo heredado del turno anterior: $${(cashSession.remanentCash || 0).toFixed(2)} MXN.`
                    : 'En el turno anterior se retiró todo el dinero a gerencia ($0.00 en caja). Ingresa aquí el efectivo con el que inicias este turno (o déjalo en 0 si comienzas sin fondo).'}
                </p>
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
