// pointillism.js — "About" page tool: turns an uploaded image into a field
// of the site's own number-representation circles (same ring/wedge geometry
// as the Numbers/Operations/Multiplication pages — number-system.js's
// drawNumber), each one showing whichever number best reproduces that patch
// of the image's own color — built entirely out of this site's own visual
// language instead of plain colored dots.
//
// Color system: NOT the site's CSV palette (data/palette2.csv/palette3.csv)
// — this page defines its own digit→hue families below (DIGIT_HUE), one
// fixed representative hue per digit 1–9 (1 red, 2 blue, 3 yellow, 4
// blue-green, 5 orange, 6 green, 7 pink, 8 purple, 9 yellow-green), plus
// three tiers of brightness/saturation by ring position — '1-10' (inner-
// most) lighter, '10-100' more saturated, '100-1000' (outermost — and,
// since ring area grows fast with ringGrowth, the dominant one) darker —
// see TIER_SB. A number's digits decide BOTH which hue family shows in
// each ring AND how much of that ring is colored in (digit/10 of its area)
// vs. left as background, so matching picks whichever 1–999 number's
// predicted average color — across all its rings' hue families — comes
// closest to that patch of the image, same approach as reaching dark tones
// via a high hundreds-digit (the dominant ring) needing 3 digits at all.
// Depends on: p5.js, colors.js, number-representation.js, number-system.js
// (getDigits/computeRingBoundaries/annularWedge/drawTicks — geometry only,
// its CSV-driven color tables are NOT used here), svg-export.js (the
// transform helpers + the lower-level _svgAnnularWedge/_svgCircle/_svgTicks,
// reused for this page's own hue-driven SVG renderer).

// annularWedge/drawTicks/computeRingBoundaries (number-system.js) all read
// this global — same convention CONFIG_NUMBERS/CONFIG_OPERATIONS follow in
// play.js. Only the ring-geometry fields are actually used; the color
// fields (bgColor etc.) aren't, since this page draws its own hue-driven
// colors rather than calling the shared drawNumber().
const CONFIG = { ...NUMBER_REPRESENTATION };

// ─── per-digit hue families — NOT read from the CSV palette, defined here
// directly so each digit's color identity is explicit and fixed. ─────────
const DIGIT_HUE = {
  1: 355, // red
  2: 212, // blue
  3: 55,  // yellow
  4: 175, // blue-green
  5: 28,  // orange
  6: 130, // green
  7: 322, // pink
  8: 272, // purple
  9: 72,  // yellow-green
};

// ─── procedural tier colors — same light/vivid/dark progression the CSV
// palette used, just reusable across any hue rather than looked up as a
// CSV row. Representative S/B values, in that same spirit. ───────────────
const TIER_SB = [
  { s: 62, b: 100 }, // '1-10'    (innermost)  — lighter
  { s: 90, b: 90 },  // '10-100'               — more saturated
  { s: 85, b: 56 },  // '100-1000' (outermost) — darker
];
const BG_SB = { s: 10, b: 99 }; // near-white tint of the most-significant digit's hue

// ─── candidate numbers 1–999, each with its own PREDICTED average render
// color — built once, then just nearest-matched per image sample (same
// shape as the site's own drawNumber: each ring's digit sets both its hue
// family, via DIGIT_HUE, and its colored-wedge coverage). ────────────────
let CANDIDATE_COLORS = []; // [{ numStr, r, g, b }]

