# Full Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand "theme mode" so each of the 5 themes is a full reskin (background + text + surfaces + typography + ASCII flavor), plus optimize the 1 MB headshot avatar.

**Architecture:** The palette data in `src/lib/themes.ts` expands to include text, font, and ripple-profile fields. The inline pre-paint script in `Layout.astro` mirrors the expanded data (same duplication pattern as today) and now also sets a `data-theme-active` attribute on `<html>`. A global CSS block in `Layout.astro` gates font-family overrides and surface/text overrides on `data-theme-active="true"`. `AsciiBackground.astro` reads `--ascii-base-rgb` and `--ripple-glow-mult` instead of branching on `isDark()`. `ThemePicker.astro` renders named rows when in theme mode and circles in accent mode. Avatar is resized + compressed and served via `<picture>`.

**Tech Stack:** Astro 4, TypeScript, Tailwind (arbitrary-value + `data-*` attribute variants), Google Fonts, `sips` / `cwebp` for image optimization.

**Verification:** Manual visual verification per task. Each task is committable.

---

## File Structure

- **Modify:** `src/lib/themes.ts` — expand `Palette` interface with typography + text + ripple-profile fields; extend `applyPalette` to write all new variables and toggle `data-theme-active`.
- **Modify:** `src/layouts/Layout.astro` — add all Google Fonts, expand inline pre-paint script, add global CSS for `data-theme-active` overrides.
- **Modify:** `src/components/ThemePicker.astro` — branch on mode: render circle swatches in accent mode, named rows in theme mode. Accent mode uses `paletteId` independent of theme-mode `paletteId`.
- **Modify:** `src/components/AsciiBackground.astro` — switch ambient color + ripple target decision to read `--ascii-base-rgb`; multiply shadowBlur by `--ripple-glow-mult`.
- **Modify:** `src/pages/index.astro` — `<picture>` for avatar.
- **Add:** `public/headshot.webp` — new optimized avatar.
- **Replace:** `public/headshot.jpg` — resized + compressed.

---

## Task 1: Expand the palette module

**Goal of this task:** Extend `src/lib/themes.ts` with all the new per-theme data (text, derived tone helpers, font triplet, ASCII base color, ripple glow multiplier) and update `applyPalette` to write the expanded CSS variable set and toggle `data-theme-active`.

**Files:**
- Modify: `src/lib/themes.ts`

- [ ] **Step 1: Rewrite `src/lib/themes.ts` with expanded palette data**

Replace the full contents of `src/lib/themes.ts` with:

```ts
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
    ripple: { asciiBaseRgb: [200, 210, 225], glowMultiplier: 1.8 },
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
```

- [ ] **Step 2: Verify it compiles**

Run: `bun dev`
Confirm: no TypeScript/Astro errors in dev server output. The module isn't used by callers with the new fields yet (Picker still imports the old shape, but the shape is a superset so it'll still compile). Kill dev server.

- [ ] **Step 3: Commit**

```bash
git add src/lib/themes.ts
git commit -m "Expand themes module with full per-theme palette and ripple profile"
```

---

## Task 2: Load all theme fonts + add global overrides + expand pre-paint script

**Goal of this task:** Update `src/layouts/Layout.astro` to load all theme fonts from Google Fonts, mirror the expanded palette data inside the inline pre-paint script, and add a global CSS block that applies theme fonts + surfaces when `data-theme-active="true"`.

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Update the Google Fonts link**

In `src/layouts/Layout.astro`, find the current Google Fonts `<link>` (inside `<head>`):

```astro
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap"
      rel="stylesheet"
    />
```

Replace with:

```astro
    <link
      href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Unbounded:wght@400;500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap"
      rel="stylesheet"
    />
```

- [ ] **Step 2: Replace the inline pre-paint script with the expanded version**

Find the existing `<script is:inline>` block in `Layout.astro`. Replace its ENTIRE contents (the IIFE) with:

