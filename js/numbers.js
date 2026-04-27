// Visual Number System — random-1.js
// Numbers arranged along a horizontal line.
// Sliders: overlap · count.   SPACE = new composition.   S = save PNG.

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  // ── composition ──────────────────────────────────────────────────────────────
  numCircles: 10, // starting count (driven by slider)
  compScale: 0.12, // base radius as fraction of min(w,h)   — overall size slider
  sizeVariation: 0.5, // 0 = all same size, 1 = large spread  — size ratio slider
  overlapFactor: 0, // 0 = touching edges, 1 = fully stacked (driven by slider)
  // ── blend mode ───────────────────────────────────────────────────────────────
  // try: BLEND  ADD  MULTIPLY  SCREEN  OVERLAY  DIFFERENCE  EXCLUSION  DARKEST  LIGHTEST
  blendModeName: "NONE",

  // ── ring geometry ─────────────────────────────────────────────────────────────
  ringAreaRatio: 0.9,
  ringGrowth: 1.4,

  // ── outer circle ─────────────────────────────────────────────────────────────
  outerStrokeRatio: 0.04, // stroke = outerR * this — scales with circle size

  // ── cake portions ─────────────────────────────────────────────────────────────
  portionArcSteps: 38,
  negStrokeRatio: 0.035, // stroke = outerR * this — scales with circle size

  // ── tick marks ────────────────────────────────────────────────────────────────
  tickLengthRatio: 0.15,
  tickStrokeWeight: 1,
  tickOpacity: 255,

  // ── decimal ring ──────────────────────────────────────────────────────────────
  decimalStrokeRatio: 0.05, // stroke = outerR * this — scales with circle size
  decimalDashCount: 10,
  decimalDashRatio: 0.9,
  decimalMarginRatio: 0.09, // margin gap = outerR * this — scales with circle size

  // ── center dot ────────────────────────────────────────────────────────────────
  centerDotRatio: 0.025, // radius = outerR * this — scales with each circle

  // ── effects ───────────────────────────────────────────────────────────────────
  bokeh: 0, // Gaussian blur in px (0 = off)
  grainAmount: 0, // grain intensity 0–100
  reality: 0, // 0 = fully abstract circles · 100 = fully readable numbers
};

// ─── font table — one entry per typeface variant ──────────────────────────────
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

