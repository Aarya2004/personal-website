# Full Themes — Design Spec

**Date:** 2026-04-12
**Status:** Approved for implementation planning
**Scope:** Expand "theme mode" from accent-only changes to full reskins. Each theme gets its own background color, text color, surface (card/border/divider) colors, typography pairing, ASCII glyph base color, and cursor/click ripple flavor. Theme mode is a single canonical look per theme — no light/dark variants when a theme is active. Also includes an avatar image optimization task.

## Goals

1. Make theme mode feel like a genuine change of voice: picking Moss should read as a different publication than Meridian, not a re-tinted copy.
2. Preserve all interactivity mechanics across themes — cursor ripple, click ripple, scroll reactivity all behave identically; only flavor (color/glow/glyph tint) differs.
3. Keep accent mode unchanged — accent mode stays as it is today, with the separate light/dark toggle intact.
4. No runtime size regression of note (fonts load from Google CDN with `display=swap`, lazy-fetched per face as used).
5. Shrink the 1 MB headshot.jpg to something sane.

## Non-Goals

- No layout, border-radius, or divider-style changes between themes (those are phase C).
- No user-defined custom themes.
- No theme-specific animation timing differences — only colors and glow.
- No blog prose (typography plugin) per-theme tweaks beyond font pairing.

## The five themes

| Theme ID | Name | Background | Text | Accent | Display font | Body font | Mono font |
|---|---|---|---|---|---|---|---|
| `ember` (default) | **Ember** | `#F7EFE6` warm paper | `#2A1A16` warm near-black | `#B8342A` crimson | Instrument Serif (current) | DM Sans (current) | JetBrains Mono (current) |
| `driftwood` | **Driftwood** | `#F4EDDF` cream | `#2B2418` warm charcoal | `#A0651F` deep amber | Fraunces | Lora | JetBrains Mono |
| `meridian` | **Meridian** | `#F2F5FA` cool blue-white | `#0F1629` deep indigo-black | `#2E3FA0` indigo | Unbounded | Inter | IBM Plex Mono |
| `moss` | **Moss** | `#EEF0E7` green-tinged cream | `#13211A` ink green-black | `#2F6B4E` forest | EB Garamond | EB Garamond | JetBrains Mono |
| `graphite` | **Graphite** | `#2A2C30` warm charcoal | `#DADCE0` off-white | `#8BA3C7` slate | IBM Plex Mono | IBM Plex Sans | IBM Plex Mono |

Ember's palette numbers match the "Warm Paper" direction chosen during brainstorming. Graphite is intentionally warm mid-grey, not near-black — softer than a pure dark theme but still clearly dark.

## Interaction between modes

- **Accent mode:** unchanged. User picks one of the 5 palette IDs (reusing the palette names as accent IDs). Only `--accent` / `--accent-muted` / `--accent-rgb` change. Background stays whatever the separate light/dark toggle is set to. Text color stays neutral-900 / neutral-100.
- **Theme mode:** applies the full theme. Background, text, surface variables, font variables, glyph base variable, and accent variable all swap. The separate light/dark toggle is hidden (dead-coded: the theme is a complete statement).

## CSS variables (expanded)

On `<html>`, theme mode writes:

- `--accent` — accent hex (same as accent mode)
- `--accent-muted` — accent at 12% alpha (same)
- `--accent-rgb` — "R G B" form (same)
- `--theme-bg` — background color
- `--theme-text` — body text color
- `--theme-text-muted` — text at ~65% toward bg (for subdued metadata)
- `--theme-border` — card/divider border color (derived: ~15% toward text from bg)
- `--theme-surface` — card-surface tint, for hover/subtle-background (derived: ~4% toward text from bg)
- `--font-display` — font-family string for display headings
- `--font-body` — font-family string for body
- `--font-mono` — font-family string for mono
- `--ascii-base-rgb` — "R G B" for the ambient ASCII glyph color base (replaces the current hard-coded black/white)

In accent mode, the non-accent variables are unset and fall back to Tailwind defaults (current behavior).

### Derived values

Rather than writing every derived value into the palette data, JS computes:

- `--accent-muted` from accent at 12% alpha (already working)
- `--theme-text-muted` = mix 65% text + 35% bg
- `--theme-border` = mix 85% bg + 15% text
- `--theme-surface` = mix 96% bg + 4% text

Keeps palette definitions simple; all tones stay consistent.