```astro
    <script is:inline>
      (function () {
        const PALETTES = {
          ember: {
            accent: '#B8342A', bg: '#F7EFE6', text: '#2A1A16',
            display: "'Instrument Serif', Georgia, serif",
            body: "'DM Sans', system-ui, sans-serif",
            mono: "'JetBrains Mono', ui-monospace, monospace",
            asciiBase: [20, 15, 12], glowMult: 1.0,
          },
          driftwood: {
            accent: '#A0651F', bg: '#F4EDDF', text: '#2B2418',
            display: "'Fraunces', Georgia, serif",
            body: "'Lora', Georgia, serif",
            mono: "'JetBrains Mono', ui-monospace, monospace",
            asciiBase: [60, 40, 20], glowMult: 1.0,
          },
          meridian: {
            accent: '#2E3FA0', bg: '#F2F5FA', text: '#0F1629',
            display: "'Unbounded', system-ui, sans-serif",
            body: "'Inter', system-ui, sans-serif",
            mono: "'IBM Plex Mono', ui-monospace, monospace",
            asciiBase: [30, 40, 70], glowMult: 0.5,
          },
          moss: {
            accent: '#2F6B4E', bg: '#EEF0E7', text: '#13211A',
            display: "'EB Garamond', Georgia, serif",
            body: "'EB Garamond', Georgia, serif",
            mono: "'JetBrains Mono', ui-monospace, monospace",
            asciiBase: [30, 50, 35], glowMult: 1.4,
          },
          graphite: {
            accent: '#8BA3C7', bg: '#2A2C30', text: '#DADCE0',
            display: "'IBM Plex Mono', ui-monospace, monospace",
            body: "'IBM Plex Sans', system-ui, sans-serif",
            mono: "'IBM Plex Mono', ui-monospace, monospace",
            asciiBase: [200, 210, 225], glowMult: 1.8,
          },
        };
        function hexToRgb(hex) {
          const c = hex.replace('#', '');
          return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
        }
        function mix(a, b, t) {
          const r = Math.round(a[0] + (b[0] - a[0]) * t);
          const g = Math.round(a[1] + (b[1] - a[1]) * t);
          const bl = Math.round(a[2] + (b[2] - a[2]) * t);
          return `rgb(${r},${g},${bl})`;
        }
        function apply() {
          const theme =
            localStorage.getItem('theme') ||
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
          if (theme === 'dark') document.documentElement.classList.add('dark');
          else document.documentElement.classList.remove('dark');

          const colorMode = localStorage.getItem('colorMode') || 'theme';
          const paletteId = localStorage.getItem('paletteId') || 'ember';
          const p = PALETTES[paletteId] || PALETTES.ember;
          const root = document.documentElement;
          const accentRgb = hexToRgb(p.accent);
          root.style.setProperty('--accent', p.accent);
          root.style.setProperty('--accent-muted', `rgba(${accentRgb[0]},${accentRgb[1]},${accentRgb[2]},0.12)`);
          root.style.setProperty('--accent-rgb', `${accentRgb[0]} ${accentRgb[1]} ${accentRgb[2]}`);

          if (colorMode === 'theme') {
            root.setAttribute('data-theme-active', 'true');
            const bg = hexToRgb(p.bg);
            const text = hexToRgb(p.text);
            root.style.setProperty('--theme-bg', p.bg);
            root.style.setProperty('--theme-text', p.text);
            root.style.setProperty('--theme-text-muted', mix(text, bg, 0.35));
            root.style.setProperty('--theme-border', mix(bg, text, 0.15));
            root.style.setProperty('--theme-surface', mix(bg, text, 0.04));
            root.style.setProperty('--font-display', p.display);
            root.style.setProperty('--font-body', p.body);
            root.style.setProperty('--font-mono', p.mono);
            root.style.setProperty('--ascii-base-rgb', `${p.asciiBase[0]} ${p.asciiBase[1]} ${p.asciiBase[2]}`);
            root.style.setProperty('--ripple-glow-mult', String(p.glowMult));
            root.style.setProperty('--theme-bg-light', p.bg);
            root.style.setProperty('--theme-bg-dark', p.bg);
          } else {
            root.removeAttribute('data-theme-active');
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
            root.style.setProperty('--theme-bg-light', '#ffffff');
            root.style.setProperty('--theme-bg-dark', '#0a0a0a');
          }
        }
        apply();
        document.addEventListener('astro:after-swap', apply);
      })();
    </script>
```

- [ ] **Step 3: Add the global theme-mode CSS block**

In `Layout.astro`, find the existing global `<style is:global>` block (contains `[data-animate]` rules). Expand it to the following:

