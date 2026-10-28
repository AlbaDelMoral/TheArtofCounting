# Visual Multiplication System — Complete Specification

## Overview

This document describes a visual system for representing multiplication. Numbers are encoded as crossing bands inside an imaginary square. The system handles integers, decimals, negative numbers, and operations (addition/subtraction) inside parentheses. It is built on top of the Visual Number System (circle-based number representation) and the Addition/Subtraction Belt System.

---

## Part 1: Core Concept — The Imaginary Square

Every multiplication A × B is drawn inside an **imaginary square**. This square is the grid space where the two operands cross.

- **Horizontal bands** represent the digits of **A** (the left operand)
- **Vertical bands** represent the digits of **B** (the right operand)
- Where horizontal and vertical bands **cross**, partial products are formed — exactly like the Japanese line multiplication method
- The square is **auto-sized** to fit its content — it grows as digits or spacing increase

The square is never drawn explicitly. It is an invisible reference frame that organizes everything inside it.

---

## Part 2: Band Structure — One Section Per Digit

### 2.1 Sections

The imaginary square is divided into **N equal sections per axis**, where N = number of digits in that operand.

```
A = 163  →  3 horizontal sections (top → bottom):
             section 0: 1 band  (hundreds digit)
             section 1: 6 bands (tens digit)
             section 2: 3 bands (units digit)

B = 456  →  3 vertical sections (left → right):
             section 0: 4 bands (hundreds digit)
             section 1: 5 bands (tens digit)
             section 2: 6 bands (units digit)
```

Each digit becomes a **group of parallel bands** — the digit value directly determines how many bands are in that group.

### 2.2 Two-Digit Padding

Single-digit numbers are **always padded to at least 2 digits** with a leading zero:

```
6   →  [0, 6]   →  section 0: 0 bands (empty), section 1: 6 bands
20  →  [2, 0]   →  section 0: 2 bands, section 1: 0 bands (empty)
```

This ensures the structure always has at least 2 sections per axis.

### 2.3 Zero Digits

A digit of 0 means that section is **completely empty** — no bands are drawn there. The section space still exists inside the square, it just contains nothing.

### 2.4 Band Direction

- **Horizontal bands** run left to right, spanning the full band length
- **Vertical bands** run top to bottom, spanning the full band length
- All bands have **identical total length**: `square size + 2 × overhang`

---

## Part 3: Auto-Sizing the Square

The square auto-sizes to contain all content. The process:

1. For each section, compute its **minimum needed size**:

   ```
   sectionSize = count × bandThickness + (count−1) × lineGap + bandThickness × 0.5
   ```

   (the extra `× 0.5` gives half-band margin padding)

2. Total content size per axis:

   ```
   totalH = sum(all horizontal section sizes) + (N−1) × digitGap
   totalV = sum(all vertical section sizes) + (N−1) × digitGap
   ```

3. Square size = `max(totalH, totalV)` — always a true square so all bands have equal length

4. Sections are centered inside the square. If one axis has less total content than the other, it is centered with equal margin on both ends.

### 3.1 Spacing Sliders That Drive Square Size

- **`lineGap`** — gap between parallel bands within the same digit group. Increasing this increases section size → square grows
- **`digitGap`** — gap between digit groups (between sections). Increasing this pushes sections apart → square grows
- **`bandThickness`** — thickness of each band. Increasing this increases section size → square grows

These sliders are linked to square size by design. Bands **never overlap** — the section sizing always leaves enough room.

---

## Part 4: Band Types

### 4.1 Basic Bands (simple numbers, no parentheses)

When an operand is a plain number (e.g. `14`, `163`, `-45`), its bands are **plain rectangles** with square caps. No circles at the ends.

The number of bands per section = the digit value. The bands themselves ARE the number — no extra labeling needed.

```
14:  section 0 → 1 horizontal band
     section 1 → 4 horizontal bands
```

**Sign encoding** (same as the full system):

- Positive result → bands are **solid filled**
- Negative result → bands are **outlined only**, same thickness and size

### 4.2 Operation Bands (parentheses)

When an operand contains an operation like `(2+8-15)` or `(3.5+1)`, its bands become **addition/subtraction chain visualizations** — the exact belt system from the addition/subtraction spec.

Each band is replaced by a **pill/belt shape** wrapping number circles:

- One circle per number in the chain
- Circles are spaced evenly along the band length
- Adjacent circles are connected by a belt (filled if local pair result ≥ 0, outlined if < 0)
- Each circle shows the actual number value using the full number circle system (concentric rings, tick marks, decimal ring if applicable)

**Key rule**: the number of operation bands per section = the digit value of the **result** of the operation.

