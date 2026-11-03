# Interactive Parameters — The Art of Counting

A full map of every slider, input, toggle, and config value the user can interact with. Use this for brainstorming what to keep, remove, expose differently, or add.

> **Note:** Numbers, Operations (addition/subtraction), and Multiplication are unified into one page, `play.html` (`js/play.js`), with one shared calculator — what you type decides which mode is shown. The panel is one accordion: a **Calculator** dropdown (always available) sits above three mode dropdowns (only the active mode's is open/clickable — the other two sit greyed out, see Part 7) and an **Artistic variables** dropdown shared across all three modes. The old standalone pages (`numbers.html`, `operations.html`, `multiplication.html`) are just redirects to `play.html` now — their `.js` files (`numbers.js`, `operations.js`, `multiplication.js`, `random-1.js`) are no longer loaded by anything and document stale behavior; don't trust them as a reference. On phone-width screens (≤768px) the panel's own look and layout changes substantially — see Part 8.

---

## 1. Calculator (shared across all three modes)

| Input | What it does |
|-------|--------------|
| expression field | Type numbers (`7, 42, 3.14, -5`), a sum (`2 + 3 - 10`), or a multiplication (`14x15`, `(2+4)x8`, `3x4x5`) — which one decides the mode. Enter to apply, Esc to clear. A sum's term can also be a parenthesized multiplication (`(3x4) + 5`) or a parenthesized nested sum (`(3x4) + (5+6)`) — see `multiplication.md` Parts 15–16. |
| digit buttons (0–9) | Insert that digit. Colored by palette2.csv's `10-100` tier (see Part 9). |
| `( ) ⌫ × / , + − .` | Insert that operator/symbol, or backspace. |
| **clear** | Empties the field **and** the canvas — nothing typed, nothing drawn. Does *not* fall back to a random composition or a placeholder example. |
| **=** | Same as pressing Enter. |
| **random** | Generates a random composition/chain/expression for the current mode **and writes it back into the field** as text (e.g. `3, 12, 31, 804, -746, 79.5` or `340 - 40.56 - 897 + 55` or `3.4x9x26x6`), so what's drawn always matches what's shown typed. |

---

## 2. Numbers mode

A row of number circles, fully compositional.

### Sliders
| Slider | Range | Default | What it controls |
|--------|-------|---------|------------------|
| **count** | 1–10 | 6 | How many circles appear |
| **size** | 0–100 | 50 | Base radius as % of canvas short edge |
| **spread** | 0–95 | 47.5 | Size variation — 0 = all same size, 95 = big spread |

All three default to the middle of their own range, deliberately — see Part 8.1.

---

## 3. Operations mode (addition/subtraction)

Circles (or embedded multiplication squares, or nested sum pills) connected by filled (positive) or outlined (negative) belts.

### Sliders
| Slider | Range | Default | What it controls |
|--------|-------|---------|------------------|
| **length** | 2–6 | 4 | Numbers per random chain (→ that many –1 belts) |
| **size** | 0–100 | 50 | Base circle radius as % of canvas short edge |
| **spread** | 0–95 | 47.5 | Size variation across circles in the chain |
| **spacing** | –95 to 150 | 27.5 | Gap between circles — negative = gap, positive = overlap |

### Internal (not exposed to user)
- `valueSizeInfluence` (0.9) — how much the numeric magnitude drives circle size vs. random
- `beltStrokeRatio` (0.02) — stroke weight of the outlined belt for negative results, as a ratio of the belt's own radius
- `beltStrokeMax` (1.5px) — hard cap on that stroke weight so a big pill's negative outline doesn't get too thick; the ratio+floor (0.4px) alone still governs small pills. Lifted entirely while drawing *inside* a nested sum pill (see `multiplication.md` Part 16) — that context is already shrunk by its own `scale(chainScale)`, so the flat local-space cap would otherwise shrink a second time and nearly disappear.
- `beltMarginRatio` (0.05, fixed) — belt offset from circle edge; used to be a "margin" slider
- When a chain contains a multiplication term, every other operand (circles, nested sums, and any other multiplication) is forced to match its size — see `multiplication.md` Part 15.2 / Part 16.3

---

## 4. Multiplication mode

Grid-based visual multiplication. Each operand pair shown as a rectangle of crossing bands.

### Text input
| Input | What it does |
|-------|--------------|
| expression field | Type `14x15`, `(2+4)x8`, or chains like `3x4x5`. Enter to apply. |
| **random** button | Generates a random chain of operands, written back into the field as text (see Part 1). |

### Sliders — band geometry
| Slider | Range | Default | What it controls |
|--------|-------|---------|------------------|
| **thickness** (bw) | 1–10 px | 5.5 | Width of each place-value band |
| **digit gap** (dgap) | 0–100 px | 50 | Gap between digit groups — also sets the square size |
| **line gap** (lgap) | 1–10 px | 5.5 | Gap between bands within one digit group |
| **overhang** (oh) | 0–20 px | 10 | How far bands extend beyond the multiplication square |

That's the full exposed slider set now — the old standalone `multiplication.js` page had a much larger list (op-chain band thickness, circle size, band margin, belt padding, ring area %, ring growth, neg stroke %, tick length %, decimal margin/dash/stroke %, decExt). None of those are wired to a slider on `play.html` anymore; they're fixed internal values in `CONFIG_MULTIPLICATION` / `NUMBER_REPRESENTATION` (see Part 7). `obw` (the op-chain band thickness, used when an operand is itself a sum, e.g. `(2+4)x8`) is also internal now — it's kept close to `bw` so a sum operand's band isn't dramatically thicker than a plain digit band, and scales with the `thickness` slider via a fixed ratio captured at panel build time (`OBW_RATIO = obw / bw`, from their two defaults).

---

## 5. Artistic variables (shared across all three modes)

A real collapsible dropdown now (desktop and mobile alike) — it used to be a plain, always-expanded, non-interactive section.

| Control | Range | Default | What it controls |
|---------|-------|---------|------------------|
| **background** | color picker | `#ffffff` | Canvas background color |
| **bokeh** | 0–30 px | 0 | Gaussian blur applied to the whole canvas |
| **grain** | 0–100 | 0 | Film grain intensity |
| **reality** | 0–100 | 0 | Crossfade from abstract shape → readable digit typography. Piecewise, not linear: the shape stays fully opaque until 50, then fades out; the text ramps in up to 50, then stays fully opaque — so at exactly 50 **both** render at full opacity, instead of both sitting at 50% like a plain linear crossfade would. Same formula in all three modes now (`reality < 50 ? 1 : 1 - (reality-50)/50` for the shape, mirrored for the text). |

The **export** button sits just below this dropdown, outside it — it stays visible whether Artistic variables is expanded or collapsed.

### Keyboard shortcuts (apply in whichever mode is active)
| Key | Action |
|-----|--------|
| `Space` | Reshuffle colors (same composition/expression, new random colors) |
| `S` | Save a high-quality PNG (3× resolution in Numbers mode, 4× in Operations/Multiplication) |
| `T` | Same as `S`, but with a transparent background instead of the canvas background color |

---

## 6. Canvas navigation (pan / zoom)

| Gesture | Device | Mode |
|---------|--------|------|
| Scroll | Desktop (mouse) | Multiplication only |
| Drag | Desktop (mouse) | Multiplication only |
| Double-click | Desktop (mouse) | Multiplication only — resets zoom/pan to fit the whole chain |
| One-finger drag (pan) | Phone (≤768px, touch) | **All three modes** |
| Two-finger pinch (zoom) | Phone (≤768px, touch) | **All three modes** |

On desktop, pan/zoom only ever existed for Multiplication (it's the one mode whose content can meaningfully run off-screen). On phone, finger pan/zoom works the same way in Numbers and Operations too, since there's no mouse-wheel/drag equivalent there to fall back on. Pan/zoom resets to identity (`zoom=1, panX=0, panY=0`) on every mode switch; Multiplication immediately re-fits its own view right after via `_fitMultiplicationView()`.

---

## 7. Mode-dropdown behavior (shared, not a "slider")

Which mode's dropdown is open is decided entirely by what the calculator resolves to — not by clicking. The other two mode dropdowns sit visibly in the list but greyed out and un-clickable (tier 4º grey, see Part 9). Multiplication's own dropdown *also* opens alongside Operations whenever the current sum embeds a multiplication term (`(3x4) + 5`), since its sliders affect that embedded square's geometry too.

---

## 8. Mobile (≤768px) — a different panel, same drawing engine

The canvas itself is **always** the full viewport, full height, on phone — it's a fixed background layer, completely independent of the panel's own size or open/closed state (opening the panel, typing, or pressing `=` never resizes or repositions it).

### 8.1 Slider defaults start centered
Every slider above defaults to (or very close to) the middle of its own range on page load, rather than near one end — e.g. Numbers' `size` is 50 of 0–100, not a small value near the bottom. This was a deliberate fix: ranges were widened at some point without updating the defaults to match, which made compositions render tiny by default.

### 8.2 The panel is a floating overlay, opened by a FAB
Below 768px the panel isn't a visible sidebar/sheet by default — it's fully tucked away (0 height), and a circular floating button (`.mobile-fab`, bottom-right, dark fill, "+") is the only thing shown. Tapping it reveals every section as a stacked list of full-width title rows (same look as desktop's dropdown titles, not a separate "chip" style — that was tried and explicitly reverted), with a frosted-glass background (`rgba(255,255,255,0.75)` + `backdrop-filter: blur(16px)`) so the canvas shows through, softened. The FAB's glyph swaps to "×" while open.

- Tapping a section's title opens it, auto-collapsing whichever other section was open — **only one section open at a time**.
- The panel auto-sizes to fit whatever's open (`height: auto; max-height: 90vh`) instead of a fixed height, so a short section (Numbers' 3 sliders) doesn't take as much room as a tall one (Calculator's full keypad) — no nested scroll area inside an open section.
- Tapping the FAB again collapses everything in one tap, back to just the FAB, canvas fully clear.
- The intro paragraph (see Part 10) hides itself once any section is expanded, to free up room.

### 8.3 Other mobile-only tweaks
- Section titles and the +/− glyph use a fluid `clamp()` size (`--panel-title-size`), not a fixed px + breakpoint jump — 20px on wide desktop screens, scaling smoothly up to 34px by phone width.
- Calculator's typed-expression display bumps to 22px (desktop: 11px) — both comfortably above the 16px iOS auto-zoom-on-focus threshold.
- Slider thumb: 18px (desktop: 6px). Digit-circle outline: 1.5px (desktop: 1px).
- The page's own CSS grid (`--grid-columns`, used for layout math like the nav links and the intro paragraph's max-width) drops from 9 columns to 6 below 768px.

