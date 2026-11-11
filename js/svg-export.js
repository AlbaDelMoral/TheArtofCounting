// svg-export.js — vector (SVG) export of the current Play canvas.
// Rebuilds the current composition as real SVG shapes/paths directly from
// the same data the canvas renderer uses (composition/chains/parsedSteps),
// instead of rasterizing — so the result stays crisp at any zoom.
// Two effects are intentionally left out, since neither has a vector
// equivalent: the grain/bokeh texture layer, and the "reality" slider's
// backdrop-blurred label (it samples+blurs actual pixels behind the text).
// The SVG export always renders as if reality = 0.
// Depends on: p5.js, number-system.js, addition-system.js,
// multiplication-system.js, play.js (loaded before this file).

// ─── 2D affine transform (translate/rotate/uniform-scale only — matches
// every push()/translate()/rotate()/scale() combo actually used below) ────
// m = [a,b,c,d,e,f] maps a local point (x,y) to absolute (X,Y):
//   X = a*x + c*y + e
//   Y = b*x + d*y + f
// s is the cumulative uniform scale factor, tracked separately so lengths
// (radii, stroke widths, font sizes) can be scaled correctly too.
function _T0() {
  return { m: [1, 0, 0, 1, 0, 0], s: 1 };
}
function _matMul(m1, m2) {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}
function _Ttranslate(T, x, y) {
  return { m: _matMul(T.m, [1, 0, 0, 1, x, y]), s: T.s };
}
function _Trotate(T, rad) {
  const c = Math.cos(rad), s = Math.sin(rad);
  return { m: _matMul(T.m, [c, s, -s, c, 0, 0]), s: T.s };
}
function _Tscale(T, k) {
  return { m: _matMul(T.m, [k, 0, 0, k, 0, 0]), s: T.s * k };
}
function _Tpoint(T, x, y) {
  const m = T.m;
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}
function _Tlen(T, len) {
  return len * T.s;
}
// Net rotation this transform carries, in degrees — used only for <text>,
// which needs its own rotate() rather than pre-rotated vertices.
function _TangleDeg(T) {
  return (Math.atan2(T.m[1], T.m[0]) * 180) / Math.PI;
}

