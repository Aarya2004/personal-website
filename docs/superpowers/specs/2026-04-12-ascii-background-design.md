# Ambient ASCII Background — Design Spec

**Date:** 2026-04-12
**Status:** Approved for implementation planning
**Scope:** Add a Codex-style ambient ASCII character field as a site-wide background, with cursor-ripple and scroll-reactive interactivity. Editorial aesthetic: reads as paper texture, not as animated text.

## Goals

1. Give the site a distinctive, memorable atmosphere without fighting the editorial content tone (Instrument Serif display, DM Sans body, narrow `max-w-3xl` column, amber accent on neutral grays).
2. Interactive enough to feel alive, restrained enough to never pull attention from content.
3. Zero new runtime dependencies. No bundle-size regression of note.
4. Respect `prefers-reduced-motion`, work in light and dark mode, behave on mobile.

## Non-Goals

- No integration with `chenglou/pretext`. It's a text-measurement library, not a visual-effects library — wrong tool for this.
- No WebGL / shaders. Canvas 2D is sufficient.
- No per-headline reveal effect ("Option D") in this spec. Deferred to a potential phase 2.
- No scramble-on-load headline effect.

## Aesthetic Direction

An almost-still field of monospace glyphs that reads as **faded letterpress register marks on newsprint**. Glyph palette is weighted heavily toward punctuation (`·`, `.`, `:`, `,`, `'`, `` ` ``, `-`, `—`, `+`, `/`, `\`, `|`, `(`, `)`, `[`, `]`, `{`, `}`, `<`, `>`) with a light sprinkling of lowercase letters (`a`, `e`, `i`, `o`, `r`, `s`, `t`, `n`). From distance: paper texture. On inspection: characters.

Two simultaneous tempos:

- **Slow ambient mutation:** ~1.5% of cells mutate per 50ms tick — sparse, quiet, not "matrix rain."
- **Radial vignette:** a soft hole is punched through the field centered on the viewport, roughly matching the content column width, so the middle of the page is near-clean and density ramps up toward the edges. This is the single biggest lever making the effect feel editorial vs. gimmicky.

## Interactivity

### A) Cursor ripple

Cells within a radius of the cursor become "excited": they mutate on every tick instead of rarely, and render at higher opacity. Excitement decays linearly over ~600ms once the cursor moves past. Effect: the page feels like it notices you, without being a toy.

- Only attached when `matchMedia('(hover: hover)').matches` — no mousemove listener on touch devices.
- Mousemove coalesced to rAF (one update per frame max).
- Suppressed entirely under `prefers-reduced-motion: reduce`.

### C) Scroll-reactive density

Scroll velocity (smoothed px/frame) modulates a global `mutationRate` multiplier (1× at rest → ~4× at fast scroll) and gives a small global brightness lift. Decays back to baseline within ~400ms of scroll stopping.

- Scroll listener rAF-throttled.
- Works on mobile (no cursor needed).
- Suppressed under `prefers-reduced-motion: reduce`.

## Architecture

**Single new component:** `src/components/AsciiBackground.astro`. Self-contained — markup, styles, and client script in one file.

**Single edit:** `src/layouts/Layout.astro` — mount `<AsciiBackground />` as the first child of `<body>`, ensure content stacks above it.

**Render target:** one `<canvas>` element, `position: fixed`, full viewport, `z-index: -1`, `pointer-events: none`. Canvas (not DOM spans) because ~9,000 cells × per-tick mutation in DOM would be unacceptable on scroll/resize.

### Grid

- Cell dimensions derived from measured glyph metrics of `JetBrains Mono` at 12px (approx 7.2 × 14px logical; exact values come from `measureText` + font size at init).
- Grid dimensions = `ceil(innerWidth / cellW) × ceil(innerHeight / cellH)`.
- Typical desktop (1440×900): ~200 × 64 ≈ 12,800 cells.

### State

- `Uint8Array` of glyph indices, length = cellCount.
- `Uint8Array` of excitement levels (0–255), length = cellCount. 0 = ambient. Non-zero decays each tick.
- Global `scrollBoost` float (0–1), decays each tick.
- Grand total memory: ~25KB even at large viewports.

### Render loop

- `requestAnimationFrame` loop, but actual work gated by an accumulator: run a tick only when ≥ `TICK_MS` (50ms) has elapsed since the last tick. Most frames do nothing.
- Per tick:
  1. Decay all non-zero excitement values.
  2. Decay `scrollBoost`.
  3. Select `floor(mutationRate * cellCount * (1 + scrollBoost * 3))` random cells, assign new glyph indices, mark their rects dirty.
  4. Also mark all excited cells dirty (they re-roll every tick regardless).
  5. For each dirty cell: clear its rect, draw its glyph at opacity = baseOpacity + excitement contribution + scrollBoost contribution.
- Vignette is NOT redrawn per tick. It lives on a second offscreen canvas composited once, or is implemented as a sibling CSS element with a radial-gradient mask that sits over the canvas. **Decision: CSS radial-gradient sibling** — simpler, no per-frame composite cost, and it automatically tracks viewport resize.

### Interactivity implementation

- **mousemove** (window, passive): store last cursor {x, y}. On each tick, compute cursor cell, set excitement of cells within `RIPPLE_RADIUS` cells to 255 (with falloff by distance). No work done between ticks.
- **scroll** (window, passive): sample `scrollY` on each frame, compute smoothed velocity, map to `scrollBoost` target, lerp toward it each tick.

### Theme integration

- Read `document.documentElement.classList.contains('dark')` at init and when `astro:after-swap` fires (existing hook in `Layout.astro`). Also observe the `<html>` element with a `MutationObserver` on the `class` attribute to catch the `ThemeToggle` flip without a page swap.
- Two palettes:
  - **Light:** `rgba(0,0,0, 0.08)` base, up to `0.18` excited.
  - **Dark:** `rgba(255,255,255, 0.06)` base, up to `0.14` excited.
- Theme change: repaint full grid once on flip; state is preserved.

### Performance guardrails

- Canvas sized with `devicePixelRatio` for sharpness; context scaled accordingly.
- `resize`: debounced 150ms, then recompute cell grid and repaint.
- `visibilitychange`: pause rAF when tab hidden, resume on return (repaint full grid on resume to clear stale state).
- `prefers-reduced-motion: reduce`: paint one static frame, skip rAF entirely, skip mousemove/scroll listeners.

### Tunable constants (top of file)

```ts
const GLYPHS = "····..::,,'`--—+/\\|()[]{}<>aeiorstn";
const FONT_SIZE = 12;
const FONT_FAMILY = "'JetBrains Mono', ui-monospace, monospace";
const BASE_OPACITY_LIGHT = 0.08;
const BASE_OPACITY_DARK = 0.06;
const EXCITED_OPACITY_BONUS = 0.10;
const MUTATION_RATE = 0.015;
const TICK_MS = 50;
const RIPPLE_RADIUS_CELLS = 6;
const RIPPLE_DECAY_MS = 600;
const SCROLL_BOOST_DECAY_MS = 400;
const SCROLL_BOOST_MAX_MULTIPLIER = 4;
const VIGNETTE_RADIUS_PX = 520;  // soft hole at viewport center
```

All knobs live at the top of the component for fast taste-testing. No magic numbers buried in the loop.

## Layout changes

In `src/layouts/Layout.astro`:

1. Add `import AsciiBackground from '../components/AsciiBackground.astro';`.
2. Insert `<AsciiBackground />` as the first child of `<body>`.
3. Ensure `<main>` and `<Header>` / `<Footer>` stack above the background. The existing `body` background (`bg-white dark:bg-neutral-950`) stays — the canvas sits above the body background but below content via `z-index: -1` relative to `body` with `position: relative`, or the canvas uses `z-index: 0` and content uses `z-index: 1`. **Decision: canvas `z-index: -1; position: fixed`, body stays `position: relative`, no changes to header/main/footer stacking.**

No other files change.

## Accessibility

- Background is decorative. `aria-hidden="true"` on the canvas and vignette element.
- `prefers-reduced-motion: reduce` → static single-frame render.
- Effect never affects contrast of foreground text (content column sits inside the vignette hole; opacity caps are well below what would interfere with body text contrast ratios).
- No content is conveyed by the glyphs — screen readers ignore it entirely.

## Testing strategy

This is a visual/interactive effect, not easily unit-testable. Verification is manual:

1. **Visual check (golden path):** `bun dev`, confirm effect renders on `/`, `/blog`, `/projects`, and a blog post page. Confirm vignette centers the content column and density ramps at edges.
2. **Light/dark toggle:** flip theme via `ThemeToggle`, confirm palette updates without a full reload.
3. **Cursor ripple:** move mouse around, confirm excitement visibly follows and decays.
4. **Scroll reactivity:** scroll fast, confirm field livens; stop, confirm it calms within ~400ms.
5. **Reduced motion:** toggle `prefers-reduced-motion` in devtools, reload, confirm static render and no listeners firing.
6. **Mobile (responsive mode + touch emulation):** confirm no mousemove listener attached, scroll reactivity still works, no perf issues.
7. **Perf:** DevTools performance tab, 10s capture while scrolling — confirm main thread well under budget, no dropped frames on a mid-tier laptop.
8. **Tab visibility:** switch tabs, confirm rAF pauses (no CPU in background tab).
9. **Resize:** drag window, confirm debounced reflow without flicker storms.
10. **Astro view transitions:** navigate between pages, confirm background persists smoothly (it's mounted in Layout, so it should — verify).

## Open questions / deferred

- **Phase 2 candidate (D):** hover-reveal of a single word behind the hero `<h1>` (your name). Explicitly deferred. Will be re-evaluated after A+C ships and the ambient baseline feels right.
- Glyph palette may be tuned after visual check — current set is a starting point, not final.

## Files changed summary

- **New:** `src/components/AsciiBackground.astro`
- **Edit:** `src/layouts/Layout.astro` (mount the component, one import + one element)

## Rollout

Single PR. No feature flag — effect is purely decorative and can be reverted with a one-line removal from `Layout.astro`.
