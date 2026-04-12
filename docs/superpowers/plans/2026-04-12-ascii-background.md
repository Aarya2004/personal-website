# Ambient ASCII Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a site-wide, editorial-styled ambient ASCII character field as a background layer with cursor-ripple and scroll-reactive interactivity.

**Architecture:** Single self-contained Astro component (`AsciiBackground.astro`) rendering one fixed-position `<canvas>` behind all content, driven by a `requestAnimationFrame` tick loop with tick-gating for cheap idle frames. A sibling `<div>` with a CSS radial-gradient provides the editorial vignette. The component is mounted once in `Layout.astro`.

**Tech Stack:** Astro 4, TypeScript, Canvas 2D API, Tailwind (only for the layout edit), JetBrains Mono font (already loaded by `Layout.astro`).

**Verification:** This is a purely visual/interactive effect — automated tests aren't a good fit. Verification is manual via `bun dev` following the Testing Checklist at the end of the plan. Each task nonetheless produces a working, committable state; run `bun dev` after implementation tasks to sanity-check visually before committing.

---

## File Structure

- **Create:** `src/components/AsciiBackground.astro` — entire effect: markup (`<canvas>` + vignette `<div>`), scoped styles, and client-side script with the tick loop, interactivity, and theme handling. Single file keeps the unit cohesive and drop-in-removable.
- **Modify:** `src/layouts/Layout.astro` — add one import and one element. No other changes to stacking context, no changes to `<Header>`, `<main>`, or `<Footer>`.

---

## Task 1: Scaffold `AsciiBackground.astro` with a static, theme-aware grid

**Goal of this task:** Get a full-viewport canvas on the page that paints a single static grid of glyphs in the correct palette for light and dark mode. No animation, no interactivity, no vignette yet. This verifies canvas setup, glyph rendering, DPR handling, and theme integration in isolation.

**Files:**
- Create: `src/components/AsciiBackground.astro`
- Modify: `src/layouts/Layout.astro` (mount the component)

- [ ] **Step 1: Create the component scaffold**

Create `src/components/AsciiBackground.astro` with the following content:

```astro
---
// AsciiBackground.astro
// Ambient editorial ASCII field rendered to a single fixed-position canvas.
// Decorative only — aria-hidden, pointer-events: none, z-index: -1.
---

<canvas id="ascii-bg" aria-hidden="true"></canvas>
<div id="ascii-vignette" aria-hidden="true"></div>

<style>
  #ascii-bg {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    pointer-events: none;
    display: block;
  }
  #ascii-vignette {
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: radial-gradient(
      ellipse 520px 420px at 50% 45%,
      var(--ascii-bg-color, #ffffff) 0%,
      var(--ascii-bg-color, #ffffff) 30%,
      transparent 90%
    );
  }
  :global(html.dark) #ascii-vignette {
    --ascii-bg-color: #0a0a0a; /* neutral-950 */
  }
  :global(html:not(.dark)) #ascii-vignette {
    --ascii-bg-color: #ffffff;
  }
</style>

<script>
  // --- Tunable constants ------------------------------------------------
  const GLYPHS = "····..::,,'`--—+/\\|()[]{}<>aeiorstn";
  const FONT_SIZE = 12;
  const FONT_FAMILY = "'JetBrains Mono', ui-monospace, monospace";
  const BASE_OPACITY_LIGHT = 0.08;
  const BASE_OPACITY_DARK = 0.06;

  // --- State ------------------------------------------------------------
  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let cellW = 0;
  let cellH = 0;
  let cols = 0;
  let rows = 0;
  let glyphs: Uint8Array = new Uint8Array(0);
  let dpr = 1;

  function isDark(): boolean {
    return document.documentElement.classList.contains('dark');
  }

  function baseOpacity(): number {
    return isDark() ? BASE_OPACITY_DARK : BASE_OPACITY_LIGHT;
  }

  function glyphColor(opacity: number): string {
    return isDark()
      ? `rgba(255,255,255,${opacity})`
      : `rgba(0,0,0,${opacity})`;
  }

  function measureCell(): { w: number; h: number } {
    if (!ctx) return { w: 0, h: 0 };
    ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
    const metrics = ctx.measureText('M');
    const w = metrics.width;
    const h = FONT_SIZE * 1.2;
    return { w, h };
  }

  function resize(): void {
    if (!canvas || !ctx) return;
    dpr = window.devicePixelRatio || 1;
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cell = measureCell();
    cellW = cell.w;
    cellH = cell.h;
    cols = Math.ceil(cssW / cellW);
    rows = Math.ceil(cssH / cellH);
    glyphs = new Uint8Array(cols * rows);
    for (let i = 0; i < glyphs.length; i++) {
      glyphs[i] = Math.floor(Math.random() * GLYPHS.length);
    }
    paintAll();
  }

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

  function init(): void {
    canvas = document.getElementById('ascii-bg') as HTMLCanvasElement | null;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    if (!ctx) return;
    resize();

    // Repaint on theme flip (ThemeToggle mutates html.class)
    const observer = new MutationObserver(() => paintAll());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Repaint on view transition
    document.addEventListener('astro:after-swap', () => {
      init();
    });

    // Resize handler (debounced)
    let resizeTimer: number | undefined;
    window.addEventListener('resize', () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(resize, 150);
    });
  }

  init();
