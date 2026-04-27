# Claude Code Session Handoff — Visual Number System & Operations
## Project: TFG (Final Degree Project) — Positional Number System Visualiser

---

## 0. Who the User Is

This is a design/art-focused TFG (Trabajo de Fin de Grado) project. The user is building a visual number representation system as both an artistic and educational tool. They care deeply about aesthetics — clean, minimal, precise. They do NOT want unnecessary sliders, features, or abstractions. When they say "do not change anything else", they mean it literally. They also use custom typefaces (ABCROM family) that are loaded locally in the browser.

---

## 1. Project Structure

```
/Users/dev2020/Desktop/UDIT4/TFG/P5Ç/website/
├── index.html
├── numbers.html
├── operations.html
├── play.html              (redirects to numbers.html)
├── learn.html
├── system-numbers.md      (full documentation of the number system logic)
├── claude-code-1.md       (this file)
├── css/
│   ├── base.css
│   ├── layout.css         (nav, dropdown, glassmorphism panel)
│   └── numbers.css
├── js/
│   ├── numbers.js         (standalone number viewer — the original system)
│   └── operations.js      (operations viewer — the main active work)
└── data/
    └── palette.csv        (19 hand-picked color swatches, tagged dark/light)
```

---

## 2. Navigation Structure

All pages share the same nav. It has a hover dropdown under "Play":

```html
<nav class="site-nav">
  <a href="index.html">Home</a>
  <div class="nav-dropdown">
    <a href="numbers.html" class="active">Play</a>
    <div class="nav-dropdown-menu">
      <a href="numbers.html">Numbers</a>
      <a href="operations.html">Operations</a>
    </div>
  </div>
  <a href="learn.html">Learn</a>
</nav>
```

- The `class="active"` on a link turns it `color: aqua` via CSS.
- The dropdown is pure CSS hover — no JavaScript.
- Defined in `css/layout.css` under `.nav-dropdown` and `.nav-dropdown-menu`.
- Font: ABCROM, same as the rest of the UI.

---

## 3. The Visual Number System (core concept — also in system-numbers.md)

Every number becomes a **circle of concentric rings**. Each ring represents one digit. Rings grow outward from center. The digit value = how many of 10 equal arc portions ("wedges") are filled in that ring.

### Digit Extraction

```
"34.2"  → digits = [2, 4, 3],  decimalCount = 1
"342"   → digits = [2, 4, 3],  decimalCount = 0
"-7"    → digits = [7],        decimalCount = 0, isNegative = true
"-3.14" → digits = [4, 1, 3],  decimalCount = 2, isNegative = true
```

- Strip leading `-` → `isNegative = true`
- Split on `.` → integer + decimal parts
- Concatenate digits, **reverse** so index 0 = units digit

### Ring Geometry

```
innerR = outerR × ringAreaRatio   (default 0.9)
```

Rings grow **geometrically** (not equally) so each ring has roughly equal visual weight:

```
width of ring i = w₀ × growth^i   (default growth = 1.4)
```

### Positive vs Negative

- **Positive**: outer circle filled solid (`PAL.outer_fill`), portions filled
- **Negative**: outer circle stroke only (`PAL.outer_stroke`), portions outlined only (no fill)

### Decimal Numbers

A **dashed circle** is drawn between the units ring and the tenths ring. 10 segments, each 90% dash / 10% gap.

### Tick Marks

10 tick marks at every ring boundary. Length = `ringWidth × tickLengthRatio`.

### Center Dot

Small black dot at the exact center. Radius = `outerR × 0.025`.

### Rotation

Each circle has:
- `angle`: random starting angle
- `rotationSpeed`: random 0.003–0.018 rad/frame, CW or CCW randomly

Updated each frame: `data.angle += data.rotationSpeed`

### Reality Slider (0–100)

Controls crossfade between abstract visual and plain numeral:
- 0 = pure circles, no text
- 100 = pure numbers, no shapes

Implementation uses `drawingContext.globalAlpha` (Canvas2D API directly).

---

## 4. Color System

Colors come from `data/palette.csv` — 19 hand-picked swatches, each tagged `dark` or `light`.

The CSV columns are: `name, H, S, B, type`
- `name` = either a slot name (like `bg`, `outer_fill`) or `swatch_01` … `swatch_19`
- `H, S, B` = HSB values (p5.js colorMode HSB 360, 100, 100, 255)
- `type` = `dark` or `light`

**`SWATCHES`** = array of all `swatch_*` entries as `{ col, type }` objects.