```astro
    <style is:global>
      [data-animate] {
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 0.5s ease, transform 0.5s ease;
      }
      [data-animate].animate-in {
        opacity: 1;
        transform: translateY(0);
      }

      /* Theme-mode overrides — only active when a full theme is selected. */
      html[data-theme-active="true"] body {
        font-family: var(--font-body);
        color: var(--theme-text);
      }
      html[data-theme-active="true"] h1,
      html[data-theme-active="true"] h2,
      html[data-theme-active="true"] h3,
      html[data-theme-active="true"] h4 {
        font-family: var(--font-display);
      }
      html[data-theme-active="true"] .font-mono,
      html[data-theme-active="true"] code,
      html[data-theme-active="true"] pre {
        font-family: var(--font-mono);
      }
      /* Surfaces: cards, dividers. */
      html[data-theme-active="true"] hr {
        border-color: var(--theme-border);
      }
      html[data-theme-active="true"] .theme-card-border {
        border-color: var(--theme-border);
      }
      html[data-theme-active="true"] .theme-text-muted {
        color: var(--theme-text-muted);
      }
      html[data-theme-active="true"] .theme-surface {
        background-color: var(--theme-surface);
      }
    </style>
```

The `.theme-card-border`, `.theme-text-muted`, and `.theme-surface` classes will be applied to existing cards/metadata in later tasks (they are opt-in, so existing markup keeps working in accent mode).

- [ ] **Step 4: Verify**

Run: `bun dev`
Open: `http://localhost:4321/`

Expected:
- Page renders normally on Ember (default). No flash.
- Network tab in devtools shows the Google Fonts CSS fetch; subsequent `.woff2` fetches happen only for active-theme faces.
- Open devtools → Elements → `<html>`. In theme mode (default), `data-theme-active="true"` is set. Switch picker to accent mode — attribute is removed.
- Body text renders in Ember's font (Instrument Serif headers, DM Sans body) same as today.
- No console errors. Kill dev server.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Layout.astro
git commit -m "Load all theme fonts and expand pre-paint script with per-theme data"
```

---

## Task 3: Update ThemePicker — rows in theme mode, circles in accent mode

**Goal of this task:** Branch the picker's swatch row: when `colorMode === 'theme'`, render named rows with a color chip + theme name; in accent mode, keep the existing circle swatches.

**Files:**
- Modify: `src/components/ThemePicker.astro`

- [ ] **Step 1: Replace the `swatchContainer.innerHTML` population + render function in the script**

In `src/components/ThemePicker.astro`'s `<script>` block, find the block that populates swatches:

```ts
    // Populate swatches.
    swatchContainer.innerHTML = '';
    for (const id of PALETTE_IDS) {
      const p = PALETTES[id];
      const sw = document.createElement('button');
      sw.type = 'button';
      sw.dataset.swatch = id;
      sw.setAttribute('aria-label', `Select ${p.name}`);
      sw.className =
        'h-7 w-7 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-neutral-950 transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400';
      sw.style.backgroundColor = p.accent;
      swatchContainer.appendChild(sw);
    }
```

Replace with:

```ts
    function populateSwatches(mode: ColorMode): void {
      swatchContainer!.innerHTML = '';
      if (mode === 'theme') {
        swatchContainer!.className = 'mt-3 flex flex-col gap-1';
        for (const id of PALETTE_IDS) {
          const p = PALETTES[id];
          const row = document.createElement('button');
          row.type = 'button';
          row.dataset.swatch = id;
          row.setAttribute('aria-label', `Select ${p.name}`);
          row.className =
            'flex items-center gap-3 w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]';
          const chip = document.createElement('span');
          chip.className = 'h-4 w-4 rounded-full shrink-0 border border-black/10 dark:border-white/10';
          chip.style.backgroundColor = p.accent;
          const label = document.createElement('span');
          label.className = 'text-neutral-700 dark:text-neutral-300';
          label.textContent = p.name;
          row.appendChild(chip);
          row.appendChild(label);
          swatchContainer!.appendChild(row);
        }
      } else {
        swatchContainer!.className = 'mt-3 flex items-center justify-between gap-2';
        for (const id of PALETTE_IDS) {
          const p = PALETTES[id];
          const sw = document.createElement('button');
          sw.type = 'button';
          sw.dataset.swatch = id;
          sw.setAttribute('aria-label', `Select ${p.name}`);
          sw.className =
            'h-7 w-7 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-neutral-950 transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400';
          sw.style.backgroundColor = p.accent;
          swatchContainer!.appendChild(sw);
        }
      }
    }

    // Initial populate — re-populate whenever mode changes.
    populateSwatches(getState().colorMode);