// ─── small string/number helpers ───────────────────────────────────────────
function _n(x) {
  return Math.round(x * 100) / 100;
}
function _pt(p) {
  return `${_n(p[0])},${_n(p[1])}`;
}
function _esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Any p5 Color, OR a raw [H,S,B] array (colorMode is HSB everywhere in this
// sketch — see number-system.js's buildPalette) → a plain CSS rgb() string.
// red()/green()/blue() always read back as 0–255 regardless of the active
// colorMode, same as the existing _p5ToCss helper. Deliberately NOT rgba():
// every color in this app is fully opaque, and rgba() isn't valid inside an
// SVG 1.1 fill/stroke attribute — some non-browser viewers (Preview,
// Illustrator, ...) reject it and silently fall back to solid black.
function _cssColor(colOrArr) {
  const col = Array.isArray(colOrArr) ? color(colOrArr[0], colOrArr[1], colOrArr[2]) : colOrArr;
  return `rgb(${Math.floor(red(col))},${Math.floor(green(col))},${Math.floor(blue(col))})`;
}
// Builds a closed polygon path from a flat list of ABSOLUTE points.
function _svgPolygon(points, filled, cssColor, strokeWidth, opacity = 1) {
  if (points.length < 2) return "";
  const d = `M ${points.map(_pt).join(" L ")} Z`;
  const style = filled
    ? `fill="${cssColor}" stroke="none"`
    : `fill="none" stroke="${cssColor}" stroke-width="${_n(strokeWidth)}"`;
  return `<path d="${d}" ${style} opacity="${_n(opacity)}"/>`;
}
function _svgCircle(cx, cy, r, fill, stroke, strokeWidth, opacity = 1, extra = "") {
  const fillAttr = fill ? `fill="${fill}"` : `fill="none"`;
  const strokeAttr = stroke ? `stroke="${stroke}" stroke-width="${_n(strokeWidth || 1)}"` : `stroke="none"`;
  return `<circle cx="${_n(cx)}" cy="${_n(cy)}" r="${_n(Math.max(0, r))}" ${fillAttr} ${strokeAttr} opacity="${_n(opacity)}" ${extra}/>`;
}
function _svgLine(x1, y1, x2, y2, stroke, strokeWidth, opacity = 1, dash = null, cap = "butt") {
  const dashAttr = dash ? `stroke-dasharray="${_n(dash[0])},${_n(dash[1])}"` : "";
  return `<line x1="${_n(x1)}" y1="${_n(y1)}" x2="${_n(x2)}" y2="${_n(y2)}" stroke="${stroke}" stroke-width="${_n(strokeWidth)}" stroke-linecap="${cap}" ${dashAttr} opacity="${_n(opacity)}"/>`;
}
function _svgText(x, y, angleDeg, content, fontFamily, fontWeight, fontStyle, fontSizePx, fill, opacity = 1) {
  const rot = Math.abs(angleDeg) > 0.01 ? ` rotate(${_n(angleDeg)} ${_n(x)} ${_n(y)})` : "";
  return (
    `<text x="${_n(x)}" y="${_n(y)}" transform="${rot}" text-anchor="middle" dominant-baseline="central" ` +
    `font-family="${fontFamily}, sans-serif" font-weight="${fontWeight}" font-style="${fontStyle}" ` +
    `font-size="${_n(fontSizePx)}" fill="${fill}" opacity="${_n(opacity)}">${_esc(content)}</text>`
  );
}

// Replicates Canvas2D's ctx.arc(cx,cy,r,startAngle,endAngle,anticlockwise)
// traversal exactly (same "keep adding/subtracting a full turn" rule the
// spec uses), returning the actual swept [start,end] to sample between —
// this is what makes the arc go the long way around when that's what the
// canvas version drew (e.g. a belt's "far side" of a circle).
function _arcSweep(startAngle, endAngle, anticlockwise) {
  const TWOPI = Math.PI * 2;
  let e = endAngle;
  if (!anticlockwise) {
    while (e < startAngle) e += TWOPI;
  } else {
    while (e > startAngle) e -= TWOPI;
  }
  return [startAngle, e];
}
function _arcPoints(cx, cy, r, startAngle, endAngle, anticlockwise, steps) {
  const [s, e] = _arcSweep(startAngle, endAngle, anticlockwise);
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = s + (e - s) * (i / steps);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

// ═══════════════════════════════════════════════════════════════════════════
// NUMBER RENDERER — mirrors number-system.js (annularWedge/drawTicks/
// drawRingOutline/drawDecimalRing/drawNumber), emitting SVG instead of
// drawing to the canvas. `T` is the transform the shape sits in; all
// coordinates passed in are LOCAL (relative to T), same as the canvas
// versions always being called right after translate()/rotate().
// ═══════════════════════════════════════════════════════════════════════════
// Real SVG elliptical-arc commands (rx=ry, a true circle) instead of a
// sampled polyline — stays perfectly smooth at any zoom, where a polygon
// approximation starts showing facets up close. Safe to do exactly here
// (unlike the belts below) because every caller passes a2 > a1 by
// construction, so the sweep direction/large-arc flag are simple and
// unambiguous: sweep=1 (increasing angle) for the outer arc, sweep=0 for
// the inner arc's reverse traversal back to the start; large-arc is just
// whether the span exceeds a half turn. T is a similarity transform
// (translate/rotate/positive-uniform-scale only, never a reflection — see
// the transform helpers up top), which preserves both properties exactly.
function _svgAnnularWedge(T, cx, cy, r1, r2, a1, a2, col, outlined, outerR) {
  const largeArc = a2 - a1 > Math.PI ? 1 : 0;
  const outerStart = _Tpoint(T, cx + r2 * Math.cos(a1), cy + r2 * Math.sin(a1));
  const outerEnd = _Tpoint(T, cx + r2 * Math.cos(a2), cy + r2 * Math.sin(a2));
  const rOuter = _Tlen(T, r2);

  let d;
  if (r1 === 0) {
    const center = _Tpoint(T, cx, cy);
    d = `M ${_pt(center)} L ${_pt(outerStart)} A ${_n(rOuter)} ${_n(rOuter)} 0 ${largeArc} 1 ${_pt(outerEnd)} Z`;
  } else {
    const innerStart = _Tpoint(T, cx + r1 * Math.cos(a1), cy + r1 * Math.sin(a1));
    const innerEnd = _Tpoint(T, cx + r1 * Math.cos(a2), cy + r1 * Math.sin(a2));
    const rInner = _Tlen(T, r1);
    d =
      `M ${_pt(outerStart)} A ${_n(rOuter)} ${_n(rOuter)} 0 ${largeArc} 1 ${_pt(outerEnd)} ` +
      `L ${_pt(innerEnd)} A ${_n(rInner)} ${_n(rInner)} 0 ${largeArc} 0 ${_pt(innerStart)} Z`;
  }

  const strokeW = _Tlen(T, Math.max(0.4, outerR * CONFIG.negStrokeRatio));
  const style = !outlined
    ? `fill="${_cssColor(col)}" stroke="none"`
    : `fill="none" stroke="${_cssColor(col)}" stroke-width="${_n(strokeW)}"`;
  return `<path d="${d}" ${style}/>`;
}

function _svgTicks(T, r, localW, outerR) {
  if (CONFIG.showTicks === false) return "";
  if (outerR < CONFIG.tickMinRadius) return "";
  const col = CONFIG.tickColor ? _cssColor(CONFIG.tickColor) : _cssColor(PAL.ticks);
  const opacity = CONFIG.tickOpacity / 255;
  const strokeW = _Tlen(T, Math.max(0.25, outerR * CONFIG.tickStrokeWeightRatio));
  const tickLen = localW * CONFIG.tickLengthRatio;
  let out = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * ((Math.PI * 2) / 10);
    const p1 = _Tpoint(T, Math.cos(a) * r, Math.sin(a) * r);
    const p2 = _Tpoint(T, Math.cos(a) * (r - tickLen), Math.sin(a) * (r - tickLen));
    out += _svgLine(p1[0], p1[1], p2[0], p2[1], col, strokeW, opacity, null, "square");
  }
  return out;
}

function _svgRingOutline(T, r, outerR) {
  if (CONFIG.showTicks === false) return "";
  const col = CONFIG.tickColor ? _cssColor(CONFIG.tickColor) : _cssColor(PAL.ticks);
  const opacity = CONFIG.tickOpacity / 255;
  const strokeW = _Tlen(T, outerR * (CONFIG.ringOutlineWeightRatio ?? 0.01));
  const c = _Tpoint(T, 0, 0);
  return _svgCircle(c[0], c[1], _Tlen(T, r), null, col, strokeW, opacity);
}

function _svgDecimalRing(T, r, outerR) {
  const seg = (Math.PI * 2 * r) / CONFIG.decimalDashCount;
  const dash = seg * CONFIG.decimalDashRatio;
  const gap = seg * (1 - CONFIG.decimalDashRatio);
  const c = _Tpoint(T, 0, 0);
  const extra = `stroke-linecap="butt" stroke-dasharray="${_n(_Tlen(T, dash))},${_n(_Tlen(T, gap))}"`;
  return _svgCircle(c[0], c[1], _Tlen(T, r), null, _cssColor(PAL.decimal), _Tlen(T, outerR * CONFIG.decimalStrokeRatio), 1, extra);
}

// Mirrors drawNumber() — cx/cy are always 0,0 here (T already carries the
// shape's own position/rotation), same as every real call site.
function _svgNumber(T, numStr, outerR, groupOpacity = 1) {
  const { digits, decimalCount, isNegative } = getDigits(numStr);
  const numRings = digits.length;
  const innerR = outerR * (1 - CONFIG.ringMarginRatio);
  const bdry = computeRingBoundaries(numRings, innerR);

  let out = "";
  const mostSigDigit = digits[numRings - 1];
  const bgCol = CONFIG.bgColor ? CONFIG.bgColor : NUMBER_BG_COLORS[mostSigDigit] || color(0, 0, 90);
  const bgC = _Tpoint(T, 0, 0);
  const bgStroke = CONFIG.bgStrokeColor ? _cssColor(CONFIG.bgStrokeColor) : null;
  out += _svgCircle(bgC[0], bgC[1], _Tlen(T, outerR), _cssColor(bgCol), bgStroke, _Tlen(T, outerR * CONFIG.outerStrokeRatio));

  const portionAngle = (Math.PI * 2) / 10;
  for (let i = numRings - 1; i >= 0; i--) {
    const digit = digits[i];
    if (digit === 0) continue;
    const r1 = i === 0 ? 0 : bdry[i - 1];
    const r2 = bdry[i];
    const tier = TIER_NAMES[i % 3];
    const t = NUMBER_COLORS[digit][tier];
    const col = color(t.H, t.S, t.B);
    if (isNegative) {
      out += _svgAnnularWedge(T, 0, 0, r1, r2, -Math.PI / 2, -Math.PI / 2 + digit * portionAngle, col, true, outerR);
    } else {
      for (let p = 0; p < digit; p++) {
        out += _svgAnnularWedge(T, 0, 0, r1, r2, -Math.PI / 2 + p * portionAngle, -Math.PI / 2 + (p + 1) * portionAngle, col, false, outerR);
      }
    }
  }

  for (let i = 0; i < numRings; i++) {
    const r1 = i === 0 ? 0 : bdry[i - 1];
    if (CONFIG.ringStyle === "outline") out += _svgRingOutline(T, bdry[i], outerR);
    else out += _svgTicks(T, bdry[i], bdry[i] - r1, outerR);
  }

  if (decimalCount > 0) out += _svgDecimalRing(T, bdry[decimalCount - 1] + outerR * CONFIG.decimalMarginRatio, outerR);

  return groupOpacity < 1 ? `<g opacity="${_n(groupOpacity)}">${out}</g>` : out;
}

// ═══════════════════════════════════════════════════════════════════════════
// BELTS — mirrors addition-system.js's drawBelt/drawBeltToSquare/
// drawBeltSquareToSquare. Arcs are sampled into a polyline (via _arcPoints)
// instead of emitting a true SVG elliptical-arc command — avoids ever having
// to work out SVG's sweep/large-arc flags, at the cost of a (very fine)
// polygon rather than a mathematically exact arc.
// ═══════════════════════════════════════════════════════════════════════════
const _BELT_ARC_STEPS = 48;

function _beltStrokeWidth(R1, R2) {
  return Math.min(CONFIG.beltStrokeMax ?? Infinity, Math.max(0.4, Math.max(R1, R2) * CONFIG.beltStrokeRatio));
}

function _svgBelt(T, x1, y1, R1, x2, y2, R2, resultPositive, cssColor) {
  const dx = x2 - x1, dy = y2 - y1;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= Math.abs(R1 - R2) + 0.5) return "";
  const base = Math.atan2(dy, dx);
  const alphaA = Math.asin(Math.max(-1, Math.min(1, (R1 - R2) / d)));
  const tA_top = base - Math.PI / 2 + alphaA;
  const tA_bot = base + Math.PI / 2 - alphaA;
  const tB_top = tA_top, tB_bot = tA_bot;

  const arcA = _arcPoints(x1, y1, R1, tA_top, tA_bot, true, _BELT_ARC_STEPS);
  const arcB = _arcPoints(x2, y2, R2, tB_bot, tB_top, true, _BELT_ARC_STEPS);
  const local = [...arcA, ...arcB];
  const abs = local.map(([x, y]) => _Tpoint(T, x, y));
  const sw = _Tlen(T, _beltStrokeWidth(R1, R2));
  return _svgPolygon(abs, resultPositive, cssColor, sw);
}