</script>
```

- [ ] **Step 2: Mount the component in `Layout.astro`**

Edit `src/layouts/Layout.astro`. Add the import alongside the existing `Header`/`Footer` imports, and insert `<AsciiBackground />` as the **first child of `<body>`**.

Add after line 4 (`import Footer from '../components/Footer.astro';`):
```astro
import AsciiBackground from '../components/AsciiBackground.astro';
```

Change the `<body>` opening block. The existing line is:
```astro
<body class="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-300">
    <Header activeNav={activeNav} />
```

Change to:
```astro
<body class="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-300">
    <AsciiBackground />
    <Header activeNav={activeNav} />
```

- [ ] **Step 3: Visually verify in the browser**

Run: `bun dev`
Open: `http://localhost:4321/`

Expected:
- A static, faint grid of glyphs is visible across the whole viewport.
- There is a soft lighter region near the top-middle where the vignette punches through (content column area should read cleanly).
- Toggle theme via the existing `ThemeToggle` — glyphs repaint in the opposite palette (subtle white on dark, subtle black on light). The vignette color flips to match.
- Navigate to `/blog`, `/projects` — the background is present on every page. View transitions don't break it.
- Resize the window — after ~150ms, the grid reflows to fit the new dimensions with no lingering visual glitches.
- No console errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AsciiBackground.astro src/layouts/Layout.astro
git commit -m "Add static ambient ASCII background with vignette and theme support"
```

---

## Task 2: Add the ambient tick loop (sparse mutation)

**Goal of this task:** Bring the grid to life with quiet, slow mutations — ~1.5% of cells change glyph every 50ms. Still no cursor or scroll interactivity. Verifies the tick-gated rAF loop, dirty-cell redraw path, and `prefers-reduced-motion` handling.

**Files:**
- Modify: `src/components/AsciiBackground.astro` (script block only)

- [ ] **Step 1: Add tick loop constants and state**

In `src/components/AsciiBackground.astro`, in the `<script>` block, add these constants alongside the existing `BASE_OPACITY_*` constants (after the opacity constants, before `// --- State`):

```ts
  const MUTATION_RATE = 0.015;
  const TICK_MS = 50;
```

Add these state variables alongside the existing `let` declarations (after `let dpr = 1;`):

```ts
  let rafHandle = 0;
  let lastTickTime = 0;
  let reduceMotion = false;
  let paused = false;
```

- [ ] **Step 2: Replace the hard-coded `paintAll()` call in `resize()` and add a dirty-cell helper**

Still in `AsciiBackground.astro`'s script, add this helper function after `paintAll()`:

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

- [ ] **Step 3: Add the tick function and rAF loop**

Add these functions after `paintCell`:

