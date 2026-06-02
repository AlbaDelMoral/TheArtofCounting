// multiplication.js — Multiplication page sketch
// Depends on: p5.js, number-system.js, addition-system.js, multiplication-system.js

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  // ── basic bands ───────────────────────────────────────────────────────────────
  bw: 14, // band thickness (px)
  oh: 40, // overhang beyond square (px)
  lgap: 8, // gap between bands within a digit group (px)
  dgap: 50, // gap between digit groups — drives square size (px)
  decExt: 45, // decimal section extra breathing room (%)

  // ── op chain bands ────────────────────────────────────────────────────────────
  obw: 32, // op band thickness — sets the band height/width (px)
  circleScale: 0.85, // circle radius as fraction of obw/2 (0.3–1.0)
  bandMargin: 0, // inset of circle span from band edges (px)
  pad: 5, // belt padding beyond circle edge (px)

  // ── belt (read by drawBelt in addition-system.js) ─────────────────────────────
  beltStrokeRatio: 0.04,

  // ── ring geometry ─────────────────────────────────────────────────────────────
  ringAreaRatio: 0.88,
  ringGrowth: 1.4,

  // ── outer circle ─────────────────────────────────────────────────────────────
  outerStrokeRatio: 0.04,

  // ── cake portions ─────────────────────────────────────────────────────────────
  portionArcSteps: 38,
  negStrokeRatio: 0.04,

  // ── tick marks ────────────────────────────────────────────────────────────────
  tickLengthRatio: 0.3,
  tickStrokeWeight: 1,
  tickOpacity: 255,

  // ── decimal ring ──────────────────────────────────────────────────────────────
  decimalStrokeRatio: 0.05,
  decimalDashCount: 10,
  decimalDashRatio: 0.82,
  decimalMarginRatio: 0.04,

  // ── center dot ────────────────────────────────────────────────────────────────
  centerDotRatio: 0.025,

  // ── blend / effects ───────────────────────────────────────────────────────────
  blendModeName: "NONE",
  bokeh: 0,
  grainAmount: 0,
  reality: 0,
};

let canvasBgHex = '#ffffff'; // canvas background — driven by colour picker
let _exportTransparent = false; // when true, saveHQ skips background fill → transparent PNG

// ─── state ────────────────────────────────────────────────────────────────────
let parsedSteps = null; // array of {sideA, sideB, result} — one per × step
let currentExpr = "14x15";
const valSpans = {};
let _stepOffsets = []; // [{ox, oy}] — canvas offset from center per step
let _stepColorSets = []; // [{hCol, vCol, chains}] — colors per step

// Assigns fresh colors and re-seeds op-chain tokens for every step.
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
  // Keep MUL_COL in sync with step 0 (needed by drawMultiplication internally)
  if (_stepColorSets.length) {
    MUL_COL.hCol = _stepColorSets[0].hCol;
    MUL_COL.vCol = _stepColorSets[0].vCol;
    MUL_COL.chains = _stepColorSets[0].chains;
  }
}

// Generates a random multiplication chain expression with 4–10 operands.
// Mix of single-digit, two-digit, three-digit values; some decimals; some negatives.
function _randomMultExpr() {
  const n = floor(random(3, 7));
  const parts = [];
  for (let i = 0; i < n; i++) {
    const tier = random();
    let val;
    if (tier < 0.4) val = floor(random(2, 10));
    else if (tier < 0.7) val = floor(random(10, 100));
    else val = floor(random(100, 1000));
    if (random() < 0.2) val = val + round(random(1, 9)) / 10;
    if (random() < 0.25) val = -val;
    parts.push(val);
  }
  return parts.join("x");
}

// Computes random placement offsets for n steps (step 0 is always at canvas center).
function _computeOffsets(n) {
  _stepOffsets = [{ ox: 0, oy: 0 }];
  let cx = 0,
    cy = 0;
  for (let i = 1; i < n; i++) {
    const angle = random(-PI / 3, PI / 3);
    const dist = random(420, 580);
    cx += cos(angle) * dist;
    cy += sin(angle) * dist;
    _stepOffsets.push({ ox: cx, oy: cy });
  }
}

