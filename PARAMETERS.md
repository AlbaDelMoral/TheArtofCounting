# Interactive Parameters — The Art of Counting

A full map of every slider, input, toggle, and config value the user can interact with across the three sketch pages. Use this for brainstorming what to keep, remove, expose differently, or add.

---

## 1. Numbers page (`numbers.js`)

The simplest page: a row of number circles, fully compositional.

### Text input
| Input | What it does |
|-------|--------------|
| numbers field | Type specific numbers (e.g. `7  42  3.14  −5`) separated by spaces/commas. Enter to apply, Esc to clear and go back to random. |

### Sliders
| Slider | Range | Default | What it controls |
|--------|-------|---------|------------------|
| **count** | 1–30 | 10 | How many circles appear |
| **size** | 1–40 | 12 | Base radius as % of canvas short edge |
| **spread** | 0–95 | 50 | Size variation — 0 = all same size, 95 = big spread |
| **overlap** | 0–95 | 0 | How much circles overlap — 0 = touching edges |
| **bokeh** | 0–30 px | 0 | Gaussian blur applied to the whole canvas |
| **grain** | 0–100 | 0 | Film grain intensity |
| **reality** | 0–100 | 0 | Crossfade from abstract circles → readable digit typography |

### Keyboard shortcuts
| Key | Action |
|-----|--------|
| `Space` | Regenerate all numbers and colors |
| `S` | Save a high-quality PNG (3× resolution) |

---

## 2. Operations page (`operations.js`)

Addition/subtraction chains. Circles connected by filled (positive) or outlined (negative) belts.

### Text input
| Input | What it does |
|-------|--------------|
| expression field | Type an expression like `2 + 3 - 10`. Enter to apply, Esc to go random. Supports chains of any length. |

### Sliders
| Slider | Range | Default | What it controls |
|--------|-------|---------|------------------|
| **length** | 2–6 | 3 | Numbers per random chain (→ that many –1 belts) |
| **size** | 1–40 | 9 | Base circle radius as % of canvas short edge |
| **spread** | 0–95 | 90 | Size variation across circles in the chain |
| **spacing** | –150 to 95 | –50 | Gap between circles — negative = gap, positive = overlap |
| **margin** | 0–50 | 12 | Belt offset from circle edge (% of radius) |
| **bokeh** | 0–30 px | 0 | Gaussian blur |
| **grain** | 0–100 | 0 | Film grain intensity |
| **reality** | 0–100 | 0 | Crossfade from abstract → readable numbers |

### Keyboard shortcuts
| Key | Action |
|-----|--------|
| `Space` | Regenerate random chain and colors |
| `S` | Save high-quality PNG (4× resolution) |

### Internal (not exposed to user)
- `valueSizeInfluence` (0.9) — how much the numeric magnitude drives circle size vs. random
- `beltStrokeRatio` (0.04) — stroke weight of the outlined belt for negative results

---

## 3. Multiplication page (`multiplication.js`)

Grid-based visual multiplication. Each operand pair shown as a rectangle of crossing bands.

### Text input
| Input | What it does |
|-------|--------------|
| expression field | Type `14x15`, `(2+4)x8`, or chains like `3x4x5`. Enter to apply, Esc resets to `14x15`. |
| **Random** button | Generates a random chain of 3–6 operands (mix of 1-, 2-, 3-digit numbers; some decimals, some negatives) |

### Canvas navigation
| Gesture | Action |
|---------|--------|
| Scroll | Zoom in/out (toward cursor) |
| Drag | Pan |
| Double-click | Reset zoom and pan |

### Sliders — band geometry
| Slider | Range | Default | What it controls |
|--------|-------|---------|------------------|
| **thickness** (bw) | 2–60 px | 14 | Width of each place-value band |
| **overhang** (oh) | 0–150 px | 40 | How far bands extend beyond the multiplication square |
| **line gap** (lgap) | 0–60 px | 8 | Gap between bands within one digit group |
| **digit gap** (dgap) | 0–400 px | 50 | Gap between digit groups — also sets the square size |
| **decimal ext %** (decExt) | 10–100% | 45 | Extra breathing room for the decimal section |