```ts
  function tick(now: number): void {
    if (paused) return;
    if (!ctx) return;
    if (now - lastTickTime >= TICK_MS) {
      lastTickTime = now;
      const mutations = Math.floor(glyphs.length * MUTATION_RATE);
      const opacity = baseOpacity();
      for (let i = 0; i < mutations; i++) {
        const idx = Math.floor(Math.random() * glyphs.length);
        glyphs[idx] = Math.floor(Math.random() * GLYPHS.length);
        paintCell(idx, opacity);
      }
    }
    rafHandle = requestAnimationFrame(tick);
  }

  function startLoop(): void {
    if (reduceMotion) return;
    if (rafHandle) cancelAnimationFrame(rafHandle);
    lastTickTime = 0;
    rafHandle = requestAnimationFrame(tick);
  }

  function stopLoop(): void {
    if (rafHandle) cancelAnimationFrame(rafHandle);
    rafHandle = 0;
  }
```

- [ ] **Step 4: Wire reduced-motion and visibility handling into `init()`**

Replace the existing `init()` function body with:

```ts
  function init(): void {
    canvas = document.getElementById('ascii-bg') as HTMLCanvasElement | null;
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    if (!ctx) return;

    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    resize();

    const observer = new MutationObserver(() => paintAll());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    document.addEventListener('astro:after-swap', () => {
      stopLoop();
      init();
    });

    let resizeTimer: number | undefined;
    window.addEventListener('resize', () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
      }, 150);
    });

    document.addEventListener('visibilitychange', () => {
      paused = document.hidden;
      if (!paused && !reduceMotion) {
        paintAll();
        startLoop();
      }
    });

    startLoop();
  }
```

- [ ] **Step 5: Visually verify**

Run: `bun dev`
Open: `http://localhost:4321/`

Expected:
- Glyphs subtly shift over time — not a storm, not static. A handful change each ~50ms.
- Switch tab away for 10s, switch back — animation resumes, no visible stutter.
- Open devtools → Rendering → enable "Emulate CSS media feature prefers-reduced-motion: reduce", reload — the grid is static. No CPU usage in the Performance tab while idle.
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/AsciiBackground.astro
git commit -m "Add ambient tick loop with reduced-motion and visibility handling"
```

---

## Task 3: Add cursor ripple interactivity (A)

**Goal of this task:** Cells near the cursor become brighter and re-roll on every tick; excitement decays ~600ms after the cursor moves away. Skip on touch devices and under reduced motion.

**Files:**
- Modify: `src/components/AsciiBackground.astro` (script block only)

- [ ] **Step 1: Add ripple constants**

In `AsciiBackground.astro`'s script, add alongside the other constants (after `TICK_MS`):

```ts
  const RIPPLE_RADIUS_CELLS = 6;
  const RIPPLE_DECAY_PER_TICK = 255 / (600 / TICK_MS); // full decay in ~600ms
  const EXCITED_OPACITY_BONUS = 0.10;
```

Add state alongside the others (after `let paused = false;`):

```ts
  let excitement: Uint8Array = new Uint8Array(0);
  let cursorX = -1;
  let cursorY = -1;
  let cursorDirty = false;
  let hasHover = false;
```

- [ ] **Step 2: Resize excitement array alongside glyphs**

In the `resize()` function, find the line:
```ts
    glyphs = new Uint8Array(cols * rows);
```
Add right after it:
```ts
    excitement = new Uint8Array(cols * rows);
