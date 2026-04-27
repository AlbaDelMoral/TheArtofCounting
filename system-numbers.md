# Visual Number System — system-numbers

A positional number system made visible. Each number is drawn as a circle of concentric rings, where the geometry encodes the value directly — no labels, no axes, just shape and color.

---

## 1. Core Concept

Every number becomes a circle. Inside that circle, rings grow outward from the center, one ring per digit. Each ring is divided into ten equal portions (like a clock face); the digit's value determines how many of those portions are filled in.

```
number: 342

ring 0 (innermost) → digit 2 (units)      → 2 out of 10 portions filled
ring 1             → digit 4 (tens)       → 4 out of 10 portions filled
ring 2 (outermost) → digit 3 (hundreds)  → 3 out of 10 portions filled
```

Digit 0 means an empty ring — no portions drawn, the ring is invisible.

---

## 2. Digit Extraction

The number string is parsed character by character:

1. Strip a leading `−` if present → mark `isNegative = true`
2. Split on `.` to separate integer and decimal parts
3. Concatenate the digits (without the dot): e.g. `"34.2"` → `"342"`
4. **Reverse** the array so index 0 is always the units digit

```
"34.2"  → digits = [2, 4, 3],  decimalCount = 1
"342"   → digits = [2, 4, 3],  decimalCount = 0
"-7"    → digits = [7],        decimalCount = 0, isNegative = true
"-3.14" → digits = [4, 1, 3],  decimalCount = 2, isNegative = true
```

The number of rings = the number of digits (integer digits + decimal digits combined).

---

## 3. Ring Geometry

Rings grow outward from the center. The total usable radius is:

```
innerR = outerR × ringAreaRatio        (default: outerR × 0.9)
```

The remaining 10% is left as a visual margin between the outermost ring and the circle edge.

Rings are **not equal in width** — they grow geometrically so that each ring has more visual area than the one inside it, making all rings roughly perceptually equal in weight:

```
width of ring i = w₀ × growth^i        (default growth = 1.4)
```

where `w₀` is computed so that all rings sum exactly to `innerR`. The boundary of each ring is stored as the cumulative sum up to that ring.

If `growth ≈ 1`, rings fall back to equal width.

---

## 4. Portion Rendering (Annular Wedge)

Each portion is a **filled arc segment** between two radii (inner and outer boundary of the ring) and two angles.

