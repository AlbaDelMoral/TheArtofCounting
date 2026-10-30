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
    // Floored so a negative belt's outline stays readable once it gets
    // small, and capped (beltStrokeMax, when the mode defines one) so it
    // doesn't keep thickening past that once the pill gets big.
    ctx.lineWidth   = Math.min(
      CONFIG.beltStrokeMax ?? Infinity,
      Math.max(0.4, Math.max(R1, R2) * CONFIG.beltStrokeRatio),
    );
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

// ─── input parser (multiplication-aware) ───────────────────────────────────────
// Same job as parseChains, but a term can also be a parenthesized
// multiplication — "(3x4) + 5" — instead of a plain constant, so that
// operand can be rendered as the actual multiplication square (handled by
// play.js) instead of a number circle. Each returned term is one of:
//   { kind: 'num',  sign, value, str }                  — plain constant
//   { kind: 'mult', sign, value, steps }                 — steps = parseMultChain's array (1+ steps)
// `value` always carries the term's own FINAL signed numeric value (chain
// sign already applied), so callers never need to re-check `sign` for math —
// it's kept around only because the multiplication square's own fill (filled
// vs outlined) needs to flip when the chain-level sign negates an otherwise
// positive product.
function parseChainsWithMult(str) {
  const results  = [];
  const segments = str.trim().split(/[|;\n]+/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    const terms = _tokenizeChainSegment(seg);
    if (terms && terms.length >= 2) results.push(terms);
  }
  return results;
}

// true if `inner` has a top-level × (i.e. this parenthesized group is a
// multiplication sub-expression, not just a parenthesized number)
function _hasTopLevelMultSign(inner) {
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if      (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && /[x×*]/i.test(c)) return true;
  }
  return false;
}

function _tokenizeChainSegment(seg) {
  const s = seg.replace(/\s/g, '').replace(/−/g, '-');
  const terms = [];
  let i = 0;
  while (i < s.length) {
    let sign = 1;
    if      (s[i] === '+') { sign = 1;  i++; }
    else if (s[i] === '-') { sign = -1; i++; }
    if (i >= s.length) return null;

    if (s[i] === '(') {
      let depth = 1, j = i + 1;
      while (j < s.length && depth > 0) {
        if      (s[j] === '(') depth++;
        else if (s[j] === ')') depth--;
        j++;
      }
      if (depth !== 0) return null; // unmatched paren
      const inner = s.slice(i + 1, j - 1);
      i = j;

      if (_hasTopLevelMultSign(inner)) {
        // parseMultChain (not parseMultExpr) so a 3+-operand chain like
        // "8x9x5" parses as all of its steps, not just the first pair —
        // the embedded square has to show the WHOLE chain, same as typing
        // it directly into multiplication mode would.
        const steps = parseMultChain(inner.replace(/×|\*/g, 'x'));
        if (!steps) return null;
        const lastResult = steps[steps.length - 1].result;
        terms.push({ kind: 'mult', sign, value: sign * lastResult, steps, exprStr: inner });
      } else if (/^-?\d+(?:\.\d+)?$/.test(inner)) {
        // the WHOLE inner string is one plain (optionally signed) number —
        // e.g. "(-15)" — not just a number followed by more stuff
        const v = parseFloat(inner);
        const value = sign * v;
        terms.push({ kind: 'num', sign, value, str: String(Math.abs(value)) });
      } else {
        // neither a multiplication nor a plain number — try it as a NESTED
        // addition/subtraction chain, e.g. "(5+6)" in "(3x4) + (5+6)".
        // Recursing into this same tokenizer means a nested chain can itself
        // contain a further nested mult or chain term, same grammar either
        // way, any depth.
        const nestedTerms = _tokenizeChainSegment(inner);
        if (!nestedTerms || nestedTerms.length < 2) return null;
        const chainValue = nestedTerms.reduce((acc, t) => acc + t.value, 0);
        terms.push({ kind: 'chain', sign, value: sign * chainValue, terms: nestedTerms, exprStr: inner });
      }
    } else {
      const m = /^\d+(?:\.\d+)?/.exec(s.slice(i));
      if (!m) return null;
      const value = sign * parseFloat(m[0]);
      terms.push({ kind: 'num', sign, value, str: String(Math.abs(value)) });
      i += m[0].length;
    }
  }
  return terms;
}

