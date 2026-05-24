// number-system.js — shared visual number rendering core
// Used by numbers.js and operations.js.
// Depends on: p5.js, CONFIG (defined in the page sketch), data/palette.csv

// ─── digit color palette (loaded from palette2.csv + palette3.csv) ────────────
// Populated by buildPalette() — do not use before setup() runs.
let NUMBER_COLORS    = {};   // { 1: { dark, mid, light }, … }  HSB values
let NUMBER_BG_COLORS = {};   // { 1: p5color, 2: p5color, … } — one bg per digit
// ─── font table ───────────────────────────────────────────────────────────────
const FONTS = [
  { family: "KMRWaldenburg", weight: "900",  style: "normal" },
  { family: "KMRWaldenburg", weight: "500",  style: "normal" },
];

// ─── palette ──────────────────────────────────────────────────────────────────
let paletteTable;
let numberColorsTable;
let bgColorTable;
let PAL = {};
let SWATCHES = [];

function preload() {
  paletteTable      = loadTable('data/palette.csv',  'csv', 'header');
  numberColorsTable = loadTable('data/palette2.csv', 'csv', 'header');
  bgColorTable      = loadTable('data/palette3.csv', 'csv', 'header');
}

function buildPalette() {
  colorMode(HSB, 360, 100, 100, 255);

  // ── palette.csv → SWATCHES ───────────────────────────────────────────────────
  SWATCHES = [];
  for (let i = 0; i < paletteTable.getRowCount(); i++) {
    const row  = paletteTable.getRow(i);
    const name = row.getString("name");
    const h    = row.getNum("H");
    const s    = row.getNum("S");
    const b    = row.getNum("B");
    const type = row.getString("type");
    const col  = color(h, s, b);
    PAL[name]  = col;
    if (name.startsWith("swatch_")) SWATCHES.push({ col, type });
  }

  // ── palette2.csv → NUMBER_COLORS ─────────────────────────────────────────────
  NUMBER_COLORS = {};
  for (let i = 0; i < numberColorsTable.getRowCount(); i++) {
    const row   = numberColorsTable.getRow(i);
    const digit = row.getNum('digit');
    const tier  = row.getString('tier');
    const H     = row.getNum('H');
    const S     = row.getNum('S');
    const B     = row.getNum('B');
    if (!NUMBER_COLORS[digit]) NUMBER_COLORS[digit] = {};
    NUMBER_COLORS[digit][tier] = { H, S, B };
  }

  // ── palette3.csv → NUMBER_BG_COLORS (row 0 = digit 1, row 8 = digit 9) ───────
  NUMBER_BG_COLORS = {};
  for (let i = 0; i < bgColorTable.getRowCount(); i++) {
    const row = bgColorTable.getRow(i);
    NUMBER_BG_COLORS[i + 1] = color(row.getNum('H'), row.getNum('S'), row.getNum('B'));
  }
}

// Unique color set per circle. Call randomSeed(colorSeed) before this.
function reshuffleColors() {
  const pool = shuffle(SWATCHES.slice());

  const di = pool.findIndex((s) => s.type === "dark");
  PAL.ticks = pool.splice(di, 1)[0].col;

  const li = pool.findIndex((s) => s.type === "light");
  const outerCol = pool.splice(li, 1)[0].col;
  PAL.outer_fill   = outerCol;
  PAL.outer_stroke = outerCol;

  PAL.ring_0  = pool[0].col;
  PAL.ring_1  = pool[1].col;
  PAL.ring_2  = pool[2].col;
  PAL.ring_3  = pool[3].col;
  PAL.ring_4  = pool[4].col;
  PAL.ring_5  = pool[5].col;
  PAL.decimal = pool[6].col;
  PAL.label   = pool[7].col;
  PAL.rings   = [PAL.ring_0, PAL.ring_1, PAL.ring_2, PAL.ring_3, PAL.ring_4, PAL.ring_5];
}

