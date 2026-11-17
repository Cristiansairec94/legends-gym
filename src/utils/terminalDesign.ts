import React from 'react';
import gymBg from '../assets/gym-background.jpg';
import gymBgReal from '../assets/gym-background-real.jpg';
import gymBgMotto from '../assets/gym-background-motto.jpg';
import modalGymBg from '../assets/modal-gym-bg.jpg';
import cardClienteNuevo from '../assets/card-cliente-nuevo.jpg';
import cardVisita from '../assets/card-visita.jpg';
import cardHuella from '../assets/card-huella.jpg';

export type TerminalCardId = 'new' | 'visit' | 'member';
export type TerminalShapePreset = 'rounded' | 'square' | 'pill' | 'circle' | 'arch' | 'bevel' | 'hexagon';
export type TerminalThemePreset = 'legends-gold' | 'neon-cyber' | 'minimal-glass' | 'dark-metal' | 'emerald-pro';
export type TerminalArrangement = 'row-3' | 'col-3' | 'pyramid-top' | 'pyramid-bottom' | 'hero-center';
export type TerminalLabelPlacement = 'bottom' | 'center' | 'top' | 'floating-pill';
export type TerminalBgPresetId = 'gymBg' | 'gymBgReal' | 'gymBgMotto' | 'modalGymBg' | 'custom';
export type TerminalCardImagePreset = 'default' | 'bg-real' | 'bg-motto' | 'custom' | 'none';