```
(2+8-15) × 456

Chain result = 2+8-15 = -5  →  abs(-5) = 5  →  digit representation of 5:
  section 0: 0 bands (tens digit of 5 = 0)
  section 1: 5 bands (units digit of 5 = 5)

Each of those 5 bands IS the operation chain (2+8-15) visualized.
```

**Circle values**: Each circle shows the actual operand value (2, 8, 15) — never the result.

**Belt fill per pair**: Each belt between adjacent circles depends only on that local pair:

```
belt(2, 8):    2+8=10  → positive → FILLED
belt(8, -15):  8+(-15)=-7 → negative → OUTLINED
```

**Operation band thickness**: controlled by the **Op band thickness** slider (separate from basic band thickness).

**All operation bands have the same total length** as basic bands — they span from `bandLeft + CR` to `bandRight - CR` where CR = circle radius, so circle edges align with band endpoints.

---

## Part 5: Overhang

All bands — basic AND operation, horizontal AND vertical — extend equally beyond the square on both ends by the **overhang** amount.

```
Total band length = square size + 2 × overhang
```

The square is the grid intersection area. The overhang is the portion of each band that sticks out beyond the square edges on both sides symmetrically.

When overhang = 0, all bands start and end exactly at the square edges. Increasing overhang makes all bands longer uniformly.

---

## Part 6: Sign (Positive vs Negative Result)

The sign of A × B determines whether ALL bands are filled or outlined:

| A sign | B sign | Result | Band style         |
| ------ | ------ | ------ | ------------------ |
| +      | +      | +      | All bands filled   |
| −      | −      | +      | All bands filled   |
| +      | −      | −      | All bands outlined |
| −      | +      | −      | All bands outlined |

For basic bands: filled = solid rectangle, outlined = rectangle stroke only, same dimensions.

For operation bands:

- The outer belt shape follows the overall multiplication sign (filled/outlined)
- The inner belt between each pair of circles follows its own local result sign
- Individual circles are filled or outlined based on their own sign (positive number = filled circle, negative number = outlined circle)

---

## Part 7: Decimal Numbers in Multiplication

When either operand has decimal digits (e.g. `14.2` or `3.6`), the decimal sections are drawn **inside** the imaginary square, right alongside the integer sections — they are treated as just more digit-groups, not a special zone past the square's edge.

### 7.1 Integer and decimal sections (both inside square)

A side's digit-groups are built as one ordered list — integer digits first, then decimal digits — and **all of them together** determine the square's size and are stacked/centered as one unit:

```
14.2:  sections = [1, 4, 2]  (int: 1, 4 — dec: 2)  → 3 sections inside the square, stacked top→bottom
3.6:   sections = [0, 3, 6]  (int: 0, 3 padded — dec: 6)  → 3 sections inside the square, stacked left→right
```

Because the square's size (`sqSize = max(totalSecH, totalSecV, …)`) now accounts for every section — integer and decimal alike — a number with decimals simply makes the square bigger, the same way an extra integer digit would, instead of poking content out past the square's border.

### 7.2 Decimal section sizing

Decimal sections use the exact same section-size formula as integer sections (`count × bandThickness + (count−1) × lineGap + bandThickness × 0.5`), with the `decExt%` slider applied as an extra multiplier **only** to decimal sections — giving them a bit more breathing room than a same-value integer section would get, without moving them outside the square.

### 7.3 Decimal separator dashed line

A **dashed line** still marks the boundary between a side's integer sections and its decimal sections — it just now falls **inside** the square instead of on the square's own edge:

- For horizontal decimals (operand A): a **horizontal dashed line** at the y-coordinate where A's first decimal section starts, spanning the full horizontal band length (including overhang)
- For vertical decimals (operand B): a **vertical dashed line** at the x-coordinate where B's first decimal section starts, spanning the full vertical band length (including overhang)

Properties (unchanged):

