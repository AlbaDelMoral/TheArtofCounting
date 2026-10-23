// numbers.js — Numbers page sketch
// Depends on: p5.js, number-system.js

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  // ── composition ──────────────────────────────────────────────────────────────
  numCircles: 10, // starting count (driven by slider)
  compScale: 0.12, // base radius as fraction of min(w,h)
  sizeVariation: 0.5, // 0 = all same size, 1 = large spread
  overlapFactor: 0, // 0 = touching edges, 1 = fully stacked

  // ── shared number representation (edit in js/number-representation.js —
  //    applies to numbers, operations and multiplication pages alike) ──────────
  ...NUMBER_REPRESENTATION,

  // ── effects ───────────────────────────────────────────────────────────────────
  bokeh: 0, // Gaussian blur in px (0 = off)
  grainAmount: 0, // grain intensity 0–100
  reality: 0, // 0 = fully abstract circles · 100 = fully readable numbers
};

// ─── composition ──────────────────────────────────────────────────────────────
// compositionData is stable (numbers + sizes + color seeds).
// composition is recomputed from data whenever overlap or canvas size changes.
let compositionData = [];
let composition = [];
let customNums = []; // empty = random mode; filled = use these exact numbers
let canvasBgHex = "#ffffff"; // canvas background — driven by colour picker
let _exportTransparent = false; // when true, saveHQ skips background fill → transparent PNG

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

// Rebuilds composition[] from compositionData[] + current CONFIG values.
// Auto-scales to always fit within the usable area (excluding panel + nav).
function computePositions(allowOverflow = false) {
  composition = [];
  const n = compositionData.length;
  if (n === 0) return;

  // ── Usable area (auto-detects left panel vs bottom panel on mobile) ─────────
  const { areaX, areaY, areaW, areaH } = getPanelArea();

  // ── Base radii from config (sized against usable area) ──────────────────────
  const m = min(areaW, areaH);
  const radii = compositionData.map((d) => {
    const lo = Math.max(0.01, CONFIG.compScale * (1 - CONFIG.sizeVariation));
    const hi = CONFIG.compScale * (1 + CONFIG.sizeVariation);
    return lerp(lo, hi, d.sizeT) * m;
  });

  // ── Compute raw total width ──────────────────────────────────────────────────
  const xs0 = [radii[0]];
  for (let i = 1; i < n; i++)
    xs0.push(
      xs0[i - 1] + (radii[i - 1] + radii[i]) * (1 - CONFIG.overlapFactor),
    );
  const totalW0 = xs0[n - 1] + radii[n - 1];
  const maxR0 = Math.max(...radii);

  // ── Scale down to fit unless size slider is being used ───────────────────────
  const scaleW = totalW0 > areaW ? areaW / totalW0 : 1;
  const scaleH = maxR0 * 2 > areaH ? areaH / (maxR0 * 2) : 1;
  const scale = allowOverflow ? 1 : Math.min(scaleW, scaleH, 1);

  const scaledR = radii.map((r) => r * scale);
  const xs = [scaledR[0]];
  for (let i = 1; i < n; i++)
    xs.push(
      xs[i - 1] + (scaledR[i - 1] + scaledR[i]) * (1 - CONFIG.overlapFactor),
    );
  const totalW = xs[n - 1] + scaledR[n - 1];

  // ── Center within usable area ────────────────────────────────────────────────
  const ox = areaX + (areaW - totalW) / 2;
  const cy = areaY + areaH / 2;

  for (let i = 0; i < n; i++) {
    composition.push({
      x: ox + xs[i],
      y: cy,
      r: scaledR[i],
      numStr: compositionData[i].numStr,
      colorSeed: compositionData[i].colorSeed,
    });
  }
}

// ─── side panel ───────────────────────────────────────────────────────────────
let sliderCount, sliderScale, sliderSpread, sliderBokeh, sliderGrain;
let panel;
const valSpans = {};

