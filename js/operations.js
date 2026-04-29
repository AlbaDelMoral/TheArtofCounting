// operations.js — Operations page sketch
// Depends on: p5.js, number-system.js, addition-system.js

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CONFIG = {
  // ── composition ──────────────────────────────────────────────────────────────
  numOps:       1,      // always one chain at a time
  numChainNums: 3,      // numbers per random chain (→ numChainNums-1 belts)
  compScale:    0.09,   // base radius as fraction of min(w,h)
  sizeVariation: 0.9,
  chainSpacing: -0.5,   // 0 = circles just touch · negative = gap · positive = overlap

  // ── size by value ─────────────────────────────────────────────────────────────
  valueSizeInfluence: 0.9, // 0 = random size · 1 = size fully driven by number magnitude

  // ── belt ──────────────────────────────────────────────────────────────────────
  beltMarginRatio: 0.12, // belt offset = r × this
  beltStrokeRatio: 0.04, // outline stroke weight / larger circle radius (negative result only)

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
  bokeh:       0,
  grainAmount: 0,
  reality:     0,
};

// ─── composition data ─────────────────────────────────────────────────────────
// chainData[i] — stable (numbers, sizes, seeds, rotation, fonts)
// chains[i]    — recomputed pixel positions on resize / slider change
let chainData  = [];
let chains     = [];
let customOps  = []; // [] = random; filled = array of [numStr, …] per chain

function generateChainData() {
  const parsed = customOps.length > 0 ? customOps : null;
  const count  = parsed ? parsed.length : CONFIG.numOps;
  chainData    = [];

  for (let c = 0; c < count; c++) {
    const nums = parsed
      ? parsed[c]
      : Array.from({ length: CONFIG.numChainNums }, () => randomNum());
    const n    = nums.length;

    const mags  = nums.map((s) => Math.log10(Math.abs(parseFloat(s)) + 1));
    const maxM  = Math.max(...mags, 0.001);
    const sizeTs = mags.map((m) => {
      const magT = m / maxM;
      const rndT = random(1);
      return lerp(rndT, magT, CONFIG.valueSizeInfluence);
    });

    chainData.push({
      nums,
      sizeTs,
      colorSeeds:     Array.from({ length: n },     () => floor(random(999983))),
      beltColorSeeds: Array.from({ length: n - 1 }, () => floor(random(999983))),
      angles:         Array.from({ length: n },     () => random(TWO_PI)),
      rotSpeeds:      Array.from({ length: n },     () => (random() < 0.5 ? -1 : 1) * random(0.003, 0.018)),
      fontIdxs:       Array.from({ length: n },     () => floor(random(FONTS.length))),
    });
  }
  computePositions();
}

function computePositions() {
  chains = [];
  const nChains = chainData.length;
  if (nChains === 0) return;

  const m    = min(width, height);
  const lo   = Math.max(0.01, CONFIG.compScale * (1 - CONFIG.sizeVariation));
  const hi   = CONFIG.compScale * (1 + CONFIG.sizeVariation);
  const rowH = height / nChains;

  for (let c = 0; c < nChains; c++) {
    const data = chainData[c];
    const n    = data.nums.length;
    const cy   = rowH * (c + 0.5);

    const radii = data.sizeTs.map((t) => lerp(lo, hi, t) * m);

    const xs = [radii[0]];
    for (let i = 1; i < n; i++)
      xs.push(xs[i - 1] + (radii[i - 1] + radii[i]) * (1 - CONFIG.chainSpacing));

    const totalW = xs[n - 1] + radii[n - 1];
    const ox     = (width - totalW) / 2;

    const circles = data.nums.map((numStr, i) => ({
      x: ox + xs[i], y: cy, r: radii[i],
      numStr, colorSeed: data.colorSeeds[i], fontIdx: data.fontIdxs[i],
    }));

    const lightSwatches = SWATCHES.filter((s) => s.type === "light");
    const basePool      = lightSwatches.length > 0 ? lightSwatches : SWATCHES;
    const belts         = [];

    for (let i = 0; i < n - 1; i++) {
      const valA    = parseFloat(data.nums[i]);
      const valB    = parseFloat(data.nums[i + 1]);
      const outerA  = getOuterCss(data.colorSeeds[i]);
      const outerB  = getOuterCss(data.colorSeeds[i + 1]);
      const excluded = new Set([outerA, outerB]);
      const available = basePool.filter((s) => {
        const key = `${floor(red(s.col))},${floor(green(s.col))},${floor(blue(s.col))}`;
        return !excluded.has(key);
      });
      const pickPool  = available.length > 0 ? available : basePool;

      randomSeed(data.beltColorSeeds[i]);
      const swatchCol = pickPool[floor(random(pickPool.length))].col;
      belts.push({
        cssColor:       `rgb(${floor(red(swatchCol))},${floor(green(swatchCol))},${floor(blue(swatchCol))})`,
        resultPositive: valA + valB >= 0,
      });
    }
    randomSeed();

    chains.push({ circles, belts });
  }
}

// ─── side panel ───────────────────────────────────────────────────────────────
let sliderLength, sliderScale, sliderSpread, sliderSpacing, sliderMargin, sliderBokeh, sliderGrain, sliderReality;
const valSpans = {};

