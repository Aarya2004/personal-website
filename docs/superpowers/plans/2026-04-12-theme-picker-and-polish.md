# Theme Picker + Editorial Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widen the ASCII-background vignette, make the footer solid like the header, add a top-right theme/accent picker with two modes (Accent | Theme), and wire an accent color across several surfaces including the ASCII cursor ripple and scroll tint.

**Architecture:** A new `ThemePicker.astro` replaces the existing `ThemeToggle.astro`. A small `src/lib/themes.ts` module holds palette definitions and a shared `applyPalette()` function, used by both the inline pre-paint script in `Layout.astro` and the picker UI. All accent colors flow through CSS variables (`--accent`, `--accent-muted`) set on `<html>`. UI surfaces read those variables via Tailwind's arbitrary-value syntax.

**Tech Stack:** Astro 4, TypeScript, Tailwind (arbitrary-value syntax `bg-[color:var(--accent)]`), localStorage, Canvas 2D.

**Verification:** Manual visual verification per task. Each task is committable.

---

## File Structure

- **New:** `src/lib/themes.ts` — Palette definitions + `applyPalette(paletteId, colorMode, darkMode)` function.
- **New:** `src/components/ThemePicker.astro` — Button + popover UI, segmented control, swatches, light/dark toggle (accent mode only), persistence wiring, `theme-change` event dispatch.
- **Delete:** `src/components/ThemeToggle.astro` — Replaced.
- **Modify:** `src/layouts/Layout.astro` — Inline pre-paint script, `<body>` bg classes.
- **Modify:** `src/components/Header.astro` — Swap `ThemeToggle` → `ThemePicker`, active nav underline color.
- **Modify:** `src/components/Footer.astro` — Solid blurred background.
- **Modify:** `src/components/AsciiBackground.astro` — Widen vignette, parse accent, blend accent into excited cells and scroll-boosted ambient cells, re-read accent on `theme-change`.
- **Modify:** `src/pages/index.astro` — Section dot colors, resume button.

---

## Task 1: Widen vignette + solid footer

**Goal of this task:** Quick visual-polish standalone — widen the ASCII vignette to comfortably cover the content column, and make the footer solid-blurred like the header. No theming work yet.

**Files:**
- Modify: `src/components/AsciiBackground.astro`
- Modify: `src/components/Footer.astro`

- [ ] **Step 1: Widen the vignette**

In `src/components/AsciiBackground.astro`'s `<style>` block, find the `#ascii-vignette` rule. The current `background` line is:

```css
    background: radial-gradient(
      ellipse 520px 420px at 50% 45%,
      var(--ascii-bg-color, #ffffff) 0%,
      var(--ascii-bg-color, #ffffff) 30%,
      transparent 90%
    );
```

Replace it with:

```css
    background: radial-gradient(
      ellipse 880px 680px at 50% 45%,
      var(--ascii-bg-color, #ffffff) 0%,
      var(--ascii-bg-color, #ffffff) 40%,
      transparent 95%
    );
```

- [ ] **Step 2: Make footer solid**

In `src/components/Footer.astro`, the opening `<footer>` tag is currently:

```astro
<footer class="border-t border-neutral-200 dark:border-neutral-800 mt-auto">
```

Replace with:

```astro
<footer class="relative z-10 mt-auto border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
```

- [ ] **Step 3: Visually verify**

Run `bun dev`. Confirm:
- The vignette clean-center region visibly covers the full content column width (should look flush with the text, not narrower).
- The footer no longer shows glyphs bleeding through — it has the same tinted blur as the header.
- Light/dark mode both look correct.
- Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/AsciiBackground.astro src/components/Footer.astro
git commit -m "Widen ASCII vignette and make footer solid-blurred"
```

---

## Task 2: Palette module (`src/lib/themes.ts`)

**Goal of this task:** Single source of truth for palette data and the function that applies a palette to `<html>`. Used by both the inline script (pre-paint, flash prevention) and the picker UI.

**Files:**
- Create: `src/lib/themes.ts`

- [ ] **Step 1: Create the themes module**

Create `src/lib/themes.ts` with:

```ts
export type PaletteId = 'ember' | 'driftwood' | 'meridian' | 'moss' | 'graphite';
export type ColorMode = 'accent' | 'theme';

