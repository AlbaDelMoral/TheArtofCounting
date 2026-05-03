// multiplication.js — Multiplication page sketch
// Depends on: p5.js, number-system.js, addition-system.js, multiplication-system.js

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  // ── basic bands ───────────────────────────────────────────────────────────────
  bw:      14,    // band thickness (px)
  oh:      40,    // overhang beyond square (px)
  lgap:    8,     // gap between bands within a digit group (px)
  dgap:    50,    // gap between digit groups — drives square size (px)
  decExt:  45,    // decimal section extra breathing room (%)

  // ── op chain bands ────────────────────────────────────────────────────────────
  obw:         32,    // op band thickness — sets the band height/width (px)
  circleScale: 0.85,  // circle radius as fraction of obw/2 (0.3–1.0)
  bandMargin:  0,     // inset of circle span from band edges (px)
  pad:         5,     // belt padding beyond circle edge (px)

  // ── belt (read by drawBelt in addition-system.js) ─────────────────────────────
  beltStrokeRatio: 0.04,

  // ── ring geometry ─────────────────────────────────────────────────────────────
  ringAreaRatio:  0.88,
  ringGrowth:     1.4,

  // ── outer circle ─────────────────────────────────────────────────────────────
  outerStrokeRatio: 0.04,

  // ── cake portions ─────────────────────────────────────────────────────────────
  portionArcSteps: 38,
  negStrokeRatio:  0.04,

  // ── tick marks ────────────────────────────────────────────────────────────────
  tickLengthRatio:  0.30,
  tickStrokeWeight: 1,
  tickOpacity:      255,

  // ── decimal ring ──────────────────────────────────────────────────────────────
  decimalStrokeRatio: 0.05,
  decimalDashCount:   10,
  decimalDashRatio:   0.82,
  decimalMarginRatio: 0.04,

  // ── center dot ────────────────────────────────────────────────────────────────
  centerDotRatio: 0.025,

  // ── blend / effects ───────────────────────────────────────────────────────────
  blendModeName: "NONE",
  bokeh:         0,
  grainAmount:   0,
};

// ─── state ────────────────────────────────────────────────────────────────────
let parsedSteps    = null;   // array of {sideA, sideB, result} — one per × step
let currentExpr    = '14x15';
const valSpans     = {};
let _stepOffsets   = [];     // [{ox, oy}] — canvas offset from center per step
let _stepColorSets = [];     // [{hCol, vCol, chains}] — colors per step

// Assigns fresh colors and re-seeds op-chain tokens for every step.
function _shuffleAllSteps(steps) {
  if (!steps || !steps.length) return;
  _stepColorSets = [];
  for (let i = 0; i < steps.length; i++) {
    const pool = shuffle(SWATCHES.slice());
    _stepColorSets.push({
      hCol:   pool[0].col,
      vCol:   pool[1 % pool.length].col,
      chains: [2, 3, 4, 5].map(j => _p5ToCss(pool[j % pool.length].col)),
    });
    for (const side of [steps[i].sideA, steps[i].sideB]) {
      if (side && side.tokens) {
        side.tokens.forEach(t => { t.colorSeed = floor(random(999983)); });
      }
    }
  }
  // Keep MUL_COL in sync with step 0 (needed by drawMultiplication internally)
  if (_stepColorSets.length) {
    MUL_COL.hCol   = _stepColorSets[0].hCol;
    MUL_COL.vCol   = _stepColorSets[0].vCol;
    MUL_COL.chains = _stepColorSets[0].chains;
  }
}

// Computes random placement offsets for n steps (step 0 is always at canvas center).
function _computeOffsets(n) {
  _stepOffsets = [{ ox: 0, oy: 0 }];
  let cx = 0, cy = 0;
  for (let i = 1; i < n; i++) {
    const angle = random(-PI / 3, PI / 3);
    const dist  = random(420, 580);
    cx += cos(angle) * dist;
    cy += sin(angle) * dist;
    _stepOffsets.push({ ox: cx, oy: cy });
  }
}

// ─── pan / zoom ───────────────────────────────────────────────────────────────
let _zoom     = 1.0;
let _panX     = 0;
let _panY     = 0;
let _dragging = false;
let _lastMX   = 0;
let _lastMY   = 0;

// Returns true when the mouse is over a UI element (panel, inputs, etc.)
function _overUI() {
  const el = document.elementFromPoint(mouseX, mouseY);
  return el && el.tagName !== 'CANVAS';
}