### Theme-specific ASCII & ripple tuning

Per theme, a `rippleProfile` object defines:

- `asciiBaseRgb: [r, g, b]` — ambient glyph color base (replaces hard-coded black/white in `cellStyle`)
- `rippleGlowMultiplier: number` — multiplies the current shadowBlur (Meridian = 0.5 crisp, Moss = 1.4 soft, Graphite = 1.8 luminous, Ember/Driftwood = 1.0 baseline)
- `rippleLightenAmount: number` — how much the accent is lightened toward white for dark backgrounds, or deepened toward bg for light backgrounds. Defaults to 0.4 on dark bg, 0.25 on light bg; theme can override.

Per-theme profiles:

| Theme | asciiBaseRgb | rippleGlowMultiplier | Notes |
|---|---|---|---|
| `ember` | `[20, 15, 12]` | 1.0 | Neutral-warm base, crimson glow |
| `driftwood` | `[60, 40, 20]` | 1.0 | Faint sepia base, amber glow |
| `meridian` | `[30, 40, 70]` | 0.5 | Cool blue-grey base, crisp indigo ripple |
| `moss` | `[30, 50, 35]` | 1.4 | Green-grey base, soft green bloom |
| `graphite` | `[200, 210, 225]` | 1.8 | Cool off-white base on dark bg, luminous slate ripple |

For Graphite specifically: because bg is dark, the ambient glyphs must be LIGHT (toward off-white), not dark. The `asciiBaseRgb` handles that — it replaces the dark-mode branch of the current black/white toggle. The existing `isDark()` check in `cellStyle` is replaced with reading `--ascii-base-rgb`.

## Typography loading

All theme fonts load up-front via Google Fonts `<link>` in `Layout.astro`. Google Fonts serves them with `font-display=swap` and splits by subset, so the actual `.woff2` files are only downloaded as each face is used.

Fonts to load (merge with current):

- Instrument Serif (current, Ember display)
- DM Sans (current, Ember body)
- JetBrains Mono (current, mono for Ember/Driftwood/Moss)
- Fraunces 9..144 weight range (Driftwood display)
- Lora regular + italic (Driftwood body)
- Inter 400/500/600 (Meridian body)
- IBM Plex Sans 400/500/600 (Graphite body)
- IBM Plex Mono 400/500 (Meridian mono, Graphite display + mono)
- Unbounded 400/600 (Meridian display)
- EB Garamond regular + italic (Moss display + body)

Approximate overhead: ~3–5 KB additional CSS on initial load. Font binaries remain lazy-loaded per-face by the browser.

## Picker UI changes

In theme mode, the five circle swatches are replaced with **five named rows**. Each row shows a small color chip (accent) alongside the theme name. The currently active row has a subtle background highlight.

Accent mode keeps the existing circle swatches unchanged.

Mobile layout: rows stack naturally; popover may grow slightly taller in theme mode (max 60px per row, 300px total). Still fits a mobile viewport.

## Font application

`<body>` class keeps `font-sans` as a fallback. Theme-mode overrides use CSS variables:

- In theme mode, `<body>` gets an inline style setting `font-family: var(--font-body);`
- Headings (`h1`–`h3`) and elements marked `.font-serif` in existing code shift to `font-family: var(--font-display, theme('fontFamily.serif'));`
- Anything marked `.font-mono` shifts to `font-family: var(--font-mono, theme('fontFamily.mono'));`

To avoid a large Tailwind refactor: inject a small global CSS block in `Layout.astro` that defines these rules gated on `html[data-theme-active="true"]`. The theme picker sets `data-theme-active` on `<html>` when in theme mode.

## Inline pre-paint script updates

The inline script in `Layout.astro` that runs before paint to prevent FOUC must now:

1. Read `colorMode` + `paletteId` from localStorage (as today).
2. If theme mode: apply full palette (bg, text, fonts, ASCII base, ripple profile) via CSS variables on `<html>`, and set `data-theme-active="true"` on `<html>`.
3. If accent mode: apply accent-only vars (current behavior), ensure `data-theme-active` is removed.

The palette data duplicated in the inline script expands to include all variables. Same dup-reminder-comment pattern as today.

## ASCII background changes

The existing `cellStyle` in `AsciiBackground.astro` uses a hard-coded `isDark ? [255,255,255] : [0,0,0]` for the base glyph color. Replace that with a `readAsciiBase()` helper that parses `--ascii-base-rgb` from `<html>`, with a sensible fallback if unset.