export interface Palette {
  id: PaletteId;
  name: string;
  accent: string;       // hex, e.g. '#C03A2E'
  bgTintLight: string;  // hex
  bgTintDark: string;   // hex
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
```

- [ ] **Step 2: Verify it compiles**

Run `bun dev`. No errors in the dev server output. (The module isn't imported by anything yet — just verifying TS parses.) Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/lib/themes.ts
git commit -m "Add themes module with palette definitions and applyPalette helper"
```

---

## Task 3: Pre-paint script + body background variables in `Layout.astro`

**Goal of this task:** Wire the `<body>` to use CSS-variable backgrounds, and update the inline pre-paint script to apply the chosen palette BEFORE first paint (no color flash on reload). The picker UI doesn't exist yet — defaults handle everything.

**Files:**
- Modify: `src/layouts/Layout.astro`

- [ ] **Step 1: Update `<body>` bg classes**

In `src/layouts/Layout.astro`, find the `<body>` opening line:

```astro
<body class="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-300">
```

Replace with:

```astro
<body class="min-h-screen bg-[color:var(--theme-bg-light,#ffffff)] dark:bg-[color:var(--theme-bg-dark,#0a0a0a)] text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-300">
```

- [ ] **Step 2: Replace the inline pre-paint script**

Find the existing inline script block in `Layout.astro`:

```astro
    <script is:inline>
      function applyTheme() {
        const theme = (() => {
          if (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) {
            return localStorage.getItem('theme');
          }
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        })();
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      applyTheme();
      document.addEventListener('astro:after-swap', applyTheme);
    </script>
```

Replace with:

```astro
    <script is:inline>
      (function () {
        const PALETTES = {
          ember:     { accent: '#C03A2E', bgLight: '#FBF8F5', bgDark: '#0B0A0A' },
          driftwood: { accent: '#D97706', bgLight: '#FDFBF6', bgDark: '#0C0B09' },
          meridian:  { accent: '#3949AB', bgLight: '#F7F8FB', bgDark: '#0A0B0E' },
          moss:      { accent: '#2F6B4E', bgLight: '#F7F9F6', bgDark: '#0A0C0A' },
          graphite:  { accent: '#475569', bgLight: '#FFFFFF', bgDark: '#000000' },
        };
        function hexToRgb(hex) {
          const c = hex.replace('#', '');
          return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
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
          root.style.setProperty('--accent', p.accent);
          const [r, g, b] = hexToRgb(p.accent);
          root.style.setProperty('--accent-muted', `rgba(${r},${g},${b},0.12)`);
          root.style.setProperty('--accent-rgb', `${r} ${g} ${b}`);
          if (colorMode === 'theme') {
            root.style.setProperty('--theme-bg-light', p.bgLight);
            root.style.setProperty('--theme-bg-dark', p.bgDark);
          } else {
            root.style.setProperty('--theme-bg-light', '#ffffff');
            root.style.setProperty('--theme-bg-dark', '#0a0a0a');
          }
        }
        apply();
        document.addEventListener('astro:after-swap', apply);
      })();
    </script>
```

Note: the palette data is duplicated between this inline script and `src/lib/themes.ts` on purpose — the inline script MUST run before any JS module imports to prevent color flash, and Astro bundles modules asynchronously. Keeping a tiny duplicate here is the standard pattern. If palettes change, both places must be updated. Add a comment in `themes.ts` mentioning this duplication.

- [ ] **Step 3: Add the duplication-reminder comment in `themes.ts`**

At the top of `src/lib/themes.ts`, add (keep the existing exports):

```ts
// NOTE: The palette hex values defined in PALETTES below are also duplicated
// in the inline pre-paint script in `src/layouts/Layout.astro`.
// This duplication is intentional — the inline script must run before any
// ESM bundle loads to prevent color flash on reload. If you edit a palette
// value here, update the inline script too.
```

- [ ] **Step 4: Visually verify**

Run `bun dev`. Confirm:
- Page renders. Background should now visibly be slightly warm (Ember's `#FBF8F5`) — it's subtle but noticeable against pure white if you side-by-side with old screenshots.
- Toggle dark mode via devtools emulation or set `localStorage.theme = 'dark'` and reload — background is the Ember dark tint (`#0B0A0A`), near-black.
- Open devtools, inspect `<html>` element — `--accent: #C03A2E` should be set.
- No console errors. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/Layout.astro src/lib/themes.ts
git commit -m "Wire pre-paint script for palette variables and CSS-var body background"
```

---

## Task 4: Build the `ThemePicker` component

**Goal of this task:** The new picker component with popover, mode switch, 5 swatches, light/dark sub-toggle in accent mode, full persistence, and event dispatch. The existing `ThemeToggle` is still mounted in `Header.astro` at this point — that swap happens in Task 5.

**Files:**
- Create: `src/components/ThemePicker.astro`

- [ ] **Step 1: Create the component**

Create `src/components/ThemePicker.astro` with the following content:

```astro
---
// ThemePicker.astro
// Top-right color picker with two modes (Accent | Theme) and 5 palette swatches.
// Persists selection to localStorage. Dispatches 'theme-change' event.
---

<div class="relative" data-theme-picker>
  <button
    type="button"
    data-picker-button
    aria-label="Open theme picker"
    aria-haspopup="true"
    aria-expanded="false"
    class="rounded-lg p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent,#C03A2E)] focus-visible:ring-offset-2 transition-colors"
  >
    <!-- palette / drop icon -->
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 21a9 9 0 110-18 7 7 0 017 7c0 2-1 3-2.5 3H14a2 2 0 00-2 2c0 1 .5 2 .5 3S12 21 12 21z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" />
      <circle cx="16.5" cy="10.5" r="1" fill="currentColor" />
    </svg>
  </button>

  <div
    data-picker-popover
    role="dialog"
    aria-label="Theme picker"
    class="hidden absolute right-0 mt-2 w-60 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md p-3 shadow-lg z-50"
  >
    <!-- Mode switch -->
    <div class="flex rounded-lg bg-neutral-100 dark:bg-neutral-800 p-0.5 text-xs font-medium">
      <button
        type="button"
        data-mode-btn
        data-mode="accent"
        class="flex-1 rounded-md py-1.5 text-neutral-600 dark:text-neutral-400 transition-colors"
      >Accent</button>
      <button
        type="button"
        data-mode-btn
        data-mode="theme"
        class="flex-1 rounded-md py-1.5 text-neutral-600 dark:text-neutral-400 transition-colors"
      >Theme</button>
    </div>

    <!-- Swatches -->
    <div class="mt-3 flex items-center justify-between gap-2" data-swatches>
      <!-- Populated by script -->
    </div>

    <!-- Light/dark row (accent mode only) -->
    <div data-lightdark-row class="mt-3 hidden items-center justify-between border-t border-neutral-200 dark:border-neutral-800 pt-3">
      <span class="text-xs text-neutral-500 dark:text-neutral-400">Appearance</span>
      <button
        type="button"
        data-lightdark-btn
        aria-label="Toggle light/dark"
        class="rounded-md p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <svg data-sun class="hidden dark:block h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
        </svg>
        <svg data-moon class="block dark:hidden h-4 w-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
        </svg>
      </button>
    </div>
  </div>
</div>

<script>
  import { PALETTES, PALETTE_IDS, DEFAULT_PALETTE_ID, DEFAULT_COLOR_MODE, applyPalette } from '../lib/themes';
  import type { PaletteId, ColorMode } from '../lib/themes';

  function init(root: Element): void {
    const button = root.querySelector<HTMLButtonElement>('[data-picker-button]');
    const popover = root.querySelector<HTMLElement>('[data-picker-popover]');
    const modeButtons = root.querySelectorAll<HTMLButtonElement>('[data-mode-btn]');
    const swatchContainer = root.querySelector<HTMLElement>('[data-swatches]');
    const lightDarkRow = root.querySelector<HTMLElement>('[data-lightdark-row]');
    const lightDarkBtn = root.querySelector<HTMLButtonElement>('[data-lightdark-btn]');
    if (!button || !popover || !swatchContainer || !lightDarkRow || !lightDarkBtn) return;

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

    function getState() {
      const colorMode = (localStorage.getItem('colorMode') as ColorMode) || DEFAULT_COLOR_MODE;
      const paletteId = (localStorage.getItem('paletteId') as PaletteId) || DEFAULT_PALETTE_ID;
      const isDark = document.documentElement.classList.contains('dark');
      return { colorMode, paletteId, isDark };
    }

    function render(): void {
      const { colorMode, paletteId } = getState();
      // Mode buttons
      modeButtons.forEach((b) => {
        const active = b.dataset.mode === colorMode;
        b.classList.toggle('bg-white', active);
        b.classList.toggle('dark:bg-neutral-700', active);
        b.classList.toggle('text-neutral-900', active);
        b.classList.toggle('dark:text-neutral-100', active);
        b.classList.toggle('shadow-sm', active);
      });
      // Swatches ring
      swatchContainer!.querySelectorAll<HTMLElement>('[data-swatch]').forEach((el) => {
        const active = el.dataset.swatch === paletteId;
        el.classList.toggle('ring-2', active);
        el.classList.toggle('ring-neutral-900', active);
        el.classList.toggle('dark:ring-neutral-100', active);
      });
      // Light/dark row visibility
      lightDarkRow!.classList.toggle('hidden', colorMode !== 'accent');
      lightDarkRow!.classList.toggle('flex', colorMode === 'accent');
    }

    function applyAndPersist(): void {
      const { colorMode, paletteId } = getState();
      applyPalette(paletteId, colorMode);
      document.dispatchEvent(new CustomEvent('theme-change'));
    }

    function openPopover(): void {
      popover!.classList.remove('hidden');
      button!.setAttribute('aria-expanded', 'true');
      render();
    }
    function closePopover(): void {
      popover!.classList.add('hidden');
      button!.setAttribute('aria-expanded', 'false');
    }

    // Open/close.
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (popover!.classList.contains('hidden')) openPopover();
      else closePopover();
    });
    document.addEventListener('click', (e) => {
      if (popover!.classList.contains('hidden')) return;
      if (!root.contains(e.target as Node)) closePopover();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !popover!.classList.contains('hidden')) {
        closePopover();
        button!.focus();
      }
    });

    // Mode switch.
    modeButtons.forEach((b) => {
      b.addEventListener('click', () => {
        const mode = b.dataset.mode as ColorMode;
        localStorage.setItem('colorMode', mode);
        applyAndPersist();
        render();
      });
    });

    // Swatch click.
    swatchContainer.addEventListener('click', (e) => {
      const target = (e.target as Element).closest<HTMLElement>('[data-swatch]');
      if (!target) return;
      const id = target.dataset.swatch as PaletteId;
      localStorage.setItem('paletteId', id);
      applyAndPersist();
      render();
    });

    // Light/dark toggle.
    lightDarkBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      applyAndPersist();
      render();
    });

    render();
  }

  function initAll(): void {
    document.querySelectorAll('[data-theme-picker]').forEach(init);
  }

  initAll();
  document.addEventListener('astro:after-swap', initAll);
