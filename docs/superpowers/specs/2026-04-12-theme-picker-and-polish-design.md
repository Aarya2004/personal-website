# Theme Picker + Editorial Polish — Design Spec

**Date:** 2026-04-12
**Status:** Approved for implementation planning
**Scope:** Four related polish changes: widen the ASCII-background vignette, make the site footer solid (like the header), add a theme/accent picker to the top-right, and wire an accent color through several UI surfaces including the ASCII cursor ripple and scroll tint.

## Goals

1. Make the content column sit on a genuinely clean reading surface (widen vignette).
2. Eliminate ASCII glyph bleed-through behind the footer (match header treatment).
3. Give the user a real color-personality choice with two modes: picking an accent color (with the existing light/dark toggle still available), or picking a whole theme (accent + background tint, each with light/dark variants).
4. Make the accent color actually *visible* across the UI — including the ASCII cursor ripple and scroll tint — so a chosen color feels like it belongs to the whole page.

## Non-Goals

- No changes to content, page structure, or blog/project data.
- No theming for code blocks / prose markdown beyond what current `@tailwindcss/typography` already does. (Could be a later pass.)
- No additional effects in the ASCII background (no phase-2 reveal, no new glyph set).

## 1) Widen the vignette

**Current:** `radial-gradient(ellipse 520px 420px at 50% 45%, ...)` — the solid core is much narrower than the `max-w-3xl` (768px) content column, so glyphs show up right behind body paragraphs.

**Target:** the vignette's opaque-to-semi-opaque region fully covers the width of the content column with comfortable margin; falloff extends past the column edges softly.

**Concrete change:** in `AsciiBackground.astro`'s `<style>`, change the vignette to:

```css
background: radial-gradient(
  ellipse 880px 680px at 50% 45%,
  var(--ascii-bg-color, #ffffff) 0%,
  var(--ascii-bg-color, #ffffff) 40%,
  transparent 95%
);
```

- `880px` horizontal radius comfortably exceeds the 768px column width.
- `680px` vertical gives more vertical calm around the top section.
- Bumping the first-stop plateau from `30%` to `40%` keeps the center solidly clean; extending `transparent` stop to `95%` keeps the fade soft rather than sharp at the edges.

## 2) Solid footer

**Current footer:** `border-t border-neutral-200 dark:border-neutral-800 mt-auto` — transparent background, ASCII shows through.

**Target:** match the header treatment (same tint, same blur, same border).

**Concrete change:** in `Footer.astro`, change the `<footer>` opening to:

```astro
<footer class="relative z-10 mt-auto border-t border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md">
```

`relative z-10` ensures the backdrop blur actually paints over the fixed-position canvas (which sits at `z-index: -1`). Without a stacking context the backdrop-filter has nothing to blur.

## 3) Theme / Accent picker

Replaces the existing `ThemeToggle` button. New component `ThemePicker.astro` lives in the same slot in `Header.astro` (both desktop and mobile placements).

### UI