// ─── belt to a flat-edged shape (multiplication square) ───────────────────────
// Like drawBelt, but one side is a multiplication's own square (rendered by
// multiplication-system.js) instead of a circle — used when a chain operand
// is itself a multiplication, e.g. "(3x4) + 5". The circle side keeps the
// exact same tangent-arc geometry as a normal circle-circle belt (computed
// treating the square's half-size as if it were the other circle's radius);
// the square side has no arc of its own — instead, the straight tangent
// lines run PAST the square's far side (the side away from the circle) and
// close with a flat cap there, so the belt fully encloses the square — the
// same margin shows on every side of it, not just the side facing the
// circle (matching a circle, which the belt already wraps completely).
function drawBeltToSquare(ccx, ccy, R, sqx, sqy, H, resultPositive, cssColor) {
  const dx = sqx - ccx, dy = sqy - ccy;
  const d  = Math.sqrt(dx * dx + dy * dy);
  if (d <= Math.abs(R - H) + 0.5) return;

  const base  = Math.atan2(dy, dx);
  const alpha = Math.asin(Math.max(-1, Math.min(1, (R - H) / d)));
  const t_top = base - Math.PI / 2 + alpha;
  const t_bot = base + Math.PI / 2 - alpha;

  // flat cap beyond the square's far edge, as its two corners either side
  // of the cap's midpoint
  const farX = sqx + H * Math.cos(base), farY = sqy + H * Math.sin(base);
  const edgeDx = -Math.sin(base), edgeDy = Math.cos(base);
  const edgeBotX = farX + edgeDx * H, edgeBotY = farY + edgeDy * H; // same side as t_bot
  const edgeTopX = farX - edgeDx * H, edgeTopY = farY - edgeDy * H; // same side as t_top

  const ctx = drawingContext;
  ctx.beginPath();
  ctx.moveTo(ccx + R * Math.cos(t_top), ccy + R * Math.sin(t_top));
  ctx.arc(ccx, ccy, R, t_top, t_bot, true); // CCW — far side of the circle
  ctx.lineTo(edgeBotX, edgeBotY);
  ctx.lineTo(edgeTopX, edgeTopY); // the flat cap beyond the square
  ctx.closePath();

  if (resultPositive) {
    ctx.fillStyle = cssColor;
    ctx.fill();
  } else {
    ctx.strokeStyle = cssColor;
    ctx.lineWidth   = Math.min(
      CONFIG.beltStrokeMax ?? Infinity,
      Math.max(0.4, Math.max(R, H) * CONFIG.beltStrokeRatio),
    );
    ctx.stroke();
  }
}

// ─── belt between two flat-edged shapes (two multiplication squares) ──────────
// Both ends are flat — no arc at all — since neither side is a circle: a
// plain quad whose flat caps sit beyond EACH square's own far side (mirrors
// drawBeltToSquare's single flat cap, just on both ends), so both squares
// end up fully enclosed with the same margin as a circle would get.
function drawBeltSquareToSquare(x1, y1, H1, x2, y2, H2, resultPositive, cssColor) {
  const dx = x2 - x1, dy = y2 - y1;
  const d  = Math.sqrt(dx * dx + dy * dy);
  if (d <= 0.5) return;

  const base   = Math.atan2(dy, dx);
  const edgeDx = -Math.sin(base), edgeDy = Math.cos(base);

  const far1X = x1 - H1 * Math.cos(base), far1Y = y1 - H1 * Math.sin(base);
  const far2X = x2 + H2 * Math.cos(base), far2Y = y2 + H2 * Math.sin(base);

  const ctx = drawingContext;
  ctx.beginPath();
  ctx.moveTo(far1X + edgeDx * H1, far1Y + edgeDy * H1);
  ctx.lineTo(far2X + edgeDx * H2, far2Y + edgeDy * H2);
  ctx.lineTo(far2X - edgeDx * H2, far2Y - edgeDy * H2);
  ctx.lineTo(far1X - edgeDx * H1, far1Y - edgeDy * H1);
  ctx.closePath();

  if (resultPositive) {
    ctx.fillStyle = cssColor;
    ctx.fill();
  } else {
    ctx.strokeStyle = cssColor;
    ctx.lineWidth   = Math.min(
      CONFIG.beltStrokeMax ?? Infinity,
      Math.max(0.4, Math.max(H1, H2) * CONFIG.beltStrokeRatio),
    );
    ctx.stroke();
  }
}

// ─── belt color helper ────────────────────────────────────────────────────────
// Background circles are now always flat grey HSB(0,0,85) = RGB(216,216,216).
// Belt color exclusion checks against this fixed value.
function getOuterCss() {
  return '216,216,216';
}
