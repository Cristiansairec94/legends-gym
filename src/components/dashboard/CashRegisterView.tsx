import React, { useState, useEffect, useMemo } from 'react';
import { useGym } from '../../context/GymContext';
import { Sale } from '../../types';
import posBg from '../../assets/pos-luxury-bg.jpg';
import {
  Wallet,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  Lock,
  Unlock,
  CheckCircle2,
  FileSpreadsheet,
  Clock,
  User,
  TrendingUp,
  ShoppingBag,
  Dumbbell,
  Printer,
  DollarSign,
  FileText,
  Receipt,
  Eye
} from 'lucide-react';
import { exportShiftReportToExcel } from '../../utils/excelExport';
import { CashMovementsModal } from '../pos/CashMovementsModal';
import { ReceiptModal } from '../pos/ReceiptModal';

const REMANENT_PRESETS = [500, 1000, 1500, 2000] as const;

type LeftPanelTab = 'breakdown' | 'operations';
type OpFilter = 'all' | 'cash' | 'card' | 'transfer';

export const CashRegisterView: React.FC = () => {
  const { cashSession, closeCashSession, openCashSession, expenses, sales, gymSettings } = useGym();

  const [activeLeftTab, setActiveLeftTab] = useState<LeftPanelTab>('breakdown');
  const [opFilter, setOpFilter] = useState<OpFilter>('all');
  const [selectedSaleForReceipt, setSelectedSaleForReceipt] = useState<Sale | null>(null);

  const [countedCashStr, setCountedCashStr] = useState('');
  const [leaveCashInDrawer, setLeaveCashInDrawer] = useState<boolean>(false);
  const [remanentCashStr, setRemanentCashStr] = useState('');
  const [confirmCloseInput, setConfirmCloseInput] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [showMovementsModal, setShowMovementsModal] = useState(false);

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
  const todayCashExpensesList = useMemo(
    () => expenses.filter((e) => e.date.startsWith(todayStr) && e.paidFromCashRegister),
    [expenses, todayStr]
  );
  const todayCashExpenses = useMemo(
    () => todayCashExpensesList.reduce((sum, e) => sum + e.amount, 0),
    [todayCashExpensesList]
  );

  // Sales belonging to today / current shift
  const shiftSales = useMemo(() => {
    const openedMs = new Date(cashSession.openedAt).getTime();
    return sales.filter((s) => {
      if (s.status === 'voided') return false;
      const saleMs = new Date(s.timestamp).getTime();
      if (!isNaN(openedMs) && !isNaN(saleMs) && saleMs >= openedMs - 60000) {
        return true;
      }
      return s.timestamp.startsWith(todayStr);
    });
  }, [sales, cashSession.openedAt, todayStr]);

  const filteredShiftSales = useMemo(() => {
    if (opFilter === 'all') return shiftSales;
    return shiftSales.filter((s) => s.paymentMethod === opFilter);
  }, [shiftSales, opFilter]);

  const totalStoreSales =
    cashSession.totalSalesCash + cashSession.totalSalesCard + cashSession.totalSalesTransfer;
  const totalMemberships =
    cashSession.totalMembershipsCash +
    cashSession.totalMembershipsCard +
    (cashSession.totalMembershipsTransfer || 0);
  const grandTotalShift = totalStoreSales + totalMemberships;

  const totalCashCollected = cashSession.totalSalesCash + cashSession.totalMembershipsCash;
  const expectedCashInDrawer = cashSession.expectedCash;

  const totalCards = cashSession.totalSalesCard + cashSession.totalMembershipsCard;
  const totalTransfers =
    cashSession.totalSalesTransfer + (cashSession.totalMembershipsTransfer || 0);
  const totalElectronic = totalCards + totalTransfers;

  // Payment method % distribution
  const cashPct =
    grandTotalShift > 0 ? Math.round((totalCashCollected / grandTotalShift) * 100) : 0;
  const cardPct =
    grandTotalShift > 0 ? Math.round((totalCards / grandTotalShift) * 100) : 0;
  const transferPct =
    grandTotalShift > 0 ? Math.max(0, 100 - cashPct - cardPct) : 0;

  const hasCountedInput = countedCashStr.trim() !== '';
  const countedCash = parseFloat(countedCashStr) || 0;
  const cashDifference = countedCash - expectedCashInDrawer;

  const remanentCash = leaveCashInDrawer ? parseFloat(remanentCashStr) || 0 : 0;
  const cashToWithdraw = Math.max(0, countedCash - remanentCash);

  const isConfirmedYes =
    confirmCloseInput.trim().toUpperCase() === 'SI' ||
    confirmCloseInput.trim().toUpperCase() === 'SÍ';
  const isConfirmedNo = confirmCloseInput.trim().toUpperCase() === 'NO';

  const isRemanentValid =
    !leaveCashInDrawer ||
    (remanentCash >= 0 && remanentCash <= countedCash && remanentCashStr.trim() !== '');
  const canSubmitClose = hasCountedInput && isRemanentValid && isConfirmedYes;

  // Elapsed shift duration helper
  const shiftDurationText = useMemo(() => {
    const startMs = new Date(cashSession.openedAt).getTime();
    const endMs =
      cashSession.status === 'closed' && cashSession.closedAt
        ? new Date(cashSession.closedAt).getTime()
        : Date.now();
    if (isNaN(startMs)) return 'Turno activo';
    const diffMinutes = Math.max(1, Math.floor((endMs - startMs) / 60000));
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}m`;
  }, [cashSession.openedAt, cashSession.closedAt, cashSession.status]);

  const handleCloseSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmitClose) return;

    closeCashSession(
      countedCash,
      closeNotes.trim() || undefined,
      leaveCashInDrawer,
      leaveCashInDrawer ? remanentCash : 0,
      cashToWithdraw
    );

    setCountedCashStr('');
    setLeaveCashInDrawer(false);
    setRemanentCashStr('');
    setConfirmCloseInput('');
    setCloseNotes('');
    setActiveLeftTab('breakdown');
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
    setCloseNotes('');
  };

  const handleDownloadExcel = () => {
    exportShiftReportToExcel(cashSession, expenses, sales, gymSettings);
  };

  const handlePrintShiftReport = () => {
    let iframe = document.getElementById('shift-print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'shift-print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8" />
            <title>Corte de Caja - ${cashSession.id}</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body {
                width: 76mm;
                margin: 0 auto;
                padding: 4mm 2.5mm;
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                color: #000;
                background: #fff;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .row { display: flex; justify-content: space-between; margin: 2px 0; }
              hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
            </style>
          </head>
          <body>
            <div class="center">
              <div class="bold" style="font-size:14px;">${gymSettings.gymName}</div>
              <div>CORTE DE CAJA Y ARQUEO DE TURNO</div>
              <div>Folio: ${cashSession.id}</div>
              <div>Estado: ${cashSession.status === 'open' ? 'ARQUEO EN VIVO' : 'CORTE CERRADO'}</div>
            </div>
            <hr />
            <div>Apertura: ${new Date(cashSession.openedAt).toLocaleString('es-MX')}</div>
            ${cashSession.closedAt ? `<div>Cierre: ${new Date(cashSession.closedAt).toLocaleString('es-MX')}</div>` : ''}
            <div>Responsable: ${cashSession.openedBy}</div>
            <hr />
            <div class="bold">FLUJO DE EFECTIVO EN CAJON:</div>
            <div class="row"><span>(+) Fondo Inicial:</span><span>$${cashSession.initialCash.toFixed(2)}</span></div>
            <div class="row"><span>(+) Suplementos (Efvo):</span><span>$${cashSession.totalSalesCash.toFixed(2)}</span></div>
            <div class="row"><span>(+) Membresias (Efvo):</span><span>$${cashSession.totalMembershipsCash.toFixed(2)}</span></div>
            ${todayCashExpenses > 0 ? `<div class="row"><span>(-) Gastos de Caja:</span><span>-$${todayCashExpenses.toFixed(2)}</span></div>` : ''}
            <div class="row bold" style="margin-top:4px;"><span>(=) EFECTIVO ESPERADO:</span><span>$${expectedCashInDrawer.toFixed(2)} MXN</span></div>
            <hr />
            <div class="bold">INGRESOS ELECTRONICOS:</div>
            <div class="row"><span>Membresias (Tarjeta):</span><span>$${cashSession.totalMembershipsCard.toFixed(2)}</span></div>
            <div class="row"><span>Suplementos (Tarjeta):</span><span>$${cashSession.totalSalesCard.toFixed(2)}</span></div>
            <div class="row"><span>Membresias (Transf):</span><span>$${(cashSession.totalMembershipsTransfer || 0).toFixed(2)}</span></div>
            <div class="row"><span>Suplementos (Transf):</span><span>$${cashSession.totalSalesTransfer.toFixed(2)}</span></div>
            <div class="row bold" style="margin-top:4px;"><span>TOTAL INGRESADO TURNO:</span><span>$${grandTotalShift.toFixed(2)} MXN</span></div>
            <hr />
            <div class="center" style="margin-top:18px;">
              _______________________________<br/>
              Firma de Cajero / Auditoría
            </div>
          </body>
        </html>
      `);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 150);
    } else {
      window.print();
    }
  };

  return (
    <div className="h-full min-h-0 relative rounded-3xl border border-white/25 overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.65)] flex flex-col p-2 sm:p-2.5 gap-2">
      {/* ===================================================================== */}
      {/* ARCHITECTURAL HIGH-DEFINITION GYM BACKGROUND & AMBIENT LIGHTING       */}
      {/* ===================================================================== */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none rounded-3xl">
        <img
          src={posBg}
          alt="Legends Gym Cash Register Background"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/pos-luxury-bg.jpg';
          }}
          style={{
            filter: 'brightness(0.95) contrast(1.05) saturate(1.05)',
            objectPosition: 'center center',
          }}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d111d]/75 via-[#101524]/55 to-[#0d111d]/45 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(251,191,36,0.14)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
      </div>

      {/* ===================================================================== */}
      {/* 1. TOP UNIFIED COMMAND HEADER BAR (FROSTED CRYSTAL)                   */}
      {/* ===================================================================== */}
      <div className="relative z-20 bg-[#181f30]/75 backdrop-blur-xl rounded-2xl border border-white/25 px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 shadow-[0_10px_30px_rgba(0,0,0,0.4)] shrink-0">
        {/* Specular Top Accent Line */}
        <div
          className={`absolute inset-x-12 top-0 h-[1px] bg-gradient-to-r from-transparent ${
            cashSession.status === 'open' ? 'via-amber-300/75' : 'via-rose-400/75'
          } to-transparent pointer-events-none`}
        />

        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-lg ${
              cashSession.status === 'open'
                ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-black border-amber-200/75 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                : 'bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-300/60 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
            }`}
          >
            <Wallet className="w-4.5 h-4.5 stroke-[2.5]" />
          </div>

          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-black text-white tracking-tight uppercase drop-shadow-sm">
                Corte de Caja & Arqueo de Turno
              </h1>

              {/* Live Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border ${
                  cashSession.status === 'open'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    cashSession.status === 'open'
                      ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]'
                      : 'bg-rose-400'
                  }`}
                />
                {cashSession.status === 'open' ? 'Caja Abierta' : 'Caja Cerrada'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-200/80 hidden sm:block truncate">
              Control de membresías, suplementos en mostrador, cobros digitales y cuadre físico de efectivo.
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {cashSession.status === 'open' && (
            <button
              type="button"
              onClick={() => setShowMovementsModal(true)}
              className="h-8.5 flex items-center gap-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/55 hover:border-amber-300 text-amber-200 hover:text-white text-xs font-extrabold transition-all shadow-sm active:scale-95"
              title="Registrar entrada de cambio o retiro/gasto menor de caja"
            >
              <span className="w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center font-black text-[10px]">
                $
              </span>
              <span>Movimientos</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintShiftReport}
            className="h-8.5 flex items-center gap-1.5 px-3 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] border border-white/25 hover:border-white/40 text-white text-xs font-extrabold transition-all active:scale-95"
            title="Imprimir tirilla térmica de Arqueo / Corte (80mm)"
          >
            <Printer className="w-3.5 h-3.5 text-amber-300" />
            <span>Imprimir Corte</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadExcel}
            className="h-8.5 flex items-center gap-1.5 px-3.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/55 hover:border-emerald-300 text-xs font-extrabold text-emerald-200 hover:text-white transition-all shadow-sm active:scale-95"
            title="Descargar reporte completo de turno en formato Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>Reporte Excel</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SLIM LUMINOUS KPI STRIP (4 HIGH-CONTRAST GLASS CARDS)              */}
      {/* ===================================================================== */}
      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
        {/* KPI 1: Total Ingresado en Turno */}
        <div className="relative px-3.5 py-2 rounded-2xl bg-[#181f30]/75 backdrop-blur-md border border-amber-400/40 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-amber-300 uppercase font-black tracking-wider block truncate">
                Total Ingresado en Turno
              </span>
              <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono block leading-tight drop-shadow-sm">
                ${grandTotalShift.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-[10px] font-bold text-amber-200/80">MXN</span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/45 flex items-center justify-center text-amber-300 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-zinc-200 mt-1 pt-1 border-t border-white/15">
            <span>
              Membresías: <strong className="text-white font-mono">${totalMemberships.toLocaleString()}</strong>
            </span>
            <span>
              Tienda: <strong className="text-white font-mono">${totalStoreSales.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* KPI 2: Efectivo Físico Esperado / En Caja */}
        <div className="relative px-3.5 py-2 rounded-2xl bg-[#181f30]/75 backdrop-blur-md border border-emerald-400/45 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-emerald-300 uppercase font-black tracking-wider block truncate">
                {cashSession.status === 'open' ? 'Efectivo Físico Esperado' : 'Efectivo Físico en Caja'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono block leading-tight drop-shadow-sm">
                $
                {(cashSession.status === 'open'
                  ? expectedCashInDrawer
                  : cashSession.leaveCashInDrawer
                  ? cashSession.remanentCash || 0
                  : 0
                ).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-[10px] font-bold text-emerald-200/80">MXN</span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/45 flex items-center justify-center text-emerald-300 shrink-0">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-zinc-200 mt-1 pt-1 border-t border-white/15 truncate">
            {cashSession.status === 'open' ? (
              <>
                <span>
                  Fondo: <strong className="text-white font-mono">${cashSession.initialCash.toLocaleString()}</strong>
                </span>
                <span>
                  + Cobros Efvo: <strong className="text-emerald-300 font-mono">${totalCashCollected.toLocaleString()}</strong>
                </span>
              </>
            ) : cashSession.leaveCashInDrawer ? (
              <span className="text-amber-300 font-bold truncate">
                Fondo reservado próx. turno: ${(cashSession.remanentCash || 0).toFixed(2)}
              </span>
            ) : (
              <span className="text-zinc-300 truncate">100% retirado a gerencia ($0.00 en caja)</span>
            )}
          </div>
        </div>

        {/* KPI 3: Cobros con Tarjeta POS */}
        <div className="relative px-3.5 py-2 rounded-2xl bg-[#181f30]/75 backdrop-blur-md border border-sky-400/40 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-sky-300 uppercase font-black tracking-wider block truncate">
                Cobros con Tarjeta POS
              </span>
              <span className="text-xl sm:text-2xl font-black text-sky-400 font-mono block leading-tight drop-shadow-sm">
                ${totalCards.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-[10px] font-bold text-sky-200/80">MXN</span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/45 flex items-center justify-center text-sky-300 shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-zinc-200 mt-1 pt-1 border-t border-white/15">
            <span>
              Membresías: <strong className="text-white font-mono">${cashSession.totalMembershipsCard.toLocaleString()}</strong>
            </span>
            <span>
              Tienda: <strong className="text-white font-mono">${cashSession.totalSalesCard.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* KPI 4: Transferencias / SPEI */}
        <div className="relative px-3.5 py-2 rounded-2xl bg-[#181f30]/75 backdrop-blur-md border border-purple-400/40 shadow-lg overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[10px] text-purple-300 uppercase font-black tracking-wider block truncate">
                Transferencias / SPEI
              </span>
              <span className="text-xl sm:text-2xl font-black text-purple-400 font-mono block leading-tight drop-shadow-sm">
                ${totalTransfers.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-[10px] font-bold text-purple-200/80">MXN</span>
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/45 flex items-center justify-center text-purple-300 shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10.5px] text-zinc-200 mt-1 pt-1 border-t border-white/15">
            <span>
              Membresías:{' '}
              <strong className="text-white font-mono">
                ${(cashSession.totalMembershipsTransfer || 0).toLocaleString()}
              </strong>
            </span>
            <span>
              Tienda: <strong className="text-white font-mono">${cashSession.totalSalesTransfer.toLocaleString()}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. TWO-COLUMN KIOSK WORKSPACE (ZERO OUTER CLIPPING)                   */}
      {/* ===================================================================== */}
      <div className="relative z-10 flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5 overflow-hidden items-stretch">
        {/* ================================================================= */}
        {/* LEFT COLUMN (7/12): DESGLOSE DEL TURNO Y OPERACIONES              */}
        {/* ================================================================= */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-[#151b2b]/88 backdrop-blur-xl rounded-2xl border border-white/25 p-2.5 sm:p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)] relative overflow-hidden">
          <div className="absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none" />

          {/* Top Navigation Tabs Inside Left Panel */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/15 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#0c101b]/90 p-1 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={() => setActiveLeftTab('breakdown')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  activeLeftTab === 'breakdown'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-sm'
                    : 'text-zinc-200 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Desglose del Turno</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveLeftTab('operations')}
                className={`px-3 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                  activeLeftTab === 'operations'
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-sm'
                    : 'text-zinc-200 hover:text-white hover:bg-white/[0.08]'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Operaciones</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-black ${
                    activeLeftTab === 'operations'
                      ? 'bg-black/20 text-black'
                      : 'bg-white/15 text-amber-300'
                  }`}
                >
                  {shiftSales.length}
                </span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono font-bold bg-[#0c101b]/85 px-2.5 py-1 rounded-xl border border-white/20 text-white">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Activo: {shiftDurationText}</span>
            </div>
          </div>

          {/* Left Panel Body */}
          <div className="flex-1 min-h-0 overflow-y-auto pos-scroll pr-0.5 pt-2 flex flex-col gap-2">
            {/* ============================================================= */}
            {/* TAB 1: DESGLOSE DETALLADO DEL TURNO                           */}
            {/* ============================================================= */}
            {activeLeftTab === 'breakdown' && (
              <>
                {/* Compact High-Contrast Shift Metadata Bar */}
                <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#0c111d]/90 border border-white/20">
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-zinc-300 font-semibold">Apertura:</span>
                    <span className="font-mono font-black text-white">
                      {new Date(cashSession.openedAt).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-zinc-300 font-semibold">Responsable:</span>
                    <span className="font-black text-amber-300">{cashSession.openedBy}</span>
                  </div>
                </div>

                {/* Two-Column Uncrowded Breakdown (Physical Cash vs Electronic) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 flex-1 min-h-0">
                  {/* LEFT CARD: Efectivo Físico en Cajón */}
                  <div className="rounded-xl bg-[#0c111d]/92 border border-emerald-400/35 overflow-hidden flex flex-col shadow-lg">
                    <div className="px-3 py-2 bg-emerald-500/15 border-b border-emerald-400/25 flex items-center justify-between gap-2 shrink-0">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-400" />
                        Efectivo Físico
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/35">
                        Suma a cajón
                      </span>
                    </div>

                    <div className="p-2.5 space-y-2 flex-1 flex flex-col">
                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#161e31] hover:bg-[#1c263d] border border-white/15 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            +
                          </span>
                          <Wallet className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="text-xs font-bold text-white truncate">Fondo Inicial</span>
                        </div>
                        <span className="text-sm font-mono font-black text-white shrink-0">
                          ${cashSession.initialCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#161e31] hover:bg-[#1c263d] border border-white/15 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            +
                          </span>
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span className="text-xs font-bold text-white truncate">Suplementos (Efectivo)</span>
                        </div>
                        <span className="text-sm font-mono font-black text-white shrink-0">
                          ${cashSession.totalSalesCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#161e31] hover:bg-[#1c263d] border border-white/15 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-md bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                            +
                          </span>
                          <Dumbbell className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="text-xs font-bold text-white truncate">Membresías (Efectivo)</span>
                        </div>
                        <span className="text-sm font-mono font-black text-white shrink-0">
                          ${cashSession.totalMembershipsCash.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {todayCashExpenses > 0 && (
                        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-rose-500/20 border border-rose-400/45 text-rose-200">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-rose-500/30 border border-rose-400/60 text-rose-200 font-mono font-black text-xs flex items-center justify-center shrink-0">
                              -
                            </span>
                            <span className="text-xs font-bold truncate">Gastos / Retiros de Caja</span>
                          </div>
                          <span className="text-sm font-mono font-black text-rose-300 shrink-0">
                            -${todayCashExpenses.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Highlighted Total Expected Cash */}
                      <div className="mt-auto p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/25 via-emerald-500/15 to-emerald-500/25 border border-emerald-400/60 flex items-center justify-between gap-2 shadow-[0_0_20px_rgba(16,185,129,0.18)]">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-emerald-400 text-black font-mono font-black text-sm flex items-center justify-center shrink-0">
                            =
                          </span>
                          <div className="leading-tight min-w-0">
                            <span className="text-white font-black text-xs block truncate">
                              Total en Cajón
                            </span>
                            <span className="text-[10px] text-emerald-200 font-semibold block truncate">
                              Efectivo esperado
                            </span>
                          </div>
                        </div>
                        <span className="text-base sm:text-lg font-black text-emerald-300 font-mono whitespace-nowrap">
                          ${expectedCashInDrawer.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT CARD: Ingresos Digitales */}
                  <div className="rounded-xl bg-[#0c111d]/92 border border-sky-400/35 overflow-hidden flex flex-col shadow-lg">
                    <div className="px-3 py-2 bg-sky-500/15 border-b border-sky-400/25 flex items-center justify-between gap-2 shrink-0">
                      <span className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-sky-400" />
                        Ingresos Digitales
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-200 border border-sky-400/35">
                        No suma a cajón
                      </span>
                    </div>

                    <div className="p-2.5 space-y-1.5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-[#161e31] hover:bg-[#1c263d] border border-white/15 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-sky-500/25 border border-sky-400/45 flex items-center justify-center text-sky-300 shrink-0">
                            <CreditCard className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-bold text-white truncate">Membresías (Tarjeta)</span>
                        </div>
                        <span className="font-mono font-black text-white text-sm shrink-0">
                          ${cashSession.totalMembershipsCard.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-[#161e31] hover:bg-[#1c263d] border border-white/15 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-sky-500/25 border border-sky-400/45 flex items-center justify-center text-sky-300 shrink-0">
                            <ShoppingBag className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-bold text-white truncate">Suplementos (Tarjeta)</span>
                        </div>
                        <span className="font-mono font-black text-white text-sm shrink-0">
                          ${cashSession.totalSalesCard.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-[#161e31] hover:bg-[#1c263d] border border-white/15 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-purple-500/25 border border-purple-400/45 flex items-center justify-center text-purple-300 shrink-0">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-bold text-white truncate">Membresías (Transf.)</span>
                        </div>
                        <span className="font-mono font-black text-white text-sm shrink-0">
                          ${(cashSession.totalMembershipsTransfer || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-[#161e31] hover:bg-[#1c263d] border border-white/15 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-purple-500/25 border border-purple-400/45 flex items-center justify-center text-purple-300 shrink-0">
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-xs font-bold text-white truncate">Suplementos (Transf.)</span>
                        </div>
                        <span className="font-mono font-black text-white text-sm shrink-0">
                          ${cashSession.totalSalesTransfer.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Digital Subtotal + Payment Mix Bar */}
                      <div className="mt-auto p-2.5 rounded-xl bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-purple-500/20 border border-sky-400/45 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-white">Subtotal Digital:</span>
                          <span className="text-sm sm:text-base font-mono font-black text-sky-300 whitespace-nowrap">
                            ${totalElectronic.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-200 font-bold mb-1">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-400" />
                              Efvo ({cashPct}%)
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-sky-400" />
                              Tarj ({cardPct}%)
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-purple-400" />
                              Transf ({transferPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden flex">
                            <div
                              style={{ width: `${grandTotalShift > 0 ? cashPct : 34}%` }}
                              className="h-full bg-emerald-400 transition-all duration-300"
                            />
                            <div
                              style={{ width: `${grandTotalShift > 0 ? cardPct : 33}%` }}
                              className="h-full bg-sky-400 transition-all duration-300"
                            />
                            <div
                              style={{ width: `${grandTotalShift > 0 ? transferPct : 33}%` }}
                              className="h-full bg-purple-400 transition-all duration-300"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Closed Shift Result Card */}
                {cashSession.status === 'closed' && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/15 via-[#141a29] to-[#101522] border border-amber-400/45 space-y-2 font-mono">
                    <div className="flex items-center justify-between border-b border-white/15 pb-2">
                      <span className="text-xs font-black text-amber-300 uppercase tracking-wider font-sans flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Resultado Auditado del Cierre
                      </span>
                      <span className="text-[11px] text-zinc-300">
                        {cashSession.closedAt ? new Date(cashSession.closedAt).toLocaleString('es-MX') : ''}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-200 font-sans">Efectivo Contado por Cajero:</span>
                      <span className="text-white font-black">${cashSession.actualCash?.toFixed(2)} MXN</span>
                    </div>

                    {cashSession.leaveCashInDrawer ? (
                      <>
                        <div className="flex justify-between text-xs text-amber-300">
                          <span className="font-sans">( - ) Fondo Dejado en Caja (Próx. Turno):</span>
                          <span className="font-bold">${cashSession.remanentCash?.toFixed(2)} MXN</span>
                        </div>
                        <div className="flex justify-between text-xs text-emerald-300 font-bold bg-emerald-500/15 px-3 py-2 rounded-lg border border-emerald-400/35">
                          <span className="font-sans">( = ) Efectivo Retirado (Entregado a Gerencia):</span>
                          <span>${cashSession.withdrawnCash?.toFixed(2)} MXN</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-xs text-emerald-300 font-bold bg-emerald-500/15 px-3 py-2 rounded-lg border border-emerald-400/35">
                        <span className="font-sans">( = ) Efectivo Retirado (100% a Gerencia):</span>
                        <span>${(cashSession.withdrawnCash ?? cashSession.actualCash)?.toFixed(2)} MXN</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-white/15">
                      <span className="text-zinc-200 font-sans font-bold">Diferencia de Arqueo:</span>
                      <span
                        className={`font-black px-2.5 py-0.5 rounded-md ${
                          (cashSession.cashDifference || 0) === 0
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : (cashSession.cashDifference || 0) > 0
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                        }`}
                      >
                        ${(cashSession.cashDifference || 0).toFixed(2)} MXN
                        {(cashSession.cashDifference || 0) === 0
                          ? ' (Cuadre Perfecto ✓)'
                          : (cashSession.cashDifference || 0) > 0
                          ? ' (Sobrante)'
                          : ' (Faltante)'}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ============================================================= */}
            {/* TAB 2: OPERACIONES Y TICKETS DEL TURNO                        */}
            {/* ============================================================= */}
            {activeLeftTab === 'operations' && (
              <div className="space-y-2.5">
                {/* Filter Chips */}
                <div className="flex items-center justify-between flex-wrap gap-2 bg-[#101522]/80 p-2 rounded-xl border border-white/15">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(
                      [
                        { id: 'all', label: 'Todos' },
                        { id: 'cash', label: '💵 Efectivo' },
                        { id: 'card', label: '💳 Tarjeta' },
                        { id: 'transfer', label: '🏦 Transferencia' },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setOpFilter(tab.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all ${
                          opFilter === tab.id
                            ? 'bg-amber-400 text-black'
                            : 'bg-white/[0.06] text-zinc-200 hover:bg-white/[0.12]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-300">
                    {filteredShiftSales.length} {filteredShiftSales.length === 1 ? 'cobro' : 'cobros'}
                  </span>
                </div>

                {/* Sales List */}
                {filteredShiftSales.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#101522]/60 border border-white/10 text-center space-y-2">
                    <Receipt className="w-8 h-8 text-zinc-400 mx-auto" />
                    <p className="text-xs font-bold text-zinc-200">
                      No hay cobros registrados con este filtro en el turno actual.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredShiftSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="p-2.5 rounded-xl bg-[#101522]/80 hover:bg-[#151c2e]/90 border border-white/15 flex items-center justify-between gap-2.5 transition-all"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                              sale.saleType === 'membership'
                                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                                : 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                            }`}
                          >
                            {sale.saleType === 'membership' ? (
                              <Dumbbell className="w-4 h-4" />
                            ) : (
                              <ShoppingBag className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-amber-300">
                                {sale.folio}
                              </span>
                              <span className="text-xs font-bold text-white truncate">
                                {sale.clientName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10.5px] text-zinc-300">
                              <span>
                                {new Date(sale.timestamp).toLocaleTimeString('es-MX', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              <span>•</span>
                              <span className="uppercase font-bold text-zinc-200">
                                {sale.paymentMethod === 'cash'
                                  ? 'Efectivo'
                                  : sale.paymentMethod === 'card'
                                  ? 'Tarjeta'
                                  : 'Transferencia'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-black text-sm text-emerald-300">
                            +${sale.total.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedSaleForReceipt(sale)}
                            className="p-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.18] border border-white/15 text-zinc-200 hover:text-white transition-all"
                            title="Ver o reimprimir ticket"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RIGHT COLUMN (5/12): CONSOLA DE CORTE DE CAJA (CORTE Z)           */}
        {/* ================================================================= */}
        <div className="lg:col-span-5 flex flex-col min-h-0 bg-[#161c2c]/78 backdrop-blur-xl rounded-2xl border border-white/25 p-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.5)] relative overflow-hidden">
          <div className="absolute inset-x-10 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-300/75 to-transparent pointer-events-none" />

          {cashSession.status === 'open' ? (
            <form onSubmit={handleCloseSession} className="flex-1 min-h-0 flex flex-col justify-between gap-1 overflow-y-auto pos-scroll pr-0.5">
              {/* Top Header + 3-Step Visual Progress (Compact Single-Window Row) */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0 border-b border-white/15 pb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.35)] border border-amber-200/70 shrink-0">
                    <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <h3 className="font-black text-xs sm:text-sm text-white tracking-tight">
                    Realizar Corte de Caja
                  </h3>
                </div>

                {/* 3-Step Progress Pills */}
                <div className="flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider">
                  <div
                    className={`px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${
                      hasCountedInput
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : 'bg-white/[0.06] text-amber-300 border-amber-400/40'
                    }`}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>1. Conteo</span>
                  </div>
                  <div
                    className={`px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${
                      hasCountedInput && isRemanentValid
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : 'bg-white/[0.05] text-zinc-400 border-white/15'
                    }`}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>2. Retiro</span>
                  </div>
                  <div
                    className={`px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${
                      isConfirmedYes
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                        : 'bg-white/[0.05] text-zinc-400 border-white/15'
                    }`}
                  >
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    <span>3. Autorizar</span>
                  </div>
                </div>
              </div>

              {/* Middle Controls */}
              <div className="space-y-1.5">
                {/* STEP 1: Efectivo Total Contado */}
                <div className="space-y-1">
                  <label className="text-[11.5px] font-black text-white block">
                    Efectivo Total Contado en Caja ($) *
                  </label>

                  {/* Digital Readout Input */}
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <DollarSign className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={countedCashStr}
                      onChange={(e) => setCountedCashStr(e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="Ingresa el efectivo físico contado..."
                      className="w-full h-8 pl-9 pr-14 bg-[#0e1320]/90 rounded-xl border border-amber-400/45 text-sm sm:text-base font-mono font-black text-white placeholder:text-zinc-400 placeholder:font-sans placeholder:text-xs placeholder:font-semibold focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-400/30 transition-all shadow-inner"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9.5px] font-mono font-black text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-400/35 pointer-events-none">
                      MXN
                    </span>
                  </div>

                  {/* 3-Column Live Comparison Gauge */}
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[#0e1320]/80 border border-white/15 text-center font-mono">
                    <div className="p-1 rounded-lg bg-white/[0.03]">
                      <span className="text-[9.5px] font-sans font-bold uppercase text-zinc-300 block">
                        Esperado
                      </span>
                      <span className="text-xs font-black text-white">
                        ${expectedCashInDrawer.toFixed(2)}
                      </span>
                    </div>
                    <div className="p-1 rounded-lg bg-white/[0.03]">
                      <span className="text-[9.5px] font-sans font-bold uppercase text-zinc-300 block">
                        Contado
                      </span>
                      <span className="text-xs font-black text-amber-300">
                        ${countedCash.toFixed(2)}
                      </span>
                    </div>
                    <div
                      className={`p-1 rounded-lg border ${
                        !hasCountedInput
                          ? 'bg-white/[0.03] border-white/10 text-zinc-400'
                          : cashDifference === 0
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : cashDifference > 0
                          ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                          : 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                      }`}
                    >
                      <span className="text-[9.5px] font-sans font-bold uppercase block">
                        {!hasCountedInput
                          ? 'Diferencia'
                          : cashDifference === 0
                          ? '✓ Exacto'
                          : cashDifference > 0
                          ? '▲ Sobrante'
                          : '▼ Faltante'}
                      </span>
                      <span className="text-xs font-black">
                        {!hasCountedInput
                          ? '—'
                          : cashDifference > 0
                          ? `+$${cashDifference.toFixed(2)}`
                          : cashDifference < 0
                          ? `-$${Math.abs(cashDifference).toFixed(2)}`
                          : '$0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* STEP 2: Fondo en Caja y Desglose de Retiro */}
                <div className="p-1.5 sm:p-2 rounded-xl bg-[#101522]/85 border border-white/15 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="leading-tight">
                      <label className="text-[11.5px] font-black text-white block">
                        ¿Se dejará fondo en caja?
                      </label>
                      <span className="text-[10px] text-zinc-300 block">
                        Efectivo reservado para el siguiente turno
                      </span>
                    </div>

                    <div className="flex items-center gap-1 bg-[#0b0e17] p-1 rounded-xl border border-white/15 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setLeaveCashInDrawer(false);
                          setRemanentCashStr('');
                        }}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                          !leaveCashInDrawer
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'text-zinc-300 hover:text-white'
                        }`}
                      >
                        NO
                      </button>
                      <button
                        type="button"
                        onClick={() => setLeaveCashInDrawer(true)}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition-all ${
                          leaveCashInDrawer
                            ? 'bg-emerald-400 text-black shadow-sm'
                            : 'text-zinc-300 hover:text-white'
                        }`}
                      >
                        SÍ
                      </button>
                    </div>
                  </div>

                  {leaveCashInDrawer && (
                    <div className="pt-1.5 border-t border-white/10 space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label className="text-[11px] font-bold text-amber-300">
                          Monto que se queda en caja ($) *
                        </label>
                        <div className="flex items-center gap-1">
                          {REMANENT_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setRemanentCashStr(preset.toString())}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black border transition-all ${
                                remanentCashStr === preset.toString()
                                  ? 'bg-amber-400 text-black border-amber-200'
                                  : 'bg-white/10 hover:bg-white/20 text-zinc-200 border-white/15'
                              }`}
                            >
                              ${preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-400 font-mono font-bold text-xs">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={countedCash > 0 ? countedCash : undefined}
                          value={remanentCashStr}
                          onChange={(e) => setRemanentCashStr(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="Ej. 1000.00"
                          className="w-full h-8 pl-7 pr-3 bg-[#0b0e17] rounded-lg border border-white/20 text-xs sm:text-sm font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      {remanentCash > countedCash && countedCash > 0 && (
                        <p className="text-[10.5px] text-rose-300 font-bold leading-tight">
                          ⚠️ El fondo no puede superar el efectivo contado (${countedCash.toFixed(2)}).
                        </p>
                      )}
                    </div>
                  )}

                  {/* Side-by-side Retiro & Fondo Readout */}
                  <div className="grid grid-cols-2 gap-1.5 font-mono">
                    <div className="px-2 py-1 rounded-lg bg-black/40 border border-white/10 flex items-center justify-between gap-1">
                      <span className="text-[9.5px] font-sans font-bold uppercase text-zinc-300 shrink-0">
                        Fondo:
                      </span>
                      <span className="text-xs font-black text-amber-300 truncate">
                        ${(leaveCashInDrawer ? remanentCash : 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                      </span>
                    </div>
                    <div className="px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-between gap-1">
                      <span className="text-[9.5px] font-sans font-bold uppercase text-emerald-200 shrink-0">
                        Retiro:
                      </span>
                      <span className="text-xs font-black text-emerald-300 truncate">
                        ${(leaveCashInDrawer ? cashToWithdraw : countedCash).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                      </span>
                    </div>
                  </div>
                </div>

                {/* Optional Shift Notes */}
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Observaciones o notas del turno (opcional)..."
                  className="w-full h-8 px-2.5 bg-[#101522]/85 rounded-xl border border-white/15 text-xs text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400"
                />

                {/* STEP 3: Confirmación de Cierre */}
                <div className="p-1.5 sm:p-2 rounded-xl bg-[#101522]/90 border border-amber-400/40 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
                  <div className="leading-tight shrink-0">
                    <label className="text-[11.5px] font-black text-white block">
                      Confirmar Cierre de Turno *
                    </label>
                    <span className="text-[9px] text-amber-300 uppercase tracking-wider font-extrabold block">
                      Escribe o pulsa "SÍ"
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                    <input
                      type="text"
                      maxLength={4}
                      value={confirmCloseInput}
                      onChange={(e) => setConfirmCloseInput(e.target.value.toUpperCase())}
                      placeholder="SI O NO..."
                      className="flex-1 min-w-0 h-7 px-2 bg-[#0b0e17] rounded-lg border border-white/20 text-center font-black tracking-widest text-xs text-white uppercase placeholder-zinc-400 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setConfirmCloseInput('SI')}
                      className={`h-7 px-2.5 rounded-lg font-black text-xs border transition-all flex items-center justify-center gap-1 shrink-0 ${
                        isConfirmedYes
                          ? 'bg-emerald-400 text-black border-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                          : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border-emerald-400/40'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>SÍ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCloseInput('NO')}
                      className={`h-7 px-2.5 rounded-lg font-black text-xs border transition-all flex items-center justify-center gap-1 shrink-0 ${
                        isConfirmedNo
                          ? 'bg-rose-500 text-white border-rose-300'
                          : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border-rose-400/40'
                      }`}
                    >
                      <span>NO</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!canSubmitClose}
                className={`w-full h-9 shrink-0 rounded-xl font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                  canSubmitClose
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.45)] border border-amber-200/80 cursor-pointer active:scale-[0.99]'
                    : 'bg-white/[0.06] text-zinc-400 border border-white/15 cursor-not-allowed'
                }`}
              >
                <Lock className="w-4 h-4 stroke-[2.5]" />
                <span>Cerrar Turno y Guardar Corte</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleOpenSession} className="space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-400 border-b border-white/15 pb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/45 flex items-center justify-center text-emerald-300">
                  <Unlock className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Abrir Nuevo Turno de Caja</h3>
                  <p className="text-xs text-zinc-300">
                    Registra el fondo inicial en efectivo para comenzar operaciones
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black text-white">
                    Fondo Inicial para este Nuevo Turno ($) *
                  </label>
                  <div className="flex items-center gap-1">
                    {[0, 500, 1000, 1500].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setInitialCashStr(preset.toString())}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border transition-all ${
                          initialCashStr === preset.toString()
                            ? 'bg-emerald-400 text-black border-emerald-200'
                            : 'bg-white/10 hover:bg-white/20 text-zinc-200 border-white/15'
                        }`}
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-mono font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={initialCashStr}
                    onChange={(e) => setInitialCashStr(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="0.00"
                    className="w-full h-11 pl-8 pr-16 bg-[#0e1320]/90 rounded-xl border border-emerald-400/45 text-xl font-mono font-black text-white focus:outline-none focus:border-emerald-300"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-emerald-300">
                    MXN
                  </span>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-[#101522]/85 border border-white/15 text-xs text-zinc-200 leading-relaxed">
                  {cashSession.leaveCashInDrawer ? (
                    <span>
                      💡 Fondo heredado del turno anterior:{' '}
                      <strong className="text-emerald-300 font-mono">
                        ${(cashSession.remanentCash || 0).toFixed(2)} MXN
                      </strong>
                      .
                    </span>
                  ) : (
                    <span>
                      En el turno anterior se retiró el 100% del efectivo a gerencia ($0.00 en cajón). Ingresa el fondo con el que inicias hoy.
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 text-black font-black text-sm shadow-glow-green transition-all flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4 stroke-[2.5]" />
                <span>Abrir Caja de Turno</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Movimientos de Caja (Entradas / Retiros) */}
      {showMovementsModal && (
        <CashMovementsModal onClose={() => setShowMovementsModal(false)} />
      )}

      {/* Modal de Recibo para Operaciones del Turno */}
      {selectedSaleForReceipt && (
        <ReceiptModal
          sale={selectedSaleForReceipt}
          onClose={() => setSelectedSaleForReceipt(null)}
        />
      )}
    </div>
  );
};
