// operations.js — Visual Number System: Addition & Subtraction (Chained)
// N numbers → N-1 belts connecting adjacent pairs.
// Filled belt = local pair result positive.  Outlined belt = negative.
// Middle numbers sit inside two belts simultaneously.
// SPACE = new composition.  S = save PNG.

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  // ── composition ──────────────────────────────────────────────────────────────
  numOps: 1, // always one chain at a time
  numChainNums: 3, // numbers per random chain (→ numChainNums-1 belts)
  compScale: 0.09, // base radius as fraction of min(w,h)
  sizeVariation: 0.9,
  chainSpacing: -0.5, // 0 = circles just touch · negative = gap · positive = overlap

  // ── size by value ─────────────────────────────────────────────────────────────
  // 0 = all circles same size · 1 = size fully driven by number magnitude (log scale)
  // sizeVariation slider controls the min/max spread; this controls how much
  // the actual number values steer within that spread.
  valueSizeInfluence: 0.9,

  // ── belt ──────────────────────────────────────────────────────────────────────
  beltMarginRatio: 0.12, // belt offset = r × this (gap between circle edge and belt)
  beltStrokeRatio: 0.04, // outline stroke weight / larger circle radius (negative result only)

  // ── ring geometry ─────────────────────────────────────────────────────────────
  ringAreaRatio: 0.9,
  ringGrowth: 1.4,

  // ── outer circle ─────────────────────────────────────────────────────────────
  outerStrokeRatio: 0.04,

  // ── cake portions ─────────────────────────────────────────────────────────────
  portionArcSteps: 38,
  negStrokeRatio: 0.035,

  // ── tick marks ────────────────────────────────────────────────────────────────
  tickLengthRatio: 0.15,
  tickStrokeWeight: 1,
  tickOpacity: 255,

  // ── decimal ring ──────────────────────────────────────────────────────────────
  decimalStrokeRatio: 0.05,
  decimalDashCount: 10,
  decimalDashRatio: 0.9,
  decimalMarginRatio: 0.09,

  // ── center dot ────────────────────────────────────────────────────────────────
  centerDotRatio: 0.025,

  // ── effects ───────────────────────────────────────────────────────────────────
  bokeh: 0,
  grainAmount: 0,
  reality: 0,
};

// ─── font table ───────────────────────────────────────────────────────────────
const FONTS = [
  { family: "ABCROM", weight: "bold", style: "normal" },
  { family: "ABCROMWide", weight: "900", style: "normal" },
  { family: "ABCROMWide", weight: "400", style: "italic" },
  { family: "ABCROMExtended", weight: "900", style: "normal" },
  { family: "ABCROMExtended", weight: "400", style: "normal" },
  { family: "ABCROMCompressed", weight: "300", style: "normal" },
  { family: "ABCROMCompressed", weight: "900", style: "normal" },
];

// ─── palette ──────────────────────────────────────────────────────────────────
let paletteTable;
let PAL = {};
let SWATCHES = [];

function preload() {
  paletteTable = loadTable("data/palette.csv", "csv", "header");
}

function buildPalette() {
  colorMode(HSB, 360, 100, 100, 255);
  SWATCHES = [];
  for (let i = 0; i < paletteTable.getRowCount(); i++) {
    const row = paletteTable.getRow(i);
    const name = row.getString("name");
    const h = row.getNum("H");
    const s = row.getNum("S");
    const b = row.getNum("B");
    const type = row.getString("type");
    const col = color(h, s, b);
    PAL[name] = col;
    if (name.startsWith("swatch_")) SWATCHES.push({ col, type });
  }
}