---

## 9. The 4-tone grey system (`css/base.css`)

All panel/calculator/navbar UI chrome uses exactly four named greys instead of one-off hex values, numbered by level of importance (1º darkest/most important → 4º lightest/least):

| Variable | Hex | Level | Used for |
|----------|-----|-------|----------|
| `--grey-1` | `#2e2d2c` | 1º | Active panel-section titles, navbar links |
| `--grey-2` | `#666665` | 2º | Slider variable names, calc buttons, slider thumb |
| `--grey-3` | `#c6c6c6` | 3º | Slider value readout |
| `--grey-4` | `#e9e9e9` | 4º | Disabled/inactive panel titles, slider track, default placeholder text |

`--color-main` (the navbar's own token) now just points at `--grey-1`.

---

## 10. Intro copy (panel, above the Calculator dropdown)

A short `<p>` (`.panel-intro`) explaining what the page is, built from `js/play.js`'s `createPanel()`. Regular weight (KMRWaldenburg "Book", 400 — the family didn't have a face lighter than 500 loaded before this; `Book` (400) and `Light` (300) were added to `assets/fonts/` and registered in `base.css` specifically so this text could be genuinely lighter instead of silently falling back to Medium). Color is `--grey-1`. Font-size is fluid, same `clamp()` approach as the section titles (10px desktop → 13px phone). Capped to 4 of the mobile 6-column grid's width rather than spanning edge-to-edge.