// ─── panel ────────────────────────────────────────────────────────────────────
function createPanel() {
  const panel = createDiv('').class('side-panel');

  // ── expression input ────────────────────────────────────────────────────────
  const inputSection = createDiv('').class('custom-section');
  inputSection.parent(panel);
  createSpan('expression').class('custom-label').parent(inputSection);

  const exprInput = createElement('input').class('custom-input');
  exprInput.attribute('type', 'text');
  exprInput.attribute('placeholder', '14x15  (2+4)x8  14x15x5');
  exprInput.attribute('spellcheck', 'false');
  exprInput.value(currentExpr);
  exprInput.parent(inputSection);

  createDiv('↵ apply  ·  esc → default').class('custom-input-hint').parent(inputSection);

  exprInput.elt.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const res = parseMultChain(exprInput.value());
      if (res) {
        parsedSteps = res;
        currentExpr = exprInput.value().trim();
        _shuffleAllSteps(parsedSteps);
        _computeOffsets(parsedSteps.length);
        redraw();
      }
    }
    if (e.key === 'Escape') {
      exprInput.value('14x15');
      currentExpr = '14x15';
      parsedSteps = parseMultChain('14x15');
      _shuffleAllSteps(parsedSteps);
      _computeOffsets(parsedSteps.length);
      redraw();
    }
    e.stopPropagation();
  });

  // ── slider builder ───────────────────────────────────────────────────────────
  // Returns the p5 slider element; wires the input handler automatically.
  function addSlider(key, label, mn, mx, val, step, setter) {
    const row = createDiv('').class('slider-row');
    row.parent(panel);
    const hdr = createDiv('').class('slider-header');
    hdr.parent(row);
    createSpan(label).class('slider-label').parent(hdr);
    const vs = createSpan('').class('slider-value');
    vs.parent(hdr);
    valSpans[key] = vs;
    const sl = createSlider(mn, mx, val, step);
    sl.parent(row);
    sl.input(() => { setter(parseFloat(sl.value())); updateValues(); redraw(); });
    return sl;
  }

  // ── basic bands ──────────────────────────────────────────────────────────────
  addSlider('bw',     'thickness',      2,   60,  CONFIG.bw,     1,   v => { CONFIG.bw     = v; });
  addSlider('oh',     'overhang',       0,  150,  CONFIG.oh,     2,   v => { CONFIG.oh     = v; });
  addSlider('lgap',   'line gap',       0,   60,  CONFIG.lgap,   1,   v => { CONFIG.lgap   = v; });
  addSlider('dgap',   'digit gap',      0,  400,  CONFIG.dgap,   2,   v => { CONFIG.dgap   = v; });
  addSlider('decExt', 'decimal ext %',  10, 100,  CONFIG.decExt, 1,   v => { CONFIG.decExt = v; });

  // ── op chain bands ───────────────────────────────────────────────────────────
  addSlider('obw',         'band thickness',   10, 100, CONFIG.obw,          1,    v => { CONFIG.obw         = v; });
  addSlider('circleScale', 'circle size',      30, 100, CONFIG.circleScale * 100, 1, v => { CONFIG.circleScale  = v / 100; });
  addSlider('bandMargin',  'band margin',       0,  80, CONFIG.bandMargin,   1,    v => { CONFIG.bandMargin   = v; });
  addSlider('pad',         'belt padding',      0,  30, CONFIG.pad,          1,    v => { CONFIG.pad          = v; });

  // ── number circle ────────────────────────────────────────────────────────────
  addSlider('ringArea',   'ring area %',      40,  98,  CONFIG.ringAreaRatio  * 100, 1,   v => { CONFIG.ringAreaRatio   = v / 100; });
  addSlider('ringGrowth', 'ring growth ×100', 100, 250, CONFIG.ringGrowth     * 100, 5,   v => { CONFIG.ringGrowth      = v / 100; });
  addSlider('negSW',      'neg stroke %',     1,   12,  CONFIG.negStrokeRatio * 100, 0.5, v => { CONFIG.negStrokeRatio  = v / 100; });
  addSlider('tickLen',    'tick length %',    5,   60,  CONFIG.tickLengthRatio * 100, 1,  v => { CONFIG.tickLengthRatio = v / 100; });

  // ── decimal ring ─────────────────────────────────────────────────────────────
  addSlider('decMargin', 'dec margin %',  0,  15,  CONFIG.decimalMarginRatio * 100, 0.5, v => { CONFIG.decimalMarginRatio = v / 100; });
  addSlider('decDash',   'dash fill %',   20, 98,  CONFIG.decimalDashRatio   * 100, 1,   v => { CONFIG.decimalDashRatio   = v / 100; });
  addSlider('decSW',     'dec stroke %',  1,  15,  CONFIG.decimalStrokeRatio * 100, 0.5, v => { CONFIG.decimalStrokeRatio = v / 100; });

  // ── effects ──────────────────────────────────────────────────────────────────
  addSlider('bokeh', 'bokeh', 0,  30, CONFIG.bokeh,        1, v => { CONFIG.bokeh       = int(v); });
  addSlider('grain', 'grain', 0, 100, CONFIG.grainAmount,  1, v => { CONFIG.grainAmount = int(v); });

  createDiv('SPACE · new colors<br>S · save png<br>scroll · zoom  /  drag · pan  /  dbl-click · reset').class('panel-hint').parent(panel);

  updateValues();
}

