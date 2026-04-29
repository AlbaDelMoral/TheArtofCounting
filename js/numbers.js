// numbers.js — Numbers page sketch
// Depends on: p5.js, number-system.js

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  // ── composition ──────────────────────────────────────────────────────────────
  numCircles:   10,     // starting count (driven by slider)
  compScale:    0.12,   // base radius as fraction of min(w,h)
  sizeVariation: 0.5,   // 0 = all same size, 1 = large spread
  overlapFactor: 0,     // 0 = touching edges, 1 = fully stacked

  // ── blend mode ───────────────────────────────────────────────────────────────
  // try: BLEND  ADD  MULTIPLY  SCREEN  OVERLAY  DIFFERENCE  EXCLUSION  DARKEST  LIGHTEST
  blendModeName: "NONE",

  // ── ring geometry ─────────────────────────────────────────────────────────────
  ringAreaRatio: 0.9,
  ringGrowth:    1.4,

  // ── outer circle ─────────────────────────────────────────────────────────────
  outerStrokeRatio: 0.04,

  // ── cake portions ─────────────────────────────────────────────────────────────
  portionArcSteps: 38,
  negStrokeRatio:  0.035,

  // ── tick marks ────────────────────────────────────────────────────────────────
  tickLengthRatio:  0.15,
  tickStrokeWeight: 1,
  tickOpacity:      255,

  // ── decimal ring ──────────────────────────────────────────────────────────────
  decimalStrokeRatio: 0.05,
  decimalDashCount:   10,
  decimalDashRatio:   0.9,
  decimalMarginRatio: 0.09,

  // ── center dot ────────────────────────────────────────────────────────────────
  centerDotRatio: 0.025,

  // ── effects ───────────────────────────────────────────────────────────────────
  bokeh:       0,   // Gaussian blur in px (0 = off)
  grainAmount: 0,   // grain intensity 0–100
  reality:     0,   // 0 = fully abstract circles · 100 = fully readable numbers
};

// ─── composition ──────────────────────────────────────────────────────────────
// compositionData is stable (numbers + sizes + color seeds).
// composition is recomputed from data whenever overlap or canvas size changes.
let compositionData = [];
let composition     = [];
let customNums      = []; // empty = random mode; filled = use these exact numbers

function generateCompositionData() {
  const nums  = customNums.length > 0 ? customNums : null;
  const count = nums ? nums.length : CONFIG.numCircles;
  compositionData = [];
  for (let i = 0; i < count; i++) {
    compositionData.push({
      sizeT:         random(1),
      numStr:        nums ? nums[i] : randomNum(),
      colorSeed:     floor(random(999983)),
      angle:         random(TWO_PI),
      rotationSpeed: (random() < 0.5 ? -1 : 1) * random(0.003, 0.018),
      fontIdx:       floor(random(FONTS.length)),
    });
  }
  computePositions();
}

// Rebuilds composition[] from compositionData[] + current CONFIG values.
function computePositions() {
  composition = [];
  const n = compositionData.length;
  if (n === 0) return;

  const m    = min(width, height);
  const radii = compositionData.map((d) => {
    const lo = Math.max(0.01, CONFIG.compScale * (1 - CONFIG.sizeVariation));
    const hi = CONFIG.compScale * (1 + CONFIG.sizeVariation);
    return lerp(lo, hi, d.sizeT) * m;
  });

  const xs = [radii[0]];
  for (let i = 1; i < n; i++)
    xs.push(xs[i - 1] + (radii[i - 1] + radii[i]) * (1 - CONFIG.overlapFactor));

  const totalW = xs[n - 1] + radii[n - 1];
  const ox     = (width - totalW) / 2;
  const cy     = height / 2;

  for (let i = 0; i < n; i++) {
    composition.push({
      x:         ox + xs[i],
      y:         cy,
      r:         radii[i],
      numStr:    compositionData[i].numStr,
      colorSeed: compositionData[i].colorSeed,
    });
  }
}

// ─── side panel ───────────────────────────────────────────────────────────────
let sliderOverlap, sliderCount, sliderScale, sliderSpread, sliderBokeh, sliderGrain;
let panel;
const valSpans = {};