function _svgBeltToSquare(T, ccx, ccy, R, sqx, sqy, H, resultPositive, cssColor) {
  const dx = sqx - ccx, dy = sqy - ccy;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= Math.abs(R - H) + 0.5) return "";
  const base = Math.atan2(dy, dx);
  const alphaA = Math.asin(Math.max(-1, Math.min(1, (R - H) / d)));
  const t_top = base - Math.PI / 2 + alphaA;
  const t_bot = base + Math.PI / 2 - alphaA;

  const farX = sqx + H * Math.cos(base), farY = sqy + H * Math.sin(base);
  const edgeDx = -Math.sin(base), edgeDy = Math.cos(base);
  const edgeBot = [farX + edgeDx * H, farY + edgeDy * H];
  const edgeTop = [farX - edgeDx * H, farY - edgeDy * H];

  const arc = _arcPoints(ccx, ccy, R, t_top, t_bot, true, _BELT_ARC_STEPS);
  const local = [...arc, edgeBot, edgeTop];
  const abs = local.map(([x, y]) => _Tpoint(T, x, y));
  const sw = _Tlen(T, _beltStrokeWidth(R, H));
  return _svgPolygon(abs, resultPositive, cssColor, sw);
}

function _svgBeltSquareToSquare(T, x1, y1, H1, x2, y2, H2, resultPositive, cssColor) {
  const dx = x2 - x1, dy = y2 - y1;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d <= 0.5) return "";
  const base = Math.atan2(dy, dx);
  const edgeDx = -Math.sin(base), edgeDy = Math.cos(base);
  const far1 = [x1 - H1 * Math.cos(base), y1 - H1 * Math.sin(base)];
  const far2 = [x2 + H2 * Math.cos(base), y2 + H2 * Math.sin(base)];
  const local = [
    [far1[0] + edgeDx * H1, far1[1] + edgeDy * H1],
    [far2[0] + edgeDx * H2, far2[1] + edgeDy * H2],
    [far2[0] - edgeDx * H2, far2[1] - edgeDy * H2],
    [far1[0] - edgeDx * H1, far1[1] - edgeDy * H1],
  ];
  const abs = local.map(([x, y]) => _Tpoint(T, x, y));
  const sw = _Tlen(T, _beltStrokeWidth(H1, H2));
  return _svgPolygon(abs, resultPositive, cssColor, sw);
}