// Unique color set per circle — call randomSeed(colorSeed) before this.
function reshuffleColors() {
  const pool = shuffle(SWATCHES.slice());
  const di = pool.findIndex((s) => s.type === "dark");
  PAL.ticks = pool.splice(di, 1)[0].col;
  const li = pool.findIndex((s) => s.type === "light");
  const outerCol = pool.splice(li, 1)[0].col;
  PAL.outer_fill = outerCol;
  PAL.outer_stroke = outerCol;
  PAL.ring_0 = pool[0].col;
  PAL.ring_1 = pool[1].col;
  PAL.ring_2 = pool[2].col;
  PAL.ring_3 = pool[3].col;
  PAL.ring_4 = pool[4].col;
  PAL.ring_5 = pool[5].col;
  PAL.decimal = pool[6].col;
  PAL.label = pool[7].col;
  PAL.rings = [
    PAL.ring_0,
    PAL.ring_1,
    PAL.ring_2,
    PAL.ring_3,
    PAL.ring_4,
    PAL.ring_5,
  ];
}

// ─── digit extraction ─────────────────────────────────────────────────────────
function getDigits(numStr) {
  const isNegative = numStr.startsWith("-");
  const s = isNegative ? numStr.slice(1) : numStr;
  const parts = s.split(".");
  const intPart = parts[0];
  const decPart = parts.length > 1 ? parts[1] : "";
  const decimalCount = decPart.length;
  const digits = (intPart + decPart).split("").reverse().map(Number);
  return { digits, decimalCount, isNegative };
}

// ─── annular wedge ────────────────────────────────────────────────────────────
function annularWedge(cx, cy, r1, r2, a1, a2, col, outlined, outerR) {
  push();
  if (outlined) {
    noFill();
    stroke(col);
    strokeWeight(outerR * CONFIG.negStrokeRatio);
    strokeCap(ROUND);
    strokeJoin(ROUND);
  } else {
    fill(col);
    noStroke();
  }
  beginShape();
  if (r1 === 0) {
    vertex(cx, cy);
    for (let i = 0; i <= CONFIG.portionArcSteps; i++) {
      const a = lerp(a1, a2, i / CONFIG.portionArcSteps);
      vertex(cx + cos(a) * r2, cy + sin(a) * r2);
    }
  } else {
    for (let i = 0; i <= CONFIG.portionArcSteps; i++) {
      const a = lerp(a1, a2, i / CONFIG.portionArcSteps);
      vertex(cx + cos(a) * r2, cy + sin(a) * r2);
    }
    for (let i = CONFIG.portionArcSteps; i >= 0; i--) {
      const a = lerp(a1, a2, i / CONFIG.portionArcSteps);
      vertex(cx + cos(a) * r1, cy + sin(a) * r1);
    }
  }
  endShape(CLOSE);
  pop();
}

// ─── tick marks ───────────────────────────────────────────────────────────────
function drawTicks(cx, cy, r, localW) {
  push();
  stroke(
    hue(PAL.ticks),
    saturation(PAL.ticks),
    brightness(PAL.ticks),
    CONFIG.tickOpacity,
  );
  strokeWeight(CONFIG.tickStrokeWeight);
  strokeCap(SQUARE);
  noFill();
  const tickLen = localW * CONFIG.tickLengthRatio;
  for (let i = 0; i < 10; i++) {
    const a = -HALF_PI + i * (TWO_PI / 10);
    const x1 = cx + cos(a) * r,
      y1 = cy + sin(a) * r;
    const x2 = cx + cos(a) * (r - tickLen),
      y2 = cy + sin(a) * (r - tickLen);
    line(x1, y1, x2, y2);
  }
  pop();
}

// ─── decimal ring ─────────────────────────────────────────────────────────────
function drawDecimalRing(cx, cy, r, outerR) {
  push();
  noFill();
  stroke(PAL.decimal);
  strokeWeight(outerR * CONFIG.decimalStrokeRatio);
  strokeCap(SQUARE);
  const seg = (TWO_PI * r) / CONFIG.decimalDashCount;
  const dash = seg * CONFIG.decimalDashRatio;
  const gap = seg * (1 - CONFIG.decimalDashRatio);
  drawingContext.setLineDash([dash, gap]);
  ellipse(cx, cy, r * 2, r * 2);
  drawingContext.setLineDash([]);
  pop();
}