// ─── pan / zoom ───────────────────────────────────────────────────────────────
let _zoom = 1.0;
let _panX = 0;
let _panY = 0;
let _dragging = false;
let _lastMX = 0;
let _lastMY = 0;

// Returns true when the mouse is over a UI element (panel, inputs, etc.)
function _overUI() {
  const el = document.elementFromPoint(mouseX, mouseY);
  return el && el.tagName !== "CANVAS";
}

// ─── panel ────────────────────────────────────────────────────────────────────
function createPanel() {
  const panel = createDiv("").class("side-panel");

  addSection("Technical variables");

  // ── expression input ────────────────────────────────────────────────────────
  const inputSection = createDiv("").class("custom-section");
  inputSection.parent(panel);
  const exprInput = createElement("input").class("custom-input");
  exprInput.attribute("type", "text");
  exprInput.attribute("placeholder", "write your own multiplication: 2 × 4…");
  exprInput.attribute("spellcheck", "false");
  exprInput.value(currentExpr);
  exprInput.parent(inputSection);

  createDiv("↵ apply")
    .class("custom-input-hint")
    .parent(inputSection);

  const randBtn = createElement("button", "random").class("panel-btn");
  randBtn.parent(inputSection);
  randBtn.mousePressed(() => {
    const expr = _randomMultExpr();
    exprInput.value(expr);
    currentExpr = expr;
    parsedSteps = parseMultChain(expr);
    _shuffleAllSteps(parsedSteps);
    _computeOffsets(parsedSteps.length);
    redraw();
  });

  exprInput.elt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const res = parseMultChain(exprInput.value());
      if (res) {
        parsedSteps = res;
        currentExpr = exprInput.value().trim();
        _shuffleAllSteps(parsedSteps);
        _computeOffsets(parsedSteps.length);
        redraw();
      }
    }
    if (e.key === "Escape") {
      exprInput.value("14x15");
      currentExpr = "14x15";
      parsedSteps = parseMultChain("14x15");
      _shuffleAllSteps(parsedSteps);
      _computeOffsets(parsedSteps.length);
      redraw();
    }
    e.stopPropagation();
  });

  // ── color row builder ────────────────────────────────────────────────────────
  function addColorRow(label, defaultHex, onChange) {
    const row = createDiv("").class("color-row");
    row.parent(panel);
    createSpan(label).class("slider-label").parent(row);
    const swatch = createElement("input");
    swatch.attribute("type", "color");
    swatch.attribute("value", defaultHex);
    swatch.class("color-swatch");
    swatch.parent(row);
    swatch.input(() => onChange(swatch.value()));
  }

  // ── slider builder ───────────────────────────────────────────────────────────
  // Returns the p5 slider element; wires the input handler automatically.
  function addSlider(key, label, mn, mx, val, step, setter) {
    const row = createDiv("").class("slider-row");
    row.parent(panel);
    const hdr = createDiv("").class("slider-header");
    hdr.parent(row);
    createSpan(label).class("slider-label").parent(hdr);
    const vs = createSpan("").class("slider-value");
    vs.parent(hdr);
    valSpans[key] = vs;
    const sl = createSlider(mn, mx, val, step);
    sl.parent(row);
    // ruler: tick count capped at 25 so marks stay visible
    const numTicks = Math.min(Math.round((mx - mn) / step), 25);
    const ruler = createDiv("").class("slider-ruler");
    ruler.parent(row);
    ruler.elt.style.backgroundSize = (100 / numTicks).toFixed(2) + '% 5px';
    sl.input(() => {
      setter(parseFloat(sl.value()));
      updateValues();
      redraw();
    });
    return sl;
  }

  function addSection(title) {
    const sec = createDiv("").class("panel-section");
    sec.parent(panel);
    createSpan(title).class("panel-section-title").parent(sec);
  }

  // ── Technical variables ───────────────────────────────────────────────────────
  addSlider("bw",   "thickness", 2,   60,  CONFIG.bw,   1, (v) => { CONFIG.bw   = v; });
  addSlider("dgap", "digit gap", 0,   400, CONFIG.dgap, 2, (v) => { CONFIG.dgap = v; });
  addSlider("lgap", "line gap",  0,   60,  CONFIG.lgap, 1, (v) => { CONFIG.lgap = v; });
  addSlider("oh",   "overhang",  0,   150, CONFIG.oh,   2, (v) => { CONFIG.oh   = v; });

  // ── Artistic variables ────────────────────────────────────────────────────────
  addSection("Artistic variables");
  addColorRow("background", canvasBgHex, (hex) => { canvasBgHex = hex; });
  addSlider("bokeh",   "bokeh",   0, 30,  CONFIG.bokeh,       1, (v) => { CONFIG.bokeh       = int(v); });
  addSlider("grain",   "grain",   0, 100, CONFIG.grainAmount, 1, (v) => { CONFIG.grainAmount = int(v); });
  addSlider("reality", "reality", 0, 100, CONFIG.reality,     1, (v) => { CONFIG.reality     = int(v); });

  createDiv(
    "SPACE · new colors<br>S · save png<br>scroll · zoom  /  drag · pan  /  dbl-click · reset",
  )
    .class("panel-hint")
    .parent(panel);

  updateValues();
}