function createPanel() {

  panel = createDiv("").class("side-panel");

  // ── number input ────────────────────────────────────────────────────────────
  const customSection = createDiv("").class("custom-section");
  customSection.parent(panel);
  createSpan("numbers").class("custom-label").parent(customSection);

  const numInput = createElement("input").class("custom-input");
  numInput.attribute("type", "text");
  numInput.attribute("placeholder", "7  42  3.14  −5  …");
  numInput.attribute("spellcheck", "false");
  numInput.parent(customSection);

  createDiv("↵ apply  ·  clear → random").class("custom-input-hint").parent(customSection);

  numInput.elt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const tokens = numInput.value().trim().split(/[\s,]+/)
        .filter((t) => /^-?\d+(\.\d+)?$/.test(t));
      customNums = tokens;
      generateCompositionData();
    }
    if (e.key === "Escape") {
      numInput.value("");
      customNums = [];
      generateCompositionData();
    }
    e.stopPropagation();
  });

  function addRow(key, label, min, max, val, step) {
    const row    = createDiv("").class("slider-row");
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

  sliderOverlap = addRow("overlap", "overlap", 0,   95,  CONFIG.overlapFactor  * 100, 1);
  sliderCount   = addRow("count",   "count",   1,   30,  CONFIG.numCircles,           1);
  sliderScale   = addRow("size",    "size",    1,   40,  CONFIG.compScale      * 100, 1);
  sliderSpread  = addRow("spread",  "spread",  0,   95,  CONFIG.sizeVariation  * 100, 1);
  sliderBokeh   = addRow("bokeh",   "bokeh",   0,   30,  CONFIG.bokeh,                1);
  sliderGrain   = addRow("grain",   "grain",   0,   100, CONFIG.grainAmount,          1);
  const sliderReality = addRow("reality", "reality", 0, 100, CONFIG.reality,          1);

  createDiv("SPACE · new<br>S · save png").class("panel-hint").parent(panel);

  updateValues();

  sliderOverlap.input(() => { CONFIG.overlapFactor  = sliderOverlap.value() / 100; computePositions();         updateValues(); });
  sliderCount.input(()   => { CONFIG.numCircles      = int(sliderCount.value());    generateCompositionData(); updateValues(); });
  sliderScale.input(()   => { CONFIG.compScale        = sliderScale.value()  / 100; computePositions();         updateValues(); });
  sliderSpread.input(()  => { CONFIG.sizeVariation    = sliderSpread.value() / 100; computePositions();         updateValues(); });
  sliderBokeh.input(()   => { CONFIG.bokeh            = int(sliderBokeh.value());                               updateValues(); });
  sliderGrain.input(()   => { CONFIG.grainAmount      = int(sliderGrain.value());                               updateValues(); });
  sliderReality.input(() => { CONFIG.reality          = int(sliderReality.value());                             updateValues(); });
}

function updateValues() {
  valSpans.overlap.html(nf(CONFIG.overlapFactor,  1, 2));
  valSpans.count.html(CONFIG.numCircles);
  valSpans.size.html(nf(CONFIG.compScale,         1, 2));
  valSpans.spread.html(nf(CONFIG.sizeVariation,   1, 2));
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
  background(0, 0, 100); // HSB white

  for (let i = 0; i < composition.length; i++) {
    const item = composition[i];
    const data = compositionData[i];

    data.angle += data.rotationSpeed;

    randomSeed(item.colorSeed);
    reshuffleColors();

    const f = FONTS[data.fontIdx];

    push();
    translate(item.x, item.y);
    rotate(data.angle);

    drawingContext.globalAlpha = 1 - CONFIG.reality / 100;
    drawNumber(item.numStr, 0, 0, item.r);

    if (CONFIG.reality > 0) {
      const fontSize = Math.round(item.r * 0.65);
      drawingContext.globalAlpha    = CONFIG.reality / 100;
      drawingContext.font           = `${f.style} ${f.weight} ${fontSize}px ${f.family}, sans-serif`;
      drawingContext.textAlign      = "center";
      drawingContext.textBaseline   = "middle";
      drawingContext.fillStyle      = "#111111";
      drawingContext.fillText(item.numStr, 0, 0);
    }

    drawingContext.globalAlpha = 1;
    pop();
  }
  randomSeed();

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
  const ts = year() + nf(month(), 2) + nf(day(), 2) + "-" + nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2);
  saveCanvas("visual-numbers-" + ts, "png");
  pixelDensity(origPD);
  resizeCanvas(windowWidth, windowHeight);
}

// ─── interaction ──────────────────────────────────────────────────────────────
function keyPressed() {
  if (document.activeElement.tagName === "INPUT") return;
  if (key === " ") generateCompositionData();
  if (key === "s" || key === "S") saveHQ();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateGrain();
  computePositions();
}