// ─── ring boundaries ──────────────────────────────────────────────────────────
function computeRingBoundaries(numRings, innerR) {
  const g = CONFIG.ringGrowth;
  const bdry = [];
  if (abs(g - 1) < 0.001) {
    const w = innerR / numRings;
    for (let i = 0; i < numRings; i++) bdry.push(w * (i + 1));
  } else {
    const w0 = (innerR * (g - 1)) / (pow(g, numRings) - 1);
    for (let i = 0; i < numRings; i++)
      bdry.push((w0 * (pow(g, i + 1) - 1)) / (g - 1));
  }
  return bdry;
}

// ─── number renderer ──────────────────────────────────────────────────────────
function drawNumber(numStr, cx, cy, outerR) {
  const { digits, decimalCount, isNegative } = getDigits(numStr);
  const numRings = digits.length;
  const innerR = outerR * CONFIG.ringAreaRatio;
  const bdry = computeRingBoundaries(numRings, innerR);

  blendMode(BLEND);
  push();
  if (isNegative) {
    noFill();
    stroke(PAL.outer_stroke);
    strokeWeight(outerR * CONFIG.outerStrokeRatio);
  } else {
    fill(PAL.outer_fill);
    noStroke();
  }
  ellipse(cx, cy, outerR * 2, outerR * 2);
  pop();
  blendMode(BLEND);

  const portionAngle = TWO_PI / 10;
  for (let i = 0; i < numRings; i++) {
    const digit = digits[i];
    if (digit === 0) continue;
    const r1 = i === 0 ? 0 : bdry[i - 1];
    const r2 = bdry[i];
    const col = PAL.rings[i % PAL.rings.length];
    for (let p = 0; p < digit; p++) {
      annularWedge(
        cx,
        cy,
        r1,
        r2,
        -HALF_PI + p * portionAngle,
        -HALF_PI + (p + 1) * portionAngle,
        col,
        isNegative,
        outerR,
      );
    }
  }

  for (let i = 0; i < numRings; i++) {
    const r1 = i === 0 ? 0 : bdry[i - 1];
    drawTicks(cx, cy, bdry[i], bdry[i] - r1);
  }

  if (decimalCount > 0)
    drawDecimalRing(
      cx,
      cy,
      bdry[decimalCount - 1] + outerR * CONFIG.decimalMarginRatio,
      outerR,
    );

  push();
  fill(0, 0, 0);
  noStroke();
  ellipse(
    cx,
    cy,
    outerR * CONFIG.centerDotRatio * 2,
    outerR * CONFIG.centerDotRatio * 2,
  );
  pop();
}

// ─── random number pool ───────────────────────────────────────────────────────
function randomNum() {
  const type = floor(random(7));
  let n;
  switch (type) {
    case 0:
      return String(floor(random(1, 10)));
    case 1:
      return String(floor(random(10, 100)));
    case 2:
      return String(floor(random(100, 1000)));
    case 3:
      return "-" + String(floor(random(1, 1000)));
    case 4:
      return random(0.1, 99.9).toFixed(1);
    case 5:
      return random(0.01, 99.99).toFixed(2);
    case 6:
      n = random(0.01, 99.99);
      return "-" + (random() < 0.5 ? n.toFixed(1) : n.toFixed(2));
  }
}

// ─── grain texture ────────────────────────────────────────────────────────────
let grainGraphics = null;

function generateGrain() {
  if (grainGraphics) grainGraphics.remove();
  grainGraphics = createGraphics(width, height);
  grainGraphics.loadPixels();
  const px = grainGraphics.pixels;
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    px[i] = px[i + 1] = px[i + 2] = v;
    px[i + 3] = 255;
  }
  grainGraphics.updatePixels();
}

