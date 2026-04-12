// NOTE: Palette hex values + typography stacks + ASCII base colors below are
// also duplicated in the inline pre-paint script in `src/layouts/Layout.astro`.
// The duplication is intentional — the inline script must run before any ESM
// bundle loads to prevent color/font flash on reload. If you edit a palette
// value here, update the inline script too.

export type PaletteId = 'ember' | 'driftwood' | 'meridian' | 'moss' | 'graphite';
export type ColorMode = 'accent' | 'theme';

export interface RippleProfile {
  asciiBaseRgb: [number, number, number]; // ambient glyph base color
  glowMultiplier: number;                 // multiplies shadowBlur
}

export interface Palette {
  id: PaletteId;
  name: string;
  accent: string;       // hex
  bgHex: string;        // theme-mode page background
  textHex: string;      // theme-mode body text
  fontDisplay: string;  // CSS font-family string for display headings
  fontBody: string;     // CSS font-family string for body
  fontMono: string;     // CSS font-family string for mono
  ripple: RippleProfile;
}

export const PALETTES: Record<PaletteId, Palette> = {
  ember: {
    id: 'ember',
    name: 'Ember',
    accent: '#B8342A',
    bgHex: '#F7EFE6',
    textHex: '#2A1A16',
    fontDisplay: "'Instrument Serif', Georgia, serif",
    fontBody: "'DM Sans', system-ui, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    ripple: { asciiBaseRgb: [20, 15, 12], glowMultiplier: 1.0 },
  },
  driftwood: {
    id: 'driftwood',
    name: 'Driftwood',
    accent: '#A0651F',
    bgHex: '#F4EDDF',
    textHex: '#2B2418',
    fontDisplay: "'Fraunces', Georgia, serif",
    fontBody: "'Lora', Georgia, serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    ripple: { asciiBaseRgb: [60, 40, 20], glowMultiplier: 1.0 },
  },
  meridian: {
    id: 'meridian',
    name: 'Meridian',
    accent: '#2E3FA0',
    bgHex: '#F2F5FA',
    textHex: '#0F1629',
    fontDisplay: "'Unbounded', system-ui, sans-serif",
    fontBody: "'Inter', system-ui, sans-serif",
    fontMono: "'IBM Plex Mono', ui-monospace, monospace",
    ripple: { asciiBaseRgb: [30, 40, 70], glowMultiplier: 0.5 },
  },
  moss: {
    id: 'moss',
    name: 'Moss',
    accent: '#2F6B4E',
    bgHex: '#EEF0E7',
    textHex: '#13211A',
    fontDisplay: "'EB Garamond', Georgia, serif",
    fontBody: "'EB Garamond', Georgia, serif",
    fontMono: "'JetBrains Mono', ui-monospace, monospace",
    ripple: { asciiBaseRgb: [30, 50, 35], glowMultiplier: 1.4 },
  },
  graphite: {
    id: 'graphite',
    name: 'Graphite',
    accent: '#8BA3C7',
    bgHex: '#2A2C30',
    textHex: '#DADCE0',
    fontDisplay: "'IBM Plex Mono', ui-monospace, monospace",
    fontBody: "'IBM Plex Sans', system-ui, sans-serif",
    fontMono: "'IBM Plex Mono', ui-monospace, monospace",
    ripple: { asciiBaseRgb: [90, 100, 115], glowMultiplier: 1.8 },
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

function mix(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): string {
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * Apply a palette to <html>.
 * In accent mode: only accent variables are set; background/text/fonts fall back
 * to Tailwind defaults via the existing light/dark toggle. `data-theme-active`
 * is REMOVED from <html>.
 * In theme mode: full palette is written, including fonts and derived tones.
 * `data-theme-active="true"` is SET on <html> so global CSS overrides engage.
 */
export function applyPalette(
  paletteId: PaletteId,
  colorMode: ColorMode
): void {
  const p = PALETTES[paletteId] ?? PALETTES[DEFAULT_PALETTE_ID];
  const root = document.documentElement;

  // Always set accent variables.
  root.style.setProperty('--accent', p.accent);
  const accentRgb = hexToRgb(p.accent);
  root.style.setProperty(
    '--accent-muted',
    `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.12)`
  );
  root.style.setProperty(
    '--accent-rgb',
    `${accentRgb.r} ${accentRgb.g} ${accentRgb.b}`
  );

  if (colorMode === 'theme') {
    root.setAttribute('data-theme-active', 'true');

    const bg = hexToRgb(p.bgHex);
    const text = hexToRgb(p.textHex);

    root.style.setProperty('--theme-bg', p.bgHex);
    root.style.setProperty('--theme-text', p.textHex);
    root.style.setProperty('--theme-text-muted', mix(text, bg, 0.35));
    root.style.setProperty('--theme-border', mix(bg, text, 0.15));
    root.style.setProperty('--theme-surface', mix(bg, text, 0.04));

    root.style.setProperty('--font-display', p.fontDisplay);
    root.style.setProperty('--font-body', p.fontBody);
    root.style.setProperty('--font-mono', p.fontMono);

    const [ar, ag, ab] = p.ripple.asciiBaseRgb;
    root.style.setProperty('--ascii-base-rgb', `${ar} ${ag} ${ab}`);
    root.style.setProperty('--ripple-glow-mult', String(p.ripple.glowMultiplier));

    // Bg fallback variables the body uses for bg-[color:var(...)].
    root.style.setProperty('--theme-bg-light', p.bgHex);
    root.style.setProperty('--theme-bg-dark', p.bgHex);
  } else {
    root.removeAttribute('data-theme-active');

    // Accent mode: clear theme-only variables so Tailwind defaults win.
    root.style.removeProperty('--theme-bg');
    root.style.removeProperty('--theme-text');
    root.style.removeProperty('--theme-text-muted');
    root.style.removeProperty('--theme-border');
    root.style.removeProperty('--theme-surface');
    root.style.removeProperty('--font-display');
    root.style.removeProperty('--font-body');
    root.style.removeProperty('--font-mono');
    root.style.removeProperty('--ascii-base-rgb');
    root.style.removeProperty('--ripple-glow-mult');

    // Background: fall back to plain white / neutral-950 via existing vars.
    root.style.setProperty('--theme-bg-light', '#ffffff');
    root.style.setProperty('--theme-bg-dark', '#0a0a0a');
  }
}