Replace the `isDark()` branching inside `cellStyle` for the ripple `target` color with a `readRippleTarget()` helper: when the ASCII base is light (graphite), target lightens further toward white; when the base is dark, target deepens the accent toward bg. The decision logic uses the luminance of `asciiBase`, not `document.documentElement.classList.contains('dark')`.

Read `rippleGlowMultiplier` from a new CSS var `--ripple-glow-mult` (default `1.0`) and multiply the computed `shadowBlur` by it.

All re-reads happen on `theme-change` events (existing plumbing).

## Avatar optimization

Separate concern bundled into this work:

- Current `/public/headshot.jpg` = 1.0 MB.
- Target: resize to 512×512 max, compress to WebP at quality ~80 and JPEG at quality ~80 as fallback.
- Expected size: WebP ~30–50 KB, JPEG fallback ~60–80 KB.
- Update `<img>` usage in `src/pages/index.astro` to use `<picture>` with WebP + JPEG fallback sources.

## Architecture summary

- **Extend:** `src/lib/themes.ts` — add font/fg/bg/ripple fields to each palette, add helpers for deriving `text-muted`/`border`/`surface`, extend `applyPalette` to also set those vars and toggle `data-theme-active`.
- **Extend:** `src/layouts/Layout.astro` — expand inline pre-paint script with full theme data, add Google Fonts `<link>` for all theme fonts, add global CSS block for `data-theme-active` font overrides.
- **Extend:** `src/components/ThemePicker.astro` — render named rows in theme mode vs circles in accent mode.
- **Extend:** `src/components/AsciiBackground.astro` — switch to `readAsciiBase()` and `readRippleTarget()`, multiply shadowBlur by `--ripple-glow-mult`.
- **New:** `/public/headshot.webp`, optimized `/public/headshot.jpg`.
- **Modify:** `src/pages/index.astro` — use `<picture>` for avatar.

## Accessibility

- All theme accent/text/bg combos must meet WCAG AA. Graphite text (`#DADCE0`) on bg (`#2A2C30`) = 11.1:1 ✓. Moss text (`#13211A`) on bg (`#EEF0E7`) = 14.3:1 ✓. Ember, Driftwood, Meridian all pass body-text contrast. Accent-on-bg for the resume button (white text on accent) — crimson `#B8342A` vs white = 5.3:1 ✓ AA, Driftwood deep amber `#A0651F` vs white = 4.6:1 ✓ AA, Meridian indigo `#2E3FA0` vs white = 8.9:1 ✓ AA, Moss forest `#2F6B4E` vs white = 5.2:1 ✓ AA. Graphite's resume button uses dark theme bg as button text on its slate accent (verified at implementation time).
- `data-theme-active` is purely presentational; does not affect screen reader output.
- Picker rows in theme mode use proper `role="radiogroup"` with `aria-checked` on each row.

## Testing strategy

Manual, same as prior work. Verify per theme:

1. Background, text, accent all visibly distinct.
2. Fonts load and render (use devtools Network tab to confirm `.woff2` fetches for the active theme's faces).
3. ASCII ambient glyph base tint is visible (zoom in on an empty area).
4. Cursor ripple color matches theme.
5. Click ripple color matches theme.
6. Scroll tint matches theme.
7. Resume button contrast on all themes (confirm Driftwood uses dark text on amber).
8. Picker UI: rows in theme mode, circles in accent mode; swapping modes renders correctly.
9. Reload persistence.
10. `prefers-reduced-motion` still disables ASCII animation.
11. Mobile: picker popover doesn't overflow; theme rows tappable.
12. Avatar: new `<picture>` loads WebP in supported browsers; JPEG fallback in older. `<img>` dimensions match original visual size.

## Files changed summary

- **Modify:** `src/lib/themes.ts`
- **Modify:** `src/layouts/Layout.astro`
- **Modify:** `src/components/ThemePicker.astro`
- **Modify:** `src/components/AsciiBackground.astro`
- **Modify:** `src/pages/index.astro` (avatar `<picture>`)
- **Add:** `/public/headshot.webp` (new optimized)
- **Replace:** `/public/headshot.jpg` (resized + compressed)

## Rollout

One PR. No flags. Reversible by reverting the commits.