function updateValues() {
  valSpans.bw.html(CONFIG.bw     + 'px');
  valSpans.oh.html(CONFIG.oh     + 'px');
  valSpans.lgap.html(CONFIG.lgap + 'px');
  valSpans.dgap.html(CONFIG.dgap + 'px');
  valSpans.decExt.html(CONFIG.decExt + '%');
  valSpans.obw.html(CONFIG.obw         + 'px');
  valSpans.circleScale.html(nf(CONFIG.circleScale * 100, 1, 0) + '%');
  valSpans.bandMargin.html(CONFIG.bandMargin  + 'px');
  valSpans.pad.html(CONFIG.pad         + 'px');
  valSpans.ringArea.html(nf(CONFIG.ringAreaRatio   * 100, 1, 0) + '%');
  valSpans.ringGrowth.html(nf(CONFIG.ringGrowth    * 100, 1, 0));
  valSpans.negSW.html(nf(CONFIG.negStrokeRatio      * 100, 1, 1));
  valSpans.tickLen.html(nf(CONFIG.tickLengthRatio   * 100, 1, 0) + '%');
  valSpans.decMargin.html(nf(CONFIG.decimalMarginRatio * 100, 1, 1));
  valSpans.decDash.html(nf(CONFIG.decimalDashRatio  * 100, 1, 0) + '%');
  valSpans.decSW.html(nf(CONFIG.decimalStrokeRatio  * 100, 1, 1));
  valSpans.bokeh.html(CONFIG.bokeh + 'px');
  valSpans.grain.html(CONFIG.grainAmount);
}

// ─── p5 lifecycle ─────────────────────────────────────────────────────────────

// Overrides number-system.js preload — still loads the same paletteTable global
function preload() {
  paletteTable = loadTable('data/palette.csv', 'csv', 'header');
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
  background(0, 0, 100); // HSB white

  push();
  translate(_panX, _panY);
  scale(_zoom);
  if (parsedSteps) {
    for (let i = 0; i < parsedSteps.length; i++) {
      const off = _stepOffsets[i] || { ox: 0, oy: 0 };
      const cs  = _stepColorSets[i] || _stepColorSets[0];
      if (cs) {
        MUL_COL.hCol   = cs.hCol;
        MUL_COL.vCol   = cs.vCol;
        MUL_COL.chains = cs.chains;
      }
      push();
      translate(off.ox, off.oy);
      drawMultiplication(parsedSteps[i]);
      pop();
    }
  }
  pop();

  // Result label (fixed position — outside pan/zoom block)
  if (parsedSteps && parsedSteps.length) {
    push();
    fill(0, 0, 55);
    noStroke();
    textSize(11);
    textAlign(CENTER);
    text(currentExpr + '  =  ' + parsedSteps[parsedSteps.length - 1].result, width / 2, height - 20);
    pop();
  }

  if (CONFIG.bokeh > 0) {
    const snap = get();
    background(0, 0, 100);
    drawingContext.filter = `blur(${CONFIG.bokeh}px)`;
    blendMode(BLEND);
    image(snap, 0, 0);
    drawingContext.filter = 'none';
  }

  drawGrain();
  blendMode(BLEND);
}

// ─── save high-quality PNG (4× resolution) ────────────────────────────────────
function saveHQ() {
  const origPD = pixelDensity();
  pixelDensity(4);
  resizeCanvas(windowWidth, windowHeight);
  draw();
  const ts = year() + nf(month(), 2) + nf(day(), 2) + '-' +
             nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2);
  saveCanvas('visual-multiplication-' + ts, 'png');
  pixelDensity(origPD);
  resizeCanvas(windowWidth, windowHeight);
}

// ─── interaction ──────────────────────────────────────────────────────────────
function keyPressed() {
  if (document.activeElement.tagName === 'INPUT') return;
  if (key === ' ') { _shuffleAllSteps(parsedSteps); _computeOffsets(parsedSteps ? parsedSteps.length : 1); redraw(); }
  if (key === 's' || key === 'S') saveHQ();
}

// ─── pan / zoom handlers ──────────────────────────────────────────────────────
function mouseWheel(event) {
  if (_overUI()) return;
  const factor = event.delta > 0 ? 0.9 : 1.1;
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