// Area-weighted average color _drawNumberHued(numStr, ...) would actually
// paint: each ring's colored wedges cover (digit/10) of that ring's own
// area (true regardless of the ring's radii — a wedge's share of its ring
// is always angle/360 = digit*36°/360) in that digit's OWN hue family; the
// rest of the circle (every ring's uncolored remainder, plus the margin
// band out to outerR) is the most-significant digit's hue at BG_SB. Radii
// are normalized to outerR=1 purely so area math stays in 0..1.
function _predictAverageColor(numStr) {
  const { digits } = getDigits(numStr);
  const numRings = digits.length;
  const innerR = 1 - CONFIG.ringMarginRatio;
  const bdry = computeRingBoundaries(numRings, innerR);
  const bgCol = color(DIGIT_HUE[digits[numRings - 1]], BG_SB.s, BG_SB.b);

  let rAcc = 0, gAcc = 0, bAcc = 0;
  let remaining = 1; // full circle, area ∝ outerR² = 1
  for (let i = 0; i < numRings; i++) {
    const digit = digits[i];
    if (digit === 0) continue;
    const r1 = i === 0 ? 0 : bdry[i - 1];
    const r2 = bdry[i];
    const ringArea = r2 * r2 - r1 * r1;
    const wedgeArea = ringArea * (digit / 10);
    const tier = TIER_SB[i % 3];
    const col = color(DIGIT_HUE[digit], tier.s, tier.b);
    rAcc += red(col) * wedgeArea;
    gAcc += green(col) * wedgeArea;
    bAcc += blue(col) * wedgeArea;
    remaining -= wedgeArea;
  }
  rAcc += red(bgCol) * remaining;
  gAcc += green(bgCol) * remaining;
  bAcc += blue(bgCol) * remaining;
  return { r: rAcc, g: gAcc, b: bAcc };
}

function _buildCandidateColors() {
  CANDIDATE_COLORS = [];
  for (let n = 1; n <= 999; n++) {
    const numStr = String(n);
    const { r, g, b } = _predictAverageColor(numStr);
    CANDIDATE_COLORS.push({ numStr, r, g, b });
  }
}

// Which candidate's predicted color is closest to an average {r,g,b}
// sample — plain RGB distance over the ~999 candidates.
function _nearestNumber(r, g, b) {
  let best = CANDIDATE_COLORS[0], bestD = Infinity;
  for (const c of CANDIDATE_COLORS) {
    const dist = (c.r - r) ** 2 + (c.g - g) ** 2 + (c.b - b) ** 2;
    if (dist < bestD) { bestD = dist; best = c; }
  }
  return best.numStr;
}

// ─── image + dot state ───────────────────────────────────────────────────────
let sourceImg = null; // original p5.Image, as loaded
let fitted = null; // resized copy, exactly the size it's drawn at
let imgOffsetX = 0, imgOffsetY = 0; // where `fitted` sits on the canvas
let dots = []; // last-generated circles: [{ x, y, r, numStr }] — reused
// by both the canvas redraw and the SVG export, so they always match.

const PARAMS = {
  spacing: 16, // grid spacing in px — the main "density" control
  dotSize: 0.9, // circle diameter as a fraction of `spacing`
  jitter: 0.35, // random offset from the grid, as a fraction of `spacing`
  seed: 1,
};

// When true, the source photo is painted first as a backdrop, THEN the
// number circles on top of it — both visible at once (the circles' own
// gaps/background reveal the photo underneath) — toggled by the panel's
// "show original" button, see createPanel().
let SHOW_IMAGE_BEHIND = false;
// When true, each number circle's background ellipse is left out entirely
// (opacity 0, per the request — not just transparent fill, actually never
// drawn) so only its colored pie-sector wedges remain — see
// _drawNumberHued's `hideBg` param.
let HIDE_BG = false;

// ─── panel ────────────────────────────────────────────────────────────────
const valSpans = {};
let _fileInput;

function _updateValues() {
  if (valSpans.spacing) valSpans.spacing.html(PARAMS.spacing);
  if (valSpans.dotSize) valSpans.dotSize.html(nf(PARAMS.dotSize, 1, 2));
  if (valSpans.jitter) valSpans.jitter.html(nf(PARAMS.jitter, 1, 2));
}

function _addRow(container, key, label, mn, mx, val, step, onInput) {
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
    _updateValues();
    regenerate();
  });
  return sl;
}

// Mobile-only floating action button — the panel sits at 0 height (see
// panel.css's mobile media query) until this is tapped. No accordion
// sections here (unlike play.js's panel), so this just toggles the one
// class straight through.
function _createMobileFab() {
  const fab = createElement("button", "+").class("mobile-fab");
  fab.attribute("aria-label", "Toggle panel");
  fab.mousePressed(() => {
    const panelEl = document.querySelector(".side-panel");
    if (!panelEl) return;
    const isOpen = panelEl.classList.toggle("side-panel--menu-open");
    fab.elt.textContent = isOpen ? "×" : "+";
  });
  return fab;
}