```

- [ ] **Step 2: Update `render()` to reflect active swatch differently for rows vs circles**

In the same `<script>`, find the existing `render()` function's swatch-ring block:

```ts
      swatchContainer!.querySelectorAll<HTMLElement>('[data-swatch]').forEach((el) => {
        const active = el.dataset.swatch === paletteId;
        el.classList.toggle('ring-2', active);
        el.classList.toggle('ring-neutral-900', active);
        el.classList.toggle('dark:ring-neutral-100', active);
      });
```

Replace with:

```ts
      const inThemeMode = colorMode === 'theme';
      swatchContainer!.querySelectorAll<HTMLElement>('[data-swatch]').forEach((el) => {
        const active = el.dataset.swatch === paletteId;
        if (inThemeMode) {
          // Named row: highlight with bg tint when active.
          el.classList.toggle('bg-neutral-100', active);
          el.classList.toggle('dark:bg-neutral-800', active);
          el.classList.toggle('font-medium', active);
          // Ring classes not used for rows.
          el.classList.remove('ring-2', 'ring-neutral-900', 'dark:ring-neutral-100');
        } else {
          // Circle swatch: highlight with ring when active.
          el.classList.toggle('ring-2', active);
          el.classList.toggle('ring-neutral-900', active);
          el.classList.toggle('dark:ring-neutral-100', active);
          el.classList.remove('bg-neutral-100', 'dark:bg-neutral-800', 'font-medium');
        }
      });
```

- [ ] **Step 3: Re-populate swatches when mode changes**

In the existing `modeButtons.forEach((b) => { b.addEventListener('click', ...) })` block, update the handler:

Current:
```ts
    modeButtons.forEach((b) => {
      b.addEventListener('click', () => {
        const mode = b.dataset.mode as ColorMode;
        localStorage.setItem('colorMode', mode);
        applyAndPersist();
        render();
      });
    });
```

Replace with:
```ts
    modeButtons.forEach((b) => {
      b.addEventListener('click', () => {
        const mode = b.dataset.mode as ColorMode;
        localStorage.setItem('colorMode', mode);
        populateSwatches(mode);
        applyAndPersist();
        render();
      });
    });
```

- [ ] **Step 4: Verify**

Run: `bun dev`. Open: `http://localhost:4321/`.

Expected:
- Click picker button. In theme mode (default): popover shows 5 rows, each with a color chip + theme name (Ember, Driftwood, Meridian, Moss, Graphite). Active one has a subtle bg highlight.
- Switch to Accent mode: popover shows 5 circle swatches like before.
- Switch back to Theme mode: rows return.
- Click a row — full theme applies (bg, fonts, accent all update).
- No console errors. Kill dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemePicker.astro
git commit -m "Render named rows in theme mode and circles in accent mode"
```

---

## Task 4: Update ASCII background to use theme vars for glyph base and ripple glow

**Goal of this task:** Replace the hard-coded `isDark()` branching in `AsciiBackground.astro`'s `cellStyle` with `readAsciiBase()` (reads `--ascii-base-rgb`), and multiply `shadowBlur` by `--ripple-glow-mult`. Keep accent-mode behavior unchanged (falls back to current white/black when the var is unset).

**Files:**
- Modify: `src/components/AsciiBackground.astro`

- [ ] **Step 1: Add ASCII base state + glow multiplier state**

In the `<script>` block, alongside the other `let` declarations (after `let accentB = 46;`), add:

```ts
  let asciiBaseR = 0;     // overridden by --ascii-base-rgb when in theme mode
  let asciiBaseG = 0;
  let asciiBaseB = 0;
  let asciiBaseSet = false; // whether --ascii-base-rgb provided a value
  let rippleGlowMult = 1.0;
```

- [ ] **Step 2: Add `readAsciiBase()` helper**

Add this function immediately after the existing `readAccent()`:

```ts
  function readAsciiBase(): void {
    const style = getComputedStyle(document.documentElement);
    const v = style.getPropertyValue('--ascii-base-rgb').trim();
    if (v) {
      const parts = v.split(/\s+/).map((n) => parseInt(n, 10));
      if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
        [asciiBaseR, asciiBaseG, asciiBaseB] = parts;
        asciiBaseSet = true;
      } else {
        asciiBaseSet = false;
      }
    } else {
      asciiBaseSet = false;
    }
    const mult = parseFloat(style.getPropertyValue('--ripple-glow-mult'));
    rippleGlowMult = isNaN(mult) || mult <= 0 ? 1.0 : mult;
  }