</script>
```

- [ ] **Step 2: Verify the component parses**

Run `bun dev`. No TS or Astro errors in output. (Component isn't mounted yet.) Stop dev server.

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemePicker.astro
git commit -m "Add ThemePicker component with accent/theme modes and persistence"
```

---

## Task 5: Swap ThemeToggle for ThemePicker in Header, update nav underline

**Goal of this task:** Mount the picker in the header (both desktop and mobile slots), remove the old `ThemeToggle` component, and change the active nav underline to use `--accent`.

**Files:**
- Modify: `src/components/Header.astro`
- Delete: `src/components/ThemeToggle.astro`

- [ ] **Step 1: Update Header imports and usage**

In `src/components/Header.astro`, change the import line:

```astro
import ThemeToggle from './ThemeToggle.astro';
```

to:

```astro
import ThemePicker from './ThemePicker.astro';
```

Change **both** occurrences of `<ThemeToggle />` to `<ThemePicker />` (one in the desktop nav div, one in the mobile menu div).

- [ ] **Step 2: Update active nav underline**

In `Header.astro`, find:

```astro
              ? 'border-b-2 border-amber-500 dark:border-amber-400 text-neutral-900 dark:text-neutral-100'
```

Replace with:

```astro
              ? 'border-b-2 border-[color:var(--accent)] text-neutral-900 dark:text-neutral-100'
```