The circle is divided into 10 equal angles of `2π / 10` radians each, starting from the **top** (`−π/2`, i.e. 12 o'clock) and going clockwise.

Each wedge is drawn as a polygon approximated with 38 arc steps for smoothness. For the innermost ring (ring 0), the inner radius collapses to 0, making it a pie slice instead of an annular wedge.

---

## 5. Positive vs. Negative Numbers

### Positive

- The outer circle is **filled** with a solid color (`PAL.outer_fill`)
- Portions inside are also filled solid

### Negative

- The outer circle is drawn as a **stroke only** (no fill), using `PAL.outer_stroke`
- Each portion is also drawn as an **outline only** — no fill, just a stroke contour
- The stroke weight scales proportionally with the circle size: `outerR × negStrokeRatio`

This means positive numbers are solid/opaque, negative numbers are skeletal/hollow — the same shape language, but inverted fill.

---

## 6. Decimal Numbers

When a number has decimal digits, the decimal point is visualised as a **dashed circle ring** drawn between the units ring and the tenths ring.

Specifically, the decimal ring is drawn at:

```
radius = boundary of the (decimalCount − 1)th ring + outerR × decimalMarginRatio
```

The dashing pattern: the circumference is divided into 10 equal segments, each segment split 90% dash / 10% gap (`decimalDashRatio = 0.9`).

For example, `"34.2"` has `decimalCount = 1`, so the decimal ring appears just outside ring 0 (units), between units and tens.

---

## 7. Tick Marks

Every ring boundary has **10 tick marks**, evenly distributed around the ring, starting from the top. They act as a visual scale — equivalent to the 10 positions that portions can occupy.

Tick length scales with the local ring width: `tickLen = ringWidth × tickLengthRatio`.

Ticks are always drawn in the dark palette color assigned to that circle.

---

## 8. Center Dot

A small filled black dot at the exact center of every circle. Radius = `outerR × centerDotRatio` (default 0.025 × outerR). Acts as a visual anchor / origin point.

---

## 9. Color System

Colors come from a CSV palette of 19 hand-picked swatches, each tagged as `dark` or `light`.

Each circle gets its own **stable, unique color assignment** determined by a fixed `colorSeed`. Before every redraw, `randomSeed(colorSeed)` is called so the shuffle always produces the same result for that circle regardless of frame or slider changes.

### Assignment rules (per circle)

| Slot | Source | Used for |
|---|---|---|
| `ticks` | 1 dark swatch | all 10 tick marks on all rings |
| `outer_fill` / `outer_stroke` | 1 light swatch | outer circle fill (positive) or stroke (negative) |
| `ring_0` … `ring_5` | next 6 swatches (any type) | ring fill / outline color, cycling if >6 rings |
| `decimal` | next swatch | dashed decimal ring |
| `label` | next swatch | (reserved for future label use) |

The pool is shuffled each time, so every circle gets a different color arrangement while remaining consistent frame-to-frame.

---

## 10. Rotation

Each circle has two rotation properties assigned once when the composition is generated:

| Property | Value |
|---|---|
| `angle` | random starting angle (`0 → 2π`) |
| `rotationSpeed` | random speed between `0.003` and `0.018` rad/frame, sign random (CW or CCW) |

Every frame: `data.angle += data.rotationSpeed`

The circle is drawn inside a `push() / translate(cx, cy) / rotate(angle) / pop()` block, so the entire circle (rings, ticks, decimal ring, center dot, and any number text) rotates as one unit around its own center.

---

## 11. Reality Slider

The **reality** parameter (0–100) controls a crossfade between the abstract visual representation and a plain readable numeral.

| Reality | What you see |
|---|---|
| 0 | Pure circles — no text, fully abstract |
| 50 | 50% circle opacity + 50% text opacity (overlaid) |
| 100 | Pure numeral — circles invisible, just the number |

Implementation:
- `drawingContext.globalAlpha = 1 − reality/100` → applied before drawing the circle
- `drawingContext.globalAlpha = reality/100` → applied before drawing the text
- Both are drawn inside the same rotated block, so the numeral rotates with the circle
- `globalAlpha` is reset to 1 after each circle

### Number typography

Each circle is assigned a random font at composition time (`fontIdx`), chosen from 7 ABCROM typeface variants:

| Family | Weight | Style |
|---|---|---|
| ABCROM | bold | normal |
| ABCROMWide | 900 | normal |
| ABCROMWide | 400 | italic |
| ABCROMExtended | 900 | normal |
| ABCROMExtended | 400 | normal |
| ABCROMCompressed | 300 | normal |
| ABCROMCompressed | 900 | normal |

Font size = `outerR × 0.65`, so text scales with the circle.

---

## 12. Composition Layout

Multiple circles are arranged in a **horizontal line**, centered on the canvas.

Each circle has a random `sizeT` (0–1) that maps to an actual radius:

```
lo = compScale × (1 − sizeVariation)
hi = compScale × (1 + sizeVariation)
radius = lerp(lo, hi, sizeT) × min(canvasW, canvasH)
```

Circles are placed edge-to-edge (or overlapping) left to right:

```
x[i] = x[i−1] + (r[i−1] + r[i]) × (1 − overlapFactor)
```

`overlapFactor = 0` → circles just touch  
`overlapFactor = 1` → all circles stacked on the same center  

The whole line is then re-centered on the canvas horizontally.

**Stable data vs. recomputed positions:**
- `compositionData[]` stores the number strings, sizes, color seeds, rotation state, and font assignments — these never change unless SPACE is pressed
- `composition[]` stores the actual pixel coordinates — recomputed any time the canvas resizes or sliders change

---

## 13. Visual Effects

### Bokeh
A Gaussian blur applied to the whole canvas via `drawingContext.filter = blur(Npx)`. The current frame is captured, the canvas is cleared, and the blurred snapshot is redrawn. Strength 0–30px.

### Grain
A static noise texture (random grayscale pixels, generated once) is overlaid using OVERLAY blend mode. Alpha scales from 0 (invisible) to 200 (heavy grain) as the slider moves 0–100.

---

## 14. Interaction

| Key / Action | Effect |
|---|---|
| `SPACE` | Generate a new random composition |
| `S` | Save a 3× resolution PNG with timestamp |
| Number input (top of panel) | Type space/comma-separated numbers → Enter to apply, Esc to go back to random |

---

## 15. Config Reference

| Parameter | Default | Description |
|---|---|---|
| `numCircles` | 10 | Number of circles in a random composition |
| `compScale` | 0.12 | Base radius as fraction of `min(width, height)` |
| `sizeVariation` | 0.5 | Spread of circle sizes (0 = uniform, 1 = wide range) |
| `overlapFactor` | 0 | 0 = touching, 1 = fully overlapping |
| `ringAreaRatio` | 0.9 | Fraction of `outerR` used for rings |
| `ringGrowth` | 1.4 | Geometric growth rate of ring widths |
| `outerStrokeRatio` | 0.04 | Outer circle stroke weight / outerR |
| `negStrokeRatio` | 0.035 | Negative portion outline weight / outerR |
| `portionArcSteps` | 38 | Polygon resolution for arc approximation |
| `tickLengthRatio` | 0.15 | Tick length / local ring width |
| `tickStrokeWeight` | 1 | Tick stroke in px (absolute) |
| `tickOpacity` | 255 | Tick opacity (0–255) |
| `decimalStrokeRatio` | 0.05 | Decimal ring stroke weight / outerR |
| `decimalDashCount` | 10 | Number of dash segments in decimal ring |
| `decimalDashRatio` | 0.9 | Fraction of each segment that is solid (vs gap) |
| `decimalMarginRatio` | 0.09 | Gap between units ring and decimal ring / outerR |
| `centerDotRatio` | 0.025 | Center dot radius / outerR |
| `bokeh` | 0 | Gaussian blur in px (0 = off) |
| `grainAmount` | 0 | Grain intensity 0–100 |
| `reality` | 0 | 0 = abstract circles, 100 = readable numerals |