- Same thickness as basic bands
- Square caps (`lineCap: 'butt'` while drawing, so segments don't blur together)
- Dash/gap ratio controlled by `decDash%` slider
- Color matches the band color of that operand
- Drawn AFTER the crossing bands of the other axis, so they visually "break" the dash

### 7.4 Overhang is now the only thing extending past the square

With decimals living inside the square, the **only** thing that extends a band past the square's own edge is the `overhang` slider (`oh`) — applied evenly to both ends of every band, integer or decimal section alike. At `overhang = 0`, every band — including decimal-section bands — starts and ends exactly on the square's edge.

### 7.5 Decimals inside parentheses

When decimal numbers appear inside parentheses as part of a chain operation (e.g. `(1.5+2)×6`), the decimals are represented on the **number circles** using the decimal ring spec (dashed ring between decimal and integer rings inside the circle). This is unrelated to the outer multiplication grid's own decimal sections — that still only applies to operands that directly multiply, not to numbers inside a parenthesized chain.

---

## Part 8: Expressions

The search bar accepts the following expression formats:

```
14x15           →  simple × simple
(2+4+8)x15      →  operation × simple
14x(3-7+2)      →  simple × operation
(2+3)x(4+5)     →  operation × operation
14.2x3.6        →  decimal × decimal
(1.5+2)x6       →  decimal chain × simple
-14x15          →  negative × positive
14x(-15)        →  positive × negative (same as -14x15 in result)
(9-2-10)x(-45)  →  operation × negative
123x456         →  3-digit × 3-digit
1234x56         →  4-digit × 2-digit
```

Parser rules:

- `x` or `*` = multiplication sign
- `( )` = operation group (addition/subtraction chain)
- `+` and `−` inside parens = chain operators
- Leading minus = negative number
- `.` = decimal point
- Numbers inside parens can be decimal: `(1.5+2.3-0.7)`
- Single-element parens like `(-15)` are treated as simple negative numbers

---

## Part 9: Visual Sliders Reference

### Basic Bands

| Slider                         | Effect                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| **Thickness**                  | Height (horizontal) or width (vertical) of each rectangle band. Drives square size. |
| **Overhang beyond square**     | How far all bands extend beyond the square edges on both sides.                     |
| **Gap within digit group**     | Space between parallel bands in the same digit group. Drives square size.           |
| **Digit gap (drives sq size)** | Space between different digit groups (between sections). Drives square size.        |
| **Decimal section size %**     | Extra breathing room in decimal sections beyond minimum needed.                     |

### Op Chain Bands

| Slider              | Effect                                                                        |
| ------------------- | ----------------------------------------------------------------------------- |
| **Circle diameter** | Size of each number circle in operation chains. Also sets the op band height. |
| **Belt padding**    | Extra space between circle edge and belt boundary in the chain.               |

### Number Circle

| Slider                  | Effect                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| **Ring area %**         | How much of the circle radius is used for rings (vs margin).                              |
| **Ring growth ×100**    | Geometric growth rate of ring widths (outer rings wider). 100 = equal, 140 = 1.4× growth. |
| **Neg stroke weight %** | Stroke thickness for outlined (negative) circles and portions, as % of radius.            |
| **Tick length %**       | Length of tick marks at ring boundaries, as % of ring width.                              |

### Decimal Ring

| Slider                 | Effect                                                       |
| ---------------------- | ------------------------------------------------------------ |
| **Margin from ring %** | Gap between the decimal ring and the ring boundary it marks. |
| **Dash fraction %**    | What fraction of each dash segment is solid (vs gap).        |
| **Stroke weight %**    | Thickness of the decimal dashed ring, as % of circle radius. |

---

## Part 10: Color System

**Basic bands (simple numbers) are colored by digit value, not randomly.** Each digit-group's bands use that digit's own color (1–9) from the same palette the number circles use (`data/palette2.csv`, `mid` tier) — digit `4` is always the same color everywhere on the page, digit `7` is always another fixed color, and so on. This applies per digit-group independently: a 3-digit operand like `456` draws its `4`-section, `5`-section, and `6`-section each in their own digit color, not one uniform color for the whole operand. A digit of `0` draws no bands, so it needs no color. Pressing **Space** (shuffle) no longer changes these band colors, since they're now deterministic — it still reshuffles everything else below.

Everything else is still randomly assigned from a curated palette of 24 HSB color swatches on every shuffle:

- `colCircle` — background fill color of number circles in operation chains
- `colChain0..3` — belt colors for operation chains (one per adjacent pair, cycling)
- `RING_COLORS[0..5]` — ring fill colors inside number circles (all randomized on shuffle)

---

## Part 11: Drawing Order

Everything is drawn in this order (back to front):

1. **Vertical decimal dashed line** (if B has decimals) — behind everything
2. **All vertical bands** — integer sections + decimal sections, left to right
3. **Horizontal decimal dashed line** (if A has decimals) — behind horizontal bands
4. **All horizontal bands** — integer sections + decimal sections, top to bottom
5. **Result label** — text at bottom showing expression = result

This ensures horizontal bands always appear on top of vertical bands (like a real weave/grid), and dashed separator lines are always behind the bands of their own axis.

---

## Part 12: Complete Worked Examples

### Example 1: `14 × 15` (simple)

```
A = 14: intDigits=[1,4]  →  2 sections horizontal
  section 0 (top):    1 band
  section 1 (bottom): 4 bands

B = 15: intDigits=[1,5]  →  2 sections vertical
  section 0 (left):  1 band
  section 1 (right): 5 bands

Result = 210 > 0  →  all bands FILLED
Square size = auto-sized from content
```

### Example 2: `(2+8-15) × 456` (operation × simple)

```
Chain (2+8-15): result = -5  →  abs(-5) = 5  →  digits [0,5] (padded)
  section 0 (top):    0 operation bands (empty)
  section 1 (bottom): 5 operation bands

Each operation band shows: circle(2) --belt-- circle(8) --belt-- circle(-15)
  belt(2,8):   2+8=10 → FILLED (purple)
  belt(8,-15): 8-15=-7 → OUTLINED (blue)

B = 456: intDigits=[4,5,6]  →  3 sections vertical
  section 0 (left):   4 bands
  section 1 (middle): 5 bands
  section 2 (right):  6 bands

Result = -5 × 456 = -2280 < 0  →  all bands OUTLINED
Circle for 2: positive → filled
Circle for 8: positive → filled
Circle for -15 (sign=-1): negative → outlined
```

### Example 3: `14.2 × 3.6` (decimals)

```
A = 14.2:
  sections = [1, 4, 2]  →  3 sections, all INSIDE the square (top→bottom: 1, 4, 2 bands)
  Horizontal dashed line at the y where the 3rd (decimal) section starts,
  spanning the full horizontal band length (incl. overhang) — not at sqB

B = 3.6:
  sections = [0, 3, 6]  →  3 sections, all INSIDE the square (left→right: 0 empty, 3, 6 bands)
  Vertical dashed line at the x where the 3rd (decimal) section starts,
  spanning the full vertical band length (incl. overhang) — not at sqR

Square size grows to fit all 3 sections per axis, same as a 3-digit integer would.
Only the `overhang` slider extends bands past the square's own edge now.
```

### Example 4: `163 × 456` (3-digit × 3-digit)

```
A = 163:
  intDigits=[1,6,3]  →  3 sections horizontal inside square
  section 0 (top):    1 band
  section 1 (middle): 6 bands
  section 2 (bottom): 3 bands

B = 456:
  intDigits=[4,5,6]  →  3 sections vertical inside square
  section 0 (left):   4 bands
  section 1 (middle): 5 bands
  section 2 (right):  6 bands

Square is larger than 2-digit case to accommodate 3 sections + 2 digit gaps.
Result = 74328 > 0 → all bands FILLED.
```

### Example 5: `(2+3) × (4+5)` (operation × operation)

```
A chain (2+3) = 5  →  digits [0,5]
  Horizontal: 0 op bands on top, 5 op bands on bottom
  Each band: circle(2) --FILLED belt-- circle(3)

B chain (4+5) = 9  →  digits [0,9]
  Vertical: 0 op bands on left, 9 op bands on right
  Each band: circle(4) --FILLED belt-- circle(5)

Result = 5×9 = 45 > 0 → all filled
```

---

## Part 13: Implementation Notes (Canvas 2D)

- All drawing uses **Canvas 2D API** via p5.js
- **Square caps** on all basic bands (`p.rect` with radius=0)
- **Square caps** on dashed lines (`p.strokeCap(p.SQUARE)`)
- **Belt geometry**: external tangent with both arcs CCW (`ctx.arc(..., true)`) — see addition/subtraction spec
- **Blend mode**: `p.BLEND` for all drawing (no multiply blend)
- Band rectangles use `p.rectMode(p.CORNERS)` for precise positioning
- The square is never drawn — it is computed only
- `p.noLoop()` — drawing is static, only redraws when inputs change

---

## Part 14: Multi-Operand Chains (e.g. `4x3x6x5`)

An expression with more than one `×` is split into a sequence of pairwise **steps** by `parseMultChain`:

```
4x3x6x5  →  step 0: 4×3=12
            step 1: 12×6=72    (sideA = step 0's result, 12)
            step 2: 72×5=360   (sideA = step 1's result, 72)
```

From step 1 onward, **sideA is just the previous step's result treated as a plain number** — its digit decomposition becomes the new horizontal bands, crossing the next operand's digits (sideB) vertically. Each step is otherwise drawn exactly like any ordinary `A × B` square from Parts 1–3: its own auto-sized square, its own digit sections, its own color-by-digit bands.

### 14.1 Why this reads as one connected chain

Because the "sideA" of every step after the first is literally the running result's digits, consecutive squares share a value, not just a position — the digit-bands you see entering a square are the same digits that formed the previous square's result. This is what makes the chain look like one object instead of several unrelated multiplications, without needing any extra "connector" drawing on top.

### 14.2 Diagonal placement — the staircase rule

Steps are **not** drawn independently at random positions. Each step's square is placed so its **top-left corner exactly touches the previous step's bottom-right corner** — a staircase growing down-and-to-the-right. If step *i* has half-size `half_i`, its center moves by `prevHalf + half_i` on **both** the x and y axis relative to the previous step's center. The whole staircase is then re-centered so it sits in the middle of the canvas.

```
step[i].ox = step[i-1].ox + half[i-1] + half[i]
step[i].oy = step[i-1].oy + half[i-1] + half[i]   (same increment — pure diagonal)
```

This positioning is recomputed (`_computeOffsets`) every time the chain changes AND every time any panel slider changes (thickness, digit gap, line gap, etc.) — since those sliders change each step's square size, the staircase must be re-synced or the corners drift apart.

### 14.3 The whole chain always bounds to a perfect square

Because every step moves by an equal amount on both axes, the bounding box around the *entire* chain — from step 0's top-left corner to the last step's bottom-right corner — always comes out to `(sum of all step sizes) × (sum of all step sizes)`. This holds regardless of how differently sized the individual steps are (a tiny `2×3` square and a huge `6×798` square still complete one bigger square together when placed this way).

### 14.4 Debug outlines

Two optional outlines help verify the above visually, both on by default:

- **Per-step outline** — a thin (1px) black stroke around each step's own square, drawn inside `drawMultiplication`. Toggle: `CONFIG.showSquareOutline = false`.
- **Whole-chain outline** — a red stroke around the entire staircase's bounding box, drawn once per frame in the main draw loop after all steps. Toggle: `CONFIG.showChainOutline = false`.

### 14.5 Open question: band-width inheritance

Not yet implemented: whether a step's "carried-over" horizontal bands (the ones representing the previous result's digits) should keep the band thickness they were first drawn at in step 0, rather than each step recalculating thickness independently. Currently all bands — carried-over or freshly introduced — use the same global `thickness` (`CONFIG.bw`) slider value. This is intentionally left open pending further direction.

