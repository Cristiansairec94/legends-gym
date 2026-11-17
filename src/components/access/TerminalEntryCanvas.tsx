import React, { useRef, useState } from 'react';
import { Move, Maximize2 } from 'lucide-react';
import {
  TerminalCardDesign,
  TerminalCardId,
  TerminalEntryDesignConfig,
  getShapeContainerStyle,
  hexToRgba,
  resolveBackgroundSource,
  resolveCardImageSource,
} from '../../utils/terminalDesign';

interface TerminalEntryCanvasProps {
  design: TerminalEntryDesignConfig;
  onCardClick?: (cardId: TerminalCardId) => void;
  isEditing?: boolean;
  selectedCardId?: TerminalCardId | null;
  onSelectCard?: (cardId: TerminalCardId) => void;
  onChangeDesign?: (next: TerminalEntryDesignConfig) => void;
  compactText?: boolean;
  renderCardOverlay?: (card: TerminalCardDesign) => React.ReactNode;
}

export const TerminalEntryCanvas: React.FC<TerminalEntryCanvasProps> = ({
  design,
  onCardClick,
  isEditing = false,
  selectedCardId = null,
  onSelectCard,
  onChangeDesign,
  compactText = false,
  renderCardOverlay,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bgInfo = resolveBackgroundSource(design.background);
  const [bgImgSrc, setBgImgSrc] = useState<string>(bgInfo.src);

  React.useEffect(() => {
    setBgImgSrc(bgInfo.src);
  }, [bgInfo.src]);

  const shapeStyle = getShapeContainerStyle(design.shape);
  const usesClipPath = design.shape.preset === 'bevel' || design.shape.preset === 'hexagon';

  // Pointer drag / resize handler (percentages relative to stageRef)
  const startDrag = (
    e: React.PointerEvent,
    action: 'move-group' | 'resize-group' | 'move-card' | 'resize-card',
    cardId?: TerminalCardId
  ) => {
    if (!isEditing || !onChangeDesign || !stageRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    if (cardId && onSelectCard) {
      onSelectCard(cardId);
    }

    const rect = stageRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialGroup = {
      topPct: design.layout.topPct,
      leftPct: design.layout.leftPct,
      widthPct: design.layout.widthPct,
      heightPct: design.layout.heightPct,
    };
    const initialCard = cardId ? { ...design.cards[cardId] } : null;

    const handleMove = (ev: PointerEvent) => {
      const dxPct = ((ev.clientX - startX) / rect.width) * 100;
      const dyPct = ((ev.clientY - startY) / rect.height) * 100;
      const round1 = (v: number) => Math.round(v * 10) / 10;

      if (action === 'move-group') {
        const nextLeft = Math.max(0, Math.min(95 - initialGroup.widthPct, initialGroup.leftPct + dxPct));
        const nextTop = Math.max(0, Math.min(96 - initialGroup.heightPct, initialGroup.topPct + dyPct));
        onChangeDesign({
          ...design,
          updatedAt: new Date().toISOString(),
          layout: {
            ...design.layout,
            leftPct: round1(nextLeft),
            topPct: round1(nextTop),
          },
        });
      } else if (action === 'resize-group') {
        const nextW = Math.max(20, Math.min(98 - initialGroup.leftPct, initialGroup.widthPct + dxPct));
        const nextH = Math.max(12, Math.min(85 - initialGroup.topPct, initialGroup.heightPct + dyPct));
        onChangeDesign({
          ...design,
          updatedAt: new Date().toISOString(),
          layout: {
            ...design.layout,
            widthPct: round1(nextW),
            heightPct: round1(nextH),
          },
        });
      } else if (action === 'move-card' && cardId && initialCard) {
        const nextX = Math.max(0, Math.min(98 - initialCard.widthPct, initialCard.xPct + dxPct));
        const nextY = Math.max(0, Math.min(98 - initialCard.heightPct, initialCard.yPct + dyPct));
        onChangeDesign({
          ...design,
          updatedAt: new Date().toISOString(),
          cards: {
            ...design.cards,
            [cardId]: {
              ...design.cards[cardId],
              xPct: round1(nextX),
              yPct: round1(nextY),
            },
          },
        });
      } else if (action === 'resize-card' && cardId && initialCard) {
        const nextW = Math.max(10, Math.min(96 - initialCard.xPct, initialCard.widthPct + dxPct));
        const nextH = Math.max(10, Math.min(92 - initialCard.yPct, initialCard.heightPct + dyPct));
        onChangeDesign({
          ...design,
          updatedAt: new Date().toISOString(),
          cards: {
            ...design.cards,
            [cardId]: {
              ...design.cards[cardId],
              widthPct: round1(nextW),
              heightPct: round1(nextH),
            },
          },
        });
      }
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  const orderedCards: TerminalCardDesign[] = design.layout.cardOrder
    .map(id => design.cards[id])
    .filter(c => c && (c.visible || isEditing));

  const renderCard = (card: TerminalCardDesign, extraStyle?: React.CSSProperties) => {
    const imgInfo = resolveCardImageSource(card);
    const isSelected = isEditing && selectedCardId === card.id;
    const glowAlpha = Math.max(0, Math.min(0.85, (design.shape.glowIntensity || 0) / 140));
    const glowShadow = glowAlpha > 0
      ? `0 0 ${Math.round(12 + (design.shape.glowIntensity / 100) * 28)}px ${hexToRgba(card.accentColor, glowAlpha)}`
      : '0 10px 25px rgba(0,0,0,0.45)';
    const placement = design.shape.labelPlacement;
    const customOverlay = !isEditing && renderCardOverlay ? renderCardOverlay(card) : null;

    const innerContent = (
      <>
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={usesClipPath ? undefined : shapeStyle}
        >
          {imgInfo.src ? (
            <img
              src={imgInfo.src}
              alt={card.title}
              onError={(e) => {
                if (imgInfo.fallback && e.currentTarget.src !== imgInfo.fallback) {
                  e.currentTarget.src = imgInfo.fallback;
                }
              }}
              style={{
                objectPosition: card.imagePosition || 'center center',
                opacity: (design.shape.imageOpacity ?? 100) / 100,
              }}
              className={`absolute inset-0 w-full h-full ${card.imageFit === 'contain' ? 'object-contain' : 'object-cover'} ${
                !isEditing && !customOverlay && design.shape.hoverScale ? 'group-hover:scale-105' : ''
              } transition-transform duration-500 pointer-events-none select-none`}
            />
          ) : (
            <div
              className={`absolute inset-0 pointer-events-none ${customOverlay ? 'backdrop-blur-xl' : ''}`}
              style={{
                background: customOverlay
                  ? 'radial-gradient(circle at 50% 48%, rgba(34, 197, 94, 0.14) 0%, rgba(10, 14, 21, 0.90) 62%, rgba(6, 9, 14, 0.95) 100%)'
                  : `linear-gradient(135deg, ${hexToRgba(card.accentColor, 0.25)} 0%, #090b10 100%)`,
              }}
            />
          )}

          {(imgInfo.src || !customOverlay) && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: customOverlay
                  ? 'linear-gradient(to top, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.12) 48%, rgba(0,0,0,0.28) 100%)'
                  : placement === 'top'
                    ? 'linear-gradient(to bottom, rgba(0,0,0,0.86), rgba(0,0,0,0.18), transparent)'
                    : placement === 'center'
                      ? 'radial-gradient(circle, rgba(0,0,0,0.68), rgba(0,0,0,0.35))'
                      : 'linear-gradient(to top, rgba(0,0,0,0.88), rgba(0,0,0,0.18), transparent)',
              }}
            />
          )}
        </div>

        {customOverlay ? (
          <div className="relative z-10 w-full h-full flex flex-col">
            {customOverlay}
          </div>
        ) : (
          /* Etiqueta / Texto de la tarjeta */
          <div
            className={`relative z-10 w-full flex ${
              placement === 'top'
                ? 'items-start'
                : placement === 'center' || placement === 'floating-pill'
                  ? 'items-center justify-center'
                  : 'items-end'
            }`}
            style={{ height: '100%' }}
          >
            <div
              className={`w-full ${
                placement === 'floating-pill'
                  ? 'w-auto mx-auto px-3.5 py-1.5 rounded-full text-center'
                  : compactText
                    ? 'p-1.5 rounded-lg'
                    : 'p-2 sm:p-2.5 lg:p-3 rounded-lg sm:rounded-xl'
              } ${
                design.shape.preset === 'circle' || design.shape.preset === 'hexagon' ? 'text-center' : ''
              } bg-[#090a0f]/92 backdrop-blur-sm border shadow-lg transition-colors`}
              style={{
                borderColor: hexToRgba(card.accentColor, 0.4),
              }}
            >
              <h3
                className={`${
                  compactText ? 'text-[10px]' : 'text-xs sm:text-sm lg:text-[15px]'
                } font-black text-white uppercase tracking-wider leading-tight truncate`}
              >
                {card.title}
              </h3>
              {card.subtitle && (
                <div
                  className={`mt-0.5 flex items-center ${
                    design.shape.preset === 'circle' || design.shape.preset === 'hexagon' || placement === 'floating-pill'
                      ? 'justify-center'
                      : ''
                  }`}
                >
                  <span
                    className={`${compactText ? 'text-[9px]' : 'text-[10px] sm:text-[11px]'} font-bold truncate`}
                    style={{ color: card.accentColor }}
                  >
                    {card.subtitle}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );

    const cardOpacity = card.visible ? 1 : 0.35;

    if (usesClipPath) {
      return (
        <div
          key={card.id}
          onClick={() => {
            if (isEditing) {
              onSelectCard?.(card.id);
            } else {
              onCardClick?.(card.id);
            }
          }}
          onPointerDown={(e) => {
            if (isEditing && design.layout.mode === 'free') {
              startDrag(e, 'move-card', card.id);
            }
          }}
          style={{
            ...extraStyle,
            opacity: cardOpacity,
            filter: `drop-shadow(0 0 ${Math.round(6 + (design.shape.glowIntensity / 100) * 14)}px ${hexToRgba(
              card.accentColor,
              Math.max(0.25, glowAlpha)
            )})`,
          }}
          className={`group relative w-full h-full select-none ${
            isEditing ? (design.layout.mode === 'free' ? 'cursor-move' : 'cursor-pointer') : 'cursor-pointer'
          } ${!isEditing && design.shape.hoverScale ? 'transform hover:-translate-y-1 transition-all duration-300' : ''}`}
        >
          <div
            className="w-full h-full"
            style={{
              ...shapeStyle,
              background: isSelected ? '#ffffff' : hexToRgba(card.accentColor, 0.85),
              padding: `${Math.max(1, design.shape.borderWidth)}px`,
            }}
          >
            <div
              className="relative w-full h-full overflow-hidden flex flex-col justify-end p-2"
              style={{ ...shapeStyle, background: '#090a0f' }}
            >
              {innerContent}
            </div>
          </div>

          {isEditing && design.layout.mode === 'free' && (
            <button
              type="button"
              onPointerDown={(e) => startDrag(e, 'resize-card', card.id)}
              title="Arrastra para cambiar tamaño"
              className="absolute bottom-1 right-1 z-30 w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center shadow cursor-nwse-resize"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    return (
      <div
        key={card.id}
        onClick={() => {
          if (isEditing) {
            onSelectCard?.(card.id);
          } else {
            onCardClick?.(card.id);
          }
        }}
        onPointerDown={(e) => {
          if (isEditing && design.layout.mode === 'free') {
            startDrag(e, 'move-card', card.id);
          }
        }}
        style={{
          ...extraStyle,
          ...shapeStyle,
          opacity: cardOpacity,
          borderWidth: `${customOverlay ? 1 : design.shape.borderWidth}px`,
          borderStyle: 'solid',
          borderColor: isSelected
            ? '#ffffff'
            : customOverlay
              ? 'rgba(255, 255, 255, 0.22)'
              : hexToRgba(card.accentColor, 0.72),
          boxShadow: isSelected
            ? `0 0 0 3px rgba(255,255,255,0.45), ${glowShadow}`
            : customOverlay
              ? '0 14px 36px rgba(0, 0, 0, 0.55)'
              : glowShadow,
        }}
        className={`group relative w-full h-full ${customOverlay ? 'overflow-visible' : 'overflow-hidden'} flex flex-col justify-end ${
          compactText ? 'p-1.5' : 'p-2 sm:p-2.5 lg:p-3'
        } select-none ${
          isEditing ? (design.layout.mode === 'free' ? 'cursor-move' : 'cursor-pointer') : 'cursor-pointer'
        } ${!isEditing && !customOverlay && design.shape.hoverScale ? 'transform hover:-translate-y-1 transition-all duration-300' : 'transition-all duration-200'}`}
      >
        {innerContent}

        {isEditing && design.layout.mode === 'free' && (
          <button
            type="button"
            onPointerDown={(e) => startDrag(e, 'resize-card', card.id)}
            title="Arrastra para cambiar tamaño"
            className="absolute bottom-1.5 right-1.5 z-30 w-6 h-6 rounded-full bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-lg cursor-nwse-resize"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };

  // Compute grid / arrangement styling in 'group' mode
  const renderGroupLayout = () => {
    const arr = design.layout.arrangement;
    const gap = compactText ? Math.max(4, Math.round(design.layout.gapPx * 0.45)) : design.layout.gapPx;

    if (arr === 'col-3') {
      return (
        <div className="flex flex-col w-full h-full" style={{ gap: `${gap}px` }}>
          {orderedCards.map((c) => renderCard(c, { flex: '1 1 0%' }))}
        </div>
      );
    }

    if (arr === 'pyramid-top') {
      return (
        <div className="grid grid-cols-2 w-full h-full" style={{ gap: `${gap}px` }}>
          {orderedCards[0] && (
            <div className="col-span-2 w-1/2 mx-auto h-full">
              {renderCard(orderedCards[0])}
            </div>
          )}
          {orderedCards.slice(1).map((c) => (
            <div key={c.id} className="w-full h-full">
              {renderCard(c)}
            </div>
          ))}
        </div>
      );
    }

    if (arr === 'pyramid-bottom') {
      return (
        <div className="grid grid-cols-2 w-full h-full" style={{ gap: `${gap}px` }}>
          {orderedCards.slice(0, 2).map((c) => (
            <div key={c.id} className="w-full h-full">
              {renderCard(c)}
            </div>
          ))}
          {orderedCards[2] && (
            <div className="col-span-2 w-1/2 mx-auto h-full">
              {renderCard(orderedCards[2])}
            </div>
          )}
        </div>
      );
    }

    if (arr === 'hero-center') {
      return (
        <div
          className="grid w-full h-full items-center"
          style={{
            gap: `${gap}px`,
            gridTemplateColumns: orderedCards.length === 3 ? '0.88fr 1.38fr 0.88fr' : `repeat(${orderedCards.length || 1}, minmax(0, 1fr))`,
          }}
        >
          {orderedCards.map((c, idx) => {
            const isCenterHero = orderedCards.length === 3 ? idx === 1 : idx === 0;
            return (
              <div
                key={c.id}
                className={
                  isCenterHero
                    ? 'relative z-20 w-full h-full'
                    : `relative z-10 w-full h-[74%] scale-[0.95] opacity-85 brightness-[0.84] transition-all duration-300 ${
                        !isEditing ? 'hover:opacity-100 hover:brightness-100 hover:scale-[0.98] hover:z-30' : ''
                      }`
                }
              >
                {renderCard(c)}
              </div>
            );
          })}
        </div>
      );
    }

    // Default 'row-3'
    return (
      <div
        className="grid w-full h-full"
        style={{
          gap: `${gap}px`,
          gridTemplateColumns: `repeat(${Math.max(1, orderedCards.length)}, minmax(0, 1fr))`,
        }}
      >
        {orderedCards.map((c) => renderCard(c))}
      </div>
    );
  };

  return (
    <div ref={stageRef} className="relative w-full h-full overflow-hidden bg-[#07090d] select-none">
      {/* Background Image */}
      <img
        key={bgImgSrc}
        src={bgImgSrc}
        alt="Fondo Pantalla de Acceso"
        onError={() => {
          if (bgImgSrc !== bgInfo.fallback) setBgImgSrc(bgInfo.fallback);
          else if (bgImgSrc !== './gym-background.jpg') setBgImgSrc('./gym-background.jpg');
        }}
        style={{
          objectPosition: design.background.position || 'center center',
          filter: `brightness(${design.background.brightness ?? 100}%) blur(${design.background.blur ?? 0}px)`,
        }}
        className={`absolute inset-0 w-full h-full pointer-events-none select-none ${
          design.background.fit === 'fill'
            ? 'object-fill'
            : design.background.fit === 'contain'
              ? 'object-contain'
              : 'object-cover'
        }`}
      />

      {/* Optional background darkening scrim */}
      {design.background.overlayOpacity > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: `rgba(0, 0, 0, ${design.background.overlayOpacity / 100})` }}
        />
      )}

      {/* Optional Top Banner Title */}
      {design.banner.enabled && (
        <div
          style={{ top: `${design.banner.topPct}%` }}
          className="absolute left-4 right-4 z-10 flex flex-col items-center text-center pointer-events-none"
        >
          <div
            className={`${compactText ? 'px-3 py-1' : 'px-6 py-2.5'} rounded-2xl bg-black/70 backdrop-blur-md border shadow-2xl`}
            style={{ borderColor: hexToRgba(design.banner.accentColor, 0.65) }}
          >
            <h2
              className={`${compactText ? 'text-xs' : 'text-xl sm:text-2xl font-black'} uppercase tracking-widest text-white`}
            >
              {design.banner.title}
            </h2>
            {design.banner.subtitle && (
              <p
                className={`${compactText ? 'text-[9px]' : 'text-xs sm:text-sm'} font-semibold mt-0.5`}
                style={{ color: design.banner.accentColor }}
              >
                {design.banner.subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Cards Stage */}
      {design.layout.mode === 'group' ? (
        <div
          onPointerDown={(e) => {
            if (isEditing) startDrag(e, 'move-group');
          }}
          style={{
            position: 'absolute',
            top: `${design.layout.topPct}%`,
            left: `${design.layout.leftPct}%`,
            width: `${design.layout.widthPct}%`,
            height: `${design.layout.heightPct}%`,
            zIndex: 15,
          }}
          className={isEditing ? 'ring-2 ring-dashed ring-amber-400/80 rounded-2xl p-1 cursor-move' : ''}
        >
          {isEditing && (
            <div className="absolute -top-6 left-0 px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black flex items-center gap-1 shadow pointer-events-none whitespace-nowrap">
              <Move className="w-3 h-3" />
              <span>Arrastra para mover · Esquina para tamaño</span>
            </div>
          )}
          {renderGroupLayout()}
          {isEditing && (
            <button
              type="button"
              onPointerDown={(e) => startDrag(e, 'resize-group')}
              title="Arrastra para ajustar ancho y alto"
              className="absolute -bottom-2.5 -right-2.5 z-30 w-6 h-6 rounded-full bg-amber-400 hover:bg-amber-300 text-black flex items-center justify-center shadow-lg border-2 border-black cursor-nwse-resize"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        orderedCards.map((card) => (
          <div
            key={card.id}
            style={{
              position: 'absolute',
              top: `${card.yPct}%`,
              left: `${card.xPct}%`,
              width: `${card.widthPct}%`,
              height: `${card.heightPct}%`,
              zIndex: isEditing && selectedCardId === card.id ? 25 : 15,
            }}
          >
            {renderCard(card)}
          </div>
        ))
      )}
    </div>
  );
};