**`reshuffleColors()`** — call `randomSeed(colorSeed)` BEFORE this:
1. Shuffle SWATCHES pool
2. Pull first `dark` swatch → `PAL.ticks`
3. Pull first `light` swatch → `PAL.outer_fill` / `PAL.outer_stroke`
4. Remaining: `PAL.ring_0` … `PAL.ring_5`, `PAL.decimal`, `PAL.label`

This means every circle gets a unique, stable, reproducible color arrangement.

**`getOuterCss(colorSeed)`** — replays the shuffle to find what `outer_fill` a circle would get, returns as CSS string `"R,G,B"`. Used to prevent belts from matching adjacent circle fills.

---

## 5. The Operations System (operations.js — the main active file)

### Concept

A **chain** is a sequence of N numbers connected by N-1 **belts** (rubber-band shapes). Each belt connects an adjacent pair of circles and represents the operation between them.

- Belt **filled** = local pair result is positive (valA + valB ≥ 0)
- Belt **outlined** (stroke only, no fill) = local pair result is negative

The visual is: circles sitting in a horizontal row, wrapped by belt shapes. Middle circles are inside two belts simultaneously.

### Belt Shape (drawBelt)

Uses Canvas2D arc() directly (NOT p5.js shapes). The shape is the **external tangent** wrapping of two circles:

```
Geometry: α = asin((R1 − R2) / d)   where d = distance between centers

tA_top = base − π/2 + α
tA_bot = base + π/2 − α
tB_top = base − π/2 + α
tB_bot = base + π/2 − α

Path: moveTo A_top
      → arc(A, tA_top→tA_bot, CCW=true)   ← far side of left circle
      → lineTo B_bot
      → arc(B, tB_bot→tB_top, CCW=true)   ← far side of right circle
      → closePath
```

BOTH arcs are counterclockwise (`true` as the last parameter to `ctx.arc()`). This is critical — if you get it wrong the shape inverts.

If the circles overlap so much that one contains the other, the function returns early (`d <= |R1 - R2| + 0.5`).

The belt radius is extended: `R = circle.r × (1 + beltMarginRatio)` so the belt wraps slightly outside each circle edge.

### Belt Colors

- Only picked from **light** swatches (or all swatches if no lights available)
- **Excluded**: the `outer_fill` colors of the two adjacent circles (so the belt is always distinguishable from the circles it connects)
- Color is stable per composition via `beltColorSeeds[i]`

### Magnitude-Based Sizing

Circle size is proportional to the number it represents. Specifically:

```javascript
mags  = nums.map(s => Math.log10(Math.abs(parseFloat(s)) + 1))
maxM  = Math.max(...mags, 0.001)
sizeTs = mags.map(m => {
  const magT = m / maxM      // 0..1 within this chain
  const rndT = random(1)
  return lerp(rndT, magT, CONFIG.valueSizeInfluence)
})
```

`valueSizeInfluence = 0` → all circles random size
`valueSizeInfluence = 1` → size purely driven by number magnitude

Default: `0.9` (mostly magnitude-driven, slight randomness).

### DATA STRUCTURE

```
chainData[i] — STABLE (generated once, never recomputed unless SPACE pressed)
  .nums           [numStr, …]         N number strings
  .sizeTs         [0..1, …]           N size values (blended mag + random)
  .colorSeeds     [int, …]            N color seeds (one per circle)
  .beltColorSeeds [int, …]            N-1 belt color seeds
  .angles         [rad, …]            N current rotation angles (mutated each frame)
  .rotSpeeds      [rad/frame, …]      N rotation speeds
  .fontIdxs       [int, …]            N font indices

chains[i] — RECOMPUTED on resize or slider change
  .circles  [{x, y, r, numStr, colorSeed, fontIdx}, …]
  .belts    [{cssColor, resultPositive}, …]           length = N-1
```

### Spacing / Positioning

Circles placed left-to-right:

```javascript
xs[0] = radii[0]
xs[i] = xs[i-1] + (radii[i-1] + radii[i]) × (1 − CONFIG.chainSpacing)
```

`chainSpacing = 0` → circles just touch
`chainSpacing > 0` → circles overlap
`chainSpacing < 0` → circles have a gap between them

The whole row is re-centered horizontally on canvas.

---

## 6. The Draw Loop — Reality Slider & Compositing (CRITICAL)

This is the most technically subtle part. Read carefully.

### The Problem