```

- [ ] **Step 3: Replace `cellStyle` to use the ASCII base**

Find the existing `cellStyle` function:

```ts
  function cellStyle(index: number, baseOpacity: number): { fill: string; shadow: number } {
    const e = excitement[index] / 255;
    const s = scrollBoost;
    const opacity = baseOpacity + e * EXCITED_PEAK_OPACITY_BONUS;
    const blend = Math.min(0.9, e * 1.0 + s * 0.4);
    const dark = isDark();

    // Directional accent: brighten for dark mode, deepen for light mode.
    let targetR: number, targetG: number, targetB: number;
    if (dark) {
      targetR = Math.round(accentR + (255 - accentR) * 0.4);
      targetG = Math.round(accentG + (255 - accentG) * 0.4);
      targetB = Math.round(accentB + (255 - accentB) * 0.4);
    } else {
      targetR = Math.round(accentR * 0.75);
      targetG = Math.round(accentG * 0.75);
      targetB = Math.round(accentB * 0.75);
    }

    const baseR = dark ? 255 : 0;
    const baseG = dark ? 255 : 0;
    const baseB = dark ? 255 : 0;
    const r = Math.round(baseR + (targetR - baseR) * blend);
    const g = Math.round(baseG + (targetG - baseG) * blend);
    const b = Math.round(baseB + (targetB - baseB) * blend);

    const shadow = e > 0 ? Math.round(6 * e) : 0;
    return { fill: `rgba(${r},${g},${b},${opacity})`, shadow };
  }
```

Replace with:

```ts
  function cellStyle(index: number, baseOpacity: number): { fill: string; shadow: number } {
    const e = excitement[index] / 255;
    const s = scrollBoost;
    const opacity = baseOpacity + e * EXCITED_PEAK_OPACITY_BONUS;
    const blend = Math.min(0.9, e * 1.0 + s * 0.4);

    // Base color: theme-provided when in theme mode, otherwise fall back to
    // the neutral dark/light pair driven by the `dark` class.
    let baseR: number, baseG: number, baseB: number;
    if (asciiBaseSet) {
      baseR = asciiBaseR;
      baseG = asciiBaseG;
      baseB = asciiBaseB;
    } else {
      const dark = isDark();
      baseR = baseG = baseB = dark ? 255 : 0;
    }

    // Luminance-based decision for ripple target direction.
    // If base is light (high luminance), ripple brightens further toward white.
    // If base is dark, ripple deepens accent toward ~40% toward black.
    const baseLum = 0.299 * baseR + 0.587 * baseG + 0.114 * baseB;
    const baseIsLight = baseLum > 127;
    let targetR: number, targetG: number, targetB: number;
    if (baseIsLight) {
      targetR = Math.round(accentR + (255 - accentR) * 0.4);
      targetG = Math.round(accentG + (255 - accentG) * 0.4);
      targetB = Math.round(accentB + (255 - accentB) * 0.4);
    } else {
      targetR = Math.round(accentR * 0.75);
      targetG = Math.round(accentG * 0.75);
      targetB = Math.round(accentB * 0.75);
    }

    const r = Math.round(baseR + (targetR - baseR) * blend);
    const g = Math.round(baseG + (targetG - baseG) * blend);
    const b = Math.round(baseB + (targetB - baseB) * blend);

    const shadow = e > 0 ? Math.round(6 * e * rippleGlowMult) : 0;
    return { fill: `rgba(${r},${g},${b},${opacity})`, shadow };
  }
```

- [ ] **Step 4: Call `readAsciiBase()` alongside `readAccent()`**

Find the `init()` function. After `readAccent();`, add:

```ts
    readAsciiBase();
```

Find the `themeObserver`:

```ts
  const themeObserver = new MutationObserver(() => {
    readAccent();
    paintAll();
  });
```

Change to:

```ts
  const themeObserver = new MutationObserver(() => {
    readAccent();
    readAsciiBase();
    paintAll();
  });
```

Also the MutationObserver currently only watches `class`. Theme mode sets `data-theme-active`, so extend the observer's filter. Find:

```ts
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
```

Change to:

```ts
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme-active', 'style'],
  });
```

(The `style` filter is needed because theme switches mutate inline CSS custom properties on `<html>` via `style.setProperty`, which register as `style` attribute changes. Without watching `style`, switching themes in theme mode won't update the ASCII bg until a re-mount.)

Finally, find the existing `theme-change` listener:

```ts
  document.addEventListener('theme-change', () => {
    readAccent();
    paintAll();
  });
