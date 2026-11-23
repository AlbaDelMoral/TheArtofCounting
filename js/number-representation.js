// number-representation.js — shared "level 1" logic: how ONE number is drawn
// (ring geometry, ticks/outline, bg circle, decimal ring, center dot, portion arcs).
// Edit values here and they apply to every page (numbers, operations, multiplication) —
// each page's CONFIG spreads this object in, instead of redefining these fields itself.
// Depends on: js/colors.js (loaded before this file)

const NUMBER_REPRESENTATION = {
  // ── blend mode ─────────────────────────────────────────────────────────────────
  blendModeName: "NONE",

  // ── ring geometry ─────────────────────────────────────────────────────────────
  ringMarginRatio: 0.06, // gap between outermost digit ring and bg circle edge,
  // as a fraction of outerR — scales proportionally as circles get bigger/smaller,
  // but stays the same regardless of digit count (1-digit vs 2-digit numbers).
  ringGrowth: 1.4,

  // ── outer circle ─────────────────────────────────────────────────────────────
  showBgCircle: true, // set to false to hide the filled circle behind the rings
  outerStrokeRatio: 0.006, // outline thickness, only used when bgStrokeColor is set
  bgColor: COLORS.bgCircle, // see js/colors.js
  bgStrokeColor: COLORS.bgCircleOutline, // see js/colors.js (null = no outline)

  // ── cake portions ─────────────────────────────────────────────────────────────
  portionArcSteps: 94, // higher = smoother arcs, less wavy on outlined (negative) wedges
  negStrokeRatio: 0.015,

  // ── tick marks / ring outline ────────────────────────────────────────────────
  showTicks: true, // set to false to hide tick marks/outline entirely
  ringStyle: "ticks", // "ticks" (original) or "outline" (thin circle per digit ring)
  ringOutlineWeightRatio: 0.0, // outline thickness, only used when ringStyle === "outline"
  tickLengthRatio: 0.1, // only used when ringStyle === "ticks"
  tickStrokeWeightRatio: 0.005, // scales with outerR, so ticks don't look thick on small numbers
  tickStrokeDecayRatio: 0.7, // 1 = all rings the same thickness; <1 makes each ring
  // outward from the units ring thinner by this factor (e.g. 0.7 → ring i's
  // weight is tickStrokeWeightRatio * 0.7^i, so 1-10 is thickest, 10-100 a bit
  // thinner, 100-1000 thinner still, and so on).
  tickOpacity: 255,
  tickColor: COLORS.tickMarks, // see js/colors.js
  tickMinRadius: 28, // below this circle radius (px) the tick marks are hidden entirely — too small to read as dashes

  // ── decimal ring ──────────────────────────────────────────────────────────────
  decimalStrokeRatio: 0.05,
  decimalDashCount: 10,
  decimalDashRatio: 0.9,
  decimalMarginRatio: 0.09,

  // ── center dot ────────────────────────────────────────────────────────────────
  centerDotRatio: 0.025,
};
