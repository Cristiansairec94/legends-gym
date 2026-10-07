import React, { useState } from 'react';
import { Client } from '../../types';
import { useGym } from '../../context/GymContext';
import { sounds } from '../../services/audio';
import confetti from 'canvas-confetti';
import { 
  Fingerprint, 
  CheckCircle2, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  RefreshCw 
} from 'lucide-react';

interface BiometricEnrollModalProps {
  client: Client;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BiometricEnrollModal: React.FC<BiometricEnrollModalProps> = ({
  client,
  onClose,
  onSuccess,
}) => {
  const { enrollFingerprint } = useGym();
  
  // Step 1: Primera toma, Step 2: Segunda toma, Step 3: Verificación final y guardado
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isReading, setIsReading] = useState(false);
  const [fingerSelected, setFingerSelected] = useState('Pulgar Derecho');

  const fingers = [
    'Pulgar Derecho',
    'Índice Derecho',
    'Pulgar Izquierdo',
    'Índice Izquierdo',
  ];

  const handleCaptureStep = () => {
    if (isReading) return;
    setIsReading(true);
    sounds.playScanBlip();

    setTimeout(() => {
      setIsReading(false);
      if (step === 1) {
        setStep(2);
      } else if (step === 2) {
        setStep(3);
      } else if (step === 3) {
        // Final success
        const templateCode = `FP_${fingerSelected.toUpperCase().replace(/\s+/g, '_')}_${Date.now()}`;
        enrollFingerprint(client.id, templateCode);
        sounds.playAccessGranted();
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch {
          // fallback
        }
        setStep(4);
        if (onSuccess) onSuccess();
      }
    }, 1200);
  };

  const handleReset = () => {
    setStep(1);
    setIsReading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gym-card rounded-2xl border border-gym-border w-full max-w-lg overflow-hidden shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gym-border flex items-center justify-between bg-gym-surface/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Enrolamiento Biométrico</h3>
              <p className="text-xs text-gym-muted">Captura de huella dactilar para torniquete</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gym-muted hover:text-white hover:bg-gym-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client Header Info */}
        <div className="p-4 bg-gym-surface/20 border-b border-gym-border/60 flex items-center gap-3">
          <img 
            src={client.avatarUrl} 
            alt={client.fullName} 
            className="w-12 h-12 rounded-full object-cover border border-gym-border" 
          />
          <div>
            <h4 className="font-bold text-sm text-white">{client.fullName}</h4>
            <div className="flex items-center gap-2 text-xs text-gym-muted mt-0.5">
              <span>Folio: <strong className="text-gray-300">{client.id}</strong></span>
              <span>•</span>
              <span>Doc: <strong className="text-gray-300">{client.documentId}</strong></span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{client.membership.planName}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {step < 4 ? (
            <div className="space-y-6">
              
              {/* Finger selector */}
              {step === 1 && (
                <div>
                  <label className="text-xs font-semibold text-gym-muted block mb-2">
                    Seleccione el dedo a enrolar:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {fingers.map((f) => (
                      <button
                        key={f}
                        onClick={() => setFingerSelected(f)}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          fingerSelected === f
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-sm'
                            : 'bg-gym-surface text-gray-300 border-gym-border hover:border-gym-border/80'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Steps Indicators */}
              <div className="flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-gym-surface/40 border border-gym-border">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                      step > s
                        ? 'bg-emerald-500 text-black'
                        : step === s
                        ? 'bg-amber-500 text-black ring-4 ring-amber-500/20'
                        : 'bg-gym-surface text-gym-muted border border-gym-border'
                    }`}>
                      {step > s ? '✓' : s}
                    </div>
                    <span className={`text-xs ${step === s ? 'text-amber-400 font-bold' : 'text-gym-muted'}`}>
                      {s === 1 ? '1ra Lectura' : s === 2 ? '2da Lectura' : 'Verificación'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Scanner interactive target */}
              <div className="flex flex-col items-center">
                <div
                  onClick={handleCaptureStep}
                  className={`w-36 h-36 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 relative border-2 ${
                    isReading
                      ? 'bg-amber-500/10 border-amber-400 shadow-glow-gold scale-105'
                      : 'bg-gym-surface/80 border-gym-border hover:border-amber-400 hover:shadow-glow-gold/30'
                  }`}
                >
                  {isReading && (
                    <div className="absolute inset-0 rounded-full border border-amber-400/40 scanner-ring" />
                  )}
                  {isReading && (
                    <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_10px_#F59E0B] animate-scan-line z-20" />
                  )}
                  <Fingerprint className={`w-16 h-16 ${isReading ? 'text-amber-400 animate-pulse' : 'text-gym-muted hover:text-amber-400'}`} />
                </div>

                <div className="mt-4 text-center">
                  <p className="text-sm font-bold text-white">
                    {isReading 
                      ? 'Extrayendo plantilla biométrica...' 
                      : `Haz clic para capturar: ${fingerSelected}`}
                  </p>
                  <p className="text-xs text-gym-muted mt-1">
                    {step === 1 && 'Coloca el dedo firmemente sobre el sensor para la muestra base'}
                    {step === 2 && 'Levanta el dedo y vuelve a apoyarlo para verificar ángulo'}
                    {step === 3 && 'Última confirmación para generar el código hash criptográfico'}
                  </p>
                </div>
              </div>

            </div>
          ) : (
            // Success Screen
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-black text-white">¡Enrolamiento Exitoso!</h4>
                <p className="text-xs text-gym-muted mt-1">
                  La huella de <strong className="text-white">{client.fullName}</strong> fue registrada en la base de datos biométrica.
                </p>
              </div>

              <div className="bg-gym-surface/70 p-3 rounded-xl border border-gym-border text-left font-mono text-[11px] space-y-1 text-gym-muted">
                <div>Hash ID: <span className="text-emerald-400 font-bold">BIO_HASH_{client.id}</span></div>
                <div>Dedo: <span className="text-gray-200">{fingerSelected}</span></div>
                <div>Estado: <span className="text-emerald-400">Torniquete Habilitado</span></div>
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm shadow-glow-gold transition-all"
                >
                  Finalizar y Cerrar
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl bg-gym-surface hover:bg-gym-surface/80 border border-gym-border text-xs font-semibold text-gym-muted hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Volver a capturar</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