```

Change to:

```ts
  document.addEventListener('theme-change', () => {
    readAccent();
    readAsciiBase();
    paintAll();
  });
```

- [ ] **Step 5: Verify**

Run: `bun dev`. Visit `/`.

Expected:
- On Ember (default theme): ASCII ambient glyphs are a very faint warm-dark tint (not pure black). Cursor ripple glows in the warm crimson family.
- Switch to Meridian theme: ambient glyphs tint toward cool blue-grey; cursor ripple is crisp indigo with noticeably LESS glow (glowMultiplier 0.5).
- Switch to Moss: ambient tint is green-grey; ripple is soft green with MORE bloom (1.4).
- Switch to Graphite: bg turns dark, glyphs are now light (they must be, since the base is 200,210,225); ripple glow is very luminous (1.8) slate-blue.
- Switch to Accent mode: ASCII glyphs go back to neutral black/white via `isDark()` fallback.
- No console errors. Kill dev server.

- [ ] **Step 6: Commit**

```bash
git add src/components/AsciiBackground.astro
git commit -m "ASCII background reads theme glyph base and ripple glow multiplier"
```

---

## Task 5: Wire card/divider surfaces to theme variables

**Goal of this task:** Apply theme surface/border/text-muted variables to the existing cards and dividers so they visibly shift per theme. Use opt-in class names so accent-mode markup is unchanged.

**Files:**
- Modify: `src/components/ProjectCard.astro`
- Modify: `src/components/BlogPostCard.astro`
- Modify: `src/components/Footer.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/layouts/BlogPost.astro`

- [ ] **Step 1: ProjectCard — add theme-aware border**

In `src/components/ProjectCard.astro`, the outer `<div>` currently has:

```astro
<div class="group rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md">
```

Add the `theme-card-border` class so the global CSS can override border color in theme mode:

```astro
<div class="group theme-card-border rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md">
```

- [ ] **Step 2: BlogPostCard — add theme-aware border**

In `src/components/BlogPostCard.astro`, the outer `<a>` currently has:

```astro
<a href={`/blog/${slug}`} class="group block rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md">
```

Add `theme-card-border`:

```astro
<a href={`/blog/${slug}`} class="group block theme-card-border rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-md">
```

- [ ] **Step 3: index.astro — add `theme-card-border` to `hr` dividers**

In `src/pages/index.astro`, there are four `<hr class="border-neutral-200 dark:border-neutral-800" />` dividers. The global CSS already applies `border-color: var(--theme-border)` to `hr`s in theme mode via the `html[data-theme-active="true"] hr` rule, so this is already handled for `hr`s — no change needed here.

Verify no manual changes needed for `hr`s by running a quick grep: `grep -n 'border-neutral' src/pages/index.astro` should show only the current `border-neutral-200` class on the four `hr`s. They will now render with `--theme-border` in theme mode automatically.

- [ ] **Step 4: Footer — add theme-aware border + surface**

In `src/components/Footer.astro`, the `<footer>` currently has:

```astro
<footer class="relative z-10 mt-auto border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
```

Add `theme-card-border` and an opt-in `theme-surface` (which applies the `--theme-surface` bg in theme mode). Also use `bg-white/80 dark:bg-neutral-950/80` as fallback for accent mode — keep both; the theme-mode override lives in the global CSS:

```astro
<footer class="relative z-10 mt-auto theme-card-border border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
```

Note: we're NOT adding `theme-surface` to the footer — the `bg-white/80 dark:bg-neutral-950/80` is a transparency layer meant to show a blur. In theme mode, the global CSS's `bg-white/80 dark:bg-neutral-950/80` would still apply because it's a Tailwind utility, but since in theme mode we want the footer to feel like part of the theme, we need to override. Update the footer to:

```astro
<footer class="relative z-10 mt-auto theme-card-border border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md [html[data-theme-active='true']_&]:bg-[color:var(--theme-bg)]/85">
```

Wait — Tailwind arbitrary-variant selectors with attribute checks need explicit form. The cleanest approach is to add a CSS rule to the global `<style is:global>` block in `Layout.astro`:

In `src/layouts/Layout.astro` global style block, add after the existing theme overrides:

```css
      html[data-theme-active="true"] footer {
        background-color: color-mix(in oklab, var(--theme-bg) 85%, transparent);
      }