- [ ] **Step 3: Delete the old ThemeToggle**

```bash
rm src/components/ThemeToggle.astro
```

- [ ] **Step 4: Visually verify**

Run `bun dev`. Confirm:
- Top-right button shows a palette icon (not sun/moon).
- Click the button — popover opens with "Accent | Theme" tabs at top, 5 swatches below, and (if in Theme mode) no appearance toggle.
- Switch to Accent mode — light/dark row appears at the bottom.
- Click a swatch — ring moves to it, colors around the page update (e.g. active nav underline).
- Outside-click closes popover. Escape closes popover.
- Navigate between pages — picker persists, state preserved.
- Reload — selection persists.
- No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Header.astro src/components/ThemeToggle.astro
git commit -m "Replace ThemeToggle with ThemePicker in Header and update nav accent"
```

---

## Task 6: Accent surfaces — section dots and resume button

**Goal of this task:** Apply `--accent` to the visible hero-area surfaces on the home page.

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Change section dot colors**

In `src/pages/index.astro`, find the "Currently" section dot:

```astro
          <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-amber-500 dark:bg-amber-400" aria-hidden="true"></span>
```

Replace `bg-amber-500 dark:bg-amber-400` with `bg-[color:var(--accent)]`:

```astro
          <span class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm bg-[color:var(--accent)]" aria-hidden="true"></span>