p5.js `push()` / `pop()` wraps Canvas2D `ctx.save()` / `ctx.restore()`. This means `globalAlpha` is saved and restored by every `push()/pop()`. So:

- If `globalAlpha = 0.5` BEFORE a `push()`, then `pop()` restores it back to 0.5 ✓
- If you set `globalAlpha = 0.5` INSIDE a `push()` block, then `pop()` restores it to whatever it was before the push ✓

**The rule**: always ensure `globalAlpha = 1` BEFORE calling `push()` if you want `pop()` to restore to 1.

### The White Punch-Out Technique

When belts are semi-transparent and circles are also semi-transparent, the belt color bleeds through the circle shape producing ugly color mixing. The fix is a **white punch-out**:

Before drawing each abstract circle, draw a solid white filled circle at full alpha. This erases whatever belt color was painted behind it. The abstract circle and number text then appear cleanly over white.

### The Draw Loop (current, correct implementation)

```javascript
function draw() {
  blendMode(BLEND);
  background(0, 0, 100); // HSB white

  for (let c = 0; c < chains.length; c++) {
    const chain = chains[c];
    const data  = chainData[c];

    // Advance rotation every frame
    for (let i = 0; i < data.angles.length; i++) data.angles[i] += data.rotSpeeds[i];

    // STEP 1: Draw belts — fade out with reality
    blendMode(BLEND);
    drawingContext.globalAlpha = 1 - CONFIG.reality / 100;
    for (let i = 0; i < chain.belts.length; i++) {
      const belt = chain.belts[i];
      const cA = chain.circles[i], cB = chain.circles[i + 1];
      const RA = cA.r * (1 + CONFIG.beltMarginRatio);
      const RB = cB.r * (1 + CONFIG.beltMarginRatio);
      drawBelt(cA.x, cA.y, RA, cB.x, cB.y, RB, belt.resultPositive, belt.cssColor);
    }

    // STEP 2: Draw circles — globalAlpha=1 so push() saves 1 and pop() restores 1
    drawingContext.globalAlpha = 1;

    for (let i = 0; i < chain.circles.length; i++) {
      const circle = chain.circles[i];
      const f      = FONTS[data.fontIdxs[i]];

      randomSeed(circle.colorSeed);
      reshuffleColors();

      const shapeAlpha = 1 - CONFIG.reality / 100;
      const textAlpha  = CONFIG.reality / 100;

      // a) WHITE PUNCH-OUT — erase belt color behind this circle
      push();
      noStroke();
      fill(0, 0, 100); // HSB white
      ellipse(circle.x, circle.y, circle.r * 2, circle.r * 2);
      pop();
      // globalAlpha = 1 after pop ✓

      // b) Abstract circle — fades out with reality
      push();
      translate(circle.x, circle.y);
      rotate(data.angles[i]);
      drawingContext.globalAlpha = shapeAlpha;
      drawNumber(circle.numStr, 0, 0, circle.r);
      pop(); // restores globalAlpha = 1 ✓

      // c) Number text — fades in with reality
      if (textAlpha > 0) {
        push();
        translate(circle.x, circle.y);
        rotate(data.angles[i]);
        const fs = Math.round(circle.r * 0.65);
        drawingContext.globalAlpha = textAlpha;
        drawingContext.font        = `${f.style} ${f.weight} ${fs}px ${f.family}, sans-serif`;
        drawingContext.textAlign   = "center";
        drawingContext.textBaseline = "middle";
        drawingContext.fillStyle   = "#111111";
        drawingContext.fillText(circle.numStr, 0, 0);
        pop(); // restores globalAlpha = 1 ✓
      }
    }
  }

  randomSeed();
  // bokeh and grain follow...
}
```

**At reality = 100:**
- Belts: `globalAlpha = 0` → invisible
- White punch-out: always full alpha → white discs
- Abstract circles: `shapeAlpha = 0` → invisible
- Text: `textAlpha = 1` → fully visible

Result: clean white background, only the number text showing. No shapes, no belts.

---

## 7. CONFIG Reference (operations.js)