```

And in `Footer.astro`, just add `theme-card-border`:

```astro
<footer class="relative z-10 mt-auto theme-card-border border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
```

(Revert the weird arbitrary-variant from above — just the simple class addition.)

- [ ] **Step 5: Header — add theme-aware border**

In `src/components/Header.astro`, find the `<header>` opening:

```astro
<header
  class="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md"
```

Add `theme-card-border`:

```astro
<header
  class="sticky top-0 z-50 theme-card-border border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md"
```

Also in `src/layouts/Layout.astro`, extend the footer background rule to cover the header too:

```css
      html[data-theme-active="true"] header,
      html[data-theme-active="true"] footer {
        background-color: color-mix(in oklab, var(--theme-bg) 85%, transparent);
      }
```

- [ ] **Step 6: BlogPost layout — add `theme-text-muted` to metadata**

In `src/layouts/BlogPost.astro`, find the metadata line (near the top, containing `pubDate` and reading time). Add `theme-text-muted` to any span that currently uses `text-neutral-500 dark:text-neutral-400` metadata text. (Run a grep to find the exact line: `grep -n 'text-neutral-500' src/layouts/BlogPost.astro`.)

If the file has a date/meta line like:

```astro
<div class="text-sm text-neutral-500 dark:text-neutral-400">
```

Change to:

```astro
<div class="text-sm text-neutral-500 dark:text-neutral-400 theme-text-muted">
```

(If there are multiple such spans in BlogPost.astro, apply `theme-text-muted` to each metadata one. Content body text should NOT get this class — only muted/secondary elements.)

- [ ] **Step 7: Verify**

Run: `bun dev`. Visit `/`, `/blog`, `/projects`, and a blog post page.

Expected:
- In Ember theme: card borders are now a warm-tinged border color (derived `--theme-border`); hr dividers same. Header and footer have Ember's warm bg tint, not white.
- Switch themes: each theme has visibly distinct card borders, dividers, header/footer tints.
- In accent mode: cards and dividers look exactly like before (no regression — fallback classes still apply, overrides only active under `data-theme-active="true"`).
- No console errors. Kill dev server.

- [ ] **Step 8: Commit**

```bash
git add src/components/ProjectCard.astro src/components/BlogPostCard.astro src/components/Footer.astro src/components/Header.astro src/layouts/Layout.astro src/layouts/BlogPost.astro
git commit -m "Wire card borders, dividers, header/footer surfaces to theme variables"
```

---

## Task 6: Optimize the avatar image

**Goal of this task:** Resize the 1 MB headshot.jpg to 512×512 max, compress a WebP version, and update `index.astro` to use `<picture>` with WebP + JPEG fallback.

**Files:**
- Modify (resize): `public/headshot.jpg`
- Add: `public/headshot.webp`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Inspect the current image**

Run: `file public/headshot.jpg && sips -g pixelWidth -g pixelHeight public/headshot.jpg`

Note the original dimensions for reference.

- [ ] **Step 2: Create a backup and resize the JPG**

```bash
cp public/headshot.jpg /tmp/headshot-original.jpg
sips -Z 512 public/headshot.jpg --out public/headshot.jpg
# Re-encode at quality 80 to compress.
sips -s format jpeg -s formatOptions 80 public/headshot.jpg --out public/headshot.jpg
```

Verify new size:
```bash
ls -lh public/headshot.jpg
```
Expected: somewhere between 40 KB and 100 KB (well under the original 1 MB).

- [ ] **Step 3: Create WebP version**

Check if `cwebp` is installed:
```bash
which cwebp
```

If present:
```bash
cwebp -q 80 /tmp/headshot-original.jpg -resize 512 0 -o public/headshot.webp
```

If NOT present, install it:
```bash
# macOS Homebrew
brew install webp
# Then run the cwebp command above.
```

If `brew` is unavailable, skip WebP generation and use a `<picture>` with only the JPG source (the `<img>` fallback handles it). In that case, document the skip in the commit message.

Verify:
```bash
ls -lh public/headshot.webp
```
Expected: 15 KB – 40 KB.

- [ ] **Step 4: Update `index.astro` to use `<picture>`**

In `src/pages/index.astro`, find the current avatar `<img>`:

```astro
      <img
        src={personal.avatar}
        alt={personal.name}
        class="h-28 w-28 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700 shrink-0"
      />
