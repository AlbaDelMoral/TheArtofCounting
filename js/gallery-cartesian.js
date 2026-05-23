// gallery-cartesian.js — zoomable Cartesian gallery (no-logo variant)
//
// Identical to home-cartesian.js at the point before hover-images were added:
// thumbnails are always visible on every point, no mouseenter/leave logic.
//
// ── Toggle background hover effect ──────────────────────────────────────────
const BG_HOVER = false;
// ────────────────────────────────────────────────────────────────────────────

const IMAGES = [
  "assets/images/1.png",
  "assets/images/2.png",
  "assets/images/3.png",
  "assets/images/4.png",
  "assets/images/5.png",
  "assets/images/6.png",
];

const RANGE = 10;

// ── Point cloud — tweak these to reshape the whole gallery ───────────────────
const SEED = 42; // any integer — change for a completely different layout
const NUM_POINTS = 100; // total number of coordinate points
const MIN_SPACING = 0.05; // minimum distance between any two points (coordinate units)
//                             ↑ lower = denser cluster, higher = more breathing room
// ────────────────────────────────────────────────────────────────────────────

// ── Zoom — tweak these to control scroll behaviour ───────────────────────────
const ZOOM_MIN = 0.6; // how far you can zoom out (0.1 = very far, 1 = no zoom-out)
const ZOOM_MAX = 4; // how far you can zoom in  (2 = moderate, 5 = very close)
const ZOOM_SPEED = 0.035; // how much each scroll tick zooms (0.02 = slow, 0.1 = fast)
// ────────────────────────────────────────────────────────────────────────────

// SPREAD is derived automatically so points always fill the canvas at max zoom-out.
// You don't need to change this — adjust ZOOM_MIN to control how far out they go.
const SPREAD = Math.ceil(RANGE / ZOOM_MIN);

// ── Label size at each end of the zoom range ─────────────────────────────────
const LABEL_SIZE_FAR = 5; // screen size (px) when fully zoomed OUT
const LABEL_SIZE_NEAR = 6; // screen size (px) when fully zoomed IN
// ────────────────────────────────────────────────────────────────────────────

// ── Projection lines ─────────────────────────────────────────────────────────
const PROJ_SHOW = false; // true / false — toggle all projection lines
const PROJ_COLOR = "#c0c0c0"; // any CSS color
const PROJ_OPACITY = 0.6; // 0 (invisible) → 1 (fully solid)
const PROJ_THICKNESS = 1; // line thickness in px
const PROJ_DASH = 3; // dash length in px  (0 = solid line)
const PROJ_GAP = 5; // gap between dashes in px
// ────────────────────────────────────────────────────────────────────────────

// Seeded RNG (LCG) — keeps the layout stable across page loads
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const ALL_POINTS = (() => {
  const rng = makeRng(SEED);
  const pts = [];
  let attempts = 0;
  const maxAttempts = NUM_POINTS * 200;

  while (pts.length < NUM_POINTS && attempts < maxAttempts) {
    attempts++;
    const x = Math.round((rng() * 2 - 1) * SPREAD);
    const y = Math.round((rng() * 2 - 1) * SPREAD);

    const tooClose = pts.some(
      (p) => Math.hypot(p.x - x, p.y - y) < MIN_SPACING,
    );
    if (tooClose) continue;

    pts.push({ x, y, src: IMAGES[pts.length % IMAGES.length] });
  }
  return pts;
})();

// ── State ────────────────────────────────────────────────────────────────────
let zoom = 1;
let world = null;
let plane = null;
let overlay = null;
let projCanvas = null;
let projCtx = null;
let rafPending = false;

// ── Coordinate → world percentage ────────────────────────────────────────────
function toPercent(x, y) {
  return {
    px: 50 + (x / RANGE) * 50,
    py: 50 - (y / RANGE) * 50,
  };
}

// ── World % → screen px ──────────────────────────────────────────────────────
function worldPctToScreen(px, py) {
  const w = plane.offsetWidth;
  const h = plane.offsetHeight;
  const worldX = (px / 100) * w;
  const worldY = (py / 100) * h;
  const sx = (worldX - w / 2) * zoom + w / 2;
  const sy = (worldY - h / 2) * zoom + h / 2;
  return { sx, sy };
}

