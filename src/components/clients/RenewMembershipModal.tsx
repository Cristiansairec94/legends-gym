import React, { useState } from 'react';
import { Client, MembershipPlanType, PaymentMethod } from '../../types';
import { useGym } from '../../context/GymContext';
import confetti from 'canvas-confetti';
import { X, RefreshCw, CreditCard, Banknote, ArrowRightLeft } from 'lucide-react';

interface RenewMembershipModalProps {
  client: Client;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RenewMembershipModal: React.FC<RenewMembershipModalProps> = ({
  client,
  onClose,
  onSuccess,
}) => {
  const { renewMembership } = useGym();

  const [selectedPlan, setSelectedPlan] = useState<MembershipPlanType>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountGiven, setAmountGiven] = useState<string>('');

  const plans: { type: MembershipPlanType; name: string; months: number; price: number }[] = [
    { type: 'daily', name: 'Pase por Día (Day Pass)', months: 0, price: 150 },
    { type: 'monthly', name: 'Mensualidad Estándar (30 Días)', months: 1, price: 850 },
    { type: 'quarterly', name: 'Plan Trimestral Fuerza (90 Días)', months: 3, price: 2300 },
    { type: 'vip', name: 'Membresía Black VIP Anual (365 Días)', months: 12, price: 9500 },
  ];

  const currentPlan = plans.find(p => p.type === selectedPlan) || plans[1];
  const cashNum = parseFloat(amountGiven) || 0;
  const change = paymentMethod === 'cash' ? Math.max(0, cashNum - currentPlan.price) : 0;

  const handleRenew = (e: React.FormEvent) => {
    e.preventDefault();
    renewMembership(
      client.id, 
      selectedPlan, 
      currentPlan.months, 
      currentPlan.price, 
      paymentMethod
    );

    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-lg overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Renovar Cuota de Gimnasio</h3>
              <p className="text-xs text-gym-muted">Cobro y reactivación inmediata de acceso</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Member preview */}
        <div className="p-4 bg-gym-surface/20 border-b border-gym-border/60 flex items-center gap-3">
          <img 
            src={client.avatarUrl} 
            alt={client.fullName} 
            className="w-12 h-12 rounded-full object-cover border border-gym-border" 
          />
          <div>
            <h4 className="font-bold text-sm text-white">{client.fullName}</h4>
            <div className="flex items-center gap-2 text-xs text-gym-muted mt-0.5">
              <span>Estado Actual:</span>
              <span className={`font-semibold ${
                client.membership.status === 'active' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {client.membership.status === 'active' ? 'Activo' : 'Vencido'} ({client.membership.daysRemaining} días)
              </span>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleRenew} className="p-6 space-y-5">
          
          {/* Plan Options */}
          <div>
            <label className="text-xs font-semibold text-gym-muted block mb-2">
              Seleccionar Plan de Renovación:
            </label>
            <div className="space-y-2">
              {plans.map((p) => (
                <div
                  key={p.type}
                  onClick={() => setSelectedPlan(p.type)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedPlan === p.type
                      ? 'bg-amber-500/15 border-amber-400 shadow-glow-gold/40'
                      : 'bg-gym-surface/60 border-gym-border hover:border-gym-border/80'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-white block">{p.name}</span>
                  </div>
                  <span className="text-sm font-mono font-black text-amber-400">
                    ${p.price} MXN
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-semibold text-gym-muted block mb-2">
              Método de Pago:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                    : 'bg-gym-surface text-gym-muted border-gym-border'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Efectivo</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'card'
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500'
                    : 'bg-gym-surface text-gym-muted border-gym-border'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Tarjeta</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  paymentMethod === 'transfer'
                    ? 'bg-purple-500/20 text-purple-400 border-purple-500'
                    : 'bg-gym-surface text-gym-muted border-gym-border'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Transferencia</span>
              </button>
            </div>
          </div>

          {/* Cash calculation if cash */}
          {paymentMethod === 'cash' && (
            <div className="bg-gym-surface/50 p-3 rounded-xl border border-gym-border flex items-center justify-between gap-4">
              <div>
                <label className="text-[11px] text-gym-muted block">Efectivo Recibido:</label>
                <input
                  type="number"
                  value={amountGiven}
                  onChange={(e) => setAmountGiven(e.target.value)}
                  placeholder={`$${currentPlan.price}`}
                  className="w-32 px-2 py-1 bg-gym-card rounded-lg border border-gym-border text-sm font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gym-muted block">Cambio a Entregar:</span>
                <span className="text-base font-mono font-black text-emerald-400">
                  ${change.toFixed(2)} MXN
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gym-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gym-muted hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-sm shadow-glow-green transition-all"
            >
              Confirmar Cobro y Activar
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
