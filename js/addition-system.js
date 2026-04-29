// addition-system.js — belt drawing and chain expression logic
// Used by operations.js only.
// Depends on: p5.js, number-system.js (PAL, SWATCHES), CONFIG (from operations.js)

// ─── belt ─────────────────────────────────────────────────────────────────────
// Draws the convex "rubber-band" shape wrapping two circles.
// Uses Canvas 2D arc() directly — BOTH arcs counterclockwise (true).
//
// Geometry: external tangent angle offset α = asin((R1−R2)/d)
//   tA_top = base − π/2 + α      tA_bot = base + π/2 − α
//   tB_top = base − π/2 + α      tB_bot = base + π/2 − α
// Path: moveTo A_top → arc(A, tA_top→tA_bot, CCW) → lineTo B_bot
//        → arc(B, tB_bot→tB_top, CCW) → closePath (top tangent line)
//
// Positive result: filled, no stroke.  Negative result: stroke only, no fill.

function drawBelt(x1, y1, R1, x2, y2, R2, resultPositive, cssColor) {
  const dx = x2 - x1, dy = y2 - y1;
  const d  = Math.sqrt(dx * dx + dy * dy);
  if (d <= Math.abs(R1 - R2) + 0.5) return; // one circle contains the other

  const base  = Math.atan2(dy, dx);
  const alpha = Math.asin(Math.max(-1, Math.min(1, (R1 - R2) / d)));

  const tA_top = base - Math.PI / 2 + alpha;
  const tA_bot = base + Math.PI / 2 - alpha;
  const tB_top = base - Math.PI / 2 + alpha;
  const tB_bot = base + Math.PI / 2 - alpha;

  const ctx = drawingContext;
  ctx.beginPath();
  ctx.moveTo(x1 + R1 * Math.cos(tA_top), y1 + R1 * Math.sin(tA_top));
  ctx.arc(x1, y1, R1, tA_top, tA_bot, true); // CCW — far side of left circle
  ctx.lineTo(x2 + R2 * Math.cos(tB_bot), y2 + R2 * Math.sin(tB_bot));
  ctx.arc(x2, y2, R2, tB_bot, tB_top, true); // CCW — far side of right circle
  ctx.closePath();

  if (resultPositive) {
    ctx.fillStyle = cssColor;
    ctx.fill();
  } else {
    ctx.strokeStyle = cssColor;
    ctx.lineWidth   = Math.max(R1, R2) * CONFIG.beltStrokeRatio;
    ctx.stroke();
  }
}

// ─── input parser ─────────────────────────────────────────────────────────────
// Accepts:  "2 + 3 - 10"  →  ["2","3","-10"]
//           "8 - 3 - 9"   →  ["8","-3","-9"]
// Multiple chains separated by  |  ;  or newline.
function parseChains(str) {
  const results  = [];
  const segments = str.trim().split(/[|;\n]+/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const norm   = seg.replace(/(\d)\s*-\s*(\d)/g, "$1 +-$2");
    const tokens = norm.match(/-?\d+\.?\d*/g);
    if (tokens && tokens.length >= 2) results.push(tokens);
  }
  return results;
}

// ─── belt color helper ────────────────────────────────────────────────────────
// Returns the CSS rgb string that reshuffleColors would assign as outer_fill
// for a given colorSeed — used to prevent belt colors matching circle fills.
function getOuterCss(colorSeed) {
  randomSeed(colorSeed);
  const pool = shuffle(SWATCHES.slice());
  const di   = pool.findIndex((s) => s.type === "dark");
  pool.splice(di, 1);
  const li  = pool.findIndex((s) => s.type === "light");
  const col = pool[li].col;
  return `${floor(red(col))},${floor(green(col))},${floor(blue(col))}`;
}