// Unique color set per circle. Called with randomSeed(item.colorSeed) beforehand
// so each circle always gets the same stable colors across redraws.
function reshuffleColors() {
  const pool = shuffle(SWATCHES.slice());

  // one dark → ticks
  const di = pool.findIndex((s) => s.type === "dark");
  PAL.ticks = pool.splice(di, 1)[0].col;

  // one light → outer circle
  const li = pool.findIndex((s) => s.type === "light");
  const outerCol = pool.splice(li, 1)[0].col;
  PAL.outer_fill = outerCol;
  PAL.outer_stroke = outerCol;

  // remaining swatches (any type) → rings, decimal, label, all unique
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
  const combined = intPart + decPart;
  const digits = combined.split("").reverse().map(Number);
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

  // outer circle — blend mode applies HERE ONLY
  blendMode(window[CONFIG.blendModeName] || BLEND);
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
  blendMode(BLEND); // everything inside drawn in normal mode

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
  const dotR = outerR * CONFIG.centerDotRatio;
  ellipse(cx, cy, dotR * 2, dotR * 2);
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

// Fills a p5.Graphics buffer with random grayscale noise (static grain).
// Called once on setup and again on window resize.
function generateGrain() {
  if (grainGraphics) grainGraphics.remove();
  grainGraphics = createGraphics(width, height);
  grainGraphics.loadPixels();
  const px = grainGraphics.pixels;
  for (let i = 0; i < px.length; i += 4) {
    const v = Math.floor(Math.random() * 256);
    px[i] = v;
    px[i + 1] = v;
    px[i + 2] = v;
    px[i + 3] = 255;
  }
  grainGraphics.updatePixels();
}

// Overlays the grain buffer using OVERLAY blend so it adds texture without
// dramatically shifting hue. Alpha scales with CONFIG.grainAmount (0–100).
function drawGrain() {
  if (CONFIG.grainAmount === 0 || !grainGraphics) return;
  push();
  blendMode(OVERLAY);
  const alpha = map(CONFIG.grainAmount, 0, 100, 0, 200);
  tint(255, alpha);
  image(grainGraphics, 0, 0);
  noTint();
  blendMode(BLEND);
  pop();
}

// ─── line composition ─────────────────────────────────────────────────────────
// compositionData is stable (numbers + sizes + color seeds).
// composition is recomputed from data whenever overlap or canvas size changes.
let compositionData = [];
let composition = [];
let customNums = []; // empty = random mode; filled = use these exact numbers

function generateCompositionData() {
  const nums = customNums.length > 0 ? customNums : null;
  const count = nums ? nums.length : CONFIG.numCircles;
  compositionData = [];
  for (let i = 0; i < count; i++) {
    compositionData.push({
      sizeT: random(1),
      numStr: nums ? nums[i] : randomNum(),
      colorSeed: floor(random(999983)),
      angle: random(TWO_PI),
      rotationSpeed: (random() < 0.5 ? -1 : 1) * random(0.003, 0.018),
      fontIdx: floor(random(FONTS.length)),
    });
  }
  computePositions();
}

// Rebuilds composition[] from compositionData[] + current overlapFactor.
// Scales radii down automatically if the line is wider than the canvas.
function computePositions() {
  composition = [];
  const n = compositionData.length;
  if (n === 0) return;

  // actual radii from sizeT + live CONFIG knobs — no clamping, free to exceed canvas
  const m = min(width, height);
  const radii = compositionData.map((d) => {
    const lo = Math.max(0.01, CONFIG.compScale * (1 - CONFIG.sizeVariation));
    const hi = CONFIG.compScale * (1 + CONFIG.sizeVariation);
    return lerp(lo, hi, d.sizeT) * m;
  });

  // x positions: each centre placed relative to the previous
  const xs = [radii[0]];
  for (let i = 1; i < n; i++) {
    xs.push(xs[i - 1] + (radii[i - 1] + radii[i]) * (1 - CONFIG.overlapFactor));
  }

  // centre the whole line on canvas
  const totalW = xs[n - 1] + radii[n - 1];
  const ox = (width - totalW) / 2;
  const cy = height / 2;

  for (let i = 0; i < n; i++) {
    composition.push({
      x: ox + xs[i],
      y: cy,
      r: radii[i],
      numStr: compositionData[i].numStr,
      colorSeed: compositionData[i].colorSeed,
    });
  }
}

// ─── sliders ──────────────────────────────────────────────────────────────────
// ─── side panel ───────────────────────────────────────────────────────────────
let sliderOverlap,
  sliderCount,
  sliderScale,
  sliderSpread,
  sliderBokeh,
  sliderGrain;
let panel;
const valSpans = {};

function createPanel() {
  // inject styles so the panel works standalone (no external CSS dependency)
  createElement("style").html(`
    .side-panel {
      position: fixed;
      top: 0; left: 0;
      width: 200px;
      height: 100vh;
      background: rgba(255, 255, 255, 0.78);
      backdrop-filter: blur(30px);
      -webkit-backdrop-filter: blur(16px);
      border-right: 1px solid rgba(255, 255, 255, 0.35);
      padding: 64px 20px 28px 20px;
      display: flex;
      flex-direction: column;
      gap: 0;
      z-index: 50;
      font-family: 'ABCROM', sans-serif;
      font-weight: 500;
      font-size: 11px;
      box-sizing: border-box;
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
      width: 14px;
      height: 14px;
      background: #111;
      border-radius: 50%;
      margin-top: 0px;
      cursor: pointer;
    }
    .side-panel input[type=range]::-moz-range-thumb {
      width: 14px;
      height: 14px;
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

  panel = createDiv("").class("side-panel");

  // ── number input (custom composition or random) ─────────────────────────
  const customSection = createDiv("").class("custom-section");
  customSection.parent(panel);
  createSpan("numbers").class("custom-label").parent(customSection);

  const numInput = createElement("input").class("custom-input");
  numInput.attribute("type", "text");
  numInput.attribute("placeholder", "7  42  3.14  −5  …");
  numInput.attribute("spellcheck", "false");
  numInput.parent(customSection);

  createDiv("↵ apply  ·  clear → random")
    .class("custom-input-hint")
    .parent(customSection);

  numInput.elt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      // parse space/comma-separated tokens that look like valid numbers
      const tokens = numInput
        .value()
        .trim()
        .split(/[\s,]+/)
        .filter((t) => /^-?\d+(\.\d+)?$/.test(t));
      customNums = tokens;
      generateCompositionData();
    }
    if (e.key === "Escape") {
      numInput.value("");
      customNums = [];
      generateCompositionData();
    }
    e.stopPropagation(); // keep p5 keyPressed from firing while typing
  });

  function addRow(key, label, min, max, val, step) {
    const row = createDiv("").class("slider-row");
    row.parent(panel);
    const header = createDiv("").class("slider-header");
    header.parent(row);
    createSpan(label).class("slider-label").parent(header);
    const vs = createSpan("").class("slider-value");
    vs.parent(header);
    valSpans[key] = vs;
    const sl = createSlider(min, max, val, step);
    sl.parent(row);
    return sl;
  }

  sliderOverlap = addRow(
    "overlap",
    "overlap",
    0,
    95,
    CONFIG.overlapFactor * 100,
    1,
  );
  sliderCount = addRow("count", "count", 1, 30, CONFIG.numCircles, 1);
  sliderScale = addRow("size", "size", 1, 40, CONFIG.compScale * 100, 1);
  sliderSpread = addRow(
    "spread",
    "spread",
    0,
    95,
    CONFIG.sizeVariation * 100,
    1,
  );
  sliderBokeh = addRow("bokeh", "bokeh", 0, 30, CONFIG.bokeh, 1);
  sliderGrain = addRow("grain", "grain", 0, 100, CONFIG.grainAmount, 1);
  const sliderReality = addRow("reality", "reality", 0, 100, CONFIG.reality, 1);

  createDiv("SPACE · new<br>S · save png").class("panel-hint").parent(panel);

  updateValues(); // all valSpans exist now

  sliderOverlap.input(() => {
    CONFIG.overlapFactor = sliderOverlap.value() / 100;
    computePositions();
    updateValues();
  });
  sliderCount.input(() => {
    CONFIG.numCircles = int(sliderCount.value());
    generateCompositionData();
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
  valSpans.overlap.html(nf(CONFIG.overlapFactor, 1, 2));
  valSpans.count.html(CONFIG.numCircles);
  valSpans.size.html(nf(CONFIG.compScale, 1, 2));
  valSpans.spread.html(nf(CONFIG.sizeVariation, 1, 2));
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
  generateCompositionData();
  loop();
}

function draw() {
  blendMode(BLEND);
  background(PAL.bg);

  for (let i = 0; i < composition.length; i++) {
    const item = composition[i];
    const data = compositionData[i];

    // advance rotation each frame
    data.angle += data.rotationSpeed;

    randomSeed(item.colorSeed);
    reshuffleColors();

    const f = FONTS[data.fontIdx];

    // all drawing in the circle's own rotated space
    push();
    translate(item.x, item.y);
    rotate(data.angle);

    // circle fades out as reality increases
    drawingContext.globalAlpha = 1 - CONFIG.reality / 100;
    drawNumber(item.numStr, 0, 0, item.r);

    // number text fades in as reality increases, rotates with the circle
    if (CONFIG.reality > 0) {
      const fontSize = Math.round(item.r * 0.65);
      drawingContext.globalAlpha = CONFIG.reality / 100;
      drawingContext.font = `${f.style} ${f.weight} ${fontSize}px ${f.family}, sans-serif`;
      drawingContext.textAlign = "center";
      drawingContext.textBaseline = "middle";
      drawingContext.fillStyle = "#111111";
      drawingContext.fillText(item.numStr, 0, 0);
    }

    drawingContext.globalAlpha = 1;
    pop();
  }
  randomSeed();

  // ── bokeh: capture composition, redraw with blur, then reset ─────────────────
  if (CONFIG.bokeh > 0) {
    const snap = get();
    background(PAL.bg);
    drawingContext.filter = `blur(${CONFIG.bokeh}px)`;
    blendMode(BLEND);
    image(snap, 0, 0);
    drawingContext.filter = "none";
  }

  // ── grain: layered on top of blur, under UI ───────────────────────────────────
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
  saveCanvas("visual-numbers-" + ts, "png");
  pixelDensity(origPD);
  resizeCanvas(windowWidth, windowHeight);
}

// ─── interaction ──────────────────────────────────────────────────────────────
function keyPressed() {
  if (document.activeElement.tagName === "INPUT") return;
  if (key === " ") {
    generateCompositionData();
  }
  if (key === "s" || key === "S") saveHQ();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateGrain();
  computePositions();
}
