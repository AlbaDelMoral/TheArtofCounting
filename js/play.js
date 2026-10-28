// play.js — unified Play page: numbers, addition/subtraction, multiplication
// all in one canvas + one panel. One calculator drives all three: what you
// type decides which mode is shown (a plain number list → numbers, a sum →
// addition/subtraction, an "x" expression → multiplication).
// Depends on: p5.js, number-system.js, addition-system.js, multiplication-system.js

// ─── per-mode CONFIG objects ────────────────────────────────────────────────
// Each mode keeps its own settings; the shared NUMBER_REPRESENTATION slice
// (ring/tick/decimal-ring look) is identical in all three, same as before.
const CONFIG_NUMBERS = {
  numCircles: 10,
  compScale: 0.12,
  sizeVariation: 0.5,
  overlapFactor: 0,
  ...NUMBER_REPRESENTATION,
  bokeh: 0,
  grainAmount: 0,
  reality: 0,
};

const CONFIG_OPERATIONS = {
  numOps: 1,
  numChainNums: 3,
  compScale: 0.09,
  sizeVariation: 0.9,
  chainSpacing: 0.5,
  valueSizeInfluence: 0.9,
  beltMarginRatio: 0.05, // fixed — no longer user-adjustable
  beltStrokeRatio: 0.04,
  ...NUMBER_REPRESENTATION,
  bokeh: 0,
  grainAmount: 0,
  reality: 0,
};

const CONFIG_MULTIPLICATION = {
  bw: 2.5,
  oh: 20,
  lgap: 8,
  dgap: 50,
  decExt: 45,
  obw: 32,
  circleScale: 0.85,
  bandMargin: 0,
  beltMarginRatio: 0.05, // same fixed ratio as Addition/Subtraction
  beltStrokeRatio: 0.04,
  showSquareOutline: false,
  showChainOutline: false,
  ...NUMBER_REPRESENTATION,
  bokeh: 0,
  grainAmount: 0,
  reality: 0,
};

let activeMode = "numbers"; // 'numbers' | 'operations' | 'multiplication'
let CONFIG = CONFIG_NUMBERS; // mutable — number/addition/multiplication-system.js read this global

function setActiveMode(mode) {
  activeMode = mode;
  CONFIG =
    mode === "numbers"
      ? CONFIG_NUMBERS
      : mode === "operations"
        ? CONFIG_OPERATIONS
        : CONFIG_MULTIPLICATION;
  _syncDropdowns();
}

// ─── shared canvas state ────────────────────────────────────────────────────
let canvasBgHex = "#ffffff";
let _exportTransparent = false;

// ─── numbers-mode state ─────────────────────────────────────────────────────
let compositionData = [];
let composition = [];
let customNums = [];

function generateCompositionData() {
  const nums = customNums.length > 0 ? customNums : null;
  const count = nums ? nums.length : CONFIG_NUMBERS.numCircles;
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
  computeNumbersPositions();
}