export interface TerminalCardDesign {
  id: TerminalCardId;
  title: string;
  subtitle: string;
  accentColor: string;
  imagePreset: TerminalCardImagePreset;
  customImageDataUrl?: string;
  imageFit: 'cover' | 'contain';
  imagePosition: string;
  visible: boolean;
  /** Used in free-placement mode (% relative to viewport / preview stage) */
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface TerminalEntryDesignConfig {
  version: number;
  updatedAt: string;
  theme: TerminalThemePreset;
  background: {
    presetId: TerminalBgPresetId;
    customDataUrl?: string;
    fit: 'fill' | 'cover' | 'contain';
    position: string;
    brightness: number;
    blur: number;
    overlayOpacity: number;
  };
  layout: {
    mode: 'group' | 'free';
    topPct: number;
    leftPct: number;
    widthPct: number;
    heightPct: number;
    gapPx: number;
    arrangement: TerminalArrangement;
    cardOrder: TerminalCardId[];
  };
  shape: {
    preset: TerminalShapePreset;
    borderRadiusPx: number;
    borderWidth: number;
    glowIntensity: number;
    labelPlacement: TerminalLabelPlacement;
    imageOpacity: number;
    hoverScale: boolean;
  };
  banner: {
    enabled: boolean;
    title: string;
    subtitle: string;
    topPct: number;
    accentColor: string;
  };
  cards: Record<TerminalCardId, TerminalCardDesign>;
}

export const TERMINAL_BG_PRESETS: Array<{
  id: Exclude<TerminalBgPresetId, 'custom'>;
  name: string;
  primary: string;
  fallback: string;
  defaultFit: 'fill' | 'cover' | 'contain';
  defaultPosition: string;
}> = [
  {
    id: 'gymBg',
    name: 'Pared Neón Oficial LEYENDS GYM',
    primary: gymBg,
    fallback: './gym-background.jpg',
    defaultFit: 'fill',
    defaultPosition: 'center center',
  },
  {
    id: 'gymBgReal',
    name: 'Fotografía Real Gimnasio Legends',
    primary: gymBgReal,
    fallback: './gym-background-real.jpg',
    defaultFit: 'cover',
    defaultPosition: 'center 65%',
  },
  {
    id: 'gymBgMotto',
    name: 'Mural "Tu Único Límite Eres Tú"',
    primary: gymBgMotto,
    fallback: './gym-background-motto.jpg',
    defaultFit: 'cover',
    defaultPosition: 'center 50%',
  },
  {
    id: 'modalGymBg',
    name: 'Textura Mancuernas Pro Dark',
    primary: modalGymBg,
    fallback: './modal-gym-bg.jpg',
    defaultFit: 'cover',
    defaultPosition: 'center center',
  },
];

export const TERMINAL_CARD_DEFAULT_IMAGES: Record<TerminalCardId, { primary: string; fallback: string }> = {
  new: { primary: cardClienteNuevo, fallback: './card-cliente-nuevo.jpg' },
  visit: { primary: cardVisita, fallback: './card-visita.jpg' },
  member: { primary: cardHuella, fallback: './card-huella.jpg' },
};

export const TERMINAL_SHAPE_PRESETS: Array<{
  id: TerminalShapePreset;
  label: string;
  desc: string;
  radiusPx: number;
}> = [
  { id: 'rounded', label: 'Redondeado', desc: 'Tarjetas modernas', radiusPx: 16 },
  { id: 'square', label: 'Rectangular', desc: 'Esquinas rectas', radiusPx: 4 },
  { id: 'pill', label: 'Cápsula', desc: 'Bordes súper suaves', radiusPx: 38 },
  { id: 'circle', label: 'Circular / Óvalo', desc: 'Medallón redondo', radiusPx: 999 },
  { id: 'arch', label: 'Arco Gym', desc: 'Cúpula superior', radiusPx: 999 },
  { id: 'bevel', label: 'Biselado Pro', desc: 'Esquinas cortadas 45°', radiusPx: 0 },
  { id: 'hexagon', label: 'Hexágono', desc: 'Panel geométrico', radiusPx: 0 },
];

export const TERMINAL_THEME_PRESETS: Array<{
  id: TerminalThemePreset;
  label: string;
  swatch: string;
  cardColors: Record<TerminalCardId, string>;
  borderWidth: number;
  glowIntensity: number;
}> = [
  {
    id: 'legends-gold',
    label: 'Dorado Legends',
    swatch: '#f59e0b',
    cardColors: { new: '#f59e0b', visit: '#10b981', member: '#f59e0b' },
    borderWidth: 2,
    glowIntensity: 45,
  },
  {
    id: 'neon-cyber',
    label: 'Cyber Neón',
    swatch: '#06b6d4',
    cardColors: { new: '#06b6d4', visit: '#ec4899', member: '#a855f7' },
    borderWidth: 2,
    glowIntensity: 80,
  },
  {
    id: 'emerald-pro',
    label: 'Esmeralda Pro',
    swatch: '#10b981',
    cardColors: { new: '#10b981', visit: '#34d399', member: '#f59e0b' },
    borderWidth: 2,
    glowIntensity: 55,
  },
  {
    id: 'minimal-glass',
    label: 'Cristal Minimal',
    swatch: '#e4e4e7',
    cardColors: { new: '#ffffff', visit: '#d4d4d8', member: '#fbbf24' },
    borderWidth: 1,
    glowIntensity: 18,
  },
  {
    id: 'dark-metal',
    label: 'Acero Oscuro',
    swatch: '#71717a',
    cardColors: { new: '#a1a1aa', visit: '#22c55e', member: '#eab308' },
    borderWidth: 2,
    glowIntensity: 25,
  },
];

export const DEFAULT_TERMINAL_DESIGN: TerminalEntryDesignConfig = {
  version: 4,
  updatedAt: '2026-11-16T00:00:00.000Z',
  theme: 'legends-gold',
  background: {
    presetId: 'gymBg',
    fit: 'fill',
    position: 'center center',
    brightness: 100,
    blur: 0,
    overlayOpacity: 0,
  },
  layout: {
    mode: 'group',
    topPct: 35,
    leftPct: 12,
    widthPct: 76,
    heightPct: 34,
    gapPx: 14,
    arrangement: 'hero-center',
    cardOrder: ['new', 'member', 'visit'],
  },
  shape: {
    preset: 'rounded',
    borderRadiusPx: 16,
    borderWidth: 1,
    glowIntensity: 18,
    labelPlacement: 'bottom',
    imageOpacity: 100,
    hoverScale: true,
  },
  banner: {
    enabled: false,
    title: 'FITNESS LEGENDS GYM',
    subtitle: 'Selecciona una opción o coloca tu huella para ingresar',
    topPct: 12,
    accentColor: '#f59e0b',
  },
  cards: {
    new: {
      id: 'new',
      title: 'CLIENTE NUEVO',
      subtitle: 'Registrarme →',
      accentColor: '#f59e0b',
      imagePreset: 'default',
      imageFit: 'cover',
      imagePosition: 'center center',
      visible: true,
      xPct: 12,
      yPct: 39,
      widthPct: 20,
      heightPct: 26,
    },
    visit: {
      id: 'visit',
      title: 'QUIERO VISITA',
      subtitle: 'Pase de Visita →',
      accentColor: '#10b981',
      imagePreset: 'default',
      imageFit: 'cover',
      imagePosition: 'center center',
      visible: true,
      xPct: 68,
      yPct: 39,
      widthPct: 20,
      heightPct: 26,
    },
    member: {
      id: 'member',
      title: 'YA TENGO MEMBRESÍA',
      subtitle: 'Validar Huella →',
      accentColor: '#22c55e',
      imagePreset: 'none',
      imageFit: 'cover',
      imagePosition: 'center center',
      visible: true,
      xPct: 34,
      yPct: 35,
      widthPct: 32,
      heightPct: 34,
    },
  },
};

export function cloneDefaultTerminalDesign(): TerminalEntryDesignConfig {
  return JSON.parse(JSON.stringify(DEFAULT_TERMINAL_DESIGN));
}

export function mergeWithDefaultTerminalDesign(raw: any): TerminalEntryDesignConfig {
  const base = cloneDefaultTerminalDesign();
  if (!raw || typeof raw !== 'object') return base;
  const order: TerminalCardId[] = Array.isArray(raw.layout?.cardOrder)
    ? raw.layout.cardOrder.filter((id: any): id is TerminalCardId => id === 'new' || id === 'visit' || id === 'member')
    : [];
  const rawVersion = Number(raw.version || 1);
  const needsLayoutUpgrade = rawVersion < 3;
  const needsMemberNoImageUpgrade = rawVersion < 4;
  const fullOrder: TerminalCardId[] = needsLayoutUpgrade
    ? ['new', 'member', 'visit']
    : (order.length === 3 ? order : base.layout.cardOrder);

  const mergedLayout = {
    ...base.layout,
    ...(raw.layout || {}),
    cardOrder: fullOrder,
    ...(needsLayoutUpgrade
      ? {
          arrangement: 'hero-center' as TerminalArrangement,
          topPct: base.layout.topPct,
          leftPct: base.layout.leftPct,
          widthPct: base.layout.widthPct,
          heightPct: base.layout.heightPct,
          gapPx: base.layout.gapPx,
        }
      : {}),
  };

  const mergedShape = {
    ...base.shape,
    ...(raw.shape || {}),
    ...(needsLayoutUpgrade
      ? {
          borderWidth: base.shape.borderWidth,
          glowIntensity: base.shape.glowIntensity,
        }
      : {}),
  };

  return {
    ...base,
    ...raw,
    version: 4,
    background: { ...base.background, ...(raw.background || {}) },
    layout: mergedLayout,
    shape: mergedShape,
    banner: { ...base.banner, ...(raw.banner || {}) },
    cards: {
      new: { ...base.cards.new, ...(raw.cards?.new || {}), id: 'new' },
      visit: { ...base.cards.visit, ...(raw.cards?.visit || {}), id: 'visit' },
      member: {
        ...base.cards.member,
        ...(raw.cards?.member || {}),
        ...(needsMemberNoImageUpgrade ? { imagePreset: 'none' as TerminalCardImagePreset } : {}),
        id: 'member',
      },
    },
  };
}

export function resolveBackgroundSource(bg: TerminalEntryDesignConfig['background']): {
  src: string;
  fallback: string;
} {
  if (bg.presetId === 'custom' && bg.customDataUrl) {
    return { src: bg.customDataUrl, fallback: './gym-background.jpg' };
  }
  const found = TERMINAL_BG_PRESETS.find(p => p.id === bg.presetId) || TERMINAL_BG_PRESETS[0];
  return { src: found.primary, fallback: found.fallback };
}

export function resolveCardImageSource(card: TerminalCardDesign): {
  src: string | null;
  fallback: string;
} {
  if (card.imagePreset === 'none') return { src: null, fallback: '' };
  if (card.imagePreset === 'custom' && card.customImageDataUrl) {
    return { src: card.customImageDataUrl, fallback: TERMINAL_CARD_DEFAULT_IMAGES[card.id].fallback };
  }
  if (card.imagePreset === 'bg-real') {
    return { src: gymBgReal, fallback: './gym-background-real.jpg' };
  }
  if (card.imagePreset === 'bg-motto') {
    return { src: gymBgMotto, fallback: './gym-background-motto.jpg' };
  }
  const def = TERMINAL_CARD_DEFAULT_IMAGES[card.id];
  return { src: def.primary, fallback: def.fallback };
}

export function getShapeContainerStyle(shape: TerminalEntryDesignConfig['shape']): React.CSSProperties {
  switch (shape.preset) {
    case 'square':
      return { borderRadius: '6px' };
    case 'pill':
      return { borderRadius: '38px' };
    case 'circle':
      return { borderRadius: '9999px' };
    case 'arch':
      return { borderRadius: '9999px 9999px 18px 18px' };
    case 'bevel':
      return {
        borderRadius: '0px',
        clipPath: 'polygon(18px 0%, calc(100% - 18px) 0%, 100% 18px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 0% calc(100% - 18px), 0% 18px)',
      };
    case 'hexagon':
      return {
        borderRadius: '0px',
        clipPath: 'polygon(14% 0%, 86% 0%, 100% 50%, 86% 100%, 14% 100%, 0% 50%)',
      };
    case 'rounded':
    default:
      return { borderRadius: `${Math.max(0, Math.min(80, shape.borderRadiusPx ?? 16))}px` };
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = (hex || '#f59e0b').replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (isNaN(num)) return `rgba(245, 158, 11, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function compressImageFileToDataUrl(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 900,
  quality: number = 0.84
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        reject(new Error('Imagen vacía'));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        try {
          const ratio = Math.min(1, maxWidth / (img.width || maxWidth), maxHeight / (img.height || maxHeight));
          const w = Math.max(1, Math.round((img.width || maxWidth) * ratio));
          const h = Math.max(1, Math.round((img.height || maxHeight) * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(result);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const isPngWithAlpha = file.type === 'image/png' && result.length < 450000;
          const output = canvas.toDataURL(isPngWithAlpha ? 'image/png' : 'image/jpeg', quality);
          resolve(output);
        } catch {
          resolve(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}