// ── Projection lines ──────────────────────────────────────────────────────────
function updateProjectionLines() {
  if (!projCtx) return;

  const w = plane.offsetWidth;
  const h = plane.offsetHeight;

  if (projCanvas.width !== w || projCanvas.height !== h) {
    projCanvas.width = w;
    projCanvas.height = h;
  }

  projCtx.clearRect(0, 0, w, h);
  if (!PROJ_SHOW) return;

  const ax = w / 2;
  const ay = h / 2;

  projCtx.save();
  projCtx.strokeStyle = PROJ_COLOR;
  projCtx.globalAlpha = PROJ_OPACITY;
  projCtx.lineWidth = PROJ_THICKNESS;
  projCtx.setLineDash(PROJ_DASH > 0 ? [PROJ_DASH, PROJ_GAP] : []);

  projCtx.beginPath();
  ALL_POINTS.forEach(({ x, y }) => {
    const { px, py } = toPercent(x, y);
    const { sx, sy } = worldPctToScreen(px, py);

    if (sx < -50 || sx > w + 50 || sy < -50 || sy > h + 50) return;

    projCtx.moveTo(sx, sy);
    projCtx.lineTo(ax, sy);
    projCtx.moveTo(sx, sy);
    projCtx.lineTo(sx, ay);
  });
  projCtx.stroke();
  projCtx.restore();
}

// ── Apply zoom ────────────────────────────────────────────────────────────────
function applyTransform() {
  if (!world) return;
  world.style.transform = `scale(${zoom})`;

  const t = (zoom - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
  const screenSize = LABEL_SIZE_FAR + (LABEL_SIZE_NEAR - LABEL_SIZE_FAR) * t;
  world.style.setProperty("--cp-label-size", screenSize / zoom + "px");

  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => {
      updateProjectionLines();
      rafPending = false;
    });
  }
}

// ── Build the scene ───────────────────────────────────────────────────────────
function placeCPPoints() {
  plane = document.querySelector(".home-cartesian");
  const banner = document.querySelector(".home-banner");
  if (!plane || !banner) return;

  plane.style.setProperty("--proj-color", PROJ_COLOR);
  plane.style.setProperty("--proj-opacity", PROJ_OPACITY);
  plane.style.setProperty("--proj-thickness", PROJ_THICKNESS + "px");
  plane.style.setProperty("--proj-dash", PROJ_DASH + "px");
  plane.style.setProperty("--proj-gap", PROJ_GAP + "px");

  world = document.createElement("div");
  world.className = "cp-world";
  plane.appendChild(world);

  projCanvas = document.createElement("canvas");
  projCanvas.style.cssText =
    "position:absolute;inset:0;pointer-events:none;z-index:1;";
  projCanvas.width = plane.offsetWidth;
  projCanvas.height = plane.offsetHeight;
  projCtx = projCanvas.getContext("2d");
  plane.appendChild(projCanvas);

  if (BG_HOVER) {
    overlay = document.createElement("div");
    overlay.className = "cp-bg-overlay";
    banner.appendChild(overlay);
  }

  // Place points — images always visible, no hover logic
  ALL_POINTS.forEach(({ x, y, src }) => {
    const { px, py } = toPercent(x, y);
    const isPos = x >= 0;

    const wrap = document.createElement("div");
    wrap.className = "cp-point " + (isPos ? "cp-pos" : "cp-neg");
    wrap.style.left = px + "%";
    wrap.style.top = py + "%";

    const label = `(${x}, ${y})`;
    wrap.innerHTML = isPos
      ? `<div class="cp-header"><span class="cp-dot"></span><span class="cp-label">${label}</span></div><img class="cp-img cp-img-visible" src="${src}" alt="${label}">`
      : `<div class="cp-header"><span class="cp-label">${label}</span><span class="cp-dot"></span></div><img class="cp-img cp-img-visible" src="${src}" alt="${label}">`;

    world.appendChild(wrap);
  });

  updateProjectionLines();

  // ── Zoom (scroll) ────────────────────────────────────────────────────────
  banner.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1 - ZOOM_SPEED : 1 + ZOOM_SPEED;
      zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom * factor));
      applyTransform();
    },
    { passive: false },
  );

  // ── Reset (double-click) ─────────────────────────────────────────────────
  banner.addEventListener("dblclick", (e) => {
    if (e.target.closest(".site-nav, .home-logo")) return;
    zoom = 1;
    applyTransform();
  });

  // ── Recalculate on resize ────────────────────────────────────────────────
  window.addEventListener("resize", updateProjectionLines);
}

document.addEventListener("DOMContentLoaded", placeCPPoints);