```

- [ ] **Step 3: Update `tick()` to apply ripple and decay**

Replace the existing `tick()` function with:

```ts
  function tick(now: number): void {
    if (paused) return;
    if (!ctx) return;
    if (now - lastTickTime >= TICK_MS) {
      lastTickTime = now;
      const opacity = baseOpacity();

      // Apply cursor excitement to cells under/near cursor.
      if (cursorDirty && cursorX >= 0 && cursorY >= 0) {
        const cc = Math.floor(cursorX / cellW);
        const cr = Math.floor(cursorY / cellH);
        const r2 = RIPPLE_RADIUS_CELLS * RIPPLE_RADIUS_CELLS;
        for (let dr = -RIPPLE_RADIUS_CELLS; dr <= RIPPLE_RADIUS_CELLS; dr++) {
          for (let dc = -RIPPLE_RADIUS_CELLS; dc <= RIPPLE_RADIUS_CELLS; dc++) {
            const d2 = dr * dr + dc * dc;
            if (d2 > r2) continue;
            const rr = cr + dr;
            const cc2 = cc + dc;
            if (rr < 0 || rr >= rows || cc2 < 0 || cc2 >= cols) continue;
            const falloff = 1 - Math.sqrt(d2) / RIPPLE_RADIUS_CELLS;
            const level = Math.min(255, Math.floor(255 * falloff));
            const idx = rr * cols + cc2;
            if (level > excitement[idx]) excitement[idx] = level;
          }
        }
        cursorDirty = false;
      }

      // Ambient random mutations.
      const mutations = Math.floor(glyphs.length * MUTATION_RATE);
      for (let i = 0; i < mutations; i++) {
        const idx = Math.floor(Math.random() * glyphs.length);
        glyphs[idx] = Math.floor(Math.random() * GLYPHS.length);
        paintCell(idx, opacityFor(idx, opacity));
      }

      // Excited cells re-roll every tick and decay.
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
    }
    rafHandle = requestAnimationFrame(tick);
  }
```

- [ ] **Step 4: Add `opacityFor()` helper**

Add this helper function right before `paintCell`:

```ts
  function opacityFor(index: number, base: number): number {
    const e = excitement[index];
    if (e === 0) return base;
    return base + (e / 255) * EXCITED_OPACITY_BONUS;
  }
```

- [ ] **Step 5: Attach mousemove listener (hover-capable devices only, not reduced motion)**

In `init()`, add after the `reduceMotion = ...` line:

```ts
    hasHover = window.matchMedia('(hover: hover)').matches;
```

Then, before the final `startLoop();` call in `init()`, add:

```ts
    if (hasHover && !reduceMotion) {
      window.addEventListener(
        'mousemove',
        (e) => {
          cursorX = e.clientX;
          cursorY = e.clientY;
          cursorDirty = true;
        },
        { passive: true }
      );
    }
```

- [ ] **Step 6: Visually verify**

Run: `bun dev`
Open: `http://localhost:4321/`

Expected:
- Move the mouse across the page — a soft brightening follows the cursor with a slight trail, fading ~600ms behind.
- Hold mouse still — the bright spot smoothly fades to ambient.
- Move fast — the trail feels continuous, no gaps or jumps.
- In devtools → Rendering → "Emulate touch" — no brightening on mouse move (listener should not attach).
- Reduced motion still static.
- No console errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/AsciiBackground.astro
git commit -m "Add cursor ripple interactivity for ASCII background"
```

---

## Task 4: Add scroll-reactive density (C)

**Goal of this task:** Scrolling increases the mutation rate and global brightness briefly; decays back to ambient within ~400ms of scroll stopping. Works on mobile too (not hover-gated). Skipped under reduced motion.

**Files:**
- Modify: `src/components/AsciiBackground.astro` (script block only)

- [ ] **Step 1: Add scroll constants and state**

Add alongside the other constants:

```ts
  const SCROLL_BOOST_MAX = 1.0;
  const SCROLL_BOOST_DECAY = 0.06; // per tick; ~400ms to fully decay
  const SCROLL_VELOCITY_SCALE = 0.01; // px/frame → boost
  const SCROLL_OPACITY_BONUS = 0.04;
  const SCROLL_MUTATION_MULTIPLIER = 4;
```

Add state alongside the others:

```ts
  let scrollBoost = 0;
  let lastScrollY = 0;
  let scrollVelocity = 0;
```

- [ ] **Step 2: Initialize `lastScrollY` in `init()`**

In `init()`, after the `hasHover = ...` line, add:

```ts
    lastScrollY = window.scrollY;
```

- [ ] **Step 3: Attach scroll listener (not reduced motion)**

In `init()`, before the final `startLoop();`, add:

```ts
    if (!reduceMotion) {
      window.addEventListener(
        'scroll',
        () => {
          const y = window.scrollY;
          scrollVelocity = Math.abs(y - lastScrollY);
          lastScrollY = y;
        },
        { passive: true }
      );
    }
```

- [ ] **Step 4: Update `tick()` to incorporate scroll boost**

In `tick()`, replace the line:

```ts
      const opacity = baseOpacity();