### Sliders — op-chain circles (the number circles along the bands)
| Slider | Range | Default | What it controls |
|--------|-------|---------|------------------|
| **band thickness** (obw) | 10–100 px | 32 | Height/width of the op-chain bands |
| **circle size** (circleScale) | 30–100% | 85% | Circle radius relative to band thickness |
| **band margin** (bandMargin) | 0–80 px | 0 | Inset of circle span from band edges |
| **belt padding** (pad) | 0–30 px | 5 | Extra space beyond circle edge in belt |

### Sliders — number circle drawing
| Slider | Range | Default | What it controls |
|--------|-------|---------|------------------|
| **ring area %** (ringAreaRatio) | 40–98% | 88% | How much of the circle area is occupied by rings |
| **ring growth ×100** (ringGrowth) | 100–250 | 140 | How fast rings grow outward |
| **neg stroke %** (negStrokeRatio) | 1–12% | 4% | Stroke weight of outlined portions (negative numbers) |
| **tick length %** (tickLengthRatio) | 5–60% | 30% | Length of the 9-tick marks |
| **dec margin %** (decimalMarginRatio) | 0–15% | 4% | Gap between last ring and decimal dashed ring |
| **dash fill %** (decimalDashRatio) | 20–98% | 82% | How much of each dash segment is filled vs. gap |
| **dec stroke %** (decimalStrokeRatio) | 1–15% | 5% | Stroke weight of the decimal dashed ring |

### Sliders — effects
| Slider | Range | Default | What it controls |
|--------|-------|---------|------------------|
| **bokeh** | 0–30 px | 0 | Gaussian blur |
| **grain** | 0–100 | 0 | Film grain intensity |

### Keyboard shortcuts
| Key | Action |
|-----|--------|
| `Space` | New random colors (same expression) |
| `S` | Save high-quality PNG (4× resolution) |

---

## 4. Shared drawing parameters (number-system.js `CONFIG`)

These are set per-page and control the number circle rendering engine. Most are exposed via sliders above, but some are hardcoded:

| Parameter | What it does |
|-----------|--------------|
| `blendModeName` | p5 blend mode for rings (BLEND, ADD, MULTIPLY, SCREEN…). Currently "NONE" everywhere. |
| `portionArcSteps` | Smoothness of the pie-wedge arcs (38 = smooth) |
| `tickOpacity` | Opacity of the 9 tick marks (0–255) |
| `tickStrokeWeight` | Pixel weight of tick lines (independent of circle size) |
| `centerDotRatio` | Size of the center dot as % of radius |
| `outerStrokeRatio` | Stroke weight of the outer circle border |

---

## 5. Color system

Not interactive via sliders — driven by CSV files and the palette logic.

| File | Controls |
|------|----------|
| `data/palette.csv` | Belt/swatch color pool (HSB rows, used by operations + multiplication) |
| `data/palette2.csv` | Digit-specific ring colors — 9 digits × 3 tiers (dark/mid/light) |
| `data/palette3.csv` | Digit-specific background circle colors — 9 rows (one per digit 1–9) |

**How color is assigned:**
- Background circle color → keyed to the **most significant digit** of the number
- Ring arc color → keyed to each **individual digit** in the number, using the `mid` tier
- Belt color (operations/multiplication) → picked from the swatch pool, excluding the two connected circles' colors

---

## 6. Homepage (`home.js`)

The falling number circles animation (currently toggled off).

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

- **reality slider** exists on Numbers and Operations but not Multiplication — is that intentional?
- **grain and bokeh** are on all three pages but not linked — should they be global?
- **blendModeName** is never exposed to the user but could be a powerful visual toggle
- **tickOpacity** is 0 on Numbers/home (hidden), 255 on Operations/Multiplication — could be a slider
- The **color system** is currently not user-facing at all — palette editing, digit color remapping, or a "shuffle palette" button could be interesting
- **valueSizeInfluence** on Operations (how much number magnitude drives size) is internal but potentially interesting to expose