```javascript
const CONFIG = {
  numOps: 1,               // always one chain at a time (DO NOT add multi-chain UI)
  numChainNums: 3,         // number of operands per chain (controlled by "length" slider)
  compScale: 0.09,         // base radius as fraction of min(width, height)
  sizeVariation: 0.9,      // spread of circle sizes (0=uniform, 1=wide range)
  chainSpacing: -0.5,      // 0=touching, negative=gap, positive=overlap

  valueSizeInfluence: 0.9, // 0=random size, 1=size fully driven by number magnitude

  beltMarginRatio: 0.12,   // how far belt extends beyond circle edge (as fraction of r)
  beltStrokeRatio: 0.04,   // belt outline stroke weight / larger circle radius

  ringAreaRatio: 0.9,      // fraction of outerR used for all rings
  ringGrowth: 1.4,         // geometric growth rate of ring widths

  outerStrokeRatio: 0.04,  // outer circle stroke weight / outerR
  negStrokeRatio: 0.035,   // negative portion outline weight / outerR
  portionArcSteps: 38,     // polygon resolution for arc approximation

  tickLengthRatio: 0.15,   // tick length / local ring width
  tickStrokeWeight: 1,     // tick stroke in px (absolute)
  tickOpacity: 255,        // tick opacity (0–255)

  decimalStrokeRatio: 0.05,
  decimalDashCount: 10,
  decimalDashRatio: 0.9,
  decimalMarginRatio: 0.09,

  centerDotRatio: 0.025,

  bokeh: 0,                // Gaussian blur in px
  grainAmount: 0,          // grain intensity 0–100
  reality: 0,              // 0=abstract circles, 100=readable numerals
};
```

---

## 8. Sliders (current, in order in the panel)

| Slider | Variable | Range | Maps to |
|--------|----------|-------|---------|
| length | sliderLength | 2–6 | CONFIG.numChainNums |
| size | sliderScale | 1–40 | CONFIG.compScale × 100 |
| spread | sliderSpread | 0–95 | CONFIG.sizeVariation × 100 |
| spacing | sliderSpacing | -150–95 | CONFIG.chainSpacing × 100 |
| margin | sliderMargin | 0–50 | CONFIG.beltMarginRatio × 100 |
| bokeh | sliderBokeh | 0–30 | CONFIG.bokeh |
| grain | sliderGrain | 0–100 | CONFIG.grainAmount |
| reality | sliderReality | 0–100 | CONFIG.reality |

**There is NO "count" slider** (it was removed). One chain only, always.

Expression input box at top of panel: type `"2 + 3 - 10"`, press Enter to apply, Escape to go back to random.

---

## 9. p5.js + Canvas2D Quirks — Things That Burned Us

### globalAlpha + push/pop

`push()/pop()` saves and restores `globalAlpha`. Always set `globalAlpha` OUTSIDE push if you want it to persist. Always set to 1 before a push if you want pop to restore to 1.

### colorMode

The entire file uses `colorMode(HSB, 360, 100, 100, 255)`. When calling `background(0, 0, 100)` that is HSB white (hue 0, sat 0, brightness 100). Never use raw RGB values with p5 fill/stroke in this file.

### Converting p5 color to CSS string

```javascript
// HSB color → CSS for Canvas2D fillStyle / strokeStyle
const css = `rgb(${floor(red(col))},${floor(green(col))},${floor(blue(col))})`;
```

`red()`, `green()`, `blue()` extract the RGB components from a p5 color object (regardless of colorMode).

### drawingContext

`drawingContext` is the raw Canvas2D context. Use it directly for:
- `globalAlpha`
- `filter` (for bokeh blur)
- `setLineDash()` (for decimal ring)
- `font`, `textAlign`, `textBaseline`, `fillText()` (for text rendering)
- `arc()`, `beginPath()`, `fill()`, `stroke()` (for belt shape)

All other drawing uses p5.js functions.

### randomSeed + shuffle

p5's `shuffle()` uses the internal random state. So `randomSeed(n); shuffle(arr)` always produces the same shuffle for the same seed `n`. This is how stable color assignments work. Always call `randomSeed()` (no args) after any seeded block to restore true randomness.

---

## 10. Fonts

Seven ABCROM typeface variants are available. Each circle gets one assigned randomly at composition time (`fontIdxs`). Font size = `outerR × 0.65`.

```javascript
const FONTS = [
  { family: "ABCROM",           weight: "bold", style: "normal" },
  { family: "ABCROMWide",       weight: "900",  style: "normal" },
  { family: "ABCROMWide",       weight: "400",  style: "italic" },
  { family: "ABCROMExtended",   weight: "900",  style: "normal" },
  { family: "ABCROMExtended",   weight: "400",  style: "normal" },
  { family: "ABCROMCompressed", weight: "300",  style: "normal" },
  { family: "ABCROMCompressed", weight: "900",  style: "normal" },
];
```

---

## 11. Effects

### Bokeh