function updateValues() {
  valSpans.bw.html(CONFIG.bw + "px");
  valSpans.dgap.html(CONFIG.dgap + "px");
  valSpans.lgap.html(CONFIG.lgap + "px");
  valSpans.oh.html(CONFIG.oh + "px");
  valSpans.bokeh.html(CONFIG.bokeh + "px");
  valSpans.grain.html(CONFIG.grainAmount);
  valSpans.reality.html(CONFIG.reality);
}

// ─── p5 lifecycle ─────────────────────────────────────────────────────────────

// Overrides number-system.js preload — still loads the same paletteTable global
function preload() {
  paletteTable      = loadTable('data/palette.csv',  'csv', 'header');
  numberColorsTable = loadTable('data/palette2.csv', 'csv', 'header');
  bgColorTable      = loadTable('data/palette3.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 255);
  buildPalette();
  generateGrain();
  parsedSteps = parseMultChain(currentExpr);
  _shuffleAllSteps(parsedSteps);
  _computeOffsets(parsedSteps.length);
  createPanel();
  noLoop();
}

function draw() {
  blendMode(BLEND);
  if (_exportTransparent) {
    drawingContext.clearRect(0, 0, width, height); // transparent background
  } else {
    drawingContext.fillStyle = canvasBgHex;
    drawingContext.fillRect(0, 0, width, height);
  }

  const shapeAlpha = 1 - CONFIG.reality / 100;
  const textAlpha  = CONFIG.reality / 100;

  drawingContext.globalAlpha = shapeAlpha;
  push();
  translate(_panX, _panY);
  scale(_zoom);
  if (parsedSteps) {
    for (let i = 0; i < parsedSteps.length; i++) {
      const off = _stepOffsets[i] || { ox: 0, oy: 0 };
      const cs = _stepColorSets[i] || _stepColorSets[0];
      if (cs) {
        MUL_COL.hCol = cs.hCol;
        MUL_COL.vCol = cs.vCol;
        MUL_COL.chains = cs.chains;
      }
      push();
      translate(off.ox, off.oy);
      drawMultiplication(parsedSteps[i]);
      pop();
    }
  }
  pop();
  drawingContext.globalAlpha = 1;

  // Result label (fixed position — always visible)
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

  // Reality overlay: plain numerals fade in
  if (textAlpha > 0 && parsedSteps && parsedSteps.length) {
    const label = currentExpr + "  =  " + parsedSteps[parsedSteps.length - 1].result;
    drawingContext.globalAlpha = textAlpha;
    drawingContext.font = "900 normal 72px KMRWaldenburg, sans-serif";
    drawingContext.textAlign = "center";
    drawingContext.textBaseline = "middle";
    drawingContext.fillStyle = "#111111";
    drawingContext.fillText(label, width / 2, height / 2);
    drawingContext.globalAlpha = 1;
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

// ─── save high-quality PNG (4× resolution) ────────────────────────────────────
function saveHQ(transparent = false) {
  _exportTransparent = transparent;
  const origPD = pixelDensity();
  pixelDensity(4);
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
  const prefix = transparent ? "visual-multiplication-transparent-" : "visual-multiplication-";
  saveCanvas(prefix + ts, "png");
  _exportTransparent = false;
  pixelDensity(origPD);
  resizeCanvas(windowWidth, windowHeight);
  draw(); // redraw on screen with background restored
}

// ─── interaction ──────────────────────────────────────────────────────────────
function keyPressed() {
  if (document.activeElement.tagName === "INPUT") return;
  if (key === " ") {
    _shuffleAllSteps(parsedSteps);
    _computeOffsets(parsedSteps ? parsedSteps.length : 1);
    redraw();
  }
  if (key === "s" || key === "S") saveHQ(false);
  if (key === "t" || key === "T") saveHQ(true);
}

// ─── pan / zoom handlers ──────────────────────────────────────────────────────
function mouseWheel(event) {
  if (_overUI()) return;
  const factor = event.delta > 0 ? 0.97 : 1.03;
  // Zoom toward the cursor position
  _panX = mouseX - (mouseX - _panX) * factor;
  _panY = mouseY - (mouseY - _panY) * factor;
  _zoom = constrain(_zoom * factor, 0.1, 10);
  redraw();
  return false; // prevent page scroll
}

function mousePressed() {
  if (_overUI()) return;
  _dragging = true;
  _lastMX = mouseX;
  _lastMY = mouseY;
}

function mouseDragged() {
  if (!_dragging) return;
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
  if (_overUI()) return;
  _zoom = 1;
  _panX = 0;
  _panY = 0;
  redraw();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  generateGrain();
  redraw();
}

// ─── touch pan / pinch-zoom (mobile) ─────────────────────────────────────────
let _lastTouchDist = null;

// Returns true if the touch event originated inside the side panel.
function _touchOnPanel(e) {
  return !!(e && e.target && e.target.closest && e.target.closest('.side-panel'));
}

function touchStarted(e) {
  if (_touchOnPanel(e)) return; // let panel handle its own scrolling
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
  return false; // prevent browser default (page zoom / scroll)
}

function touchMoved(e) {
  if (_touchOnPanel(e)) return; // let panel scroll
  if (touches.length === 1 && _dragging) {
    _panX += touches[0].x - _lastMX;
    _panY += touches[0].y - _lastMY;
    _lastMX = touches[0].x;
    _lastMY = touches[0].y;
    redraw();
  } else if (touches.length === 2 && _lastTouchDist !== null) {
    const dx = touches[1].x - touches[0].x;
    const dy = touches[1].y - touches[0].y;
    const dist  = Math.sqrt(dx * dx + dy * dy);
    const midX  = (touches[0].x + touches[1].x) / 2;
    const midY  = (touches[0].y + touches[1].y) / 2;
    const factor = dist / _lastTouchDist;
    _panX = midX - (midX - _panX) * factor;
    _panY = midY - (midY - _panY) * factor;
    _zoom = constrain(_zoom * factor, 0.1, 10);
    _lastTouchDist = dist;
    redraw();
  }
  return false;
}

function touchEnded(e) {
  if (_touchOnPanel(e)) return;
  _dragging = false;
  _lastTouchDist = null;
}