```

with:

```ts
      // Update scroll boost from velocity, then decay velocity sample.
      const target = Math.min(SCROLL_BOOST_MAX, scrollVelocity * SCROLL_VELOCITY_SCALE);
      if (target > scrollBoost) scrollBoost = target;
      scrollBoost = Math.max(0, scrollBoost - SCROLL_BOOST_DECAY);
      scrollVelocity = 0;

      const opacity = baseOpacity() + scrollBoost * SCROLL_OPACITY_BONUS;
```

Also update the mutation count line:

```ts
      const mutations = Math.floor(glyphs.length * MUTATION_RATE);
```

to:

```ts
      const mutations = Math.floor(
        glyphs.length * MUTATION_RATE * (1 + scrollBoost * (SCROLL_MUTATION_MULTIPLIER - 1))
      );
```

- [ ] **Step 5: Visually verify**

Run: `bun dev`
Open: `http://localhost:4321/`

Expected:
- Scroll slowly — barely any change; feels ambient.
- Scroll fast (flick) — the field visibly livens; more cells churn, slight brightness lift.
- Stop scrolling — within ~400ms, it settles back to baseline.
- On mobile (devtools device emulation), scroll reactivity still works via touch scroll.
- Reduced motion still static regardless of scroll.
- No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/AsciiBackground.astro
git commit -m "Add scroll-reactive density and brightness to ASCII background"
```

---

## Task 5: Taste pass and final verification

**Goal of this task:** Run the full Testing Checklist, tune constants if anything feels off, and ship.

**Files:**
- Potentially tune: `src/components/AsciiBackground.astro` (constants at top of script only)

- [ ] **Step 1: Run the full Testing Checklist (below)**

- [ ] **Step 2: If anything feels off, tune the constants at the top of the script**

Common knobs:
- Too busy? Lower `MUTATION_RATE` to 0.01.
- Too subtle? Raise `BASE_OPACITY_LIGHT` to 0.10, `BASE_OPACITY_DARK` to 0.08.
- Ripple too small/large? Adjust `RIPPLE_RADIUS_CELLS` (try 4 or 8).
- Vignette too tight/loose? In the `<style>` block, change `520px 420px` to e.g. `640px 500px`.
- Scroll too reactive? Halve `SCROLL_BOOST_MAX` to 0.5.

- [ ] **Step 3: If any constants changed, commit the tuning**

```bash
git add src/components/AsciiBackground.astro
git commit -m "Tune ASCII background constants for editorial feel"
```

---

## Testing Checklist

Run through this before declaring done:

1. **Visual — all pages:** `bun dev`, visit `/`, `/blog`, `/projects`, and one individual blog post. Background present everywhere. Vignette centers the content column on each page.
2. **Light/dark theme:** Toggle via existing `ThemeToggle`. Glyph color and vignette color both flip. No flash, no broken state.
3. **Cursor ripple (A):** Move mouse. Bright trail follows with ~600ms decay. Stop — fades smoothly.
4. **Scroll reactivity (C):** Fast scroll — field livens briefly. Stop — settles within ~400ms.
5. **Touch device (devtools emulation):** No cursor ripple listener attached (verify: move simulated pointer, no trail). Scroll reactivity still works.
6. **Reduced motion:** DevTools → Rendering → `prefers-reduced-motion: reduce` → reload. Grid is static. DevTools Performance: idle CPU is flat (no ongoing rAF work).
7. **Performance:** DevTools Performance, 10s capture while scrolling around the site. Main thread well under 16ms/frame budget. No dropped frames on a mid-tier machine.
8. **Tab visibility:** Switch to another tab for 10s, come back. Animation resumes cleanly. Confirmed by watching devtools Performance tab show no CPU while the site tab is hidden.
9. **Resize:** Drag window from small to large. After ~150ms pause, grid reflows. No flicker storm during the drag itself.
10. **Astro view transitions:** Click between pages. Background persists smoothly through the view transition; after-swap hook rebinds correctly.
11. **Accessibility:** Canvas and vignette both `aria-hidden="true"`. VoiceOver / screen reader walks past them silently (spot-check).
12. **Console:** No warnings or errors anywhere.
