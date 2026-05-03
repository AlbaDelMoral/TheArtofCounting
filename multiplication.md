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

When either operand has decimal digits (e.g. `14.2` or `3.6`), the decimal sections extend **outside** the imaginary square.

### 7.1 Integer sections (inside square)

The integer digit groups always live inside the square following the normal N-section layout.

```
14.2:  integer digits [1, 4] → 2 sections inside square (top, bottom for horizontal)
3.6:   integer digits [3]    → padded to [0, 3] → 2 sections (left empty, right for vertical)
```

### 7.2 Decimal sections (outside square)

Decimal digit groups are appended after the integer sections and placed **outside the square**:

```
14.2:  decimal digit [2] → 1 section below sqB (outside, horizontal)
3.6:   decimal digit [6] → 1 section right of sqR (outside, vertical)
```

The decimal section size auto-sizes to fit its content (same formula as integer sections), plus the `decExt%` slider adds breathing room.

### 7.3 Decimal separator dashed line

A **dashed line** marks the boundary between integer and decimal sections:

- For horizontal decimals: a **horizontal dashed line** at `y = sqB` (bottom edge of square), spanning the full horizontal band length
- For vertical decimals: a **vertical dashed line** at `x = sqR` (right edge of square), spanning the full vertical band length

Properties:

- Same thickness as basic bands
- Square caps
- Dash/gap ratio controlled by `decDash%` slider
- Color matches the band color of that operand
- Drawn BEHIND the bands of the same axis (vertical dash → under horizontal bands)

### 7.4 Bands extend through decimal zones

When A has decimal sections (horizontal extending downward), vertical bands must also extend down to cover the full height. When B has decimal sections (vertical extending rightward), horizontal bands extend right to cover full width. All bands always span the entire grid extent including decimal extensions.

### 7.5 Decimals inside parentheses

When decimal numbers appear inside parentheses as part of a chain operation (e.g. `(1.5+2)×6`), the decimals are represented on the **number circles** using the decimal ring spec (dashed ring between decimal and integer rings inside the circle). The outer multiplication grid does NOT get decimal section extensions in this case — the decimal extension only applies to operands that directly multiply.

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

Colors are randomly assigned from a curated palette of 24 HSB color swatches on every shuffle (press **Space** or click **shuffle colors**):

- `colH` — color of horizontal bands (A operand)
- `colV` — color of vertical bands (B operand)
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
  intDigits=[1,4]  →  2 sections inside square (top=1 band, bottom=4 bands)
  decDigits=[2]    →  1 section BELOW square (2 bands)
  Horizontal dashed line at y=sqB, full width

B = 3.6:
  intDigits=[0,3]  →  2 sections inside square (left=0 empty, right=3 bands)
  decDigits=[6]    →  1 section RIGHT of square (6 bands)
  Vertical dashed line at x=sqR, full height

All bands extend through each other's decimal zones.
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