function computeNumbersPositions(allowOverflow = false) {
  composition = [];
  const n = compositionData.length;
  if (n === 0) return;

  const { areaX, areaY, areaW, areaH } = getPanelArea();
  const m = min(areaW, areaH);
  const radii = compositionData.map((d) => {
    const lo = Math.max(0.01, CONFIG_NUMBERS.compScale * (1 - CONFIG_NUMBERS.sizeVariation));
    const hi = CONFIG_NUMBERS.compScale * (1 + CONFIG_NUMBERS.sizeVariation);
    return lerp(lo, hi, d.sizeT) * m;
  });

  const xs0 = [radii[0]];
  for (let i = 1; i < n; i++)
    xs0.push(xs0[i - 1] + (radii[i - 1] + radii[i]) * (1 - CONFIG_NUMBERS.overlapFactor));
  const totalW0 = xs0[n - 1] + radii[n - 1];
  const maxR0 = Math.max(...radii);

  const scaleW = totalW0 > areaW ? areaW / totalW0 : 1;
  const scaleH = maxR0 * 2 > areaH ? areaH / (maxR0 * 2) : 1;
  const scale = allowOverflow ? 1 : Math.min(scaleW, scaleH, 1);

  const scaledR = radii.map((r) => r * scale);
  const xs = [scaledR[0]];
  for (let i = 1; i < n; i++)
    xs.push(xs[i - 1] + (scaledR[i - 1] + scaledR[i]) * (1 - CONFIG_NUMBERS.overlapFactor));
  const totalW = xs[n - 1] + scaledR[n - 1];

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

function reshuffleNumbersColors() {
  compositionData.forEach((d, i) => {
    d.colorSeed = Math.floor(Math.random() * 999983);
    if (composition[i]) composition[i].colorSeed = d.colorSeed;
  });
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

// ─── operations-mode state ──────────────────────────────────────────────────
let chainData = [];
let chains = [];
let customOps = [];

function generateChainData() {
  const parsed = customOps.length > 0 ? customOps : null;
  const count = parsed ? parsed.length : CONFIG_OPERATIONS.numOps;
  chainData = [];

  for (let c = 0; c < count; c++) {
    const nums = parsed
      ? parsed[c]
      : Array.from({ length: CONFIG_OPERATIONS.numChainNums }, () => randomNum());
    const n = nums.length;

    const mags = nums.map((s) => Math.log10(Math.abs(parseFloat(s)) + 1));
    const maxM = Math.max(...mags, 0.001);
    const sizeTs = mags.map((m) => {
      const magT = m / maxM;
      const rndT = random(1);
      return lerp(rndT, magT, CONFIG_OPERATIONS.valueSizeInfluence);
    });

    chainData.push({
      nums,
      sizeTs,
      colorSeeds: Array.from({ length: n }, () => floor(random(999983))),
      beltColorSeeds: Array.from({ length: n - 1 }, () => floor(random(999983))),
      angles: Array.from({ length: n }, () => random(TWO_PI)),
      rotSpeeds: Array.from(
        { length: n },
        () => (random() < 0.5 ? -1 : 1) * random(0.003, 0.018),
      ),
      fontIdxs: Array.from({ length: n }, () => floor(random(FONTS.length))),
    });
  }
  computeOperationsPositions();
}

function computeOperationsPositions() {
  chains = [];
  const nChains = chainData.length;
  if (nChains === 0) return;

  const { areaX, areaY, areaW, areaH } = getPanelArea();
  const m = min(areaW, areaH);
  // Scaled down so the "size" slider's useful range reaches further (~0.8)
  // before the auto-fit-to-area clamp below caps it, instead of saturating
  // almost immediately (~0.2) like a 1:1 mapping did.
  const SIZE_SCALE = 0.2;
  const effScale = CONFIG_OPERATIONS.compScale * SIZE_SCALE;
  const lo = Math.max(0.01, effScale * (1 - CONFIG_OPERATIONS.sizeVariation));
  const hi = effScale * (1 + CONFIG_OPERATIONS.sizeVariation);
  const rowH = areaH / nChains;

  for (let c = 0; c < nChains; c++) {
    const data = chainData[c];
    const n = data.nums.length;
    const cy = areaY + rowH * (c + 0.5);

    const radii = data.sizeTs.map((t) => lerp(lo, hi, t) * m);

    // chainSpacing: positive = more gap, negative = more overlap (0 = touching)
    const xs0 = [radii[0]];
    for (let i = 1; i < n; i++)
      xs0.push(xs0[i - 1] + (radii[i - 1] + radii[i]) * (1 + CONFIG_OPERATIONS.chainSpacing));
    const totalW0 = xs0[n - 1] + radii[n - 1];
    const maxR0 = Math.max(...radii);

    const scaleW = totalW0 > areaW ? areaW / totalW0 : 1;
    const scaleH = maxR0 * 2 > rowH ? rowH / (maxR0 * 2) : 1;
    const scale = Math.min(scaleW, scaleH, 1);

    const scaledR = radii.map((r) => r * scale);
    const xs = [scaledR[0]];
    for (let i = 1; i < n; i++)
      xs.push(xs[i - 1] + (scaledR[i - 1] + scaledR[i]) * (1 + CONFIG_OPERATIONS.chainSpacing));
    const totalW = xs[n - 1] + scaledR[n - 1];
    const ox = areaX + (areaW - totalW) / 2;

    const circles = data.nums.map((numStr, i) => ({
      x: ox + xs[i],
      y: cy,
      r: scaledR[i],
      numStr,
      colorSeed: data.colorSeeds[i],
      fontIdx: data.fontIdxs[i],
    }));

    const lightSwatches = SWATCHES.filter((s) => s.type === "light");
    const basePool = lightSwatches.length > 0 ? lightSwatches : SWATCHES;
    const belts = [];

    for (let i = 0; i < n - 1; i++) {
      const valA = parseFloat(data.nums[i]);
      const valB = parseFloat(data.nums[i + 1]);
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
      belts.push({
        cssColor: `rgb(${floor(red(swatchCol))},${floor(green(swatchCol))},${floor(blue(swatchCol))})`,
        resultPositive: valA + valB >= 0,
      });
    }
    randomSeed();

    chains.push({ circles, belts });
  }
}

function reshuffleOperationsColors() {
  chainData.forEach((chain) => {
    chain.colorSeeds = chain.colorSeeds.map(() => Math.floor(Math.random() * 999983));
    chain.beltColorSeeds = chain.beltColorSeeds.map(() => Math.floor(Math.random() * 999983));
  });
  computeOperationsPositions();
}

// ─── multiplication-mode state ──────────────────────────────────────────────
let parsedSteps = null;
let currentExpr = "14x15";
let _stepOffsets = [];
let _stepColorSets = [];

function _shuffleAllSteps(steps) {
  if (!steps || !steps.length) return;
  _stepColorSets = [];
  for (let i = 0; i < steps.length; i++) {
    const pool = shuffle(SWATCHES.slice());
    _stepColorSets.push({
      hCol: pool[0].col,
      vCol: pool[1 % pool.length].col,
      chains: [2, 3, 4, 5].map((j) => _p5ToCss(pool[j % pool.length].col)),
    });
    for (const side of [steps[i].sideA, steps[i].sideB]) {
      if (side && side.tokens) {
        side.tokens.forEach((t) => {
          t.colorSeed = floor(random(999983));
        });
      }
    }
  }
  if (_stepColorSets.length) {
    MUL_COL.hCol = _stepColorSets[0].hCol;
    MUL_COL.vCol = _stepColorSets[0].vCol;
    MUL_COL.chains = _stepColorSets[0].chains;
  }
}

function _randomMultExpr() {
  // Kept small so results don't balloon into dozens of digits: 2-4 operands,
  // mostly single/double digit values, occasionally a bit bigger.
  const n = floor(random(2, 5));
  const parts = [];
  for (let i = 0; i < n; i++) {
    const tier = random();
    let val;
    if (tier < 0.6) val = floor(random(2, 10));
    else if (tier < 0.9) val = floor(random(10, 30));
    else val = floor(random(30, 60));
    if (random() < 0.15) val = val + round(random(1, 9)) / 10;
    if (random() < 0.2) val = -val;
    parts.push(val);
  }
  return parts.join("x");
}

function _computeOffsets(steps) {
  _stepOffsets = [];
  if (!steps || !steps.length) return;

  let cx = 0,
    cy = 0;
  let prevHalf = 0;
  for (let i = 0; i < steps.length; i++) {
    const half = _multSquareSize(steps[i]) / 2;
    if (i > 0) {
      cx += prevHalf + half;
      cy += prevHalf + half;
    }
    _stepOffsets.push({ ox: cx, oy: cy, half });
    prevHalf = half;
  }

  const first = _stepOffsets[0];
  const last = _stepOffsets[_stepOffsets.length - 1];
  const midX = (first.ox - first.half + last.ox + last.half) / 2;
  const midY = (first.oy - first.half + last.oy + last.half) / 2;
  for (const o of _stepOffsets) {
    o.ox -= midX;
    o.oy -= midY;
  }
}

// Formats one side of a multiplication step for the per-square reality
// label — a plain value for a simple operand, or the reconstructed
// expression (e.g. "6+2-8") for a parenthesized chain operand.
function _fmtMultSide(side) {
  if (!side) return "";
  if (side.type === "chain") {
    return (
      "(" +
      side.tokens
        .map((t, i) => (i === 0 ? (t.sign < 0 ? "-" : "") : t.sign < 0 ? "-" : "+") + t.val)
        .join("") +
      ")"
    );
  }
  return String(side.value);
}

function applyMultiplication(raw) {
  const res = parseMultChain(raw);
  if (!res) return false;
  // Switch CONFIG to CONFIG_MULTIPLICATION before any geometry below reads
  // it — multiplication-system.js's _multGeometryCore reads the shared
  // mutable CONFIG pointer directly. Switching only after this function
  // returns (as applyInput() used to) meant the very first switch into
  // multiplication mode from another mode computed geometry against the
  // PREVIOUS mode's CONFIG (missing bw/obw/lgap/dgap/... entirely).
  setActiveMode("multiplication");
  parsedSteps = res;
  currentExpr = raw.trim();
  _shuffleAllSteps(parsedSteps);
  _computeOffsets(parsedSteps);
  _fitMultiplicationView();
  return true;
}

// Zooms/pans so the whole chain's bounding square sits centered inside the
// canvas, regardless of how big or small it ended up (random chains can
// range from tiny to huge). _computeOffsets() already centers the chain's
// bounding box on offset-space (0,0), i.e. on the canvas center, so we only
// need to scale around that same center point.
function _fitMultiplicationView() {
  if (!_stepOffsets.length) {
    _zoom = 1;
    _panX = 0;
    _panY = 0;
    return;
  }
  const first = _stepOffsets[0];
  const last = _stepOffsets[_stepOffsets.length - 1];
  const bboxW = last.ox + last.half - (first.ox - first.half);
  const bboxH = last.oy + last.half - (first.oy - first.half);
  const pad = 60;
  const availW = Math.max(50, width - pad * 2);
  const availH = Math.max(50, height - pad * 2);
  _zoom = constrain(Math.min(availW / bboxW, availH / bboxH), 0.02, 2.5);
  _panX = (width / 2) * (1 - _zoom);
  _panY = (height / 2) * (1 - _zoom);
}

// ─── pan / zoom (multiplication mode only) ─────────────────────────────────
let _zoom = 1.0;
let _panX = 0;
let _panY = 0;
let _dragging = false;
let _lastMX = 0;
let _lastMY = 0;

function _overUI() {
  // mouseX/mouseY are canvas-relative; the canvas is now offset from the
  // viewport's origin (it starts at column 3), so convert to viewport
  // coordinates before asking the DOM what's at that point.
  const rect = _canvasEl.elt.getBoundingClientRect();
  const el = document.elementFromPoint(mouseX + rect.left, mouseY + rect.top);
  return el && el.tagName !== "CANVAS";
}

// ─── input-mode detection ───────────────────────────────────────────────────
// Decides what the typed string means: an "x"/"×" → multiplication, a "+"/"-"
// sitting between two numbers → addition/subtraction, otherwise → a plain
// number list.
function _detectMode(str) {
  const s = str.trim();
  if (!s) return null;
  const compact = s.replace(/[\s,]/g, "");
  if (/[x×*]/i.test(compact)) return "multiplication";
  if (/\d\s*[+\-−]\s*-?\d/.test(s)) return "operations";
  return "numbers";
}

// ─── panel ───────────────────────────────────────────────────────────────────
let display; // shared calculator display element
const valSpans = {};
let _dropdowns = {}; // mode -> { wrapper, content }

function createPanel() {
  const panel = createDiv("").class("side-panel");

  // ── calculator section (shared across all three modes) ──────────────────────
  const customSection = createDiv("").class("custom-section calculator");
  customSection.parent(panel);

  display = createElement("input").class("calc-display");
  display.attribute("type", "text");
  display.attribute("placeholder", "3, 5, 6  ·  2 + 3  ·  2 × 4");
  display.attribute("spellcheck", "false");
  display.parent(customSection);

  function applyInput() {
    const raw = display.value();
    const mode = _detectMode(raw);
    if (!mode) return;

    if (mode === "multiplication") {
      if (!applyMultiplication(raw)) return; // switches to multiplication mode internally
    } else if (mode === "operations") {
      const parsed = parseChains(raw);
      if (!parsed.length) return;
      customOps = parsed;
      generateChainData();
      setActiveMode("operations");
    } else {
      const tokens = raw
        .trim()
        .split(/[\s,]+/)
        .filter((t) => /^-?\d+(\.\d+)?$/.test(t));
      customNums = tokens;
      generateCompositionData();
      setActiveMode("numbers");
    }
    redraw();
  }

  function clearInput() {
    if (activeMode === "numbers") {
      display.value("");
      customNums = [];
      generateCompositionData();
    } else if (activeMode === "operations") {
      display.value("");
      customOps = [];
      generateChainData();
    } else {
      display.value("14x15");
      applyMultiplication("14x15");
    }
    redraw();
  }

  function backspaceInput() {
    display.value(display.value().slice(0, -1));
  }

  function randomAction() {
    if (activeMode === "numbers") {
      customNums = [];
      generateCompositionData();
      display.value("");
    } else if (activeMode === "operations") {
      customOps = [];
      generateChainData();
      display.value("");
    } else {
      const expr = _randomMultExpr();
      display.value(expr);
      applyMultiplication(expr);
    }
    redraw();
  }

  display.elt.addEventListener("keydown", (e) => {
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
    btn.mousePressed(() => display.value(display.value() + d));
  });

  // operator grid
  const opGrid = createDiv("").class("calc-op-grid");
  opGrid.parent(customSection);
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
    btn.mousePressed(() => (action ? action() : display.value(display.value() + insert)));
  });

  const clearEqualsRow = createDiv("").class("calc-row");
  clearEqualsRow.parent(customSection);

  const clearBtn = createElement("button", "clear").class("calc-btn calc-clear-btn");
  clearBtn.parent(clearEqualsRow);
  clearBtn.mousePressed(() => clearInput());

  const equalsBtn = createElement("button", "=").class("calc-btn calc-equals-btn");
  equalsBtn.parent(clearEqualsRow);
  equalsBtn.mousePressed(() => applyInput());

  const randomBtn = createElement("button", "random").class("calc-btn calc-random-btn");
  randomBtn.parent(customSection);
  randomBtn.mousePressed(() => randomAction());

  // ── shared row/section builders ──────────────────────────────────────────────
  function addRow(container, key, label, mn, mx, val, step, onInput) {
    const row = createDiv("").class("slider-row");
    row.parent(container);
    const header = createDiv("").class("slider-header");
    header.parent(row);
    createSpan(label).class("slider-label").parent(header);
    const vs = createSpan("").class("slider-value");
    vs.parent(header);
    valSpans[key] = vs;
    const sl = createSlider(mn, mx, val, step);
    sl.parent(row);
    const numTicks = 10;
    const ruler = createDiv("").class("slider-ruler");
    ruler.parent(row);
    for (let i = 0; i < numTicks; i++) {
      const tick = createDiv("").class("slider-tick");
      tick.parent(ruler);
      tick.elt.style.left = `calc(var(--panel-thumb-size) / 2 + (100% - var(--panel-thumb-size)) * ${i} / ${numTicks - 1})`;
    }
    sl.input(() => {
      onInput(parseFloat(sl.value()));
      updateValues();
      redraw();
    });
    return sl;
  }

  function addColorRow(container, label, defaultHex, onChange) {
    const row = createDiv("").class("color-row");
    row.parent(container);
    createSpan(label).class("slider-label").parent(row);
    const swatch = createElement("input");
    swatch.attribute("type", "color");
    swatch.attribute("value", defaultHex);
    swatch.class("color-swatch");
    swatch.parent(row);
    swatch.input(() => onChange(swatch.value()));
  }

  // ── collapsible "Technical variables" dropdown, one per mode ─────────────────
  // Not user-clickable: which dropdown is open/active is decided entirely by
  // what the calculator input resolves to (_detectMode → setActiveMode), not
  // by the user toggling a title directly. The other two stay closed and
  // greyed out (see .panel-dropdown:not(.panel-dropdown--open) in panel.css).
  function addDropdown(mode, title) {
    const wrapper = createDiv("").class("panel-dropdown");
    wrapper.parent(panel);

    const toggle = createDiv("").class("panel-section panel-dropdown-toggle");
    toggle.parent(wrapper);
    createSpan(title).class("panel-section-title").parent(toggle);
    createSpan("⌄").class("panel-dropdown-arrow").parent(toggle);

    const contentOuter = createDiv("").class("panel-dropdown-content");
    contentOuter.parent(wrapper);
    const content = createDiv("").class("panel-dropdown-content-inner");
    content.parent(contentOuter);

    _dropdowns[mode] = { wrapper, content };
    return content;
  }

  const numbersContent = addDropdown("numbers", "Numbers");
  const sliderCount = addRow(
    numbersContent,
    "count",
    "count",
    1,
    10,
    CONFIG_NUMBERS.numCircles,
    1,
    (v) => {
      CONFIG_NUMBERS.numCircles = int(v);
      generateCompositionData();
    },
  );
  const sliderNumSize = addRow(
    numbersContent,
    "numSize",
    "size",
    0,
    100,
    CONFIG_NUMBERS.compScale * 100,
    1,
    (v) => {
      CONFIG_NUMBERS.compScale = v / 100;
      computeNumbersPositions(true);
    },
  );
  const sliderNumSpread = addRow(
    numbersContent,
    "numSpread",
    "spread",
    0,
    95,
    CONFIG_NUMBERS.sizeVariation * 100,
    1,
    (v) => {
      CONFIG_NUMBERS.sizeVariation = v / 100;
      computeNumbersPositions();
    },
  );

  const opsContent = addDropdown("operations", "Addition and Subtraction");
  addRow(opsContent, "length", "length", 2, 6, CONFIG_OPERATIONS.numChainNums, 1, (v) => {
    CONFIG_OPERATIONS.numChainNums = int(v);
    generateChainData();
  });
  addRow(opsContent, "opSize", "size", 0, 100, CONFIG_OPERATIONS.compScale * 100, 1, (v) => {
    CONFIG_OPERATIONS.compScale = v / 100;
    computeOperationsPositions();
  });
  addRow(
    opsContent,
    "opSpread",
    "spread",
    0,
    95,
    CONFIG_OPERATIONS.sizeVariation * 100,
    1,
    (v) => {
      CONFIG_OPERATIONS.sizeVariation = v / 100;
      computeOperationsPositions();
    },
  );
  addRow(
    opsContent,
    "spacing",
    "spacing",
    -95,
    150,
    CONFIG_OPERATIONS.chainSpacing * 100,
    1,
    (v) => {
      CONFIG_OPERATIONS.chainSpacing = v / 100;
      computeOperationsPositions();
    },
  );
  const multContent = addDropdown("multiplication", "Multiplication");
  // obw (the addition/subtraction op-chain's own band thickness) stays
  // proportional to bw, so the "thickness" slider also scales the
  // addition/subtraction bands whenever a parenthesized chain is a
  // multiplication operand.
  const OBW_RATIO = CONFIG_MULTIPLICATION.obw / CONFIG_MULTIPLICATION.bw;
  addRow(multContent, "bw", "thickness", 1, 10, CONFIG_MULTIPLICATION.bw, 0.1, (v) => {
    CONFIG_MULTIPLICATION.bw = v;
    CONFIG_MULTIPLICATION.obw = v * OBW_RATIO;
    _computeOffsets(parsedSteps);
  });
  addRow(multContent, "dgap", "digit gap", 0, 100, CONFIG_MULTIPLICATION.dgap, 1, (v) => {
    CONFIG_MULTIPLICATION.dgap = v;
    _computeOffsets(parsedSteps);
  });
  addRow(multContent, "lgap", "line gap", 1, 10, CONFIG_MULTIPLICATION.lgap, 0.1, (v) => {
    CONFIG_MULTIPLICATION.lgap = v;
    _computeOffsets(parsedSteps);
  });
  addRow(multContent, "oh", "overhang", 0, 20, CONFIG_MULTIPLICATION.oh, 1, (v) => {
    CONFIG_MULTIPLICATION.oh = v;
    _computeOffsets(parsedSteps);
  });

  // ── Artistic variables — shared across all three modes ───────────────────────
  const artSection = createDiv("").class("panel-section");
  artSection.parent(panel);
  createSpan("Artistic variables").class("panel-section-title").parent(artSection);

  addColorRow(panel, "background", canvasBgHex, (hex) => {
    canvasBgHex = hex;
  });
  const sliderBokeh = addRow(panel, "bokeh", "bokeh", 0, 30, CONFIG_NUMBERS.bokeh, 1, (v) => {
    CONFIG_NUMBERS.bokeh = int(v);
    CONFIG_OPERATIONS.bokeh = int(v);
    CONFIG_MULTIPLICATION.bokeh = int(v);
  });
  const sliderGrain = addRow(
    panel,
    "grain",
    "grain",
    0,
    100,
    CONFIG_NUMBERS.grainAmount,
    1,
    (v) => {
      CONFIG_NUMBERS.grainAmount = int(v);
      CONFIG_OPERATIONS.grainAmount = int(v);
      CONFIG_MULTIPLICATION.grainAmount = int(v);
    },
  );
  const sliderReality = addRow(
    panel,
    "reality",
    "reality",
    0,
    100,
    CONFIG_NUMBERS.reality,
    1,
    (v) => {
      CONFIG_NUMBERS.reality = int(v);
      CONFIG_OPERATIONS.reality = int(v);
      CONFIG_MULTIPLICATION.reality = int(v);
    },
  );

  const exportBtn = createElement("button", "export").class(
    "calc-btn calc-random-btn panel-export-btn",
  );
  exportBtn.parent(panel);
  exportBtn.mousePressed(() => saveHQ(false));

  updateValues();
  _syncDropdowns();
}