Gaussian blur via Canvas2D filter:
```javascript
const snap = get();
background(0, 0, 100);
drawingContext.filter = `blur(${CONFIG.bokeh}px)`;
image(snap, 0, 0);
drawingContext.filter = "none";
```

### Grain

A static noise texture (`grainGraphics`) generated once. Overlaid each frame via `blendMode(OVERLAY)` at variable alpha.

---

## 12. Interaction

| Key / Action | Effect |
|---|---|
| `SPACE` | New random composition (calls `generateChainData()`) |
| `S` / `s` | Save 3× resolution PNG with timestamp |
| Expression input → Enter | Apply custom operation chain |
| Expression input → Escape | Return to random |

Keyboard handler checks `document.activeElement.tagName === "INPUT"` to suppress SPACE/S when the user is typing in the input box.

---

## 13. What Was Recently Fixed / Current State

The last active task before this handoff was fixing the **reality slider rendering**. The user complained that at reality=100, the abstract shapes were still partially visible ("ink bleed black" / colored blobs behind numbers).

The fix applied was the **white punch-out approach** in the draw loop — described in full in Section 6 above. The user requested this fix and it was applied to `operations.js`. As of this handoff, the fix has been written to disk but the user has NOT yet confirmed whether it works correctly. This should be the FIRST thing to verify when resuming.

**Expected behavior at reality=100:** Only clean text numerals on a white background. No ring shapes, no filled outer circles, no belts, no colored anything — just numbers.

---

## 14. The numbers.js File

`numbers.js` is the original standalone number viewer. It is NOT operations.js. Do not confuse them. `numbers.js` powers `numbers.html` and has:
- Its own complete CONFIG
- Its own panel with different sliders
- No belts, no operations, no chains — just individual number circles
- The same `drawNumber()`, `reshuffleColors()`, `getDigits()` etc. logic

**If you ever need to change something in both files**, change them separately and carefully. They are independent.

---

## 15. Things the User Cares About / Aesthetic Principles

1. **No unnecessary features.** If the user didn't ask for a slider, don't add one. If a parameter exists in CONFIG, it doesn't need a UI control unless requested.
2. **One chain at a time.** The "count" slider was explicitly removed. `numOps = 1` always.
3. **Full alpha on belts.** No semi-transparency on belt fill. `globalAlpha = 1 - reality/100` but at reality=0 that is 1.0, full color.
4. **No outline when belt is filled.** Positive result = filled, no stroke at all. Negative = stroke only, no fill.
5. **Belt colors always from palette.csv.** Never hardcoded hex colors.
6. **Belt never matches adjacent circle fill.** The `getOuterCss()` exclusion system handles this.
7. **Sizing reflects magnitude.** Big number = bigger circle. `valueSizeInfluence = 0.9` by default.
8. **Clean at reality=100.** Absolutely nothing except text visible. White background, dark numerals.
9. **Font is always ABCROM family.** Even the panel UI.
10. **Glassmorphism panel.** `backdrop-filter: blur(30px)`, `background: rgba(255,255,255,0.78)`, `border-right: 1px solid rgba(255,255,255,0.35)`.

---

## 16. Possible Next Steps (things the user may want to continue)

- Verify the reality slider fix works correctly at all values (0, 50, 100)
- Potentially add **multiplication** as a new operation type (currently only addition/subtraction)
- The `learn.html` page may need content
- The `index.html` home page may need updates
- Visual refinements to how belts look when circles overlap heavily or are very different in size

---

## 17. File Paths Quick Reference

| What | Where |
|---|---|
| Main active sketch | `/Users/dev2020/Desktop/UDIT4/TFG/P5Ç/website/js/operations.js` |
| Number-only sketch | `/Users/dev2020/Desktop/UDIT4/TFG/P5Ç/website/js/numbers.js` |
| Nav + panel CSS | `/Users/dev2020/Desktop/UDIT4/TFG/P5Ç/website/css/layout.css` |
| Color palette | `/Users/dev2020/Desktop/UDIT4/TFG/P5Ç/website/data/palette.csv` |
| Number system docs | `/Users/dev2020/Desktop/UDIT4/TFG/P5Ç/website/system-numbers.md` |
| Operations page HTML | `/Users/dev2020/Desktop/UDIT4/TFG/P5Ç/website/operations.html` |
| Numbers page HTML | `/Users/dev2020/Desktop/UDIT4/TFG/P5Ç/website/numbers.html` |

---

*This document was generated at the end of a long working session to allow seamless continuation in a new Claude Code context window.*
