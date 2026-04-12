// NOTE: The palette hex values defined in PALETTES below are also duplicated
// in the inline pre-paint script in `src/layouts/Layout.astro`.
// This duplication is intentional — the inline script must run before any
// ESM bundle loads to prevent color flash on reload. If you edit a palette
// value here, update the inline script too.

export type PaletteId = 'ember' | 'driftwood' | 'meridian' | 'moss' | 'graphite';
export type ColorMode = 'accent' | 'theme';

export interface Palette {
  id: PaletteId;
  name: string;
  accent: string;
  bgTintLight: string;
  bgTintDark: string;
}

export const PALETTES: Record<PaletteId, Palette> = {
  ember: {
    id: 'ember',
    name: 'Ember',
    accent: '#C03A2E',
    bgTintLight: '#FBF8F5',
    bgTintDark: '#0B0A0A',
  },
  driftwood: {
    id: 'driftwood',
    name: 'Driftwood',
    accent: '#D97706',
    bgTintLight: '#FDFBF6',
    bgTintDark: '#0C0B09',
  },
  meridian: {
    id: 'meridian',
    name: 'Meridian',
    accent: '#3949AB',
    bgTintLight: '#F7F8FB',
    bgTintDark: '#0A0B0E',
  },
  moss: {
    id: 'moss',
    name: 'Moss',
    accent: '#2F6B4E',
    bgTintLight: '#F7F9F6',
    bgTintDark: '#0A0C0A',
  },
  graphite: {
    id: 'graphite',
    name: 'Graphite',
    accent: '#475569',
    bgTintLight: '#FFFFFF',
    bgTintDark: '#000000',
  },
};

export const PALETTE_IDS: PaletteId[] = [
  'ember',
  'driftwood',
  'meridian',
  'moss',
  'graphite',
];

export const DEFAULT_PALETTE_ID: PaletteId = 'ember';
export const DEFAULT_COLOR_MODE: ColorMode = 'theme';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

/**
 * Apply a palette to <html>. Sets CSS variables consumed by the rest of the UI.
 * - --accent: always the palette's accent color.
 * - --accent-muted: accent at 12% alpha.
 * - --accent-rgb: "R G B" form for space-separated rgba() usage.
 * - --theme-bg-light / --theme-bg-dark: in theme mode, the palette's tints.
 *   In accent mode, falls back to plain white / neutral-950.
 */
export function applyPalette(
  paletteId: PaletteId,
  colorMode: ColorMode
): void {
  const p = PALETTES[paletteId] ?? PALETTES[DEFAULT_PALETTE_ID];
  const root = document.documentElement;
  root.style.setProperty('--accent', p.accent);
  const { r, g, b } = hexToRgb(p.accent);
  root.style.setProperty('--accent-muted', `rgba(${r},${g},${b},0.12)`);
  root.style.setProperty('--accent-rgb', `${r} ${g} ${b}`);

  if (colorMode === 'theme') {
    root.style.setProperty('--theme-bg-light', p.bgTintLight);
    root.style.setProperty('--theme-bg-dark', p.bgTintDark);
  } else {
    root.style.setProperty('--theme-bg-light', '#ffffff');
    root.style.setProperty('--theme-bg-dark', '#0a0a0a');
  }
}