// ═══════════════════════════════════════════════════════════════════════════
// MULTIPLICATION — mirrors multiplication-system.js's band/drawMultiplication
// functions. Layout/geometry (_multGeometryCore, _placeTier, _digitBandColor)
// is reused as-is (pure math, no canvas calls) — only the actual drawing is
// re-emitted as SVG.
// ═══════════════════════════════════════════════════════════════════════════
function _svgHBand(T, x1, y, x2, bw, col, filled) {
  const hw = bw / 2;
  const local = [[x1, y - hw], [x2, y - hw], [x2, y + hw], [x1, y + hw]];
  const abs = local.map(([x, y2]) => _Tpoint(T, x, y2));
  const sw = _Tlen(T, Math.max(0.3, bw * 0.25));
  return _svgPolygon(abs, filled, _cssColor(col), sw);
}
function _svgVBand(T, x, y1, y2, bw, col, filled) {
  const hw = bw / 2;
  const local = [[x - hw, y1], [x + hw, y1], [x + hw, y2], [x - hw, y2]];
  const abs = local.map(([x2, y]) => _Tpoint(T, x2, y));
  const sw = _Tlen(T, Math.max(0.3, bw * 0.25));
  return _svgPolygon(abs, filled, _cssColor(col), sw);
}

function _svgOpHBand(T, y, tokens, cL, cR, CR, marginRatio) {
  const n = tokens.length;
  const pos = tokens.map((_, i) => [n === 1 ? (cL + cR) / 2 : cL + (i / (n - 1)) * (cR - cL), y]);
  const beltR = CR * (1 + marginRatio);
  let out = "";
  for (let i = 0; i < n - 1; i++) {
    const local = tokens[i].val * tokens[i].sign + tokens[i + 1].val * tokens[i + 1].sign;
    out += _svgBelt(T, pos[i][0], pos[i][1], beltR, pos[i + 1][0], pos[i + 1][1], beltR, local >= 0, MUL_COL.chains[i % 4]);
  }
  for (let i = 0; i < n; i++) {
    const [cx, cy] = pos[i];
    const numStr = (tokens[i].sign < 0 ? "-" : "") + String(tokens[i].val);
    const erase = _Tpoint(T, cx, cy);
    out += _svgCircle(erase[0], erase[1], _Tlen(T, CR), _cssColor(color(0, 0, 100)), null, 0);
    randomSeed(tokens[i].colorSeed);
    reshuffleColors();
    out += _svgNumber(_Ttranslate(T, cx, cy), numStr, CR);
  }
  return out;
}
function _svgOpVBand(T, x, tokens, cT, cB, CR, marginRatio) {
  const n = tokens.length;
  const pos = tokens.map((_, i) => [x, n === 1 ? (cT + cB) / 2 : cT + (i / (n - 1)) * (cB - cT)]);
  const beltR = CR * (1 + marginRatio);
  let out = "";
  for (let i = 0; i < n - 1; i++) {
    const local = tokens[i].val * tokens[i].sign + tokens[i + 1].val * tokens[i + 1].sign;
    out += _svgBelt(T, pos[i][0], pos[i][1], beltR, pos[i + 1][0], pos[i + 1][1], beltR, local >= 0, MUL_COL.chains[i % 4]);
  }
  for (let i = 0; i < n; i++) {
    const [cx, cy] = pos[i];
    const numStr = (tokens[i].sign < 0 ? "-" : "") + String(tokens[i].val);
    const erase = _Tpoint(T, cx, cy);
    out += _svgCircle(erase[0], erase[1], _Tlen(T, CR), _cssColor(color(0, 0, 100)), null, 0);
    randomSeed(tokens[i].colorSeed);
    reshuffleColors();
    out += _svgNumber(_Ttranslate(T, cx, cy), numStr, CR);
  }
  return out;
}