function createPanel() {
  panel = createDiv("").class("side-panel");

  // ── calculator section ───────────────────────────────────────────────────────
  const customSection = createDiv("").class("custom-section calculator");
  customSection.parent(panel);

  const numInput = createElement("input").class("calc-display");
  numInput.attribute("type", "text");
  numInput.attribute("placeholder", "write your own numbers: 3, 5, 6…");
  numInput.attribute("spellcheck", "false");
  numInput.parent(customSection);

  function applyInput() {
    const tokens = numInput
      .value()
      .trim()
      .split(/[\s,]+/)
      .filter((t) => /^-?\d+(\.\d+)?$/.test(t));
    customNums = tokens;
    generateCompositionData();
  }

  function clearInput() {
    numInput.value("");
    customNums = [];
    generateCompositionData();
  }

  function backspaceInput() {
    numInput.value(numInput.value().slice(0, -1));
  }

  numInput.elt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyInput();
    if (e.key === "Escape") clearInput();
    e.stopPropagation();
  });

  // digit row — colored to match each digit's palette2.csv ring color
  const digitRow = createDiv("").class("calc-digit-row");
  digitRow.parent(customSection);
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach((d) => {
    const btn = createElement("button", String(d)).class("calc-digit-btn");
    btn.parent(digitRow);
    const tier = NUMBER_COLORS[d] && NUMBER_COLORS[d].mid;
    const hex = tier ? color(tier.H, tier.S, tier.B).toString("#rrggbb") : "#606369";
    btn.elt.style.setProperty("--calc-digit-color", hex);
    btn.mousePressed(() => numInput.value(numInput.value() + d));
  });

  // operator grid + clear/equals
  const opGrid = createDiv("").class("calc-op-grid");
  opGrid.parent(customSection);
  // grouped like a normal calculator: brackets+delete, multiply/divide+comma,
  // add/subtract+decimal — clear/equals/random live below as full-width keys
  const opButtons = [
    { label: "(", insert: "(" },
    { label: ")", insert: ")" },
    { label: "⌫", action: backspaceInput },
    { label: "×", insert: " × " },
    { label: "/", insert: " / " },
    { label: ",", insert: ", " },
    { label: "+", insert: " + " },
    { label: "−", insert: " - " },
    { label: ".", insert: "." },
  ];
  opButtons.forEach(({ label, insert, action }) => {
    const btn = createElement("button", label).class("calc-btn");
    btn.parent(opGrid);
    btn.mousePressed(() => (action ? action() : numInput.value(numInput.value() + insert)));
  });

  const clearEqualsRow = createDiv("").class("calc-row");
  clearEqualsRow.parent(customSection);

  const clearBtn = createElement("button", "clear").class("calc-btn calc-clear-btn");
  clearBtn.parent(clearEqualsRow);
  clearBtn.mousePressed(() => clearInput());

  const equalsBtn = createElement("button", "=").class("calc-btn calc-equals-btn");
  equalsBtn.parent(clearEqualsRow);
  equalsBtn.mousePressed(() => applyInput());

  const randomBtn = createElement("button", "random equation").class(
    "calc-btn calc-random-btn",
  );
  randomBtn.parent(customSection);
  randomBtn.mousePressed(() => generateCompositionData());

  function addSection(title) {
    const sec = createDiv("").class("panel-section");
    sec.parent(panel);
    createSpan(title).class("panel-section-title").parent(sec);
  }

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
    // ruler: always exactly 10 ticks, purely a visual reference —
    // independent of the slider's own range/step. Positioned to match the
    // native thumb's actual travel (inset by half the thumb size on each
    // side), so a tick lines up exactly under the thumb's center.
    const numTicks = 10;
    const ruler = createDiv("").class("slider-ruler");
    ruler.parent(row);
    for (let i = 0; i < numTicks; i++) {
      const tick = createDiv("").class("slider-tick");
      tick.parent(ruler);
      tick.elt.style.left = `calc(var(--panel-thumb-size) / 2 + (100% - var(--panel-thumb-size)) * ${i} / ${numTicks - 1})`;
    }
    return sl;
  }

  addSection("Technical variables");

  sliderCount = addRow("count", "count", 1, 10, CONFIG.numCircles, 1);
  sliderScale = addRow("size", "size", 1, 200, CONFIG.compScale * 100, 1);
  sliderSpread = addRow(
    "spread",
    "spread",
    0,
    95,
    CONFIG.sizeVariation * 100,
    1,
  );

  addSection("Artistic variables");
  sliderBokeh = addRow("bokeh", "bokeh", 0, 30, CONFIG.bokeh, 1);
  sliderGrain = addRow("grain", "grain", 0, 100, CONFIG.grainAmount, 1);
  const sliderReality = addRow("reality", "reality", 0, 100, CONFIG.reality, 1);

  const exportBtn = createElement("button", "export").class(
    "calc-btn calc-random-btn panel-export-btn",
  );
  exportBtn.parent(panel);
  exportBtn.mousePressed(() => saveHQ(false));

  updateValues();

  sliderCount.input(() => {
    CONFIG.numCircles = int(sliderCount.value());
    generateCompositionData();
    updateValues();
  });
  sliderScale.input(() => {
    CONFIG.compScale = sliderScale.value() / 100;
    computePositions(true);
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
  if (_exportTransparent) {
    drawingContext.clearRect(0, 0, width, height);
  } else {
    drawingContext.fillStyle = canvasBgHex;
    drawingContext.fillRect(0, 0, width, height);
  }

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

    const _r = CONFIG.reality;
    drawingContext.globalAlpha = _r < 50 ? 1 : 1 - (_r - 50) / 50;
    drawNumber(item.numStr, 0, 0, item.r);

    if (CONFIG.reality > 0) {
      const fontSize = Math.round(item.r * 0.65);
      drawingContext.globalAlpha = _r > 50 ? 1 : _r / 50;
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

  if (CONFIG.bokeh > 0) {
    const snap = get();
    if (_exportTransparent) {
      drawingContext.clearRect(0, 0, width, height);
    } else {
      drawingContext.fillStyle = canvasBgHex;
      drawingContext.fillRect(0, 0, width, height);
    }
    drawingContext.filter = `blur(${CONFIG.bokeh}px)`;
    blendMode(BLEND);
    image(snap, 0, 0);
    drawingContext.filter = "none";
  }

  drawGrain();
  blendMode(BLEND);
}

// ─── save high-quality PNG (3× resolution) ────────────────────────────────────
function saveHQ(transparent = false) {
  _exportTransparent = transparent;
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
  _exportTransparent = false;
  pixelDensity(origPD);
  resizeCanvas(windowWidth, windowHeight);
}

// ─── interaction ──────────────────────────────────────────────────────────────
function reshuffleAllColors() {
  // reshuffle ring/decimal colors (colorSeed drives reshuffleColors() in number-system.js)
  compositionData.forEach((d, i) => {
    d.colorSeed = Math.floor(Math.random() * 999983);
    if (composition[i]) composition[i].colorSeed = d.colorSeed;
  });

  // reshuffle background circle colors — reassign palette3 colors to random digits
  const keys = Object.keys(NUMBER_BG_COLORS);
  const vals = keys.map((k) => NUMBER_BG_COLORS[k]);
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  keys.forEach((k, i) => {
    NUMBER_BG_COLORS[k] = vals[i];
  });
}

function keyPressed() {
  if (document.activeElement.tagName === "INPUT") return;
  if (key === " ") reshuffleAllColors();
  if (key === "s" || key === "S") saveHQ(false);
  if (key === "t" || key === "T") saveHQ(true);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateGrain();
  computePositions();
}

// ─── touch (mobile) ───────────────────────────────────────────────────────────
// Let panel touches pass through; block browser pinch-zoom on the canvas.
function touchStarted(e) {
  if (e && e.target && e.target.closest(".side-panel")) return;
  return false;
}
function touchMoved(e) {
  if (e && e.target && e.target.closest(".side-panel")) return;
  return false;
}
