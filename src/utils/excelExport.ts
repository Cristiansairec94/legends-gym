import * as XLSX from 'xlsx';
import { CashRegisterSession, Expense, Sale, GymSettings } from '../types';

export const exportShiftReportToExcel = (
  cashSession: CashRegisterSession,
  expenses: Expense[],
  sales: Sale[],
  gymSettings?: GymSettings
) => {
  const wb = XLSX.utils.book_new();

  const openedDateStr = new Date(cashSession.openedAt).toLocaleString('es-MX');
  const closedDateStr = cashSession.closedAt 
    ? new Date(cashSession.closedAt).toLocaleString('es-MX') 
    : 'Turno en curso (No cerrado)';

  const todayStr = new Date().toISOString().slice(0, 10);
  const shiftOpenTime = new Date(cashSession.openedAt).getTime();
  const shiftCloseTime = cashSession.closedAt ? new Date(cashSession.closedAt).getTime() : Date.now();

  // Filtrar ventas del turno actual
  const shiftSales = sales.filter(s => {
    const saleTime = new Date(s.timestamp || '').getTime();
    if (isNaN(saleTime)) return s.timestamp?.startsWith(todayStr);
    return saleTime >= shiftOpenTime && saleTime <= shiftCloseTime;
  });

  // Gastos pagados de caja
  const shiftCashExpenses = expenses.filter(e => {
    const expTime = new Date(e.date).getTime();
    if (isNaN(expTime)) return e.date?.startsWith(todayStr) && e.paidFromCashRegister;
    return expTime >= shiftOpenTime && expTime <= shiftCloseTime && e.paidFromCashRegister;
  });

  const totalCashExpenses = shiftCashExpenses.reduce((sum, e) => sum + e.amount, 0);

  const totalStoreSales = cashSession.totalSalesCash + cashSession.totalSalesCard + cashSession.totalSalesTransfer;
  const totalMemberships = cashSession.totalMembershipsCash + cashSession.totalMembershipsCard + (cashSession.totalMembershipsTransfer || 0);
  const grandTotalShift = totalStoreSales + totalMemberships;

  const totalElectronic = cashSession.totalSalesCard + cashSession.totalSalesTransfer + cashSession.totalMembershipsCard + (cashSession.totalMembershipsTransfer || 0);
  const expectedCashInDrawer = cashSession.expectedCash;

  const remanentCash = cashSession.leaveCashInDrawer ? (cashSession.remanentCash || 0) : 0;
  const withdrawnCash = cashSession.withdrawnCash ?? (cashSession.actualCash ?? expectedCashInDrawer);

  // ==========================================
  // HOJA 1: RESUMEN DE CORTE DE CAJA (CORTE Z)
  // ==========================================
  const summaryData: (string | number)[][] = [
    ['FITNESS LEGENDS GYM - REPORTE DE CORTE DE CAJA (CORTE Z)'],
    ['Gimnasio:', gymSettings?.gymName || 'Fitness Legends Gym', 'Fecha de Emisión:', new Date().toLocaleString('es-MX')],
    ['Folio de Turno:', cashSession.id, 'Estado:', cashSession.status === 'open' ? 'ABIERTO / EN CURSO' : 'CERRADO / CORTE REALIZADO'],
    ['Cajero Responsable:', cashSession.openedBy, 'Fecha Apertura:', openedDateStr],
    ['Fecha Cierre:', closedDateStr, 'Sucursal:', 'Principal'],
    [],
    ['--- 1. DESGLOSE DEL EFECTIVO EN CAJA FÍSICA ---', '', '', ''],
    ['Concepto', 'Monto ($ MXN)', 'Tipo', 'Detalle Operativo'],
    ['( + ) Fondo Inicial con que abrió el turno', cashSession.initialCash, 'Fondo', 'Monedas y billetes depositados al iniciar'],
    ['( + ) Ventas en Mostrador / Tienda (Efectivo)', cashSession.totalSalesCash, 'Ingreso', 'Suplementos, bebidas y cafetería cobrados en efectivo'],
    ['( + ) Membresías y Cuotas (Efectivo)', cashSession.totalMembershipsCash, 'Ingreso', 'Planes, inscripciones y visitas pagadas en efectivo'],
    ['( - ) Gastos Operativos Pagados de Caja (Efectivo)', -totalCashExpenses, 'Egreso', 'Compras urgentes y gastos menores pagados del cajón'],
    ['( = ) TOTAL EFECTIVO FÍSICO ESPERADO EN CAJÓN', expectedCashInDrawer, 'Cálculo Sistema', 'Monto total que debe existir físicamente en monedas/billetes'],
    [],
    ['--- 2. ARQUEO, CUADRE Y RETIRO DE EFECTIVO ---', '', '', ''],
    ['Concepto', 'Monto ($ MXN)', 'Resultado', 'Explicación'],
    ['Efectivo Físico Contado por Cajero', cashSession.actualCash ?? expectedCashInDrawer, 'Conteo Real', cashSession.status === 'closed' ? 'Conteo final al realizar el corte' : 'Turno aún en operaciones'],
    [
      'Diferencia de Caja', 
      cashSession.cashDifference ?? 0, 
      (cashSession.cashDifference || 0) === 0 ? 'Exacto' : (cashSession.cashDifference || 0) > 0 ? 'Sobrante' : 'Faltante',
      (cashSession.cashDifference || 0) === 0 
        ? 'Cuadre perfecto (0.00 de diferencia)' 
        : (cashSession.cashDifference || 0) > 0 
        ? `Sobrante de $${(cashSession.cashDifference || 0).toFixed(2)} a favor de caja` 
        : `Faltante de $${Math.abs(cashSession.cashDifference || 0).toFixed(2)} por justificar`
    ],
    ['¿Se dejó fondo para el siguiente turno?', cashSession.leaveCashInDrawer ? 'SÍ' : 'NO', 'Decisión', cashSession.leaveCashInDrawer ? 'Se reservó fondo en caja' : 'Se retiró el 100%'],
    ['Fondo que Permanece en Caja (Próx. Turno)', remanentCash, 'Fondo Remanente', 'Dinero que se queda en el cajón para cambio del siguiente turno'],
    ['EFECTIVO A RETIRAR (ENTREGA A GERENCIA)', withdrawnCash, 'Retiro Físico', 'Efectivo neto entregado a la administración / sobre sellado'],
    [],
    ['--- 3. INGRESOS ELECTRÓNICOS Y BANCARIOS (NO INGRESAN A CAJA FÍSICA) ---', '', '', ''],
    ['Concepto', 'Monto ($ MXN)', 'Medio de Pago', 'Destino'],
    ['Membresías cobradas con Tarjeta (POS)', cashSession.totalMembershipsCard, 'Terminal Bancaria', 'Cuenta Bancaria Gimnasio'],
    ['Suplementos / Tienda con Tarjeta (POS)', cashSession.totalSalesCard, 'Terminal Bancaria', 'Cuenta Bancaria Gimnasio'],
    ['Membresías por Transferencia (SPEI)', cashSession.totalMembershipsTransfer || 0, 'Transferencia SPEI', 'Cuenta Bancaria Gimnasio'],
    ['Suplementos / Tienda por Transferencia (SPEI)', cashSession.totalSalesTransfer, 'Transferencia SPEI', 'Cuenta Bancaria Gimnasio'],
    ['TOTAL INGRESOS ELECTRÓNICOS EN BANCO', totalElectronic, 'Suma Bancaria', 'Depósitos directos a cuenta bancaria'],
    [],
    ['--- 4. GRAN TOTAL CONSOLIDADO DEL TURNO ---', '', '', ''],
    ['TOTAL GENERAL INGRESADO EN EL TURNO', grandTotalShift, 'Total Ventas', 'Suma global de Efectivo + Tarjetas + Transferencias'],
    [],
    ['Notas del Turno:', cashSession.notes || 'Sin observaciones registradas.'],
    [],
    ['Firma Cajero de Turno: ___________________________', '', 'Firma Gerencia / Recibido: ___________________________', '']
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);

  // Configuración de anchos de columna para visualización perfecta
  wsSummary['!cols'] = [
    { wch: 48 }, // Columna A: Concepto
    { wch: 20 }, // Columna B: Monto
    { wch: 26 }, // Columna C: Tipo
    { wch: 55 }, // Columna D: Detalle
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Corte de Turno');

  // ==========================================
  // HOJA 2: DETALLE DE VENTAS DEL TURNO
  // ==========================================
  const salesHeader = [
    'Folio / Ticket',
    'Fecha y Hora',
    'Tipo de Venta',
    'Cliente / Socio',
    'Método de Pago',
    'Productos / Conceptos',
    'Subtotal ($)',
    'Total ($ MXN)',
    'Cajero'
  ];

  const salesRows = shiftSales.map(s => {
    const itemsDescription = s.items && s.items.length > 0
      ? s.items.map(it => `${it.quantity}x ${it.product.name}`).join(' | ')
      : s.planName || 'Venta mostrador';

    const paymentLabel = s.paymentMethod === 'cash' 
      ? 'Efectivo' 
      : s.paymentMethod === 'card' 
      ? 'Tarjeta Bancaria' 
      : 'Transferencia';

    const saleTypeLabel = s.saleType === 'membership' ? 'Membresía / Cuota' : 'Suplementos / Tienda';

    return [
      s.folio || s.id,
      new Date(s.timestamp).toLocaleString('es-MX'),
      saleTypeLabel,
      s.clientName || 'Público en General',
      paymentLabel,
      itemsDescription,
      s.subtotal || s.total,
      s.total,
      s.cashierName || cashSession.openedBy
    ];
  });

  const wsSales = XLSX.utils.aoa_to_sheet([salesHeader, ...salesRows]);
  wsSales['!cols'] = [
    { wch: 18 }, // Folio
    { wch: 22 }, // Fecha y Hora
    { wch: 22 }, // Tipo
    { wch: 28 }, // Cliente
    { wch: 20 }, // Método de Pago
    { wch: 45 }, // Productos
    { wch: 15 }, // Subtotal
    { wch: 16 }, // Total
    { wch: 24 }, // Cajero
  ];

  XLSX.utils.book_append_sheet(wb, wsSales, 'Ventas del Turno');

  // ==========================================
  // HOJA 3: GASTOS PAGADOS DE CAJA
  // ==========================================
  const expensesHeader = [
    'Folio Gasto',
    'Fecha y Hora',
    'Categoría',
    'Descripción del Gasto',
    'Monto ($ MXN)',
    'Pagado de Caja',
    'Registrado Por'
  ];

  const categoryNames: Record<string, string> = {
    rent: 'Renta',
    utilities: 'Servicios (Luz/Agua)',
    equipment: 'Mantenimiento Equipos',
    supplements_stock: 'Compra de Suplementos',
    payroll: 'Nómina / Sueldos',
    marketing: 'Publicidad',
    cleaning: 'Limpieza e Insumos',
    other: 'Otro'
  };

  const expensesRows = shiftCashExpenses.map(e => [
    e.folio || e.id,
    new Date(e.date).toLocaleString('es-MX'),
    categoryNames[e.category] || e.category,
    e.description,
    e.amount,
    'SÍ (Efectivo de Caja)',
    e.registeredBy || 'Administración'
  ]);

  const wsExpenses = XLSX.utils.aoa_to_sheet([expensesHeader, ...expensesRows]);
  wsExpenses['!cols'] = [
    { wch: 16 },
    { wch: 22 },
    { wch: 24 },
    { wch: 40 },
    { wch: 16 },
    { wch: 24 },
    { wch: 24 }
  ];

  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Gastos de Caja');

  // Descarga directa del archivo .xlsx
  const safeDate = new Date().toISOString().slice(0, 10);
  const fileName = `Reporte_Corte_Caja_${cashSession.id}_${safeDate}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