function createPanel() {

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

  createDiv("↵ apply  ·  esc → random").class("custom-input-hint").parent(customSection);

  opInput.elt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const parsed = parseChains(opInput.value());
      if (parsed.length > 0) { customOps = parsed; generateChainData(); }
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
    const row    = createDiv("").class("slider-row");
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

  sliderLength  = addRow("length",  "length",  2,    6,   CONFIG.numChainNums,         1);
  sliderScale   = addRow("size",    "size",    1,    40,  CONFIG.compScale      * 100, 1);
  sliderSpread  = addRow("spread",  "spread",  0,    95,  CONFIG.sizeVariation  * 100, 1);
  sliderSpacing = addRow("spacing", "spacing", -150, 95,  CONFIG.chainSpacing   * 100, 1);
  sliderMargin  = addRow("margin",  "margin",  0,    50,  CONFIG.beltMarginRatio * 100, 1);
  sliderBokeh   = addRow("bokeh",   "bokeh",   0,    30,  CONFIG.bokeh,                1);
  sliderGrain   = addRow("grain",   "grain",   0,    100, CONFIG.grainAmount,          1);
  sliderReality = addRow("reality", "reality", 0,    100, CONFIG.reality,              1);

  createDiv("SPACE · new<br>S · save png").class("panel-hint").parent(panel);

  updateValues();

  sliderLength.input(()  => { CONFIG.numChainNums    = int(sliderLength.value());   generateChainData();  updateValues(); });
  sliderScale.input(()   => { CONFIG.compScale        = sliderScale.value()  / 100; computePositions();   updateValues(); });
  sliderSpread.input(()  => { CONFIG.sizeVariation    = sliderSpread.value() / 100; computePositions();   updateValues(); });
  sliderSpacing.input(() => { CONFIG.chainSpacing     = sliderSpacing.value() / 100; computePositions();  updateValues(); });
  sliderMargin.input(()  => { CONFIG.beltMarginRatio  = sliderMargin.value() / 100;                       updateValues(); });
  sliderBokeh.input(()   => { CONFIG.bokeh            = int(sliderBokeh.value());                         updateValues(); });
  sliderGrain.input(()   => { CONFIG.grainAmount      = int(sliderGrain.value());                         updateValues(); });
  sliderReality.input(() => { CONFIG.reality          = int(sliderReality.value());                       updateValues(); });
}

function updateValues() {
  valSpans.length.html(CONFIG.numChainNums);
  valSpans.size.html(nf(CONFIG.compScale,        1, 2));
  valSpans.spread.html(nf(CONFIG.sizeVariation,  1, 2));
  valSpans.spacing.html(nf(CONFIG.chainSpacing,  1, 2));
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
    const data  = chainData[c];

    for (let i = 0; i < data.angles.length; i++) data.angles[i] += data.rotSpeeds[i];

    // Step 1: Draw all belts — fade out with reality
    blendMode(BLEND);
    drawingContext.globalAlpha = 1 - CONFIG.reality / 100;
    for (let i = 0; i < chain.belts.length; i++) {
      const belt = chain.belts[i];
      const cA   = chain.circles[i];
      const cB   = chain.circles[i + 1];
      const RA   = cA.r * (1 + CONFIG.beltMarginRatio);
      const RB   = cB.r * (1 + CONFIG.beltMarginRatio);
      drawBelt(cA.x, cA.y, RA, cB.x, cB.y, RB, belt.resultPositive, belt.cssColor);
    }

    // Step 2: Draw all circles on top
    // globalAlpha must be 1 here so every push() below saves 1 and pop() restores 1.
    drawingContext.globalAlpha = 1;

    for (let i = 0; i < chain.circles.length; i++) {
      const circle = chain.circles[i];
      const f      = FONTS[data.fontIdxs[i]];

      randomSeed(circle.colorSeed);
      reshuffleColors();

      const shapeAlpha = 1 - CONFIG.reality / 100;
      const textAlpha  = CONFIG.reality / 100;

      if (shapeAlpha > 0) {
        push();
        noStroke();
        fill(0, 0, 100); // HSB white — erases belt colour behind this circle
        ellipse(circle.x, circle.y, circle.r * 2, circle.r * 2);
        pop();

        push();
        translate(circle.x, circle.y);
        rotate(data.angles[i]);
        drawingContext.globalAlpha = shapeAlpha;
        drawNumber(circle.numStr, 0, 0, circle.r);
        pop(); // restores globalAlpha = 1 ✓
      }

      if (textAlpha > 0) {
        push();
        translate(circle.x, circle.y);
        rotate(data.angles[i]);
        const fs = Math.round(circle.r * 0.65);
        drawingContext.globalAlpha  = textAlpha;
        drawingContext.font         = `${f.style} ${f.weight} ${fs}px ${f.family}, sans-serif`;
        drawingContext.textAlign    = "center";
        drawingContext.textBaseline = "middle";
        drawingContext.fillStyle    = "#111111";
        drawingContext.fillText(circle.numStr, 0, 0);
        pop(); // restores globalAlpha = 1 ✓
      }
    }
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