function drawGrain() {
  if (CONFIG.grainAmount === 0 || !grainGraphics) return;
  push();
  blendMode(OVERLAY);
  tint(255, map(CONFIG.grainAmount, 0, 100, 0, 200));
  image(grainGraphics, 0, 0);
  noTint();
  blendMode(BLEND);
  pop();
}

// ─── belt ─────────────────────────────────────────────────────────────────────
// Draws the convex "rubber-band" shape wrapping two circles.
// Uses Canvas 2D arc() directly — BOTH arcs counterclockwise (true).
//
// Geometry: external tangent angle offset α = asin((R1−R2)/d)
//   tA_top = base − π/2 + α      tA_bot = base + π/2 − α
//   tB_top = base − π/2 + α      tB_bot = base + π/2 − α
// Path: moveTo A_top → arc(A, tA_top→tA_bot, CCW) → lineTo B_bot
//        → arc(B, tB_bot→tB_top, CCW) → closePath (top tangent line)
//
// Positive result: filled, no stroke.  Negative result: stroke only, no fill.

function drawBelt(x1, y1, R1, x2, y2, R2, resultPositive, cssColor) {
  const dx = x2 - x1,
    dy = y2 - y1;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= Math.abs(R1 - R2) + 0.5) return; // one circle contains the other

  const base = Math.atan2(dy, dx);
  const alpha = Math.asin(Math.max(-1, Math.min(1, (R1 - R2) / d)));

  const tA_top = base - Math.PI / 2 + alpha;
  const tA_bot = base + Math.PI / 2 - alpha;
  const tB_top = base - Math.PI / 2 + alpha;
  const tB_bot = base + Math.PI / 2 - alpha;

  const ctx = drawingContext;

  ctx.beginPath();
  ctx.moveTo(x1 + R1 * Math.cos(tA_top), y1 + R1 * Math.sin(tA_top));
  ctx.arc(x1, y1, R1, tA_top, tA_bot, true); // CCW — far side of left circle
  ctx.lineTo(x2 + R2 * Math.cos(tB_bot), y2 + R2 * Math.sin(tB_bot));
  ctx.arc(x2, y2, R2, tB_bot, tB_top, true); // CCW — far side of right circle
  ctx.closePath();

  if (resultPositive) {
    ctx.fillStyle = cssColor;
    ctx.fill();
  } else {
    ctx.strokeStyle = cssColor;
    ctx.lineWidth = Math.max(R1, R2) * CONFIG.beltStrokeRatio;
    ctx.stroke();
  }
}