// Mirrors drawMultiplication(parsed, cx, cy) — cx/cy default to the canvas
// center exactly like the original (width/height are p5 globals, valid any
// time after setup()).
function _svgMultiplication(T, parsed, cx, cy) {
  if (!parsed || !MUL_COL.hCol) return "";
  const geo = _multGeometryCore(parsed);
  const {
    sideA, sideB, positive, bw, pad, lgap, dgap, oh, CR, bm,
    bandHH, bandVW, sectsA, sectsB, decSecsA, decSecsB, firstDecIdxA, firstDecIdxB,
    nSecA, nSecB, secHszArr, secVszArr, totalSecH, totalSecV, sqSize,
  } = geo;

  cx = cx ?? width / 2;
  cy = cy ?? height / 2;
  const sqL = cx - sqSize / 2, sqR = cx + sqSize / 2;
  const sqT = cy - sqSize / 2, sqB = cy + sqSize / 2;

  const extraH = Math.max(0, sqSize - totalSecH);
  const gapExtraH = nSecA > 1 ? extraH / (nSecA - 1) : 0;
  const secHstarts = [];
  let yy = sqT + (nSecA > 1 ? 0 : extraH / 2);
  for (let g = 0; g < nSecA; g++) { secHstarts.push(yy); yy += secHszArr[g] + dgap + gapExtraH; }

  const extraV = Math.max(0, sqSize - totalSecV);
  const gapExtraV = nSecB > 1 ? extraV / (nSecB - 1) : 0;
  const secVstarts = [];
  let xx = sqL + (nSecB > 1 ? 0 : extraV / 2);
  for (let g = 0; g < nSecB; g++) { secVstarts.push(xx); xx += secVszArr[g] + dgap + gapExtraV; }

  const hBandL = sqL - oh, hBandR = sqR + oh;
  const vBandT = sqT - oh, vBandB = sqB + oh;
  const cL = sqL - oh + CR + bm, cR_op = sqR + oh - CR - bm;
  const cT = sqT - oh + CR + bm, cB_op = sqB + oh - CR - bm;

  const nIntSecsA = nSecA - decSecsA.length;
  const nIntSecsB = nSecB - decSecsB.length;

  const rowGroups = [];
  for (let g = 0; g < nSecA; g++) {
    const sec = sectsA[g], count = sec.count, ys = [];
    if (count > 0) {
      const secTop = secHstarts[g], secSz = secHszArr[g];
      const maxLg = count > 1 ? Math.max(0, (secSz - count * bandHH) / (count - 1)) : 0;
      const lg = Math.min(lgap, maxLg);
      const grpH = count * bandHH + (count - 1) * lg;
      const sy = secTop + (secSz - grpH) / 2;
      for (let k = 0; k < count; k++) ys.push(sy + bandHH / 2 + k * (bandHH + lg));
    }
    rowGroups.push({ ys, isDecimal: sec.isDecimal, digit: sec.count, tier: _placeTier(g, nIntSecsA) });
  }

  const colGroups = [];
  for (let g = 0; g < nSecB; g++) {
    const sec = sectsB[g], count = sec.count, xs = [];
    if (count > 0) {
      const secLeft = secVstarts[g], secSz = secVszArr[g];
      const maxLg = count > 1 ? Math.max(0, (secSz - count * bandVW) / (count - 1)) : 0;
      const lg = Math.min(lgap, maxLg);
      const grpW = count * bandVW + (count - 1) * lg;
      const sx = secLeft + (secSz - grpW) / 2;
      for (let k = 0; k < count; k++) xs.push(sx + bandVW / 2 + k * (bandVW + lg));
    }
    colGroups.push({ xs, isDecimal: sec.isDecimal, digit: sec.count, tier: _placeTier(g, nIntSecsB) });
  }

  const dashSeg = bw * 2.5;
  const dashOn = dashSeg * CONFIG.decimalDashRatio;
  const dashOff = dashSeg * (1 - CONFIG.decimalDashRatio);

  let out = "";

  for (const grp of colGroups) {
    const vCol = _digitBandColor(grp.digit, grp.tier) || MUL_COL.vCol;
    for (const bx of grp.xs) {
      if (sideB.type === "chain") out += _svgOpVBand(T, bx, sideB.tokens, cT, cB_op, CR, pad);
      else out += _svgVBand(T, bx, vBandT, vBandB, bw, vCol, positive);
    }
  }

  for (const grp of rowGroups) {
    const hCol = _digitBandColor(grp.digit, grp.tier) || MUL_COL.hCol;
    for (const ry of grp.ys) {
      if (sideA.type === "chain") out += _svgOpHBand(T, ry, sideA.tokens, cL, cR_op, CR, pad);
      else out += _svgHBand(T, hBandL, ry, hBandR, bw, hCol, positive);
    }
  }

  if (decSecsB.length > 0) {
    const xDash = secVstarts[firstDecIdxB];
    const p1 = _Tpoint(T, xDash, vBandT), p2 = _Tpoint(T, xDash, vBandB);
    out += _svgLine(p1[0], p1[1], p2[0], p2[1], _cssColor(MUL_COL.vCol), _Tlen(T, bw), 1, [_Tlen(T, dashOn), _Tlen(T, dashOff)]);
  }
  if (decSecsA.length > 0) {
    const yDash = secHstarts[firstDecIdxA];
    const p1 = _Tpoint(T, hBandL, yDash), p2 = _Tpoint(T, hBandR, yDash);
    out += _svgLine(p1[0], p1[1], p2[0], p2[1], _cssColor(MUL_COL.hCol), _Tlen(T, bw), 1, [_Tlen(T, dashOn), _Tlen(T, dashOff)]);
  }

  if (CONFIG.showSquareOutline !== false) {
    const abs = [[sqL, sqT], [sqR, sqT], [sqR, sqB], [sqL, sqB]].map(([x, y]) => _Tpoint(T, x, y));
    out += _svgPolygon(abs, false, "rgb(0,0,0)", _Tlen(T, 1));
  }

  randomSeed();
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// OPERATIONS CHAIN — mirrors play.js's _drawChainNodes. Recurses into a
// nested chain term exactly like the canvas version's push()/scale()/pop().
// Reality-driven shape/text crossfade is skipped: the export always draws
// shapes at full opacity and never draws the (raster-only) reality labels.
// ═══════════════════════════════════════════════════════════════════════════
function _svgChainNodes(T, nodes, belts, data) {
  let out = "";

  for (let i = 0; i < belts.length; i++) {
    const belt = belts[i];
    const cA = nodes[i], cB = nodes[i + 1];
    const RA = cA.r * (1 + CONFIG_OPERATIONS.beltMarginRatio);
    const RB = cB.r * (1 + CONFIG_OPERATIONS.beltMarginRatio);
    if (cA.kind === "mult" && cB.kind === "mult") {
      out += _svgBeltSquareToSquare(T, cA.x, cA.y, RA, cB.x, cB.y, RB, belt.resultPositive, belt.cssColor);
    } else if (cA.kind === "mult") {
      out += _svgBeltToSquare(T, cB.x, cB.y, RB, cA.x, cA.y, RA, belt.resultPositive, belt.cssColor);
    } else if (cB.kind === "mult") {
      out += _svgBeltToSquare(T, cA.x, cA.y, RA, cB.x, cB.y, RB, belt.resultPositive, belt.cssColor);
    } else {
      out += _svgBelt(T, cA.x, cA.y, RA, cB.x, cB.y, RB, belt.resultPositive, belt.cssColor);
    }
  }

  for (let i = 0; i < nodes.length; i++) {
    const circle = nodes[i];

    if (circle.kind === "chain") {
      const Tn = _Tscale(_Ttranslate(T, circle.x, circle.y), circle.chainScale);
      out += _svgChainNodes(Tn, circle.nestedLayout.nodes, circle.nestedLayout.belts, circle.nestedData);
      continue;
    }

    if (circle.kind === "mult") {
      const eraseHalf = circle.r;
      const erase = _Tpoint(T, circle.x, circle.y);
      out += _svgCircle(erase[0], erase[1], _Tlen(T, eraseHalf), _cssColor(CONFIG_OPERATIONS.bgColor), null, 0);

      const Tn = _Tscale(_Ttranslate(T, circle.x, circle.y), circle.squareScale);
      const prevConfig = CONFIG;
      CONFIG = _embeddedMultConfig();
      const lastIdx = circle.steps.length - 1;
      for (let s = 0; s < circle.steps.length; s++) {
        const cs = circle.colorSets[s];
        MUL_COL.hCol = cs.hCol;
        MUL_COL.vCol = cs.vCol;
        MUL_COL.chains = cs.chains;
        const step = circle.steps[s];
        const effStep = s === lastIdx && circle.sign < 0 ? { ...step, result: -step.result } : step;
        const off = circle.stepOffsets[s];
        out += _svgMultiplication(_Ttranslate(Tn, off.ox, off.oy), effStep, 0, 0);
      }
      CONFIG = prevConfig;
      continue;
    }

    randomSeed(circle.colorSeed);
    reshuffleColors();
    const erase = _Tpoint(T, circle.x, circle.y);
    out += _svgCircle(erase[0], erase[1], _Tlen(T, circle.r), _cssColor(color(0, 0, 100)), null, 0);
    const Tn = _Trotate(_Ttranslate(T, circle.x, circle.y), data.angles[i]);
    out += _svgNumber(Tn, circle.numStr, circle.r);
  }

  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// TOP-LEVEL — one function per mode, matching draw()'s per-mode branch
// (minus bokeh/grain/reality — see file header), then the public entry
// point that picks the right one and triggers the download.
// ═══════════════════════════════════════════════════════════════════════════
function _svgTopLevelTransform() {
  return _Tscale(_Ttranslate(_T0(), _panX, _panY), _zoom);
}

function _buildNumbersSVG() {
  const T0 = _svgTopLevelTransform();
  let out = "";
  for (let i = 0; i < composition.length; i++) {
    const item = composition[i];
    const data = compositionData[i];
    randomSeed(item.colorSeed);
    reshuffleColors();
    const T = _Trotate(_Ttranslate(T0, item.x, item.y), data.angle);
    out += _svgNumber(T, item.numStr, item.r);
  }
  randomSeed();
  return out;
}

function _buildOperationsSVG() {
  const T0 = _svgTopLevelTransform();
  let out = "";
  for (let c = 0; c < chains.length; c++) {
    out += _svgChainNodes(T0, chains[c].circles, chains[c].belts, chainData[c]);
  }
  randomSeed();
  return out;
}

function _buildMultiplicationSVG() {
  const T0 = _svgTopLevelTransform();
  let out = "";
  if (parsedSteps) {
    for (let i = 0; i < parsedSteps.length; i++) {
      const off = _stepOffsets[i] || { ox: 0, oy: 0, half: 0 };
      const cs = _stepColorSets[i] || _stepColorSets[0];
      if (cs) {
        MUL_COL.hCol = cs.hCol;
        MUL_COL.vCol = cs.vCol;
        MUL_COL.chains = cs.chains;
      }
      out += _svgMultiplication(_Ttranslate(T0, off.ox, off.oy), parsedSteps[i]);
    }
  }
  return out;
}

// Triggers a browser download of `content` as a file — SVG export has no
// p5 helper like saveCanvas(), so this builds the Blob + <a download> by hand.
function _downloadText(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportSVG() {
  let body;
  if (activeMode === "numbers") body = _buildNumbersSVG();
  else if (activeMode === "operations") body = _buildOperationsSVG();
  else body = _buildMultiplicationSVG();

  const bg = `<rect x="0" y="0" width="${width}" height="${height}" fill="${canvasBgHex}"/>`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}">${bg}${body}</svg>`;

  const ts =
    year() + nf(month(), 2) + nf(day(), 2) + "-" + nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2);
  _downloadText(svg, "visual-" + activeMode + "-" + ts + ".svg", "image/svg+xml");
}
