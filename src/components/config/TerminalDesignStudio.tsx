import React, { useEffect, useState } from 'react';
import { Palette, CheckCircle2, Monitor } from 'lucide-react';
import { useGym } from '../../context/GymContext';
import { TerminalCardId, TerminalEntryDesignConfig } from '../../utils/terminalDesign';
import { TerminalEntryCanvas } from '../access/TerminalEntryCanvas';
import { TerminalDesignEditorControls } from '../access/TerminalDesignEditorControls';

export const TerminalDesignStudio: React.FC = () => {
  const { terminalDesign, updateTerminalDesign } = useGym();
  const [draft, setDraft] = useState<TerminalEntryDesignConfig>(terminalDesign);
  const [selectedCardId, setSelectedCardId] = useState<TerminalCardId>('new');
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setDraft(terminalDesign);
  }, [terminalDesign]);

  const handleSave = (designToSave: TerminalEntryDesignConfig) => {
    const finalDesign = {
      ...designToSave,
      updatedAt: new Date().toISOString(),
    };
    updateTerminalDesign(finalDesign);
    setSavedToast(true);
    window.setTimeout(() => setSavedToast(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Banner Header */}
      <div className="bg-gym-card rounded-2xl border border-gym-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
              Estudio Visual de Pantalla de Acceso
            </h1>
            <p className="text-xs text-gym-muted mt-0.5">
              Personaliza imágenes, lugar, forma, tamaños y diseño de entrada. Los cambios se sincronizan con Control de Acceso.
            </p>
          </div>
        </div>

        {savedToast && (
          <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Diseño guardado y aplicado</span>
          </div>
        )}
      </div>

      {/* Main Split Studio: Live Interactive 16:9 Canvas + Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-7 bg-gym-card rounded-2xl border border-gym-border p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-200 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-amber-400" />
              <span>Vista Previa Interactiva (Arrastra las tarjetas en vivo)</span>
            </span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-semibold">
              {draft.layout.mode === 'free' ? 'Modo Libre (Individual)' : 'Modo Conjunto'}
            </span>
          </div>

          <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/15 shadow-2xl bg-black">
            <TerminalEntryCanvas
              design={draft}
              isEditing={true}
              selectedCardId={selectedCardId}
              onSelectCard={(id) => setSelectedCardId(id)}
              onChangeDesign={(next) => setDraft(next)}
              compactText={true}
            />
          </div>
        </div>

        <div className="xl:col-span-5 h-[620px]">
          <TerminalDesignEditorControls
            design={draft}
            onChange={(next) => setDraft(next)}
            onSave={handleSave}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
          />
        </div>
      </div>
    </div>
  );
};
