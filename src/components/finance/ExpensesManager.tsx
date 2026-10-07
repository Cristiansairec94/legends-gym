import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { 
  Receipt, 
  Plus, 
  Search, 
  DollarSign, 
  TrendingDown, 
  Calendar, 
  CreditCard, 
  Banknote, 
  Building2, 
  Tag, 
  Trash2, 
  FileText,
  AlertCircle,
  X,
  Filter
} from 'lucide-react';

export const ExpensesManager: React.FC = () => {
  const { 
    expenses, 
    addExpense, 
    deleteExpense, 
    todayExpensesTotal, 
    monthExpensesTotal, 
    activeBranch,
    cashSession,
    currentRole 
  } = useGym();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Nuevo gasto form state
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState<ExpenseCategory>('equipment');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidFromCashRegister, setPaidFromCashRegister] = useState(true);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');

  const categoryLabels: Record<ExpenseCategory, { label: string; color: string }> = {
    rent: { label: 'Renta de Local', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    utilities: { label: 'Luz & Aire Acondicionado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    equipment: { label: 'Mantenimiento de Equipo', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    supplements_stock: { label: 'Compra Suplementos', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    payroll: { label: 'Nómina & Sueldos', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    marketing: { label: 'Marketing & Redes', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    cleaning: { label: 'Insumos de Limpieza', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    other: { label: 'Otros Gastos', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0 || !description.trim()) return;

    addExpense({
      date: new Date().toISOString(),
      category,
      description: description.trim(),
      amount: Number(amount),
      paymentMethod,
      paidFromCashRegister,
      registeredBy: currentRole === 'admin' ? 'Administrador' : 'Recepcionista en turno',
      receiptNumber: receiptNumber.trim() || undefined,
      branchId: activeBranch.id,
      notes: notes.trim() || undefined
    });

    // Reset form
    setAmount('');
    setDescription('');
    setReceiptNumber('');
    setNotes('');
    setIsModalOpen(false);
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.folio.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (e.receiptNumber && e.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-500/20 via-gym-card to-gym-surface p-6 rounded-2xl border border-red-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-red-400">
                CONTROL DE EGRESOS & OPERACIÓN
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
              <Receipt className="w-7 h-7 text-red-400" />
              Registro de Gastos Operativos
            </h1>
            <p className="text-xs text-gym-muted mt-1 max-w-xl">
              Control de salidas de dinero para mantenimiento de pesas/cardio, pago de luz comercial, proveedores de suplementación y caja chica.
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-black text-xs shadow-lg flex items-center gap-2 transition-all self-start md:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Gastos de Hoy */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Gastos Registrados Hoy</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-red-400">
              ${todayExpensesTotal.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Impacto en flujo de caja diario</p>
        </div>

        {/* Gastos del Mes */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Egresos del Mes</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-white">
              ${monthExpensesTotal.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Mantenimiento + Insumos + Servicios</p>
        </div>

        {/* Estado de Caja Chica */}
        <div className="p-4 rounded-xl bg-gym-card border border-gym-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gym-muted uppercase">Efectivo Disponible en Caja</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-black text-emerald-400">
              ${cashSession.expectedCash.toLocaleString('es-MX')}
            </span>
          </div>
          <p className="text-[11px] text-gym-muted mt-1">Sede: {activeBranch.name}</p>
        </div>

      </div>

      {/* Filtros & Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gym-card p-3 rounded-2xl border border-gym-border">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gym-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Buscar por folio, concepto o factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gym-surface border border-gym-border rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gym-muted focus:outline-none focus:border-red-400"
          />
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              categoryFilter === 'all'
                ? 'bg-red-500 text-white'
                : 'bg-gym-surface text-gym-muted hover:text-white'
            }`}
          >
            Todos ({expenses.length})
          </button>
          {Object.entries(categoryLabels).map(([catKey, catMeta]) => {
            const count = expenses.filter(e => e.category === catKey).length;
            if (count === 0 && categoryFilter !== catKey) return null;
            return (
              <button
                key={catKey}
                onClick={() => setCategoryFilter(catKey)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                  categoryFilter === catKey
                    ? 'bg-red-500 text-white'
                    : 'bg-gym-surface text-gym-muted hover:text-white'
                }`}
              >
                {catMeta.label} ({count})
              </button>
            );
          })}
        </div>

      </div>

      {/* Expenses Table */}
      <div className="bg-gym-card rounded-2xl border border-gym-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gym-surface/80 border-b border-gym-border text-gym-muted uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Folio / Fecha</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Descripción del Gasto</th>
                <th className="py-3 px-4">Método de Pago</th>
                <th className="py-3 px-4">Registró</th>
                <th className="py-3 px-4 text-right">Importe</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gym-border/40">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gym-muted">
                    No se encontraron gastos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const cat = categoryLabels[expense.category] || categoryLabels.other;
                  const dateObj = new Date(expense.date);

                  return (
                    <tr key={expense.id} className="hover:bg-gym-surface/40 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-white block">
                          {expense.folio}
                        </span>
                        <span className="text-[11px] text-gym-muted">
                          {dateObj.toLocaleDateString('es-MX')} {dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cat.color}`}>
                          {cat.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-gray-200 truncate" title={expense.description}>
                          {expense.description}
                        </p>
                        {expense.receiptNumber && (
                          <span className="text-[10px] text-gym-muted font-mono block">
                            Doc: {expense.receiptNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {expense.paymentMethod === 'cash' && <Banknote className="w-3.5 h-3.5 text-emerald-400" />}
                          {expense.paymentMethod === 'card' && <CreditCard className="w-3.5 h-3.5 text-blue-400" />}
                          {expense.paymentMethod === 'transfer' && <DollarSign className="w-3.5 h-3.5 text-purple-400" />}
                          <span className="capitalize font-medium text-gray-300">
                            {expense.paymentMethod === 'cash' ? 'Efectivo' : expense.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}
                          </span>
                        </div>
                        {expense.paidFromCashRegister && (
                          <span className="text-[9px] text-amber-400 block font-semibold">
                            (Descontado de Caja)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-gym-muted font-medium">
                        {expense.registeredBy}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-sm text-red-400">
                          -${expense.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="p-1 rounded-lg text-gym-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar gasto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal Registrar Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gym-card border border-gym-border rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gym-border pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-red-400" />
                <h3 className="font-black text-lg text-white">Registrar Nuevo Gasto</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-gym-muted hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gym-muted block mb-1">Monto ($ MXN) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="Ej. 1450"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-red-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gym-muted block mb-1">Categoría *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                  >
                    {Object.entries(categoryLabels).map(([catKey, catMeta]) => (
                      <option key={catKey} value={catKey}>{catMeta.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gym-muted block mb-1">Descripción / Concepto *</label>
                <input 
                  type="text"
                  placeholder="Ej. Reparación de polea alta en torre Matrix..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gym-muted block mb-1">Forma de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia SPEI</option>
                    <option value="card">Tarjeta Débito/Crédito</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gym-muted block mb-1">No. Factura / Ticket</label>
                  <input 
                    type="text"
                    placeholder="Ej. FAC-88912"
                    value={receiptNumber}
                    onChange={(e) => setReceiptNumber(e.target.value)}
                    className="w-full bg-gym-surface border border-gym-border rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
                  />
                </div>
              </div>

              {paymentMethod === 'cash' && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gym-surface/80 border border-gym-border">
                  <input 
                    type="checkbox"
                    id="paidFromCash"
                    checked={paidFromCashRegister}
                    onChange={(e) => setPaidFromCashRegister(e.target.checked)}
                    className="w-4 h-4 text-red-500 rounded bg-gym-card border-gym-border focus:ring-0"
                  />
                  <label htmlFor="paidFromCash" className="text-xs text-gray-200 cursor-pointer">
                    Descontar inmediatamente del efectivo en caja de turno
                  </label>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gym-muted block mb-1">Notas Adicionales</label>
                <textarea 
                  rows={2}
                  placeholder="Detalles sobre proveedor, garantía o autorización..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gym-surface border border-gym-border rounded-xl p-3 text-xs text-white focus:outline-none focus:border-red-400 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gym-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gym-surface text-gym-muted hover:text-white text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black shadow-lg"
                >
                  Guardar Gasto
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