function createPanel() {
  const panel = createDiv("").class("side-panel");
  _createMobileFab(); // own fixed element, independent of the panel's own height

  createP(
    "Drop an image, or click below to choose one — it's redrawn as a field " +
      "of this site's own number circles (1 red, 2 blue, 3 yellow, 4 blue-" +
      "green, 5 orange, 6 green, 7 pink, 8 purple, 9 yellow-green), each one " +
      "showing whichever number best reproduces that patch of the image.",
  )
    .class("panel-intro")
    .parent(panel);

  const dropBtn = createElement("button", "choose image").class("calc-btn calc-random-btn");
  dropBtn.parent(panel);
  _fileInput = createFileInput((file) => _loadFile(file));
  _fileInput.elt.accept = "image/*";
  _fileInput.class("pointillism-file-input");
  _fileInput.parent(panel);
  dropBtn.mousePressed(() => _fileInput.elt.click());

  _addRow(panel, "spacing", "dot spacing", 6, 40, PARAMS.spacing, 1, (v) => {
    PARAMS.spacing = v;
  });
  _addRow(panel, "dotSize", "dot size", 0.4, 1.4, PARAMS.dotSize, 0.01, (v) => {
    PARAMS.dotSize = v;
  });
  _addRow(panel, "jitter", "scatter", 0, 1, PARAMS.jitter, 0.01, (v) => {
    PARAMS.jitter = v;
  });

  const shuffleBtn = createElement("button", "shuffle").class("calc-btn calc-random-btn");
  shuffleBtn.parent(panel);
  shuffleBtn.mousePressed(() => {
    PARAMS.seed = floor(random(999999));
    regenerate();
  });

  const originalBtn = createElement("button", "show original").class("calc-btn calc-random-btn");
  originalBtn.parent(panel);
  originalBtn.mousePressed(() => {
    SHOW_IMAGE_BEHIND = !SHOW_IMAGE_BEHIND;
    originalBtn.html(SHOW_IMAGE_BEHIND ? "hide original" : "show original");
    _renderCanvas();
  });

  const hideBgBtn = createElement("button", "hide backgrounds").class("calc-btn calc-random-btn");
  hideBgBtn.parent(panel);
  hideBgBtn.mousePressed(() => {
    HIDE_BG = !HIDE_BG;
    hideBgBtn.html(HIDE_BG ? "show backgrounds" : "hide backgrounds");
    _renderCanvas();
  });

  const exportBtn = createElement("button", "export").class("calc-btn calc-random-btn panel-export-btn");
  exportBtn.parent(panel);
  exportBtn.mousePressed(() => exportPNG());

  const exportSvgBtn = createElement("button", "export svg").class(
    "calc-btn calc-random-btn panel-export-btn panel-export-svg-btn",
  );
  exportSvgBtn.parent(panel);
  exportSvgBtn.mousePressed(() => exportPointillismSVG());

  _updateValues();
}

// ─── drop zone (plain DOM, centered on the canvas; hides once an image is
// loaded) — handles both click-to-browse and drag/drop ────────────────────
function _createDropZone() {
  const zone = createDiv("drop an image here").class("pointillism-dropzone");
  zone.parent(select("main"));
  zone.mousePressed(() => _fileInput.elt.click());
  const el = zone.elt;
  ["dragenter", "dragover"].forEach((evt) =>
    el.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.addClass("pointillism-dropzone--over");
    }),
  );
  ["dragleave", "drop"].forEach((evt) =>
    el.addEventListener(evt, (e) => {
      e.preventDefault();
      zone.removeClass("pointillism-dropzone--over");
    }),
  );
  el.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) _loadFile({ file });
  });
  return zone;
}
let _dropZone;

// p5's createFileInput callback gives a p5.File; a raw drag/drop gives a
// plain File — normalize to always read `.file`.
function _loadFile(f) {
  const raw = f.file || f;
  if (!raw || !raw.type || !raw.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    loadImage(reader.result, (img) => {
      sourceImg = img;
      _fitImage();
      PARAMS.seed = floor(random(999999));
      regenerate();
      if (_dropZone) _dropZone.addClass("pointillism-dropzone--hidden");
    });
  };
  reader.readAsDataURL(raw);
}

