import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, CheckCircle2, X, Delete, Lock, AlertTriangle } from 'lucide-react';
import { useGym } from '../../context/GymContext';

export const SupervisorPinModal: React.FC = () => {
  const { pendingSupervisorAction, verifySupervisorPin, cancelSupervisorAuth } = useGym();
  const [pinOrPass, setPinOrPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (pendingSupervisorAction) {
      setPinOrPass('');
      setErrorMsg('');
    }
  }, [pendingSupervisorAction]);

  if (!pendingSupervisorAction) return null;

  const handleConfirm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinOrPass.trim()) {
      setErrorMsg('Ingresa el PIN o contraseña del Supervisor / Administrador.');
      return;
    }

    const ok = verifySupervisorPin(pinOrPass, pendingSupervisorAction.actionLabel);
    if (ok) {
      const callback = pendingSupervisorAction.onAuthorized;
      cancelSupervisorAuth();
      callback();
    } else {
      setErrorMsg('PIN o contraseña de Supervisor inválido. Acción bloqueada.');
      setPinOrPass('');
    }
  };

  const appendDigit = (digit: string) => {
    setErrorMsg('');
    setPinOrPass((prev) => (prev.length < 16 ? prev + digit : prev));
  };

  const removeLastDigit = () => {
    setErrorMsg('');
    setPinOrPass((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#0f0f13] border border-amber-500/40 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/15 via-red-500/10 to-transparent border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Autorización de Supervisor
              </h3>
              <p className="text-[11px] text-amber-400/90 font-semibold">
                Acción Crítica Protegida por PIN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelSupervisorAuth}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleConfirm} className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">
              Operación solicitada:
            </p>
            <p className="text-xs font-bold text-white leading-relaxed">
              {pendingSupervisorAction.actionLabel}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              PIN o Contraseña de Administrador / Gerente
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={pinOrPass}
                onChange={(e) => {
                  setErrorMsg('');
                  setPinOrPass(e.target.value);
                }}
                onPaste={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                placeholder="Ingresa PIN de Supervisor (ej. 1234)"
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-sm font-mono tracking-widest focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Numeric Keypad */}
          <div className="p-3 rounded-2xl bg-black/50 border border-white/10">
            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => appendDigit(digit)}
                  className="py-2 rounded-lg bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 border border-white/5 text-white font-black text-sm transition active:scale-95"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinOrPass('')}
                className="py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-[11px] transition"
              >
                LIMPIAR
              </button>
              <button
                type="button"
                onClick={() => appendDigit('0')}
                className="py-2 rounded-lg bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 border border-white/5 text-white font-black text-sm transition active:scale-95"
              >
                0
              </button>
              <button
                type="button"
                onClick={removeLastDigit}
                className="py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 flex items-center justify-center transition"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-300 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={cancelSupervisorAuth}
              className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs uppercase tracking-wider transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Autorizar Acción
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 pt-1">
            <Lock className="w-3 h-3 text-amber-500/70" />
            <span>Esta autorización quedará registrada en la Bitácora de Auditoría</span>
          </div>
        </form>
      </div>
    </div>
  );
};