---

## Part 15: Multiplication as an Addition/Subtraction Operand

A chain operand no longer has to be a plain constant — it can be a parenthesized multiplication, e.g. `(3×4) + 5` or `5 + (8×9×5)`. When that happens, the operand isn't collapsed down to its numeric result and drawn as an ordinary number circle; the **actual multiplication square** (everything in Parts 1–14, including multi-step chains) is rendered in its place, still joined into the belt chain like any other operand. This is implemented in `js/addition-system.js` + `js/play.js`, not `js/multiplication-system.js` — the multiplication engine itself doesn't know it's being embedded.

### 15.1 Parsing

The addition/subtraction tokenizer (`parseChainsWithMult` / `_tokenizeChainSegment`, in `addition-system.js`) walks the typed expression term by term. A term is either:

- a plain signed number, same as always, or
- a parenthesized group containing a top-level `×` — detected by `_hasTopLevelMultSign`, which scans for `×` at paren-depth 0 *inside* that group (so a nested chain like `(2+3)×15` at the outer level is unaffected; this only triggers for a group whose own content multiplies).

A multiplication term is parsed with `parseMultChain` — **not** `parseMultExpr`, which only handles a single `A×B` pair. Using the chain-aware parser means `(8×9×5)` resolves to all of its steps (`8×9=72`, then `72×5=360`), not just the first pair.