// ─── digit extraction ─────────────────────────────────────────────────────────
function getDigits(numStr) {
  const isNegative   = numStr.startsWith("-");
  const s            = isNegative ? numStr.slice(1) : numStr;
  const parts        = s.split(".");
  const intPart      = parts[0];
  const decPart      = parts.length > 1 ? parts[1] : "";
  const decimalCount = decPart.length;
  const digits       = (intPart + decPart).split("").reverse().map(Number);
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
  stroke(hue(PAL.ticks), saturation(PAL.ticks), brightness(PAL.ticks), CONFIG.tickOpacity);
  strokeWeight(CONFIG.tickStrokeWeight);
  strokeCap(SQUARE);
  noFill();
  const tickLen = localW * CONFIG.tickLengthRatio;
  for (let i = 0; i < 10; i++) {
    const a  = -HALF_PI + i * (TWO_PI / 10);
    const x1 = cx + cos(a) * r,          y1 = cy + sin(a) * r;
    const x2 = cx + cos(a) * (r - tickLen), y2 = cy + sin(a) * (r - tickLen);
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
  const seg  = (TWO_PI * r) / CONFIG.decimalDashCount;
  const dash = seg * CONFIG.decimalDashRatio;
  const gap  = seg * (1 - CONFIG.decimalDashRatio);
  drawingContext.setLineDash([dash, gap]);
  ellipse(cx, cy, r * 2, r * 2);
  drawingContext.setLineDash([]);
  pop();
}

// ─── ring boundaries ──────────────────────────────────────────────────────────
function computeRingBoundaries(numRings, innerR) {
  const g    = CONFIG.ringGrowth;
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
  const innerR   = outerR * CONFIG.ringAreaRatio;
  const bdry     = computeRingBoundaries(numRings, innerR);

  blendMode(window[CONFIG.blendModeName] || BLEND);
  // Background circle: colour keyed to the most significant digit (palette3.csv)
  const mostSigDigit = digits[numRings - 1];
  const bgCol = NUMBER_BG_COLORS[mostSigDigit] || color(0, 0, 90);
  push();
  fill(bgCol);
  noStroke();
  ellipse(cx, cy, outerR * 2, outerR * 2);
  pop();
  blendMode(BLEND);

  const portionAngle = TWO_PI / 10;
  for (let i = 0; i < numRings; i++) {
    const digit = digits[i];
    if (digit === 0) continue;
    const r1  = i === 0 ? 0 : bdry[i - 1];
    const r2  = bdry[i];
    // Tier depends on positional weight: units=light(unidades), tens=mid(decenas), hundreds+=dark(centenas)
    const tier = i === 0 ? 'light' : i === 1 ? 'mid' : 'dark';
    const t   = NUMBER_COLORS[digit][tier];
    const col = color(t.H, t.S, t.B);
    if (isNegative) {
      // One single outlined arc spanning the full digit angle
      annularWedge(
        cx, cy, r1, r2,
        -HALF_PI,
        -HALF_PI + digit * portionAngle,
        col, true, outerR,
      );
    } else {
      for (let p = 0; p < digit; p++) {
        annularWedge(
          cx, cy, r1, r2,
          -HALF_PI + p * portionAngle,
          -HALF_PI + (p + 1) * portionAngle,
          col, false, outerR,
        );
      }
    }
  }

  for (let i = 0; i < numRings; i++) {
    const r1 = i === 0 ? 0 : bdry[i - 1];
    drawTicks(cx, cy, bdry[i], bdry[i] - r1);
  }

  if (decimalCount > 0)
    drawDecimalRing(cx, cy, bdry[decimalCount - 1] + outerR * CONFIG.decimalMarginRatio, outerR);

  // push();
  // fill(0, 0, 0);
  // noStroke();
  // const dotR = outerR * CONFIG.centerDotRatio;
  // ellipse(cx, cy, dotR * 2, dotR * 2);
  // pop();
}

// ─── random number pool ───────────────────────────────────────────────────────
function randomNum() {
  const type = floor(random(7));
  let n;
  switch (type) {
    case 0: return String(floor(random(1, 10)));
    case 1: return String(floor(random(10, 100)));
    case 2: return String(floor(random(100, 1000)));
    case 3: return "-" + String(floor(random(1, 1000)));
    case 4: return random(0.1, 99.9).toFixed(1);
    case 5: return random(0.01, 99.99).toFixed(2);
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
    px[i] = v; px[i + 1] = v; px[i + 2] = v; px[i + 3] = 255;
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