// ─── input parser ─────────────────────────────────────────────────────────────
// Accepts:  "2 + 3 - 10"  →  ["2","3","-10"]
//           "8 - 3 - 9"   →  ["8","-3","-9"]
//           "2 + 5 + 9"   →  ["2","5","9"]
// Multiple chains separated by  |  ;  or newline.
function parseChains(str) {
  const results = [];
  const segments = str
    .trim()
    .split(/[|;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const seg of segments) {
    // Normalise subtraction: "digit - digit" → "digit +-digit"
    const norm = seg.replace(/(\d)\s*-\s*(\d)/g, "$1 +-$2");
    const tokens = norm.match(/-?\d+\.?\d*/g);
    if (tokens && tokens.length >= 2) results.push(tokens);
  }
  return results;
}

// ─── composition data ─────────────────────────────────────────────────────────
// chainData[i] — stable (numbers, sizes, seeds, rotation, fonts)
// chains[i]    — recomputed pixel positions on resize / slider change
//
// chainData[i] = {
//   nums:       [numStr, …],   // N strings
//   sizeTs:     [0..1, …],     // N size values
//   colorSeeds: [int, …],      // N color seeds
//   angles:     [rad, …],      // N current rotation angles
//   rotSpeeds:  [rad/frame, …],
//   fontIdxs:   [int, …],
// }
//
// chains[i] = {
//   circles: [{x, y, r, numStr, colorSeed, fontIdx}, …],
//   belts:   [{color, resultPositive}, …],   // length = circles.length − 1
// }

let chainData = [];
let chains = [];
let customOps = []; // [] = random; filled = array of [numStr, …] per chain

function generateChainData() {
  const parsed = customOps.length > 0 ? customOps : null;
  const count = parsed ? parsed.length : CONFIG.numOps;
  chainData = [];

  for (let c = 0; c < count; c++) {
    const nums = parsed
      ? parsed[c]
      : Array.from({ length: CONFIG.numChainNums }, () => randomNum());
    const n = nums.length;
    // Size driven by magnitude (log scale) blended with a random component.
    // valueSizeInfluence=0 → random, =1 → purely magnitude-based.
    const mags = nums.map((s) => Math.log10(Math.abs(parseFloat(s)) + 1));
    const maxM = Math.max(...mags, 0.001);
    const sizeTs = mags.map((m) => {
      const magT = m / maxM; // 0..1 within this chain
      const rndT = random(1);
      return lerp(rndT, magT, CONFIG.valueSizeInfluence);
    });
    chainData.push({
      nums,
      sizeTs,
      colorSeeds: Array.from({ length: n }, () => floor(random(999983))),
      beltColorSeeds: Array.from({ length: n - 1 }, () =>
        floor(random(999983)),
      ),
      angles: Array.from({ length: n }, () => random(TWO_PI)),
      rotSpeeds: Array.from(
        { length: n },
        () => (random() < 0.5 ? -1 : 1) * random(0.003, 0.018),
      ),
      fontIdxs: Array.from({ length: n }, () => floor(random(FONTS.length))),
    });
  }
  computePositions();
}

// Returns the CSS rgb string that reshuffleColors would assign as outer_fill
// for a given colorSeed — used to prevent belt colors matching circle fills.
function getOuterCss(colorSeed) {
  randomSeed(colorSeed);
  const pool = shuffle(SWATCHES.slice());
  const di = pool.findIndex((s) => s.type === "dark");
  pool.splice(di, 1);
  const li = pool.findIndex((s) => s.type === "light");
  const col = pool[li].col;
  return `${floor(red(col))},${floor(green(col))},${floor(blue(col))}`;
}

function computePositions() {
  chains = [];
  const nChains = chainData.length;
  if (nChains === 0) return;

  const m = min(width, height);
  const lo = Math.max(0.01, CONFIG.compScale * (1 - CONFIG.sizeVariation));
  const hi = CONFIG.compScale * (1 + CONFIG.sizeVariation);

  // Vertical: divide canvas into nChains equal rows
  const rowH = height / nChains;

  for (let c = 0; c < nChains; c++) {
    const data = chainData[c];
    const n = data.nums.length;
    const cy = rowH * (c + 0.5);

    const radii = data.sizeTs.map((t) => lerp(lo, hi, t) * m);

    // Horizontal positions — left to right
    // chainSpacing: 0 = touching, negative = gap, positive = overlap
    const xs = [radii[0]];
    for (let i = 1; i < n; i++)
      xs.push(
        xs[i - 1] + (radii[i - 1] + radii[i]) * (1 - CONFIG.chainSpacing),
      );

    // Centre the chain horizontally
    const totalW = xs[n - 1] + radii[n - 1];
    const ox = (width - totalW) / 2;

    const circles = data.nums.map((numStr, i) => ({
      x: ox + xs[i],
      y: cy,
      r: radii[i],
      numStr,
      colorSeed: data.colorSeeds[i],
      fontIdx: data.fontIdxs[i],
    }));

    // One belt per adjacent pair — color from palette, never matching either circle's outer fill
    const lightSwatches = SWATCHES.filter((s) => s.type === "light");
    const basePool = lightSwatches.length > 0 ? lightSwatches : SWATCHES;
    const belts = [];
    for (let i = 0; i < n - 1; i++) {
      const valA = parseFloat(data.nums[i]);
      const valB = parseFloat(data.nums[i + 1]);

      // Exclude the outer-fill colors of the two adjacent circles
      const outerA = getOuterCss(data.colorSeeds[i]);
      const outerB = getOuterCss(data.colorSeeds[i + 1]);
      const excluded = new Set([outerA, outerB]);
      const available = basePool.filter((s) => {
        const key = `${floor(red(s.col))},${floor(green(s.col))},${floor(blue(s.col))}`;
        return !excluded.has(key);
      });
      const pickPool = available.length > 0 ? available : basePool;

      randomSeed(data.beltColorSeeds[i]);
      const swatchCol = pickPool[floor(random(pickPool.length))].col;
      const cssColor = `rgb(${floor(red(swatchCol))},${floor(green(swatchCol))},${floor(blue(swatchCol))})`;
      belts.push({
        cssColor,
        resultPositive: valA + valB >= 0,
      });
    }
    randomSeed();

    chains.push({ circles, belts });
  }
}

// ─── side panel ───────────────────────────────────────────────────────────────
let sliderLength,
  sliderScale,
  sliderSpread,
  sliderSpacing,
  sliderMargin,
  sliderBokeh,
  sliderGrain,
  sliderReality;
const valSpans = {};

function createPanel() {
  createElement("style").html(`
    .side-panel {
      position: fixed;
      top: 0; left: 0;
      width: 200px;
      height: 100vh;
      background: rgba(255,255,255,0.78);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(30px);
      border-right: 1px solid rgba(255,255,255,0.35);
      padding: 64px 20px 28px 20px;
      display: flex;
      flex-direction: column;
      gap: 0;
      z-index: 50;
      font-family: 'ABCROM', sans-serif;
      font-weight: 500;
      font-size: 11px;
      box-sizing: border-box;
      overflow-y: auto;
    }
    .slider-row {
      padding: 6px 0;
      border-bottom: 1px solid #ebebeb;
    }
    .slider-row:first-child { border-top: 1px solid #ebebeb; }
    .slider-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
    }
    .slider-label { color: #111; letter-spacing: 0.04em; }
    .slider-value { color: #999; }
    .side-panel input[type=range] {
      -webkit-appearance: none;
      appearance: none;
      display: block;
      width: 100%;
      height: 14px;
      background: transparent;
      outline: none;
      cursor: pointer;
    }
    .side-panel input[type=range]::-webkit-slider-runnable-track {
      height: 14px;
      background: #e8e8e8;
      border-radius: 99px;
    }
    .side-panel input[type=range]::-moz-range-track {
      height: 14px;
      background: #e8e8e8;
      border-radius: 99px;
      border: none;
    }
    .side-panel input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px; height: 14px;
      background: #111;
      border-radius: 50%;
      cursor: pointer;
    }
    .side-panel input[type=range]::-moz-range-thumb {
      width: 14px; height: 14px;
      background: #111;
      border-radius: 50%;
      border: none;
      cursor: pointer;
    }
    .custom-section {
      padding-bottom: 16px;
      margin-bottom: 4px;
      border-bottom: 1px solid #ebebeb;
    }
    .custom-label {
      display: block;
      color: #111;
      letter-spacing: 0.04em;
      margin-bottom: 10px;
    }
    .custom-input {
      width: 100%;
      border: none;
      border-bottom: 2px solid #111;
      background: transparent;
      font-family: 'ABCROM', sans-serif;
      font-size: 11px;
      padding: 4px 0;
      outline: none;
      color: #111;
    }
    .custom-input::placeholder { color: #ccc; }
    .custom-input-hint {
      margin-top: 7px;
      color: #bbb;
      line-height: 1.7;
    }
    .panel-hint {
      margin-top: auto;
      color: #bbb;
      line-height: 2;
      padding-top: 16px;
    }
  `);

  const panel = createDiv("").class("side-panel");

  // ── expression input ────────────────────────────────────────────────────────
  const customSection = createDiv("").class("custom-section");
  customSection.parent(panel);
  createSpan("expression").class("custom-label").parent(customSection);

  const opInput = createElement("input").class("custom-input");
  opInput.attribute("type", "text");
  opInput.attribute("placeholder", "2 + 3 - 10");
  opInput.attribute("spellcheck", "false");
  opInput.parent(customSection);

  createDiv("↵ apply  ·  esc → random")
    .class("custom-input-hint")
    .parent(customSection);

  opInput.elt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const parsed = parseChains(opInput.value());
      if (parsed.length > 0) {
        customOps = parsed;
        generateChainData();
      }
    }
    if (e.key === "Escape") {
      opInput.value("");
      customOps = [];
      generateChainData();
    }
    e.stopPropagation();
  });

  // ── sliders ─────────────────────────────────────────────────────────────────
  function addRow(key, label, mn, mx, val, step) {
    const row = createDiv("").class("slider-row");
    row.parent(panel);
    const header = createDiv("").class("slider-header");
    header.parent(row);
    createSpan(label).class("slider-label").parent(header);
    const vs = createSpan("").class("slider-value");
    vs.parent(header);
    valSpans[key] = vs;
    const sl = createSlider(mn, mx, val, step);
    sl.parent(row);
    return sl;
  }

  sliderLength = addRow("length", "length", 2, 6, CONFIG.numChainNums, 1);
  sliderScale = addRow("size", "size", 1, 40, CONFIG.compScale * 100, 1);
  sliderSpread = addRow(
    "spread",
    "spread",
    0,
    95,
    CONFIG.sizeVariation * 100,
    1,
  );
  sliderSpacing = addRow(
    "spacing",
    "spacing",
    -150,
    95,
    CONFIG.chainSpacing * 100,
    1,
  );
  sliderMargin = addRow(
    "margin",
    "margin",
    0,
    50,
    CONFIG.beltMarginRatio * 100,
    1,
  );
  sliderBokeh = addRow("bokeh", "bokeh", 0, 30, CONFIG.bokeh, 1);
  sliderGrain = addRow("grain", "grain", 0, 100, CONFIG.grainAmount, 1);
  sliderReality = addRow("reality", "reality", 0, 100, CONFIG.reality, 1);

  createDiv("SPACE · new<br>S · save png").class("panel-hint").parent(panel);

  updateValues();

  sliderLength.input(() => {
    CONFIG.numChainNums = int(sliderLength.value());
    generateChainData();
    updateValues();
  });
  sliderScale.input(() => {
    CONFIG.compScale = sliderScale.value() / 100;
    computePositions();
    updateValues();
  });
  sliderSpread.input(() => {
    CONFIG.sizeVariation = sliderSpread.value() / 100;
    computePositions();
    updateValues();
  });
  sliderSpacing.input(() => {
    CONFIG.chainSpacing = sliderSpacing.value() / 100;
    computePositions();
    updateValues();
  });
  sliderMargin.input(() => {
    CONFIG.beltMarginRatio = sliderMargin.value() / 100;
    updateValues();
  });
  sliderBokeh.input(() => {
    CONFIG.bokeh = int(sliderBokeh.value());
    updateValues();
  });
  sliderGrain.input(() => {
    CONFIG.grainAmount = int(sliderGrain.value());
    updateValues();
  });
  sliderReality.input(() => {
    CONFIG.reality = int(sliderReality.value());
    updateValues();
  });
}

