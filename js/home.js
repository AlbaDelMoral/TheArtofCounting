// home.js — falling number circles for homepage
// Depends on: p5.js, number-system.js (must load first)
// Overrides number-system.js's preload() — still loads paletteTable.

// Drawing parameters used by number-system.js's drawNumber()
const CONFIG = {
  ringAreaRatio: 0.9,
  ringGrowth: 1.4,
  outerStrokeRatio: 0.04,
  portionArcSteps: 38,
  negStrokeRatio: 0.035,
  tickLengthRatio: 0.15,
  tickStrokeWeight: 1,
  tickOpacity: 0,
  decimalStrokeRatio: 0.05,
  decimalDashCount: 10,
  decimalDashRatio: 0.9,
  decimalMarginRatio: 0.09,
  centerDotRatio: 0.025,
  blendModeName: "NONE",
};

// Physics parameters
const HOME = {
  ballCount: 20,
  gravity: 0.03,
  bounce: 0.78,
  friction: 0.9998,
  minRadius: 10,
  maxRadius: 50,
};

let balls = [];

// Cached DOM refs for colliders — resolved once on first draw
let _bandEl = null;
let _tiltEl = null;

// ─── p5 lifecycle ─────────────────────────────────────────────────────────────

// Overrides number-system.js preload — still assigns to its paletteTable global
function preload() {
  paletteTable = loadTable("data/palette.csv", "csv", "header");
}

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.style("position", "fixed");
  cnv.style("top", "0");
  cnv.style("left", "0");
  cnv.style("z-index", "5");
  cnv.style("pointer-events", "none");

  colorMode(HSB, 360, 100, 100, 255);
  buildPalette(); // from number-system.js — populates PAL + SWATCHES
  spawnBalls();
}

function draw() {
  resolveBandRefs(); // no-op after first successful query

  blendMode(BLEND);
  clear();
  colorMode(HSB, 360, 100, 100, 255);

  const letterRects = Array.from(
    document.querySelectorAll(".home-mathematics span"),
  ).map((el) => el.getBoundingClientRect());

  for (const b of balls) {
    // physics
    b.vy += HOME.gravity;
    b.vx *= HOME.friction;
    b.vy *= HOME.friction;
    b.x += b.vx;
    b.y += b.vy;
    b.angle += b.rotSpeed;

    // screen edge bounces
    if (b.x - b.r < 0) {
      b.x = b.r;
      b.vx = abs(b.vx) * HOME.bounce;
    }
    if (b.x + b.r > width) {
      b.x = width - b.r;
      b.vx = -abs(b.vx) * HOME.bounce;
    }
    if (b.y - b.r < 0) {
      b.y = b.r;
      b.vy = abs(b.vy) * HOME.bounce;
    }
    if (b.y + b.r > height) {
      b.y = height - b.r;
      b.vy = -abs(b.vy) * HOME.bounce;
    }

    // per-letter collision
    for (const rect of letterRects) rectBounce(b, rect);

    // band collision (OBB — respects the CSS rotation)
    if (_bandEl && _tiltEl) obbBounce(b, _bandEl, _tiltEl);

    // draw as a number circle
    randomSeed(b.colorSeed);
    reshuffleColors();
    push();
    translate(b.x, b.y);
    rotate(b.angle);
    drawingContext.globalAlpha = 1;
    drawNumber(b.numStr, 0, 0, b.r);
    pop();
  }

  randomSeed();
  blendMode(BLEND);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function spawnBalls() {
  balls = [];
  for (let i = 0; i < HOME.ballCount; i++) {
    const r = random(HOME.minRadius, HOME.maxRadius);
    balls.push({
      x: random(r, width - r),
      y: random(-height, -r),
      vx: random(-1.2, 1.2),
      vy: random(0.5, 2),
      r: r,
      numStr: randomNum(),
      colorSeed: floor(random(999983)),
      angle: random(TWO_PI),
      rotSpeed: (random() < 0.5 ? -1 : 1) * random(0.002, 0.01),
    });
  }
}

// ─── DOM query helpers (run once) ─────────────────────────────────────────────
function resolveBandRefs() {
  if (!_bandEl) _bandEl = document.querySelector(".home-band");
  if (!_tiltEl) _tiltEl = document.querySelector(".home-tilt");
}

// Extract rotation angle (degrees) from an element's computed CSS transform matrix
function getRotationDeg(el) {
  const m = window.getComputedStyle(el).transform;
  if (!m || m === "none") return 0;
  const v = m.match(/matrix\(([^)]+)\)/);
  if (!v) return 0;
  const [a, b] = v[1].split(",").map(parseFloat);
  return Math.atan2(b, a) * (180 / Math.PI);
}

// Circle vs OBB — handles CSS-rotated rectangles
// Uses the element's offsetWidth/Height (pre-transform) for the half-extents
// and reads the actual rotation from the ancestor tiltEl's computed matrix.
function obbBounce(b, el, tiltEl) {
  const rect   = el.getBoundingClientRect();
  const cx     = (rect.left + rect.right)   / 2;
  const cy     = (rect.top  + rect.bottom)  / 2;
  const hw     = el.offsetWidth  / 2;
  const hh     = el.offsetHeight / 2;
  const ang    = getRotationDeg(tiltEl) * (Math.PI / 180); // radians

  // Transform ball into OBB local space (un-rotate)
  const dx  =  b.x - cx;
  const dy  =  b.y - cy;
  const cos =  Math.cos(-ang);
  const sin =  Math.sin(-ang);
  const lx  =  dx * cos - dy * sin;
  const ly  =  dx * sin + dy * cos;

  // Nearest point on the unrotated rect in local space
  const nlx = constrain(lx, -hw, hw);
  const nly = constrain(ly, -hh, hh);

  // Distance from nearest point to ball centre
  const ex = lx - nlx;
  const ey = ly - nly;
  const d  = Math.sqrt(ex * ex + ey * ey);

  if (d > 0 && d < b.r) {
    // Contact normal in local space
    const nx_l = ex / d;
    const ny_l = ey / d;

    // Rotate normal back to world space
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    const nx = nx_l * cosA - ny_l * sinA;
    const ny = nx_l * sinA + ny_l * cosA;

    // Push ball out of the surface
    const overlap = b.r - d;
    b.x += nx * overlap;
    b.y += ny * overlap;

    // Reflect velocity along the world-space normal
    const dot = b.vx * nx + b.vy * ny;
    b.vx = (b.vx - 2 * dot * nx) * HOME.bounce;
    b.vy = (b.vy - 2 * dot * ny) * HOME.bounce;
  }
}

// Circle vs AABB — pushes ball out and reflects velocity along contact normal
function rectBounce(b, rect) {
  const nearX = constrain(b.x, rect.left, rect.right);
  const nearY = constrain(b.y, rect.top, rect.bottom);
  const dx = b.x - nearX;
  const dy = b.y - nearY;
  const d = sqrt(dx * dx + dy * dy);

  if (d > 0 && d < b.r) {
    const nx = dx / d;
    const ny = dy / d;
    const overlap = b.r - d;
    b.x += nx * overlap;
    b.y += ny * overlap;
    const dot = b.vx * nx + b.vy * ny;
    b.vx = (b.vx - 2 * dot * nx) * HOME.bounce;
    b.vy = (b.vy - 2 * dot * ny) * HOME.bounce;
  }
}
