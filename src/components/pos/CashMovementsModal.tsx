import React, { useState } from 'react';
import { useGym } from '../../context/GymContext';
import { X, DollarSign, ArrowUpRight, ArrowDownRight, Check } from 'lucide-react';

interface CashMovementsModalProps {
  onClose: () => void;
}

export const CashMovementsModal: React.FC<CashMovementsModalProps> = ({ onClose }) => {
  const { cashSession, updateCashSession } = useGym();

  const [type, setType] = useState<'in' | 'out'>('out');
  const [amountStr, setAmountStr] = useState('');
  const [concept, setConcept] = useState('');

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountStr) || 0;
    if (amount <= 0 || !concept.trim()) return;

    if (type === 'in') {
      updateCashSession({
        ...cashSession,
        totalSalesCash: cashSession.totalSalesCash + amount,
        expectedCash: cashSession.expectedCash + amount,
      });
    } else {
      updateCashSession({
        ...cashSession,
        expectedCash: Math.max(0, cashSession.expectedCash - amount),
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-md overflow-hidden shadow-2xl relative">
        <div className="p-4 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Movimientos de Caja</h3>
          </div>
          <button onClick={onClose} className="text-gym-muted hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveMovement} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('in')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                type === 'in'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                  : 'bg-gym-surface text-gym-muted border-gym-border'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Entrada de Dinero</span>
            </button>
            <button
              type="button"
              onClick={() => setType('out')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                type === 'out'
                  ? 'bg-red-500/20 text-red-400 border-red-500'
                  : 'bg-gym-surface text-gym-muted border-gym-border'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Retiro / Gasto Menor</span>
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-gym-muted block mb-1">Monto ($ MXN) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-base font-mono font-bold text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gym-muted block mb-1">Concepto / Motivo *</label>
            <input
              type="text"
              required
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="Ej. Compra de agua, hielo, insumos de limpieza..."
              className="w-full px-3 py-2 bg-gym-surface rounded-xl border border-gym-border text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gym-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gym-surface text-xs font-semibold text-gym-muted hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-glow-gold"
            >
              Registrar Movimiento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