```

(Leave the "Past" section dot — `bg-neutral-400 dark:bg-neutral-500` — unchanged. That's intentionally neutral.)

- [ ] **Step 2: Change resume button to accent**

Find the resume `<a>` in `index.astro`:

```astro
      <a
        href={personal.resumePath}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
      >
```

Change the `class` to:

```astro
        class="inline-flex items-center gap-1.5 rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-medium text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 transition-all"
```

- [ ] **Step 3: Visually verify**

Run `bun dev`. Confirm:
- "Currently" dot is the current accent color (crimson by default).
- Resume button is crimson, text is white, hover brightens slightly.
- Pick a different swatch from the picker — both update immediately.
- No console errors. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/pages/index.astro
git commit -m "Apply accent color to section dots and resume button"
```

---

## Task 7: Accent in ASCII cursor ripple and scroll tint

**Goal of this task:** Make the ASCII cursor ripple and scroll-boosted ambient cells render with a blend toward the accent color. Re-read the accent whenever a `theme-change` event fires.

**Files:**
- Modify: `src/components/AsciiBackground.astro`

- [ ] **Step 1: Add accent state and parsing**

In `src/components/AsciiBackground.astro`'s `<script>`, alongside the other `let` declarations (after `let scrollVelocity = 0;`), add:

```ts
  let accentR = 192;
  let accentG = 58;
  let accentB = 46;
```

Add this constant alongside the existing constants (after `EXCITED_OPACITY_BONUS`):

```ts
  const EXCITED_PEAK_OPACITY_BONUS = 0.19; // replaces EXCITED_OPACITY_BONUS at peak; see opacityFor
```

Add this helper function before `opacityFor`:

```ts
  function readAccent(): void {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--accent-rgb').trim();
    if (!v) return;
    const parts = v.split(/\s+/).map((n) => parseInt(n, 10));
    if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
      [accentR, accentG, accentB] = parts;
    }
  }
```

- [ ] **Step 2: Call `readAccent()` at init and on theme change**

In `init()`, after the line `resize();` and before `stopLoop(); startLoop();`, add:

```ts
    readAccent();
```

At module scope, add a `theme-change` listener alongside the other module-level listeners (after the `visibilitychange` listener, before the final `init();` call):

```ts
  document.addEventListener('theme-change', () => {
    readAccent();
    paintAll();
  });
```

Also call `readAccent()` in the existing `themeObserver` callback so class-based dark-mode flips pick up any changed accent too. Currently:

```ts
  const themeObserver = new MutationObserver(() => paintAll());
```

Change to:

```ts
  const themeObserver = new MutationObserver(() => {
    readAccent();
    paintAll();
  });
```

- [ ] **Step 3: Replace `opacityFor` and add a color-blending helper**

Find the existing `opacityFor`:

```ts
  function opacityFor(index: number, base: number): number {
    const e = excitement[index];
    if (e === 0) return base;
    return base + (e / 255) * EXCITED_OPACITY_BONUS;
  }
```