```

Replace with:

```astro
      <picture>
        <source srcset="/headshot.webp" type="image/webp" />
        <img
          src="/headshot.jpg"
          alt={personal.name}
          width="112"
          height="112"
          class="h-28 w-28 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700 shrink-0"
        />
      </picture>
```

Note: this hardcodes `/headshot.jpg` and `/headshot.webp` rather than using `personal.avatar`. That's intentional — the `<picture>` needs two explicit paths, and the avatar is a single known asset. If `personal.avatar` points somewhere other than `/headshot.jpg`, skip this task and come back after reconciling the data source.

Verify by checking what `personal.avatar` equals:
```bash
grep -n 'avatar' src/data/personal.ts
```
If it is `/headshot.jpg` (or similar absolute path to the same file), the replacement is correct. If it is a different path, flag as NEEDS_CONTEXT and request clarification before proceeding.

- [ ] **Step 5: Verify visually**

Run: `bun dev`. Visit `/`.

Expected:
- Avatar renders identically (same size, same crop).
- Devtools Network tab: request for `/headshot.webp` succeeds (or `/headshot.jpg` if WebP was skipped).
- Page size on DOMContentLoaded drops noticeably (~900 KB savings).

Kill dev server.

- [ ] **Step 6: Commit**

```bash
git add public/headshot.jpg public/headshot.webp src/pages/index.astro
git commit -m "Compress avatar to ~512px and serve WebP with JPG fallback"
```

---

## Task 7: Taste pass and full verification

**Goal of this task:** Run the full testing checklist; tune anything that feels off.

**Files:**
- Potentially: any of the above files.

- [ ] **Step 1: Run `bun dev` and walk through each theme**

For each of `ember`, `driftwood`, `meridian`, `moss`, `graphite` (select via picker in theme mode):

1. Background, text color, headline fonts all visibly distinct.
2. Card borders and hr dividers tint with the theme.
3. Header and footer bg tint with the theme.
4. Accent surfaces (resume button, section dots, active nav underline, tag badges) use the theme accent.
5. Cursor ripple flavor matches (Meridian crisp, Moss bloomy, Graphite luminous).
6. Click ripple inherits the same flavor.
7. Scroll tint matches accent.
8. Resume button text stays readable on its accent (verify Driftwood specifically — deep amber `#A0651F` with white text).

- [ ] **Step 2: Accent mode regression**

Switch to accent mode. Toggle light/dark via the picker's appearance row. Select each accent swatch. Confirm:

1. Background stays Tailwind default white / neutral-950.
2. Body text stays Tailwind default.
3. Card borders revert to neutral-200 / neutral-800.
4. ASCII ambient glyphs are plain black/white (no theme tint).
5. Cursor ripple uses accent color but with default glow (no multiplier).
6. Everything else works exactly as before this plan started.

- [ ] **Step 3: Persistence + reload**

Pick a non-default theme (e.g. Moss). Reload. Confirm the theme persists with no flash.

Clear localStorage. Reload. Confirm Ember (default) loads cleanly.

- [ ] **Step 4: Reduced motion**

Enable `prefers-reduced-motion: reduce` via devtools. Confirm ASCII animation stops. Theme switches still work.

- [ ] **Step 5: Mobile layout**

Resize browser to mobile width. Open picker. Theme rows should be tappable and not overflow. Circle swatches (accent mode) laid out in a single row.

- [ ] **Step 6: Contrast spot check**

In each theme, visually confirm body text is easily readable against bg, and resume button text is readable on its accent.

- [ ] **Step 7: Tune if needed**

Common knobs:

- A theme's bg feels too close to another's? Tune the hex in `src/lib/themes.ts` AND the mirrored hex in `Layout.astro`'s inline script.
- A theme's ripple glow too strong/weak? Tune `glowMultiplier` in `src/lib/themes.ts` AND `glowMult` in the inline script.
- A theme's font doesn't fit the vibe? Swap the Google font; update BOTH the palette's `fontDisplay/Body/Mono` AND the Google Fonts `<link>` in `Layout.astro`.
- Avatar too small/big in the new `<picture>`? The `width="112"` attribute drives browser sizing — adjust.

- [ ] **Step 8: If tuning was needed, commit**

```bash
git add -u
git commit -m "Tune full theme palettes and ripple profiles"
```

---

## Rollback

All changes are additive or in-place swaps. Revert tasks 1–6 in reverse order to fully undo. The original `headshot.jpg` backup is at `/tmp/headshot-original.jpg` after Task 6 Step 2; keep that around until you've confirmed the new images look right.