// Keeps the dropdown open/closed state in sync with activeMode (accordion:
// only the active mode's sliders are expanded).
function _syncDropdowns() {
  for (const mode in _dropdowns) {
    const isOpen = mode === activeMode;
    _dropdowns[mode].wrapper.elt.classList.toggle("panel-dropdown--open", isOpen);
  }
}

function updateValues() {
  if (valSpans.count) valSpans.count.html(CONFIG_NUMBERS.numCircles);
  if (valSpans.numSize) valSpans.numSize.html(nf(CONFIG_NUMBERS.compScale, 1, 2));
  if (valSpans.numSpread) valSpans.numSpread.html(nf(CONFIG_NUMBERS.sizeVariation, 1, 2));

  if (valSpans.length) valSpans.length.html(CONFIG_OPERATIONS.numChainNums);
  if (valSpans.opSize) valSpans.opSize.html(nf(CONFIG_OPERATIONS.compScale, 1, 2));
  if (valSpans.opSpread) valSpans.opSpread.html(nf(CONFIG_OPERATIONS.sizeVariation, 1, 2));
  if (valSpans.spacing) valSpans.spacing.html(nf(CONFIG_OPERATIONS.chainSpacing, 1, 2));

  if (valSpans.bw) valSpans.bw.html(nf(CONFIG_MULTIPLICATION.bw, 1, 1) + "px");
  if (valSpans.dgap) valSpans.dgap.html(CONFIG_MULTIPLICATION.dgap + "px");
  if (valSpans.lgap) valSpans.lgap.html(nf(CONFIG_MULTIPLICATION.lgap, 1, 1) + "px");
  if (valSpans.oh) valSpans.oh.html(CONFIG_MULTIPLICATION.oh + "px");

  if (valSpans.bokeh) valSpans.bokeh.html(CONFIG_NUMBERS.bokeh + "px");
  if (valSpans.grain) valSpans.grain.html(CONFIG_NUMBERS.grainAmount);
  if (valSpans.reality) valSpans.reality.html(CONFIG_NUMBERS.reality);
}

