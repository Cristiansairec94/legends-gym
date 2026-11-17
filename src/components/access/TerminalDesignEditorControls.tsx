import React, { useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Move,
  Shapes,
  Layers,
  Upload,
  RotateCcw,
  Save,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  X,
} from 'lucide-react';
import {
  TERMINAL_BG_PRESETS,
  TERMINAL_SHAPE_PRESETS,
  TERMINAL_THEME_PRESETS,
  TerminalArrangement,
  TerminalCardId,
  TerminalEntryDesignConfig,
  TerminalLabelPlacement,
  cloneDefaultTerminalDesign,
  compressImageFileToDataUrl,
} from '../../utils/terminalDesign';

interface TerminalDesignEditorControlsProps {
  design: TerminalEntryDesignConfig;
  onChange: (next: TerminalEntryDesignConfig) => void;
  onSave: (designToSave: TerminalEntryDesignConfig) => void;
  onClose?: () => void;
  selectedCardId: TerminalCardId;
  onSelectCard: (id: TerminalCardId) => void;
  compact?: boolean;
}

const ACCENT_SWATCHES = ['#f59e0b', '#10b981', '#06b6d4', '#ec4899', '#a855f7', '#ef4444', '#ffffff'];

const CARD_LABELS: Record<TerminalCardId, string> = {
  new: 'Cliente Nuevo',
  visit: 'Quiero Visita',
  member: 'Ya Tengo Membresía',
};

const ARRANGEMENT_OPTIONS: Array<{ id: TerminalArrangement; label: string }> = [
  { id: 'row-3', label: '3 en Fila' },
  { id: 'col-3', label: '3 en Columna' },
  { id: 'hero-center', label: 'Central Grande' },
  { id: 'pyramid-top', label: '1 Arriba + 2' },
  { id: 'pyramid-bottom', label: '2 Arriba + 1' },
];