// Resizes a copy of the source image to exactly the size/position it's
// drawn at (contain-fit, centered, with a little breathing room) — so the
// sampling grid below can read `fitted`'s own pixels 1:1, no extra mapping.
function _fitImage() {
  if (!sourceImg) return;
  const margin = 60;
  const availW = Math.max(100, width - margin * 2);
  const availH = Math.max(100, height - margin * 2);
  const s = Math.min(availW / sourceImg.width, availH / sourceImg.height, 1);
  const w = Math.max(1, Math.round(sourceImg.width * s));
  const h = Math.max(1, Math.round(sourceImg.height * s));
  fitted = sourceImg.get();
  fitted.resize(w, h);
  fitted.loadPixels();
  imgOffsetX = (width - w) / 2;
  imgOffsetY = (height - h) / 2;
}

// Average color of a small cluster of sample points inside one grid cell —
// cheap stand-in for averaging every pixel in the cell, and plenty accurate
// for picking a nearest candidate number.
function _sampleCellColor(gx, gy, spacing) {
  const offsets = [0, -spacing * 0.3, spacing * 0.3];
  let r = 0, g = 0, b = 0, n = 0;
  for (const dx of offsets) {
    for (const dy of offsets) {
      const x = constrain(Math.round(gx + dx), 0, fitted.width - 1);
      const y = constrain(Math.round(gy + dy), 0, fitted.height - 1);
      const idx = (y * fitted.width + x) * 4;
      r += fitted.pixels[idx];
      g += fitted.pixels[idx + 1];
      b += fitted.pixels[idx + 2];
      n++;
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

// colorMode is HSB (see setup — matches number-system.js's own convention)
// by the time this ever runs, so a plain background(255)/fill(255) would
// be read as H=255 — a saturated blue, not white. Paint white straight on
// the raw canvas context instead, same as play.js's draw() does.
function _clearWhite() {
  drawingContext.fillStyle = "#ffffff";
  drawingContext.fillRect(0, 0, width, height);
}

// Mirrors number-system.js's drawNumber()'s wedge-drawing pass, but each
// ring's color comes from DIGIT_HUE[digit] + TIER_SB instead of the
// CSV-driven NUMBER_COLORS/NUMBER_BG_COLORS lookup — see the file header.
// Draws the background ellipse too, unless `hideBg`.
function _drawNumberHued(numStr, cx, cy, outerR, hideBg) {
  const { digits } = getDigits(numStr);
  const numRings = digits.length;
  const innerR = outerR * (1 - CONFIG.ringMarginRatio);
  const bdry = computeRingBoundaries(numRings, innerR);

  if (!hideBg) {
    push();
    noStroke();
    fill(color(DIGIT_HUE[digits[numRings - 1]], BG_SB.s, BG_SB.b));
    ellipse(cx, cy, outerR * 2, outerR * 2);
    pop();
  }

  const portionAngle = TWO_PI / 10;
  for (let i = numRings - 1; i >= 0; i--) {
    const digit = digits[i];
    if (digit === 0) continue;
    const r1 = i === 0 ? 0 : bdry[i - 1];
    const r2 = bdry[i];
    const tier = TIER_SB[i % 3];
    const col = color(DIGIT_HUE[digit], tier.s, tier.b);
    for (let p = 0; p < digit; p++) {
      annularWedge(cx, cy, r1, r2, -HALF_PI + p * portionAngle, -HALF_PI + (p + 1) * portionAngle, col, false, outerR);
    }
  }

  if (!hideBg) {
    for (let i = 0; i < numRings; i++) {
      const r1 = i === 0 ? 0 : bdry[i - 1];
      drawTicks(cx, cy, bdry[i], bdry[i] - r1, outerR);
    }
  }
}

function _drawDot(d) {
  push();
  translate(d.x, d.y);
  _drawNumberHued(d.numStr, 0, 0, d.r, HIDE_BG);
  pop();
}

// Samples the image into `dots` — only needs to happen again when the
// image or its params actually change (not on a view-only toggle).
function _computeDots() {
  dots = [];
  if (!fitted) return;

  randomSeed(PARAMS.seed);
  const spacing = PARAMS.spacing;
  const jitter = spacing * PARAMS.jitter;

  for (let gy = spacing / 2; gy < fitted.height; gy += spacing) {
    for (let gx = spacing / 2; gx < fitted.width; gx += spacing) {
      const avg = _sampleCellColor(gx, gy, spacing);
      const numStr = _nearestNumber(avg.r, avg.g, avg.b);
      const jx = gx + random(-jitter, jitter);
      const jy = gy + random(-jitter, jitter);
      const r = (spacing / 2) * PARAMS.dotSize * random(0.85, 1.15);
      dots.push({ x: imgOffsetX + jx, y: imgOffsetY + jy, r, numStr });
    }
  }
}

// Paints the canvas for the current SHOW_IMAGE_BEHIND/HIDE_BG state, from
// whatever `dots`/`fitted` already hold — call after toggling a view
// button, or after _computeDots() has refreshed `dots`.
function _renderCanvas() {
  _clearWhite();
  if (SHOW_IMAGE_BEHIND && fitted) image(fitted, imgOffsetX, imgOffsetY);
  for (const d of dots) _drawDot(d);
}

function regenerate() {
  _computeDots();
  _renderCanvas();
}

// ─── export ─────────────────────────────────────────────────────────────────
function _timestamp() {
  return year() + nf(month(), 2) + nf(day(), 2) + "-" + nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2);
}

function exportPNG() {
  saveCanvas("pointillism-" + _timestamp(), "png");
}

// SVG counterpart to _drawNumberHued — same DIGIT_HUE/TIER_SB colors,
// built from the lower-level shared primitives in js/svg-export.js
// (_svgCircle/_svgAnnularWedge/_svgTicks + the transform helpers), since
// that file's own _svgNumber is tied to the CSV palette this page no
// longer uses.
function _svgNumberHued(T, numStr, outerR, hideBg) {
  const { digits } = getDigits(numStr);
  const numRings = digits.length;
  const innerR = outerR * (1 - CONFIG.ringMarginRatio);
  const bdry = computeRingBoundaries(numRings, innerR);

  let out = "";
  if (!hideBg) {
    const c = _Tpoint(T, 0, 0);
    const bgCol = color(DIGIT_HUE[digits[numRings - 1]], BG_SB.s, BG_SB.b);
    out += _svgCircle(c[0], c[1], _Tlen(T, outerR), _cssColor(bgCol), null, 0);
  }

  const portionAngle = (Math.PI * 2) / 10;
  for (let i = numRings - 1; i >= 0; i--) {
    const digit = digits[i];
    if (digit === 0) continue;
    const r1 = i === 0 ? 0 : bdry[i - 1];
    const r2 = bdry[i];
    const tier = TIER_SB[i % 3];
    const col = color(DIGIT_HUE[digit], tier.s, tier.b);
    for (let p = 0; p < digit; p++) {
      out += _svgAnnularWedge(T, 0, 0, r1, r2, -Math.PI / 2 + p * portionAngle, -Math.PI / 2 + (p + 1) * portionAngle, col, false, outerR);
    }
  }

  if (!hideBg) {
    for (let i = 0; i < numRings; i++) {
      const r1 = i === 0 ? 0 : bdry[i - 1];
      out += _svgTicks(T, bdry[i], bdry[i] - r1, outerR);
    }
  }
  return out;
}

function exportPointillismSVG() {
  let body = `<rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff"/>`;
  for (const d of dots) {
    const T = _Ttranslate(_T0(), d.x, d.y);
    body += _svgNumberHued(T, d.numStr, d.r, HIDE_BG);
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">${body}</svg>`;
  _downloadText(svg, "pointillism-" + _timestamp() + ".svg", "image/svg+xml");
}

// ─── p5 lifecycle ───────────────────────────────────────────────────────────
function setup() {
  const c = createCanvas(windowWidth, windowHeight);
  c.position(0, 0, "fixed");
  colorMode(HSB, 360, 100, 100, 255);
  _buildCandidateColors();
  createPanel();
  _dropZone = _createDropZone();
  _clearWhite();
  noLoop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (sourceImg) {
    _fitImage();
    regenerate();
  } else {
    _clearWhite();
  }
}