- A single button in the top-right (same slot as current `ThemeToggle`) showing a small paint-drop or palette icon. Aria-labelled "Open theme picker."
- Clicking opens a popover anchored to the button, positioned below-right.
- Popover contents, top to bottom:
  1. **Mode switch** — a two-option segmented control: **Accent** | **Theme**.
  2. **Swatch row** — five circular color swatches (28×28px, `rounded-full`). The currently active one has a ring (`ring-2 ring-offset-2`).
  3. **In Accent mode only:** a light/dark toggle row at the bottom (sun/moon icons — same two SVGs from today's `ThemeToggle`).
  4. **In Theme mode:** no light/dark toggle. Each theme defines its own behavior under light vs dark (via CSS variables), and the OS preference is respected on first visit (same as today).
- Popover closes on: outside-click, `Escape`, clicking a swatch (swatch selection auto-applies), or clicking the toggle button again.

### Modes

**Accent mode.** The user picks one of five accent colors. Background stays in whatever light/dark mode the separate toggle is in. The accent is applied by setting a CSS variable `--accent` on `<html>` (and a computed `--accent-muted` for hover/muted surfaces).

**Theme mode.** The user picks one of five named themes. Each theme sets:
- `--accent` (same variable as accent mode — UI code has a single place to read from)
- `--accent-muted`
- `--theme-bg-tint-light` and `--theme-bg-tint-dark` (very subtle off-white or near-black; applied as a background wash on `<body>` beneath the existing `bg-white` / `bg-neutral-950`)

The five themes:

| Theme ID | Name | Accent | Light bg tint | Dark bg tint | Feel |
|---|---|---|---|---|---|
| `ember` | **Ember** (default) | Crimson `#C03A2E` | `#FBF8F5` (warm off-white) | `#0B0A0A` | Warm, editorial — new default |
| `driftwood` | **Driftwood** | Warm amber `#D97706` | `#FDFBF6` | `#0C0B09` | Old amber accent, renamed |
| `meridian` | **Meridian** | Deep indigo `#3949AB` | `#F7F8FB` | `#0A0B0E` | Cool, technical |
| `moss` | **Moss** | Forest green `#2F6B4E` | `#F7F9F6` | `#0A0C0A` | Natural, calm |
| `graphite` | **Graphite** | Slate blue `#475569` | `#FFFFFF` | `#000000` | Monochrome, stark |

### CSS variable strategy

On `<html>`:
- `--accent: #C03A2E;` (default = Ember crimson)
- `--accent-muted: rgba(192, 58, 46, 0.12);` (auto-derived in JS)
- `--theme-bg-light: #FBF8F5;`
- `--theme-bg-dark: #0B0A0A;`

`<body>` background becomes:
```html
<body class="bg-[color:var(--theme-bg-light)] dark:bg-[color:var(--theme-bg-dark)] ..." style="...">
```

…which falls back to current `#FFFFFF` / `#0A0A0A` (neutral-950) values if variables are unset. To avoid Tailwind arbitrary-value parsing issues with dynamic colors, set these via `style` on `<html>` at JS init OR use Tailwind's `bg-[var(--theme-bg-light)]` (allowed). Decision: use `bg-[var(--theme-bg-light)]` and `dark:bg-[var(--theme-bg-dark)]` on `<body>` in `Layout.astro`, replacing the existing `bg-white dark:bg-neutral-950`.

### Persistence

Four localStorage keys:
- `theme` — existing key, `'light' | 'dark'` (light/dark preference)
- `colorMode` — `'accent' | 'theme'` (which picker mode)
- `accent` — one of `'ember' | 'driftwood' | 'meridian' | 'moss' | 'graphite'` (which accent color; used in both modes — in theme mode this is the theme ID)
- `themeSelection` — for theme mode, which theme ID is active (same value set as `accent` — they share the ID list)

Simplification: collapse to three keys — `theme`, `colorMode`, `paletteId`. The `paletteId` is used for both accent mode (swatch → accent color only) and theme mode (swatch → full theme). They share the same 5 IDs, and whether background tint is applied depends on `colorMode`.

### Default on first visit

- `colorMode = 'theme'`
- `paletteId = 'ember'`
- `theme` = OS preference (existing behavior)

This means new visitors land on Ember (crimson) by default — your new look.

### Inline theme script

The existing inline script in `Layout.astro` applies `html.dark` before paint to prevent flash. Extend it to also apply `--accent`, `--accent-muted`, and background-tint variables pre-paint, to prevent color flash.

## 4) Accent surfaces

Where the accent color actually shows up once set:

1. **Section dot markers** (`index.astro`, "Currently" yellow squares): change `bg-amber-500 dark:bg-amber-400` to `bg-[color:var(--accent)]`.
2. **Active nav underline** (`Header.astro`): change `border-amber-500 dark:border-amber-400` to `border-[color:var(--accent)]`.
3. **Resume button** (`index.astro`, currently black/white): change to accent-colored background with white text, darker on hover. Use `bg-[color:var(--accent)] text-white hover:brightness-110`.
4. **Link hover underlines and focus rings:** add `focus-visible:ring-[color:var(--accent)]` to focusable elements. (Scope note: apply to the theme picker button, resume button, and nav links only — don't chase every anchor in blog prose.)
5. **ASCII cursor ripple:** in `AsciiBackground.astro`, when excited cells are painted (in `opacityFor` path), blend toward the accent color. Read `--accent` at tick time (cache it; refresh on `MutationObserver` class + a custom `theme-change` event). Excited glyph color = `rgba(accent.r, accent.g, accent.b, opacity)` at the peak of excitement, lerping from the neutral glyph color toward accent as excitement rises. Excited peak opacity bumps from `0.16 → 0.25` to make the accent actually read. Baseline ambient mutations stay neutral.
6. **Scroll-reactive tint:** same accent color blend, applied to the *global* ambient opacity during scroll boost (not just ripple). Extend the current scroll-brightness lift so that at `scrollBoost > 0`, ambient glyphs shift toward accent in proportion to boost.

### ASCII accent implementation notes

- Parse `--accent` → `{r, g, b}` once at init and again whenever a `theme-change` custom event fires. (The picker dispatches `document.dispatchEvent(new CustomEvent('theme-change'))` on every change.)
- `glyphColor(opacity, excitementLevel01, scrollBoost01)` becomes a helper that blends from the neutral (`0,0,0` or `255,255,255` depending on dark mode) toward accent. Excitement weight and scroll-boost weight combine; cap final blend weight at ~0.8 so the accent still feels like an accent rather than solid crimson.
- The `opacityFor` helper's output opacity scales as before (max `0.25` on peak excitement), but the color is now computed per-cell from excitement + scroll boost.

## Architecture summary

- **New file:** `src/components/ThemePicker.astro` — the picker UI + script (mode switch, swatches, persistence, event dispatch).
- **New file:** `src/lib/themes.ts` — palette definitions (5 palette IDs → accent hex, light tint, dark tint) and the shared `applyPalette(id, colorMode, lightDark)` function used by both the inline pre-paint script and the picker. Exported as `PALETTES` object and `applyPalette` function.
- **Delete:** `src/components/ThemeToggle.astro` — replaced by the picker.
- **Modify:**
  - `src/layouts/Layout.astro` — import/mount `ThemePicker` (via Header), update inline pre-paint script to use `applyPalette` logic, switch `<body>` bg classes to CSS-var-based, add global CSS for `--accent` / `--accent-muted` fallback.
  - `src/components/Header.astro` — swap `ThemeToggle` for `ThemePicker` in both desktop and mobile slots. Update active nav underline to `border-[color:var(--accent)]`.
  - `src/components/Footer.astro` — add solid blurred background (the "make footer solid" change).
  - `src/components/AsciiBackground.astro` — widen vignette, parse & blend accent color in paint path, listen for `theme-change` event.
  - `src/pages/index.astro` — change section dots to `bg-[color:var(--accent)]`, resume button to accent.

## Accessibility

- Theme picker button: keyboard accessible, aria-expanded, aria-controls, aria-haspopup.
- Popover: traps focus while open (simple approach: focus moves to first swatch on open; Escape closes and returns focus to button).
- Swatches: labeled with palette name via `aria-label` (e.g. "Select Ember accent color").
- All accent-colored text must still meet WCAG AA on its background. Ember crimson at `#C03A2E` against white has sufficient contrast; against dark backgrounds I'll verify per theme (the dark mode variants may need slight lightness bumps to maintain ratio — accepted as part of implementation).

## Testing strategy

Manual, same as ASCII background (visual effect + interactivity). Verify:
1. Vignette visibly covers full content column width with soft falloff.
2. Footer looks solid, no glyph bleed-through, matches header tint.
3. Theme picker opens/closes via button click, outside click, and Escape.
4. Accent mode + swatch click → accent color updates across all 6 surfaces (dots, nav underline, resume button, focus rings, ripple, scroll tint). Light/dark toggle still works.
5. Theme mode + swatch click → accent updates AND subtle background tint shifts. Light/dark row is hidden.
6. Reload → selection persists.
7. OS-level theme change on first visit → honored; on later visits the user's `theme` localStorage setting wins.
8. Contrast check on each theme in both light and dark mode.
9. Keyboard-only navigation of the picker works.
10. Mobile: picker is reachable and sized appropriately.

## Open questions / deferred

- Blog prose (typography plugin) using accent for inline links? Deferred — current prose keeps default styling.
- Custom palette input (user-defined accent hex)? Deferred — five presets is the scope.

## Files touched summary

- **New:** `src/components/ThemePicker.astro`, `src/lib/themes.ts`
- **Delete:** `src/components/ThemeToggle.astro`
- **Modify:** `src/layouts/Layout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/components/AsciiBackground.astro`, `src/pages/index.astro`