---

## 11. Color system

Driven by CSV files, not sliders.

| File | Controls |
|------|----------|
| `data/palette.csv` | Belt/swatch color pool (HSB rows, `light`/`dark` typed), used by Operations + Multiplication |
| `data/palette2.csv` | Digit-specific ring colors — 9 digits × 3 **place-value** tiers, named `1-10`, `10-100`, `100-1000` (not the old `light`/`mid`/`dark`), grouped into 3 contiguous blocks (all 9 `1-10` rows, then all 9 `10-100`, then all 9 `100-1000`) rather than interleaved by digit |
| `data/palette3.csv` | Digit-specific background circle colors — 9 rows (one per digit 1–9); currently overridden everywhere by the fixed `COLORS.bgCircle` in `js/colors.js` instead |

**How color is assigned:**
- Background circle color → `COLORS.bgCircle` in `js/colors.js` (currently `[40, 1, 93]` HSB / `#eeedeb`, a near-white warm grey), the single place to change it — `palette3.csv`'s per-digit colors are a fallback only used when this is set to `null`
- Ring arc color → keyed to each digit's **place value**, cycling every 3 digits instead of capping out: units → `1-10`, tens → `10-100`, hundreds → `100-1000`, thousands → `1-10` again, and so on (`TIER_NAMES[i % 3]` in `js/number-system.js`)
- Tick marks (the 9 divisions per ring) → `COLORS.tickMarks` in `js/colors.js`, `[0, 0, 55]` HSB — lightened from the original `[0, 0, 25]`. Hidden entirely below `tickMinRadius` (28px circle radius) rather than rendered illegibly small.
- Belt color (Operations/Multiplication) → picked from the swatch pool at random (seeded, so it's stable until reshuffled), excluding the two connected circles' own background color. A flat-grey alternative was tried and explicitly reverted back to this swatch-pool version.

---

## 12. Homepage (`home.js`)

The falling number circles animation (currently toggled off). Unchanged this round.

| Variable | Where | What it controls |
|----------|-------|------------------|
| `FALLING_CIRCLES` | `home.js` line 7 | Toggle the entire animation on/off |
| `HOME.ballCount` | `home.js` | How many balls fall |
| `HOME.gravity` | `home.js` | Downward acceleration |
| `HOME.bounce` | `home.js` | Energy retained on bounce (0–1) |
| `HOME.friction` | `home.js` | Horizontal drag per frame |
| `HOME.minRadius` / `HOME.maxRadius` | `home.js` | Size range of falling balls |
| `--home-image-height` | `css/home.css :root` | Height of the hero image container |

---

## Notes for brainstorming

- **reality slider** now exists in all three modes via the shared Artistic variables dropdown — the old "Multiplication doesn't have it" gap is closed
- **grain and bokeh** are shared across all three modes already (one Artistic variables dropdown drives all of `CONFIG_NUMBERS`/`CONFIG_OPERATIONS`/`CONFIG_MULTIPLICATION` at once)
- **blendModeName** is still never exposed to the user but could be a powerful visual toggle
- The **color system** is still not user-facing at all — palette editing, digit color remapping, or a "shuffle palette" button could be interesting
- **valueSizeInfluence** on Operations (how much number magnitude drives size) is internal but potentially interesting to expose
- The old standalone pages' extra Multiplication sliders (ring area %, ring growth, neg stroke %, tick length %, decimal margin/dash/stroke %, op-chain band thickness/circle size/margin/padding) are no longer reachable from the UI at all — worth deciding whether any of them deserve a way back in, or whether the simpler 4-slider set is the intended final scope