function updateValues() {
  valSpans.length.html(CONFIG.numChainNums);
  valSpans.size.html(nf(CONFIG.compScale, 1, 2));
  valSpans.spread.html(nf(CONFIG.sizeVariation, 1, 2));
  valSpans.spacing.html(nf(CONFIG.chainSpacing, 1, 2));
  valSpans.margin.html(nf(CONFIG.beltMarginRatio, 1, 2));
  valSpans.bokeh.html(CONFIG.bokeh + "px");
  valSpans.grain.html(CONFIG.grainAmount);
  valSpans.reality.html(CONFIG.reality);
}

// ─── p5 lifecycle ─────────────────────────────────────────────────────────────
function setup() {
  createCanvas(windowWidth, windowHeight);
  buildPalette();
  generateGrain();
  createPanel();
  generateChainData();
  loop();
}

function draw() {
  blendMode(BLEND);
  background(0, 0, 100); // HSB white

  for (let c = 0; c < chains.length; c++) {
    const chain = chains[c];
    const data = chainData[c];

    // Advance rotation for every circle in this chain
    for (let i = 0; i < data.angles.length; i++) {
      data.angles[i] += data.rotSpeeds[i];
    }

    // ── Step 1: Draw all belts — fade out with reality (0 = full, 100 = gone) ─
    blendMode(BLEND);
    drawingContext.globalAlpha = 1 - CONFIG.reality / 100;
    for (let i = 0; i < chain.belts.length; i++) {
      const belt = chain.belts[i];
      const cA = chain.circles[i];
      const cB = chain.circles[i + 1];
      const RA = cA.r * (1 + CONFIG.beltMarginRatio);
      const RB = cB.r * (1 + CONFIG.beltMarginRatio);
      drawBelt(
        cA.x,
        cA.y,
        RA,
        cB.x,
        cB.y,
        RB,
        belt.resultPositive,
        belt.cssColor,
      );
    }

    // ── Step 2: Draw all circles on top ──────────────────────────────────────
    // globalAlpha must be 1 here so every push() below saves 1 and pop() restores 1.
    drawingContext.globalAlpha = 1;

    for (let i = 0; i < chain.circles.length; i++) {
      const circle = chain.circles[i];
      const f      = FONTS[data.fontIdxs[i]];

      randomSeed(circle.colorSeed);
      reshuffleColors();

      const shapeAlpha = 1 - CONFIG.reality / 100;
      const textAlpha  = CONFIG.reality / 100;

      // ── a+b) White punch-out + abstract circle — only when shapes are visible.
      //        At reality=100, shapeAlpha=0, so we skip both entirely: nothing
      //        shows behind the text — no colored circle, no white disc.
      if (shapeAlpha > 0) {
        push();
        noStroke();
        fill(0, 0, 100); // HSB white — erases belt colour behind this circle
        ellipse(circle.x, circle.y, circle.r * 2, circle.r * 2);
        pop();
        // globalAlpha = 1 after pop ✓

        push();
        translate(circle.x, circle.y);
        rotate(data.angles[i]);
        drawingContext.globalAlpha = shapeAlpha;
        drawNumber(circle.numStr, 0, 0, circle.r);
        pop(); // restores globalAlpha = 1 ✓
      }

      // ── c) Number text — fades in with reality, rotates with circle
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

  // ── bokeh ─────────────────────────────────────────────────────────────────
  if (CONFIG.bokeh > 0) {
    const snap = get();
    background(0, 0, 100);
    drawingContext.filter = `blur(${CONFIG.bokeh}px)`;
    blendMode(BLEND);
    image(snap, 0, 0);
    drawingContext.filter = "none";
  }

  drawGrain();
  blendMode(BLEND);
}

// ─── save high-quality PNG (3× resolution) ────────────────────────────────────
function saveHQ() {
  const origPD = pixelDensity();
  pixelDensity(3);
  resizeCanvas(windowWidth, windowHeight);
  draw();
  const ts =
    year() +
    nf(month(), 2) +
    nf(day(), 2) +
    "-" +
    nf(hour(), 2) +
    nf(minute(), 2) +
    nf(second(), 2);
  saveCanvas("visual-operations-" + ts, "png");
  pixelDensity(origPD);
  resizeCanvas(windowWidth, windowHeight);
}

// ─── interaction ──────────────────────────────────────────────────────────────
function keyPressed() {
  if (document.activeElement.tagName === "INPUT") return;
  if (key === " ") generateChainData();
  if (key === "s" || key === "S") saveHQ();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateGrain();
  computePositions();
}