export const TerminalDesignEditorControls: React.FC<TerminalDesignEditorControlsProps> = ({
  design,
  onChange,
  onSave,
  onClose,
  selectedCardId,
  onSelectCard,
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<'bg' | 'layout' | 'shape' | 'cards'>('layout');
  const [uploadError, setUploadError] = useState<string>('');
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);
  const cardFileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCard = design.cards[selectedCardId] || design.cards.new;

  const updateDesign = (updater: (prev: TerminalEntryDesignConfig) => TerminalEntryDesignConfig) => {
    const next = updater(design);
    onChange({ ...next, updatedAt: new Date().toISOString() });
  };

  const handleUploadBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 1600, 900, 0.84);
      updateDesign((prev) => ({
        ...prev,
        background: {
          ...prev.background,
          presetId: 'custom',
          customDataUrl: dataUrl,
          fit: 'cover',
        },
      }));
    } catch {
      setUploadError('No se pudo cargar esa imagen de fondo.');
    }
  };

  const handleUploadCardImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 800, 800, 0.85);
      updateDesign((prev) => ({
        ...prev,
        cards: {
          ...prev.cards,
          [selectedCardId]: {
            ...prev.cards[selectedCardId],
            imagePreset: 'custom',
            customImageDataUrl: dataUrl,
          },
        },
      }));
    } catch {
      setUploadError('No se pudo cargar la imagen de la tarjeta.');
    }
  };

  const moveCardOrder = (id: TerminalCardId, dir: -1 | 1) => {
    const order = [...design.layout.cardOrder];
    const idx = order.indexOf(id);
    if (idx === -1) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= order.length) return;
    const tmp = order[idx];
    order[idx] = order[nextIdx];
    order[nextIdx] = tmp;
    updateDesign((prev) => ({
      ...prev,
      layout: { ...prev.layout, cardOrder: order },
    }));
  };

  const applyTheme = (themeId: TerminalEntryDesignConfig['theme']) => {
    const themeObj = TERMINAL_THEME_PRESETS.find((t) => t.id === themeId);
    if (!themeObj) return;
    updateDesign((prev) => ({
      ...prev,
      theme: themeId,
      shape: {
        ...prev.shape,
        borderWidth: themeObj.borderWidth,
        glowIntensity: themeObj.glowIntensity,
      },
      cards: {
        new: { ...prev.cards.new, accentColor: themeObj.cardColors.new },
        visit: { ...prev.cards.visit, accentColor: themeObj.cardColors.visit },
        member: { ...prev.cards.member, accentColor: themeObj.cardColors.member },
      },
    }));
  };

  const switchLayoutMode = (mode: 'group' | 'free') => {
    if (mode === design.layout.mode) return;
    if (mode === 'free') {
      // Seed clean non-overlapping free coordinates from current group box
      const gTop = design.layout.topPct;
      const gLeft = design.layout.leftPct;
      const gW = design.layout.widthPct;
      const gH = design.layout.heightPct;
      const eachW = Math.max(14, Math.round((gW / 3 - 1.5) * 10) / 10);
      const nextCards = { ...design.cards };
      design.layout.cardOrder.forEach((id, i) => {
        nextCards[id] = {
          ...nextCards[id],
          xPct: Math.round((gLeft + i * (eachW + 2)) * 10) / 10,
          yPct: gTop,
          widthPct: eachW,
          heightPct: gH,
        };
      });
      updateDesign((prev) => ({
        ...prev,
        layout: { ...prev.layout, mode: 'free' },
        cards: nextCards,
      }));
    } else {
      updateDesign((prev) => ({
        ...prev,
        layout: { ...prev.layout, mode: 'group' },
      }));
    }
  };

  const handleReset = () => {
    const fresh = cloneDefaultTerminalDesign();
    fresh.updatedAt = new Date().toISOString();
    onChange(fresh);
  };

  return (
    <div className="bg-[#0e121a]/96 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] text-white flex flex-col overflow-hidden h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 bg-white/[0.03]">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-white leading-tight truncate">
              Editor de Diseño de Entrada
            </h3>
            <p className="text-[11px] text-zinc-400 truncate">
              Imágenes, lugar, forma y estilo en vivo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[11px] font-bold text-zinc-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            title="Restaurar diseño original de fábrica"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Original</span>
          </button>
          <button
            type="button"
            onClick={() => onSave(design)}
            className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#1a1200] text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              title="Cerrar editor"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 p-1.5 bg-black/35 border-b border-white/10 shrink-0">
        {[
          { id: 'bg' as const, label: 'Fondo', icon: ImageIcon },
          { id: 'layout' as const, label: 'Lugar', icon: Move },
          { id: 'shape' as const, label: 'Forma', icon: Shapes },
          { id: 'cards' as const, label: 'Tarjetas', icon: Layers },
        ].map((t) => {
          const Icon = t.icon;
          const isAct = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`py-1.5 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-all ${
                isAct
                  ? 'bg-amber-400 text-[#1a1200] shadow'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error banner */}
      {uploadError && (
        <div className="mx-3 mt-2 px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
          {uploadError}
        </div>
      )}

      {/* Scrollable Body */}
      <div className={`flex-1 min-h-0 overflow-y-auto ${compact ? 'p-3' : 'p-4'} space-y-4 text-xs`}>
        {/* TAB 1: FONDO */}
        {activeTab === 'bg' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-zinc-200">Imagen de Fondo</span>
                <button
                  type="button"
                  onClick={() => bgFileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-bold text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Foto de PC</span>
                </button>
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadBg}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {TERMINAL_BG_PRESETS.map((p) => {
                  const selected = design.background.presetId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        updateDesign((prev) => ({
                          ...prev,
                          background: {
                            ...prev.background,
                            presetId: p.id,
                            fit: p.defaultFit,
                            position: p.defaultPosition,
                          },
                        }))
                      }
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        selected
                          ? 'bg-amber-500/15 border-amber-400 text-white'
                          : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:border-white/25'
                      }`}
                    >
                      <span className="font-bold text-[11px] block truncate">{p.name}</span>
                    </button>
                  );
                })}
              </div>
              {design.background.presetId === 'custom' && (
                <p className="text-[11px] text-emerald-400 mt-1.5 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Imagen personalizada activa
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Ajuste</label>
                <select
                  value={design.background.fit}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      background: { ...prev.background, fit: e.target.value as any },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#181d28] border border-white/15 text-xs text-white"
                >
                  <option value="fill">Estirar completo</option>
                  <option value="cover">Cubrir (Cover)</option>
                  <option value="contain">Contener sin recortar</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Encuadre</label>
                <select
                  value={design.background.position}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      background: { ...prev.background, position: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#181d28] border border-white/15 text-xs text-white"
                >
                  <option value="center center">Centro</option>
                  <option value="center top">Arriba</option>
                  <option value="center bottom">Abajo</option>
                  <option value="left center">Izquierda</option>
                  <option value="right center">Derecha</option>
                </select>
              </div>
            </div>

            <div className="space-y-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-300">Brillo del fondo</span>
                  <span className="font-mono text-amber-300">{design.background.brightness}%</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={130}
                  value={design.background.brightness}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      background: { ...prev.background, brightness: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-300">Oscurecer capa encima</span>
                  <span className="font-mono text-amber-300">{design.background.overlayOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={75}
                  value={design.background.overlayOpacity}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      background: { ...prev.background, overlayOpacity: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-zinc-300">Desenfoque (Blur)</span>
                  <span className="font-mono text-amber-300">{design.background.blur}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={12}
                  value={design.background.blur}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      background: { ...prev.background, blur: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Título / Banner superior opcional */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-bold text-zinc-200">Mostrar Título Superior</span>
                <input
                  type="checkbox"
                  checked={design.banner.enabled}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      banner: { ...prev.banner, enabled: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </label>
              {design.banner.enabled && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={design.banner.title}
                    onChange={(e) =>
                      updateDesign((prev) => ({
                        ...prev,
                        banner: { ...prev.banner, title: e.target.value },
                      }))
                    }
                    placeholder="Título de bienvenida"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#181d28] border border-white/15 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={design.banner.subtitle}
                    onChange={(e) =>
                      updateDesign((prev) => ({
                        ...prev,
                        banner: { ...prev.banner, subtitle: e.target.value },
                      }))
                    }
                    placeholder="Subtítulo"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#181d28] border border-white/15 text-xs text-white"
                  />
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-zinc-400">Altura vertical (%)</span>
                      <span className="font-mono text-amber-300">{design.banner.topPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={40}
                      value={design.banner.topPct}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          banner: { ...prev.banner, topPct: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LUGAR Y TAMAÑO */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-[11px] text-amber-200">
              Puedes <strong>arrastrar directamente con el mouse</strong> sobre el lienzo para cambiar el lugar y tamaño.
            </div>

            <div>
              <label className="font-bold text-zinc-200 block mb-1.5">Modo de Posicionamiento</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => switchLayoutMode('group')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    design.layout.mode === 'group'
                      ? 'bg-amber-400 text-[#1a1200] border-amber-300'
                      : 'bg-white/[0.04] text-zinc-300 border-white/10'
                  }`}
                >
                  Conjunto (3 Juntas)
                </button>
                <button
                  type="button"
                  onClick={() => switchLayoutMode('free')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    design.layout.mode === 'free'
                      ? 'bg-amber-400 text-[#1a1200] border-amber-300'
                      : 'bg-white/[0.04] text-zinc-300 border-white/10'
                  }`}
                >
                  Libre (Cada Imagen)
                </button>
              </div>
            </div>

            {design.layout.mode === 'group' ? (
              <>
                <div>
                  <label className="font-bold text-zinc-200 block mb-1.5">Distribución del Grupo</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {ARRANGEMENT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          updateDesign((prev) => ({
                            ...prev,
                            layout: { ...prev.layout, arrangement: opt.id },
                          }))
                        }
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold cursor-pointer transition-all ${
                          design.layout.arrangement === opt.id
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:border-white/25'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Posición Vertical (Arriba)</span>
                      <span className="font-mono text-amber-300">{design.layout.topPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={75}
                      step={0.5}
                      value={design.layout.topPct}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          layout: { ...prev.layout, topPct: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Posición Horizontal (Izquierda)</span>
                      <span className="font-mono text-amber-300">{design.layout.leftPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={65}
                      step={0.5}
                      value={design.layout.leftPct}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          layout: { ...prev.layout, leftPct: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Ancho Total</span>
                      <span className="font-mono text-amber-300">{design.layout.widthPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={96}
                      step={0.5}
                      value={design.layout.widthPct}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          layout: { ...prev.layout, widthPct: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Alto Total</span>
                      <span className="font-mono text-amber-300">{design.layout.heightPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={80}
                      step={0.5}
                      value={design.layout.heightPct}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          layout: { ...prev.layout, heightPct: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Espacio entre Tarjetas</span>
                      <span className="font-mono text-amber-300">{design.layout.gapPx}px</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={44}
                      value={design.layout.gapPx}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          layout: { ...prev.layout, gapPx: Number(e.target.value) },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>

                {/* Order */}
                <div>
                  <label className="font-bold text-zinc-200 block mb-1.5">Orden de las Imágenes</label>
                  <div className="space-y-1.5">
                    {design.layout.cardOrder.map((id, idx) => (
                      <div
                        key={id}
                        className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between"
                      >
                        <span className="font-semibold text-white">
                          {idx + 1}. {design.cards[id].title}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveCardOrder(id, -1)}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                            title="Mover antes"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === design.layout.cardOrder.length - 1}
                            onClick={() => moveCardOrder(id, 1)}
                            className="p-1 rounded bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
                            title="Mover después"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* Free positioning sliders for selected card */
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {(['new', 'visit', 'member'] as TerminalCardId[]).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectCard(id)}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold truncate cursor-pointer ${
                        selectedCardId === id
                          ? 'bg-amber-400 text-black border-amber-300'
                          : 'bg-white/[0.04] text-zinc-300 border-white/10'
                      }`}
                    >
                      {CARD_LABELS[id]}
                    </button>
                  ))}
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>X Horizontal ({CARD_LABELS[selectedCardId]})</span>
                      <span className="font-mono text-amber-300">{selectedCard.xPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={88}
                      step={0.5}
                      value={selectedCard.xPct}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          cards: {
                            ...prev.cards,
                            [selectedCardId]: { ...selectedCard, xPct: Number(e.target.value) },
                          },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Y Vertical</span>
                      <span className="font-mono text-amber-300">{selectedCard.yPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={88}
                      step={0.5}
                      value={selectedCard.yPct}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          cards: {
                            ...prev.cards,
                            [selectedCardId]: { ...selectedCard, yPct: Number(e.target.value) },
                          },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Ancho</span>
                      <span className="font-mono text-amber-300">{selectedCard.widthPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      step={0.5}
                      value={selectedCard.widthPct}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          cards: {
                            ...prev.cards,
                            [selectedCardId]: { ...selectedCard, widthPct: Number(e.target.value) },
                          },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Alto</span>
                      <span className="font-mono text-amber-300">{selectedCard.heightPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={75}
                      step={0.5}
                      value={selectedCard.heightPct}
                      onChange={(e) =>
                        updateDesign((prev) => ({
                          ...prev,
                          cards: {
                            ...prev.cards,
                            [selectedCardId]: { ...selectedCard, heightPct: Number(e.target.value) },
                          },
                        }))
                      }
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FORMA Y DISEÑO */}
        {activeTab === 'shape' && (
          <div className="space-y-4">
            <div>
              <label className="font-bold text-zinc-200 block mb-1.5">Forma de las Imágenes / Tarjetas</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TERMINAL_SHAPE_PRESETS.map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() =>
                      updateDesign((prev) => ({
                        ...prev,
                        shape: {
                          ...prev.shape,
                          preset: sh.id,
                          borderRadiusPx: sh.radiusPx,
                        },
                      }))
                    }
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                      design.shape.preset === sh.id
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-white/[0.04] border-white/10 text-zinc-300 hover:border-white/25'
                    }`}
                  >
                    <span className="font-bold block text-[11px]">{sh.label}</span>
                    <span className="text-[10px] text-zinc-400">{sh.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-zinc-200 block mb-1.5">Tema Visual Rápido</label>
              <div className="grid grid-cols-2 gap-1.5">
                {TERMINAL_THEME_PRESETS.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => applyTheme(th.id)}
                    className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                      design.theme === th.id
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-white/[0.04] border-white/10 text-zinc-300'
                    }`}
                  >
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30" style={{ backgroundColor: th.swatch }} />
                    <span className="font-bold text-[11px] truncate">{th.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-bold text-zinc-200 block mb-1.5">Posición del Texto sobre la Imagen</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'bottom' as TerminalLabelPlacement, label: 'Abajo (Clásico)' },
                  { id: 'center' as TerminalLabelPlacement, label: 'Centro' },
                  { id: 'top' as TerminalLabelPlacement, label: 'Arriba' },
                  { id: 'floating-pill' as TerminalLabelPlacement, label: 'Píldora Flotante' },
                ].map((lp) => (
                  <button
                    key={lp.id}
                    type="button"
                    onClick={() =>
                      updateDesign((prev) => ({
                        ...prev,
                        shape: { ...prev.shape, labelPlacement: lp.id },
                      }))
                    }
                    className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                      design.shape.labelPlacement === lp.id
                        ? 'bg-amber-400 text-black border-amber-300'
                        : 'bg-white/[0.04] text-zinc-300 border-white/10'
                    }`}
                  >
                    {lp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-2.5">
              {design.shape.preset === 'rounded' && (
                <div>
                  <div className="flex justify-between text-[11px]">
                    <span>Curva de Esquinas</span>
                    <span className="font-mono text-amber-300">{design.shape.borderRadiusPx}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={48}
                    value={design.shape.borderRadiusPx}
                    onChange={(e) =>
                      updateDesign((prev) => ({
                        ...prev,
                        shape: { ...prev.shape, borderRadiusPx: Number(e.target.value) },
                      }))
                    }
                    className="w-full accent-amber-400"
                  />
                </div>
              )}
              <div>
                <div className="flex justify-between text-[11px]">
                  <span>Grosor de Borde</span>
                  <span className="font-mono text-amber-300">{design.shape.borderWidth}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  value={design.shape.borderWidth}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      shape: { ...prev.shape, borderWidth: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-amber-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px]">
                  <span>Brillo / Neón Exterior</span>
                  <span className="font-mono text-amber-300">{design.shape.glowIntensity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={design.shape.glowIntensity}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      shape: { ...prev.shape, glowIntensity: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-amber-400"
                />
              </div>
              <div>
                <div className="flex justify-between text-[11px]">
                  <span>Visibilidad de Imagen</span>
                  <span className="font-mono text-amber-300">{design.shape.imageOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={design.shape.imageOpacity}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      shape: { ...prev.shape, imageOpacity: Number(e.target.value) },
                    }))
                  }
                  className="w-full accent-amber-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TARJETAS INDIVIDUALES E IMÁGENES */}
        {activeTab === 'cards' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1.5">
              {(['new', 'visit', 'member'] as TerminalCardId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectCard(id)}
                  className={`py-2 px-2 rounded-xl border text-[11px] font-bold truncate cursor-pointer ${
                    selectedCardId === id
                      ? 'bg-amber-400 text-[#1a1200] border-amber-300'
                      : 'bg-white/[0.04] text-zinc-300 border-white/10 hover:border-white/25'
                  }`}
                >
                  {CARD_LABELS[id]}
                </button>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">{CARD_LABELS[selectedCardId]}</span>
                <button
                  type="button"
                  onClick={() =>
                    updateDesign((prev) => ({
                      ...prev,
                      cards: {
                        ...prev.cards,
                        [selectedCardId]: { ...selectedCard, visible: !selectedCard.visible },
                      },
                    }))
                  }
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer ${
                    selectedCard.visible
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-rose-500/20 border-rose-400/50 text-rose-300'
                  }`}
                >
                  {selectedCard.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{selectedCard.visible ? 'Visible' : 'Oculta'}</span>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Texto Principal</label>
                <input
                  type="text"
                  value={selectedCard.title}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      cards: {
                        ...prev.cards,
                        [selectedCardId]: { ...selectedCard, title: e.target.value },
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-[#181d28] border border-white/15 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Subtítulo / Acción</label>
                <input
                  type="text"
                  value={selectedCard.subtitle}
                  onChange={(e) =>
                    updateDesign((prev) => ({
                      ...prev,
                      cards: {
                        ...prev.cards,
                        [selectedCardId]: { ...selectedCard, subtitle: e.target.value },
                      },
                    }))
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-[#181d28] border border-white/15 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-400 block mb-1.5">Color de Borde y Acento</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ACCENT_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() =>
                        updateDesign((prev) => ({
                          ...prev,
                          cards: {
                            ...prev.cards,
                            [selectedCardId]: { ...selectedCard, accentColor: hex },
                          },
                        }))
                      }
                      style={{ backgroundColor: hex }}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                        selectedCard.accentColor.toLowerCase() === hex ? 'border-white scale-110' : 'border-transparent'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={selectedCard.accentColor}
                    onChange={(e) =>
                      updateDesign((prev) => ({
                        ...prev,
                        cards: {
                          ...prev.cards,
                          [selectedCardId]: { ...selectedCard, accentColor: e.target.value },
                        },
                      }))
                    }
                    className="w-7 h-7 rounded bg-transparent cursor-pointer border-0 p-0"
                    title="Elegir cualquier color"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-zinc-400">Imagen de esta Tarjeta</label>
                  <button
                    type="button"
                    onClick={() => cardFileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Subir Imagen</span>
                  </button>
                  <input
                    ref={cardFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCardImage}
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'default' as const, label: 'Imagen Oficial' },
                    { id: 'bg-real' as const, label: 'Foto Gimnasio' },
                    { id: 'bg-motto' as const, label: 'Mural Gym' },
                    { id: 'none' as const, label: 'Solo Color (Sin foto)' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        updateDesign((prev) => ({
                          ...prev,
                          cards: {
                            ...prev.cards,
                            [selectedCardId]: { ...selectedCard, imagePreset: opt.id },
                          },
                        }))
                      }
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold cursor-pointer ${
                        selectedCard.imagePreset === opt.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-white/[0.04] border-white/10 text-zinc-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <select
                    value={selectedCard.imageFit}
                    onChange={(e) =>
                      updateDesign((prev) => ({
                        ...prev,
                        cards: {
                          ...prev.cards,
                          [selectedCardId]: { ...selectedCard, imageFit: e.target.value as 'cover' | 'contain' },
                        },
                      }))
                    }
                    className="px-2 py-1 rounded-lg bg-[#181d28] border border-white/15 text-[11px] text-white"
                  >
                    <option value="cover">Cubrir tarjeta</option>
                    <option value="contain">Imagen completa</option>
                  </select>
                  <select
                    value={selectedCard.imagePosition}
                    onChange={(e) =>
                      updateDesign((prev) => ({
                        ...prev,
                        cards: {
                          ...prev.cards,
                          [selectedCardId]: { ...selectedCard, imagePosition: e.target.value },
                        },
                      }))
                    }
                    className="px-2 py-1 rounded-lg bg-[#181d28] border border-white/15 text-[11px] text-white"
                  >
                    <option value="center center">Encuadre Centro</option>
                    <option value="center top">Encuadre Arriba</option>
                    <option value="center bottom">Encuadre Abajo</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