```
(3×4) + 5        → term0: mult [3×4=12],         term1: num 5
5 + (3×4)        → term0: num 5,                 term1: mult [3×4=12]
(8×9×5) + 5      → term0: mult [8×9=72, 72×5=360], term1: num 5
(8×34×2) + (4×5) → term0: mult [8×34=272, 272×2=544], term1: mult [4×5=20]
```

Each `mult` term carries: `sign` (the chain-level `+`/`−` immediately before the parenthesis — independent of any sign *inside* the multiplication itself), `value` (`sign × last step's result`, used for magnitude/belt-sign math like any other term), `steps` (the `parseMultChain` array), and `exprStr` (the raw inner text, e.g. `"8x9x5"`, kept only for the reality-mode label).

### 15.2 Sizing — every operand in the chain matches the multiplication's size

Normally each circle in a chain is sized independently from its own magnitude (`log10(value)`). Once a chain contains a multiplication term, that rule is overridden: **every other operand in that chain — plain numbers and any other multiplication terms — is forced to the same size as the first multiplication term**, rather than being sized by its own value. This is a deliberate design choice (not a magnitude-matching coincidence): two multiplications in one chain, e.g. `(8×34×2) + (4×5)`, are meant to read as the same size imaginary square regardless of how different their actual products are.

```js
// computeOperationsPositions(), js/play.js
const multIdx = terms.findIndex((t) => t.kind === "mult");
if (multIdx !== -1) {
  for (let i = 0; i < n; i++) if (i !== multIdx) radii[i] = radii[multIdx];
}
```

The multiplication's own target half-size (`node.r`) is then whatever the normal magnitude-based circle-sizing formula produces for its value — it's just that every sibling operand copies it instead of computing their own.

### 15.3 The embedded square always fills its target size exactly

A multiplication term's `squareScale` is computed so its **full visible extent** — the chain's bounding square (always a true square; see Part 14.3) plus overhang — lands exactly on `node.r`:

```js
const { offsets, half: naturalHalf } = _computeStepOffsets(term.steps); // CONFIG = CONFIG_MULTIPLICATION while this runs
const naturalFull = naturalHalf + embeddedConfig.oh;
node.squareScale = naturalFull > 0 ? node.r / naturalFull : 1;
```

This mirrors how a plain circle's own radius already equals `node.r` — both shapes fill the exact same footprint, so the belt around them (see 15.5) wraps both with the same proportional margin rather than one of them sitting flush against the belt's wall. `_computeStepOffsets` is the pure (non-global-state) version of `_computeOffsets` (Part 14.2) — it returns `{ offsets, half }` instead of writing into the page's own `_stepOffsets`, so measuring/drawing an embedded chain never disturbs multiplication mode's own standalone chain.

**Overhang is forced to 0** for an embedded multiplication specifically, via `_embeddedMultConfig()` — a shallow clone of `CONFIG_MULTIPLICATION` with `oh: 0` — used instead of `CONFIG_MULTIPLICATION` directly whenever sizing or drawing an embedded square. The live Multiplication overhang slider therefore has no effect on embedded squares; this was a deliberate call for now (the overhang amount is tuned for multiplication mode's own full-canvas chain, and reads as excessive once the whole thing is also shrunk down into a belt).

Multi-step chains (`(8×9×5)`) draw every step, each translated to its own `stepOffsets[s]` position inside the shared `translate + scale(squareScale)` transform — same staircase as Part 14, just nested inside the belt's coordinate space instead of the canvas's.

### 15.4 Background

`drawMultiplication` never paints a background behind its own bands — on the multiplication page this doesn't matter, since the canvas itself is already that color. Embedded in a belt, the square's gaps need to visibly match a number circle's own background, so the erase step behind an embedded square paints `CONFIG_OPERATIONS.bgColor` explicitly (the same grey a number circle ends up with, since `drawNumber` paints that color over its own identical erase step) instead of plain white.

### 15.5 The belt — flat cap on the square side, wraps it completely

Three belt-drawing functions now exist in `addition-system.js`, dispatched by `(cA.kind, cB.kind)`:

| Both kinds      | Function                  | Shape                                                              |
| --------------- | -------------------------- | ------------------------------------------------------------------ |
| circle + circle  | `drawBelt` (existing)      | Arc on both ends — the original stadium/pill shape.                 |
| circle + square  | `drawBeltToSquare`         | Arc on the circle end; flat cap on the square end.                  |
| square + square  | `drawBeltSquareToSquare`   | Flat caps on both ends — a plain quad, no arcs at all.               |

The key design point for both new functions: **the flat cap sits beyond the square's *far* side** — the side facing *away* from whatever it's connected to — not at its near edge. That's what makes the belt fully enclose the square (margin visible on every side, including the side with nothing attached to it) instead of looking like the belt merely touches the square's near edge and stops.

`drawBeltToSquare(ccx, ccy, R, sqx, sqy, H, ...)` keeps the exact same tangent-arc geometry `drawBelt` already uses on the circle side (computed treating the square's half-size `H` as if it were "the other circle's radius", for the `alpha = asin((R−H)/d)` taper) — only the square side changes, from an arc to two straight lines running past the square's far edge to its two corners there.

`drawBeltSquareToSquare` doesn't need any tangent-angle math at all, since neither side has a curve: it's just the four corners (both squares' far-edge corners) connected directly.

All belt margin math (`node.r * (1 + beltMarginRatio)`) is identical for every shape kind — a mult node's `r` already equals its full visible extent (15.3), exactly like a circle's `r` already is its own radius, so one shared formula produces a uniform-width, non-tapering belt whenever two same-sized shapes are connected (which, per 15.2, is always true for a chain with a multiplication in it).

The belt's own fill (filled = positive, outlined = negative) still follows the sum of the two connected operands' signed `value`s, same rule as any other belt. Independently, **the square's own fill** (its bands — filled vs. outlined) follows its *own* effective value: if the chain-level sign negates an otherwise-positive product (e.g. `-(3×4)+20`), only the **last** step's `result` is sign-flipped for rendering (`effStep = { ...step, result: -step.result }`) — earlier steps in a multi-step chain keep their own natural sign, same as they would on the multiplication page itself. Digit decomposition is unaffected either way, since it's always derived from each side's own magnitude, never from `result`'s sign.

The belt's stroke weight when outlined (negative) uses `CONFIG_OPERATIONS.beltStrokeRatio` (0.02) rather than multiplication's own `CONFIG_MULTIPLICATION.beltStrokeRatio` (0.04) — these belts tend to be much larger than a typical op-chain belt inside a multiplication square, so a thinner ratio keeps the outline from reading as too heavy.

### 15.6 The Multiplication panel stays live

Normally only the active mode's dropdown (Numbers / Addition and Subtraction / Multiplication) is open and interactive — the other two are greyed out (see `system-numbers.md` / the panel CSS). Since an embedded multiplication's geometry is directly controlled by the Multiplication sliders (thickness, digit gap, line gap, overhang), `_syncDropdowns()` also opens the Multiplication dropdown whenever the current Operations chain contains a `mult` term:

```js
const opsHasMult = activeMode === "operations" && customOps.some((chain) => chain.some((t) => t.kind === "mult"));
const isOpen = mode === activeMode || (mode === "multiplication" && opsHasMult);
```

Dragging any of those sliders calls `_onMultGeometryChange()`, which (a) recomputes multiplication mode's own standalone `_stepOffsets` with `CONFIG` correctly pointed at `CONFIG_MULTIPLICATION` regardless of which mode is actually active (since these sliders are now reachable from Operations mode, and the generic `CONFIG` pointer would otherwise be `CONFIG_OPERATIONS` — missing `bw`/`lgap`/`dgap`/etc. entirely — while this runs), and (b) calls `computeOperationsPositions()` when in Operations mode, so the embedded square's cached `squareScale`/`stepOffsets` — set once when the chain was typed — are recomputed immediately instead of silently going stale as the sliders move.

### 15.7 Scope note

A chain may contain more than one multiplication term (`(8×34×2) + (4×5)` is valid and handled — see 15.2 and 15.5). Nesting a parenthesized *addition* chain as another chain's own operand is covered separately, in Part 16.

---

## Part 16: A Nested Chain as an Operand — "Pill Inside a Pill"

Just as a chain operand can be a parenthesized multiplication (Part 15), it can also be *another* parenthesized addition/subtraction chain: `(3×4) + (5+6)` renders the left side as the usual multiplication square, and the right side as its own fully self-contained pill — two number circles joined by their own inner belt — nested inside the outer belt. Any depth of nesting is supported (the tokenizer in `addition-system.js` is simply recursive), and a nested chain can itself contain further nested `mult` or `chain` terms.

### 16.1 Parsing — three kinds of term, not two

`_tokenizeChainSegment` now produces one of three term kinds for a parenthesized group:

1. the inner content has a top-level `×` → `kind: 'mult'` (Part 15)
2. the inner content is a bare signed number (the *whole* string, not just a leading number) → `kind: 'num'`
3. otherwise → recurse: parse the inner content with this same tokenizer. If that yields 2+ terms, it's `kind: 'chain'`, carrying `terms` (the nested array) and `value` (the sum of the nested terms' own signed values).

A `chain` term's `sign` is the chain-level `+`/`−` immediately before its parenthesis — same convention as a `mult` term's `sign` (Part 15.1) — independent of whatever signs appear *inside* the nested chain itself.

### 16.2 Data prep and layout are both just recursive now

Two functions in `js/play.js` carry this recursion:

- **`_prepareTermsData(terms)`** — builds the `{ terms, sizeTs, colorSeeds, beltColorSeeds, angles, rotSpeeds, fontIdxs }` bundle a chain needs (this used to be inlined in `generateChainData`). For a `chain` term, it recurses and stores the result as `term.nested` — so a nested chain gets exactly the same *stable* per-circle randomness (rolled once, not re-rolled every frame) a top-level chain does.
- **`_layoutChainTerms(data, m, fitW, fitH)`** — computes node positions + belts in LOCAL coordinates centered on `(0,0)` (this used to be inlined in `computeOperationsPositions`, which is now a thin wrapper: call this, then shift the top-level result into panel space). For a `chain` term it recurses with `fitW = fitH = Infinity` — see 16.3 for why.

### 16.3 Sizing — a nested chain matches a sibling multiplication too, via a uniform rescale

Part 15.2's "every operand matches the multiplication's size" rule now includes a `chain`-kind term — this was tweaked after the first pass (which exempted nested chains, sizing them independently) turned out to look disproportionate: a small nested chain next to a big multiplication square read as mismatched rather than as one consistent band.

```js
const multIdx = terms.findIndex((t) => t.kind === "mult");
if (multIdx !== -1) {
  for (let i = 0; i < n; i++) if (i !== multIdx) radii[i] = radii[multIdx];
}
```

A nested chain still lays itself out at its own *natural* size first — unconstrained by the parent (`fitW`/`fitH = Infinity`, so the fit-to-area clamp never kicks in), its own circles sized from their own magnitudes relative to EACH OTHER, same formula a top-level chain uses. Only afterward is the **whole nested pill uniformly rescaled** so its natural half-width lands on the shared target size — `chainScale`, computed and applied exactly like a multiplication square's `squareScale` (Part 15.3):

```js
const nestedLayout = _layoutChainTerms(term.nested, m, Infinity, Infinity);
node.nestedLayout = nestedLayout;
node.nestedData = term.nested;
node.chainScale = nestedLayout.halfW > 0 ? node.r / nestedLayout.halfW : 1;
```

The nested circles' sizes *relative to each other* are therefore still determined by their own magnitudes (a `9` circle is still bigger than a `2` circle inside the same nested pill) — only the pill's overall scale is forced to match, not each individual circle's size in isolation.

When there's no multiplication in the chain at all, a nested chain still sizes independently (its natural `halfW`, `chainScale = 1`) — the matching rule only ever triggers alongside a sibling `mult` term, same condition as for a plain number.

### 16.4 The outer belt wraps a nested chain exactly like a circle

A nested chain has no flat edge of its own — it's bounded by a stadium shape (rounded both ends), not a square — so from the *outside*, the belt dispatch in `_drawChainNodes` treats a `chain`-kind node exactly like a `num`-kind one: if neither side is `mult`, it's a plain `drawBelt` circle-arc join on both ends, same as any two ordinary circles. `node.r` is the TARGET half-size (15.2/16.3 above, whatever the sizing rule decided it should be) — not the nested pill's own natural half-width, which is a separate, pre-rescale number (`nestedLayout.halfW`, used only to derive `chainScale`).

When there's no sibling multiplication forcing a match, `node.r` just equals the nested pill's own natural `halfW` and `chainScale` is `1` — the pill is bounded by a simple circular arc sized to its own half-*width*, which (since the pill is elongated, wider than tall) leaves some visible slack above and below it; that slack is the "pill inside a pill" margin visible in the reference image, not a bug to be tightened.

### 16.5 Drawing — no erase step, unlike a multiplication square

`_drawChainNodes` recurses on a `chain` node the same way the multiplication branch does on a `mult` node — translate to the node's own position, then hand off — but with one deliberate difference: **no erase/backdrop rectangle is painted first.**

```js
if (circle.kind === "chain") {
  push();
  translate(circle.x, circle.y);
  _drawChainNodes(circle.nestedLayout.nodes, circle.nestedLayout.belts, circle.nestedData, shapeAlpha, textAlpha);
  pop();
  continue;
}
```

A multiplication square needs that erase step because `drawMultiplication` never paints its own background (Part 15.4) — its gaps would otherwise show the belt color behind it. A nested chain doesn't have this problem: every one of its own circles already erases its own backdrop (same as any number circle does), and the outer belt's color showing through the *gaps between* those circles — and in the margin around the whole nested pill (16.4) — is exactly the intended look, not something to paint over.

### 16.6 Minimum spacing between operands

`chainSpacing` (Part 9-ish shared config) sets the gap between two adjacent operands as a *percentage* of `(r1 + r2)` — fine when both shapes are similar sizes, but a small nested chain sitting next to a big multiplication square could end up with barely any visible gap, since the percentage is computed off a small `r1`. `_layoutChainTerms` now enforces an absolute floor on top of that percentage, independent of either shape's own size:

```js
const MIN_GAP = m * 0.04;
const gapAt = (r1, r2, minGap) => Math.max((r1 + r2) * CONFIG_OPERATIONS.chainSpacing, minGap);
```

`m` is the same panel-scale basis `_layoutChainTerms` already uses for sizing (`min(areaW, areaH)`), so the floor stays proportionate across different canvas sizes. It's applied identically in both the pre-fit-scale width estimate (`xs0`/`totalW0`, so the floor is accounted for *before* deciding whether to shrink to fit) and the final positions (`xs`, using `MIN_GAP * scale` so the floor shrinks right along with everything else if the chain did end up scaled down to fit its row).

### 16.7 Worked example: `(3×4) + (5+6-20)`

```
Outer chain: 2 terms
  term 0: mult  → 3×4 = 12           → rendered as the usual square (Part 1-14)
  term 1: chain → 5 + 6 - 20 = -9    → rendered as its OWN pill, rescaled (chainScale)
                                        to match the square's own node.r:
                                          circle(5) --belt(5+6=11, FILLED)-- circle(6)
                                                        --belt(6-20=-14, OUTLINED)-- circle(-20, outlined)

Outer belt: 12 + (-9) = 3 ≥ 0 → FILLED, wrapping the square (flat cap, node.r)
                                  and the whole nested pill (round cap, same node.r)
```

### 16.8 Scope note

A multiplication forces every sibling operand — plain numbers and nested chains alike — to match its size (Part 15.2, 16.3). Without a multiplication present, a nested chain sizes itself independently from its own magnitude, same as a plain number would. The color, rotation, and random-chain machinery is fully recursive and depth-unlimited either way.
