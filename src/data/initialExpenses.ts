import { Expense } from '../types';

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'EXP-101',
    folio: 'GAS-00101',
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    category: 'equipment',
    description: 'Cambio de cables de acero y poleas de estación multifuncional Matrix',
    amount: 1450,
    paymentMethod: 'cash',
    paidFromCashRegister: true,
    registeredBy: 'Alejandro Morales',
    receiptNumber: 'FAC-88912',
    branchId: 'branch-matriz',
    notes: 'Mantenimiento preventivo por desgaste de guaya'
  },
  {
    id: 'EXP-102',
    folio: 'GAS-00102',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    category: 'cleaning',
    description: 'Insumos sanitizantes para mancuernas, toallas húmedas y atomizadores de alcohol',
    amount: 820,
    paymentMethod: 'cash',
    paidFromCashRegister: true,
    registeredBy: 'Valeria Gómez',
    receiptNumber: 'TKT-3341',
    branchId: 'branch-matriz',
    notes: 'Compra de garrafa de 20L de desinfectante grado hospitalario'
  },
  {
    id: 'EXP-103',
    folio: 'GAS-00103',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    category: 'supplements_stock',
    description: 'Lote reposición suplementos: 15 Proteínas ISO 100 + 20 Creatinas Creapure',
    amount: 18700,
    paymentMethod: 'transfer',
    paidFromCashRegister: false,
    registeredBy: 'Roberto Méndez',
    receiptNumber: 'SUP-49201',
    branchId: 'branch-matriz',
    notes: 'Factura pagada a Distribuidora FitPro México'
  },
  {
    id: 'EXP-104',
    folio: 'GAS-00104',
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    category: 'utilities',
    description: 'Servicio CFE Electricidad Comercial de Alta Tensión (Aire Acondicionado & Luces)',
    amount: 9850,
    paymentMethod: 'transfer',
    paidFromCashRegister: false,
    registeredBy: 'Roberto Méndez',
    receiptNumber: 'CFE-0091823',
    branchId: 'branch-matriz',
    notes: 'Periodo de facturación bimestral'
  },
  {
    id: 'EXP-105',
    folio: 'GAS-00105',
    date: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    category: 'marketing',
    description: 'Pauta en Instagram & TikTok: Campaña reto de transformación 90 días',
    amount: 2500,
    paymentMethod: 'card',
    paidFromCashRegister: false,
    registeredBy: 'Roberto Méndez',
    receiptNumber: 'META-77120',
    branchId: 'branch-matriz',
    notes: 'Segmentación local 5km a la redonda de Insurgentes'
  }
];