// ─── canvas region — confined to columns 3 through the right margin ───────
// The slider panel occupies columns 1–2 (through their trailing gap); the
// visualization canvas is hard-limited to column 3 onward, so nothing drawn
// or panned can ever appear to the left of it. Reads the grid's own CSS vars
// (same ones panel.css / grid-overlay.css use) via a throwaway measuring div.
function _gridPx(varName) {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed; width:var(${varName}); visibility:hidden;`;
  document.body.appendChild(el);
  const w = el.getBoundingClientRect().width;
  el.remove();
  return w;
}

function _getCanvasRegion() {
  const marginX = _gridPx("--grid-margin-x");
  const colWidth = _gridPx("--grid-col-width");
  const gap = _gridPx("--grid-gap");
  const col3Left = marginX + 2 * (colWidth + gap); // left edge of column 3
  const x = col3Left;
  const w = Math.max(100, window.innerWidth - marginX - col3Left);
  return { x, y: 0, w, h: window.innerHeight };
}

let _canvasEl; // the p5.Element wrapping our <canvas>, kept positioned to the region above

function _applyCanvasRegion() {
  const region = _getCanvasRegion();
  resizeCanvas(region.w, region.h);
  _canvasEl.position(region.x, region.y, "fixed");
  return region;
}

// ─── p5 lifecycle ───────────────────────────────────────────────────────────
function setup() {
  const region = _getCanvasRegion();
  _canvasEl = createCanvas(region.w, region.h);
  _canvasEl.position(region.x, region.y, "fixed");
  buildPalette();
  generateGrain();
  createPanel();
  generateCompositionData(); // default: numbers mode, random composition
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

  if (activeMode === "numbers") {
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

      const _r = CONFIG_NUMBERS.reality;
      drawingContext.globalAlpha = _r < 50 ? 1 : 1 - (_r - 50) / 50;
      drawNumber(item.numStr, 0, 0, item.r);

      if (CONFIG_NUMBERS.reality > 0) {
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
  } else if (activeMode === "operations") {
    for (let c = 0; c < chains.length; c++) {
      const chain = chains[c];
      const data = chainData[c];

      for (let i = 0; i < data.angles.length; i++) data.angles[i] += data.rotSpeeds[i];

      blendMode(BLEND);
      drawingContext.globalAlpha = 1 - CONFIG_OPERATIONS.reality / 100;
      for (let i = 0; i < chain.belts.length; i++) {
        const belt = chain.belts[i];
        const cA = chain.circles[i];
        const cB = chain.circles[i + 1];
        const RA = cA.r * (1 + CONFIG_OPERATIONS.beltMarginRatio);
        const RB = cB.r * (1 + CONFIG_OPERATIONS.beltMarginRatio);
        drawBelt(cA.x, cA.y, RA, cB.x, cB.y, RB, belt.resultPositive, belt.cssColor);
      }

      drawingContext.globalAlpha = 1;
      for (let i = 0; i < chain.circles.length; i++) {
        const circle = chain.circles[i];
        const f = FONTS[data.fontIdxs[i]];

        randomSeed(circle.colorSeed);
        reshuffleColors();

        const shapeAlpha = 1 - CONFIG_OPERATIONS.reality / 100;
        const textAlpha = CONFIG_OPERATIONS.reality / 100;

        if (shapeAlpha > 0) {
          push();
          noStroke();
          fill(0, 0, 100);
          ellipse(circle.x, circle.y, circle.r * 2, circle.r * 2);
          pop();

          push();
          translate(circle.x, circle.y);
          rotate(data.angles[i]);
          drawingContext.globalAlpha = shapeAlpha;
          drawNumber(circle.numStr, 0, 0, circle.r);
          pop();
        }

        if (textAlpha > 0) {
          push();
          translate(circle.x, circle.y);
          rotate(data.angles[i]);
          const fs = Math.round(circle.r * 0.65);
          drawingContext.globalAlpha = textAlpha;
          drawingContext.font = `${f.style} ${f.weight} ${fs}px ${f.family}, sans-serif`;
          drawingContext.textAlign = "center";
          drawingContext.textBaseline = "middle";
          drawingContext.fillStyle = "#111111";
          drawingContext.fillText(circle.numStr, 0, 0);
          pop();
        }
      }
    }
    randomSeed();
  } else if (activeMode === "multiplication") {
    const shapeAlpha = 1 - CONFIG_MULTIPLICATION.reality / 100;
    const textAlpha = CONFIG_MULTIPLICATION.reality / 100;

    push();
    translate(_panX, _panY);
    scale(_zoom);
    if (parsedSteps) {
      for (let i = 0; i < parsedSteps.length; i++) {
        const off = _stepOffsets[i] || { ox: 0, oy: 0, half: 0 };
        const cs = _stepColorSets[i] || _stepColorSets[0];
        if (cs) {
          MUL_COL.hCol = cs.hCol;
          MUL_COL.vCol = cs.vCol;
          MUL_COL.chains = cs.chains;
        }
        push();
        translate(off.ox, off.oy);
        drawingContext.globalAlpha = shapeAlpha;
        drawMultiplication(parsedSteps[i]);

        // Reality text for THIS step only, centered in THIS step's own
        // square — not one combined label in the middle of the canvas.
        if (textAlpha > 0) {
          const step = parsedSteps[i];
          const label = _fmtMultSide(step.sideA) + " × " + _fmtMultSide(step.sideB) + " = " + step.result;
          const fontSize = constrain(off.half * 0.36, 8, 80);
          drawingContext.globalAlpha = textAlpha;
          drawingContext.font = `900 normal ${fontSize}px KMRWaldenburg, sans-serif`;
          drawingContext.textAlign = "center";
          drawingContext.textBaseline = "middle";
          drawingContext.fillStyle = "#111111";
          drawingContext.fillText(label, width / 2, height / 2);
        }
        pop();
      }

      if (CONFIG_MULTIPLICATION.showChainOutline !== false && _stepOffsets.length) {
        const first = _stepOffsets[0];
        const last = _stepOffsets[_stepOffsets.length - 1];
        const left = width / 2 + first.ox - first.half;
        const top = height / 2 + first.oy - first.half;
        const right = width / 2 + last.ox + last.half;
        const bottom = height / 2 + last.oy + last.half;
        push();
        noFill();
        stroke(0, 100, 90);
        strokeWeight(1.5);
        rectMode(CORNERS);
        rect(left, top, right, bottom);
        pop();
      }
    }
    pop();
    drawingContext.globalAlpha = 1;

    if (parsedSteps && parsedSteps.length) {
      push();
      fill(0, 0, 55);
      noStroke();
      textSize(11);
      textAlign(CENTER);
      text(
        currentExpr + "  =  " + parsedSteps[parsedSteps.length - 1].result,
        width / 2,
        height - 20,
      );
      pop();
    }
  }

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

// ─── save high-quality PNG ──────────────────────────────────────────────────
function saveHQ(transparent = false) {
  _exportTransparent = transparent;
  const origPD = pixelDensity();
  pixelDensity(activeMode === "numbers" ? 3 : 4);
  _applyCanvasRegion();
  draw();
  const ts =
    year() +
    nf(month(), 2) +
    nf(day(), 2) +
    "-" +
    nf(hour(), 2) +
    nf(minute(), 2) +
    nf(second(), 2);
  saveCanvas("visual-" + activeMode + "-" + ts, "png");
  _exportTransparent = false;
  pixelDensity(origPD);
  _applyCanvasRegion();
}

// ─── interaction ─────────────────────────────────────────────────────────────
function keyPressed() {
  if (document.activeElement.tagName === "INPUT") return;
  if (key === " ") {
    if (activeMode === "numbers") reshuffleNumbersColors();
    else if (activeMode === "operations") reshuffleOperationsColors();
    else {
      _shuffleAllSteps(parsedSteps);
      _computeOffsets(parsedSteps);
    }
    redraw();
  }
  if (key === "s" || key === "S") saveHQ(false);
  if (key === "t" || key === "T") saveHQ(true);
}

function windowResized() {
  _applyCanvasRegion();
  generateGrain();
  if (activeMode === "numbers") computeNumbersPositions();
  else if (activeMode === "operations") computeOperationsPositions();
  redraw();
}

// ─── pan / zoom handlers (multiplication mode only) ────────────────────────
function mouseWheel(event) {
  if (activeMode !== "multiplication" || _overUI()) return;
  const factor = event.delta > 0 ? 0.97 : 1.03;
  _panX = mouseX - (mouseX - _panX) * factor;
  _panY = mouseY - (mouseY - _panY) * factor;
  _zoom = constrain(_zoom * factor, 0.1, 10);
  redraw();
  return false;
}

function mousePressed() {
  if (activeMode !== "multiplication" || _overUI()) return;
  _dragging = true;
  _lastMX = mouseX;
  _lastMY = mouseY;
}

function mouseDragged() {
  if (activeMode !== "multiplication" || !_dragging) return;
  _panX += mouseX - _lastMX;
  _panY += mouseY - _lastMY;
  _lastMX = mouseX;
  _lastMY = mouseY;
  redraw();
}

function mouseReleased() {
  _dragging = false;
}

function doubleClicked() {
  if (activeMode !== "multiplication" || _overUI()) return;
  _fitMultiplicationView();
  redraw();
}

// ─── touch (mobile) ──────────────────────────────────────────────────────────
let _lastTouchDist = null;

function _touchOnPanel(e) {
  return !!(e && e.target && e.target.closest && e.target.closest(".side-panel"));
}

function touchStarted(e) {
  if (_touchOnPanel(e)) return;
  if (activeMode === "multiplication") {
    if (touches.length === 1) {
      _dragging = true;
      _lastMX = touches[0].x;
      _lastMY = touches[0].y;
    } else if (touches.length === 2) {
      _dragging = false;
      const dx = touches[1].x - touches[0].x;
      const dy = touches[1].y - touches[0].y;
      _lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }
  return false;
}

function touchMoved(e) {
  if (_touchOnPanel(e)) return;
  if (activeMode === "multiplication") {
    if (touches.length === 1 && _dragging) {
      _panX += touches[0].x - _lastMX;
      _panY += touches[0].y - _lastMY;
      _lastMX = touches[0].x;
      _lastMY = touches[0].y;
      redraw();
    } else if (touches.length === 2 && _lastTouchDist !== null) {
      const dx = touches[1].x - touches[0].x;
      const dy = touches[1].y - touches[0].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midX = (touches[0].x + touches[1].x) / 2;
      const midY = (touches[0].y + touches[1].y) / 2;
      const factor = dist / _lastTouchDist;
      _panX = midX - (midX - _panX) * factor;
      _panY = midY - (midY - _panY) * factor;
      _zoom = constrain(_zoom * factor, 0.1, 10);
      _lastTouchDist = dist;
      redraw();
    }
  }
  return false;
}

function touchEnded(e) {
  if (_touchOnPanel(e)) return;
  _dragging = false;
  _lastTouchDist = null;
}