Replace with:

```ts
  /**
   * Per-cell opacity AND color. Returns the color string to use for fillStyle.
   * Blends from neutral (black/white per theme) toward accent as excitement rises.
   * Scroll boost also tints the whole field toward accent globally.
   */
  function cellStyle(index: number, baseOpacity: number): string {
    const e = excitement[index] / 255;       // 0..1
    const s = scrollBoost;                    // 0..1
    const opacity = baseOpacity + e * EXCITED_PEAK_OPACITY_BONUS;
    // Color blend weight: excitement dominates locally; scroll boost adds a global tint.
    const blend = Math.min(0.8, e * 0.9 + s * 0.4);
    const dark = isDark();
    const baseR = dark ? 255 : 0;
    const baseG = dark ? 255 : 0;
    const baseB = dark ? 255 : 0;
    const r = Math.round(baseR + (accentR - baseR) * blend);
    const g = Math.round(baseG + (accentG - baseG) * blend);
    const b = Math.round(baseB + (accentB - baseB) * blend);
    return `rgba(${r},${g},${b},${opacity})`;
  }
```

- [ ] **Step 4: Update `paintCell` to use the new color path**

The existing `paintCell` is:

```ts
  function paintCell(index: number, opacity: number): void {
    if (!ctx) return;
    const r = Math.floor(index / cols);
    const c = index % cols;
    const x = c * cellW;
    const y = r * cellH;
    ctx.clearRect(x, y, cellW + 1, cellH);
    ctx.fillStyle = glyphColor(opacity);
    ctx.fillText(GLYPHS[glyphs[index]], x, y);
  }
```

Replace with:

```ts
  function paintCell(index: number, baseOpacity: number): void {
    if (!ctx) return;
    const r = Math.floor(index / cols);
    const c = index % cols;
    const x = c * cellW;
    const y = r * cellH;
    ctx.clearRect(x, y, cellW + 1, cellH);
    ctx.fillStyle = cellStyle(index, baseOpacity);
    ctx.fillText(GLYPHS[glyphs[index]], x, y);
  }
```

- [ ] **Step 5: Update `tick()` call sites to pass base opacity (not pre-blended)**

In `tick()`, the ambient-mutation paint call currently is:

```ts
      for (let i = 0; i < mutations; i++) {
        const idx = Math.floor(Math.random() * glyphs.length);
        glyphs[idx] = Math.floor(Math.random() * GLYPHS.length);
        paintCell(idx, opacityFor(idx, opacity));
      }
```

Change to:

```ts
      for (let i = 0; i < mutations; i++) {
        const idx = Math.floor(Math.random() * glyphs.length);
        glyphs[idx] = Math.floor(Math.random() * GLYPHS.length);
        paintCell(idx, opacity);
      }
```

The excited-cell paint call currently is:

```ts
      for (let i = 0; i < excitement.length; i++) {
        if (excitement[i] === 0) continue;
        glyphs[i] = Math.floor(Math.random() * GLYPHS.length);
        paintCell(i, opacityFor(i, opacity));
        const next = excitement[i] - RIPPLE_DECAY_PER_TICK;
        excitement[i] = next > 0 ? next : 0;
        if (excitement[i] === 0) {
          // One final repaint at baseline to shed the excitement glow.
          paintCell(i, opacity);
        }
      }
```

Change to:

```ts
      for (let i = 0; i < excitement.length; i++) {
        if (excitement[i] === 0) continue;
        glyphs[i] = Math.floor(Math.random() * GLYPHS.length);
        paintCell(i, opacity);
        const next = excitement[i] - RIPPLE_DECAY_PER_TICK;
        excitement[i] = next > 0 ? next : 0;
        if (excitement[i] === 0) {
          paintCell(i, opacity);
        }
      }
```

Also delete the now-unused `opacityFor` function entirely.

Also delete the now-unused `glyphColor` function and its references. (Wait — `paintAll` still uses `glyphColor`. Check: in the current `paintAll`, `ctx.fillStyle = glyphColor(baseOpacity());` is set ONCE for the whole grid. With the new per-cell color path, `paintAll` should use the same `cellStyle` per cell.)

- [ ] **Step 6: Update `paintAll` to use the per-cell color path**

Current `paintAll`:

```ts
  function paintAll(): void {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = glyphColor(baseOpacity());
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const g = GLYPHS[glyphs[r * cols + c]];
        ctx.fillText(g, c * cellW, r * cellH);
      }
    }
  }
```

Replace with:

```ts
  function paintAll(): void {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    ctx.textBaseline = 'top';
    const op = baseOpacity();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        ctx.fillStyle = cellStyle(idx, op);
        ctx.fillText(GLYPHS[glyphs[idx]], c * cellW, r * cellH);
      }
    }
  }
```

Now `glyphColor` is unused. Delete it:

```ts
  function glyphColor(opacity: number): string {
    return isDark()
      ? `rgba(255,255,255,${opacity})`
      : `rgba(0,0,0,${opacity})`;
  }
```

Remove that function entirely. Also remove the now-unused `EXCITED_OPACITY_BONUS` constant (replaced by `EXCITED_PEAK_OPACITY_BONUS`).

- [ ] **Step 7: Visually verify**

Run `bun dev`. Confirm:
- Move the mouse — cursor ripple shows as a tinted crimson trail (default Ember).
- Scroll fast — field briefly tints toward crimson globally, decays back to neutral.
- Open theme picker, click a different swatch — ripple and scroll tint immediately use the new color.
- Switch between accent mode and theme mode — accent color persists and stays applied to the ripple.
- Switch light/dark — ambient is still neutral (white/black per mode); ripple still tints to accent.
- No console errors. Stop dev server.

- [ ] **Step 8: Commit**

```bash
git add src/components/AsciiBackground.astro
git commit -m "Blend accent color into ASCII cursor ripple and scroll tint"
```

---

## Task 8: Taste pass and full verification

**Goal of this task:** Run the full testing checklist; tune if anything feels off.

**Files:**
- Potentially: `src/components/AsciiBackground.astro`, `src/lib/themes.ts` (palette hex), `src/layouts/Layout.astro` (inline script palette hex — must stay in sync).

- [ ] **Step 1: Testing checklist**

Run through each:

1. Home page loads on Ember (crimson accent, subtle warm background).
2. Vignette fully covers the content column width. Glyphs behind the footer are invisible (blurred solid bg).
3. Theme picker opens on click, closes on outside-click, Escape, and button-click. Keyboard nav works (Tab into button, Enter/Space opens, Tab moves through popover).
4. Accent mode: picking a swatch changes accent everywhere (dots, nav underline, resume button, ripple). Light/dark toggle in popover still works.
5. Theme mode: picking a swatch changes accent AND subtle background tint. Light/dark row is hidden; light/dark still follows prior `theme` localStorage value.
6. `localStorage.clear()`, reload — defaults to Ember, theme mode, OS preference for dark.
7. Set a non-default palette, reload — persisted correctly.
8. ASCII ripple tints to accent; scroll tint tints to accent. Ambient cells stay neutral.
9. `prefers-reduced-motion: reduce` still disables ASCII animation. Picker still works.
10. Responsive: at mobile width, picker icon still visible next to hamburger. Popover opens and doesn't overflow viewport.
11. All focus rings use accent color.
12. WCAG AA contrast: resume button text (white on accent) passes for all five accents in both modes.
13. Dev server: no console errors, no TS warnings.

- [ ] **Step 2: If anything feels off, tune**

Common knobs:
- ASCII ripple too colorful: in `cellStyle`, lower the `e * 0.9` coefficient to `e * 0.6` and peak opacity bonus back to `0.12`.
- Scroll tint too loud: reduce the `s * 0.4` coefficient in `cellStyle`.
- Background tints too warm/cold: adjust `bgTintLight`/`bgTintDark` in `src/lib/themes.ts` AND the matching entry in the inline script in `Layout.astro`.
- Vignette too wide/narrow: adjust `880px 680px` in `AsciiBackground.astro`.

- [ ] **Step 3: If constants changed, commit**

```bash
git add -u
git commit -m "Tune theme picker and ASCII accent blend for editorial feel"
```

---

## Rollback

All changes are additive or swap-in-place. To fully revert: revert the seven feature commits on `main` (Tasks 1–7) and restore `src/components/ThemeToggle.astro` from its last git SHA. No database, no migrations, no external state.
