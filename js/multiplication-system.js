// multiplication-system.js — visual multiplication drawing + layout engine
// Depends on: p5.js, number-system.js (SWATCHES, PAL, reshuffleColors, drawNumber)
//             addition-system.js (drawBelt)

// ─── color globals ────────────────────────────────────────────────────────────
// hCol / vCol : p5 color objects used with fill() / stroke()
// chains      : CSS "rgb(r,g,b)" strings used by drawBelt()
const MUL_COL = {
  hCol:   null,
  vCol:   null,
  chains: ['rgb(180,180,180)', 'rgb(180,180,180)', 'rgb(180,180,180)', 'rgb(180,180,180)'],
};

function _p5ToCss(col) {
  return `rgb(${floor(red(col))},${floor(green(col))},${floor(blue(col))})`;
}

// Shuffles band + belt colors from SWATCHES.
// Also re-seeds any op-chain circles so Space gives a fully fresh look.
function mulShuffleColors(parsed) {
  if (!SWATCHES || !SWATCHES.length) return;
  const pool = shuffle(SWATCHES.slice());
  MUL_COL.hCol   = pool[0].col;
  MUL_COL.vCol   = pool[1 % pool.length].col;
  MUL_COL.chains = [2, 3, 4, 5].map(i => _p5ToCss(pool[i % pool.length].col));

  if (parsed) {
    for (const side of [parsed.sideA, parsed.sideB]) {
      if (side && side.tokens) {
        side.tokens.forEach(t => { t.colorSeed = floor(random(999983)); });
      }
    }
  }
}

// ─── expression parser ────────────────────────────────────────────────────────
// Accepts:  14x15 · (2+4-8)x15 · 14.2x3.6 · -14x(9-2) · (2+3)x(4+5) · etc.
// Returns { sideA, sideB, result } or null on failure.
function parseMultExpr(raw) {
  const str = raw.replace(/\s/g, '').toLowerCase()
                 .replace(/−/g, '-').replace(/×/g, 'x').replace(/\*/g, 'x');

  // Find the × that is NOT inside parentheses
  let depth = 0, splitIdx = -1;
  for (let i = 0; i < str.length; i++) {
    if      (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    else if (str[i] === 'x' && depth === 0) { splitIdx = i; break; }
  }
  if (splitIdx === -1) return null;

  const rawA = str.slice(0, splitIdx);
  const rawB = str.slice(splitIdx + 1);

  // Build a 'simple' side object from a plain number (possibly decimal, negative)
  function makeSimple(v) {
    const absV  = Math.abs(v);
    const s     = String(absV);
    const dot   = s.indexOf('.');
    const intD  = (dot === -1 ? s : s.slice(0, dot)).split('').map(Number);
    const decD  = dot === -1 ? [] : s.slice(dot + 1).split('').map(Number);
    return { type: 'simple', value: v, intDigits: intD, decDigits: decD, negative: v < 0 };
  }

  // Build a 'chain' side object from an inner string like "2+8-15" or "-3+5"
  function parseChainSide(inner) {
    const matches = [...inner.matchAll(/([+\-]?\d+(?:\.\d+)?)/g)];
    if (matches.length < 2) return null;
    const tokens = matches.map(m => {
      const r    = m[1];
      const sign = r.startsWith('-') ? -1 : 1;
      const val  = Math.abs(parseFloat(r));
      return { val, sign, colorSeed: Math.floor(Math.random() * 999983) };
    });
    const value     = tokens.reduce((acc, t, i) => i === 0 ? t.val * t.sign : acc + t.val * t.sign, 0);
    const absResult = Math.abs(Math.round(value));
    const d         = String(absResult).split('').map(Number);
    const digits    = d.length === 1 ? [0, d[0]] : d;
    return { type: 'chain', value, tokens, digits, negative: value < 0 };
  }

  function parseSide(s) {
    if (s.startsWith('(') && s.endsWith(')')) {
      const inner = s.slice(1, -1);
      // Single number in parentheses → simple (e.g. (-15) or (5))
      if (/^-?\d+(?:\.\d+)?$/.test(inner)) return makeSimple(parseFloat(inner));
      const ch = parseChainSide(inner);
      // A chain that resolved to 1 token → simple
      if (ch && ch.tokens.length === 1) return makeSimple(ch.value);
      return ch;
    }
    const v = parseFloat(s);
    if (!isNaN(v)) return makeSimple(v);
    return null;
  }

  const sideA = parseSide(rawA);
  const sideB = parseSide(rawB);
  if (!sideA || !sideB) return null;

  return {
    sideA,
    sideB,
    result: Math.round(sideA.value * sideB.value * 1e10) / 1e10,
  };
}

// Extends parseMultExpr to handle chains: a×b×c×d
// Returns array of {sideA, sideB, result} steps (1 element for a simple a×b).
// Returns null on parse failure.
function parseMultChain(raw) {
  const str = raw.replace(/\s/g, '').toLowerCase()
                 .replace(/−/g, '-').replace(/×/g, 'x').replace(/\*/g, 'x');

  // Split at top-level 'x' characters into operand parts
  const parts = [];
  let depth = 0, last = 0;
  for (let i = 0; i < str.length; i++) {
    if      (str[i] === '(') depth++;
    else if (str[i] === ')') depth--;
    else if (str[i] === 'x' && depth === 0) { parts.push(str.slice(last, i)); last = i + 1; }
  }
  parts.push(str.slice(last));
  if (parts.length < 2) return null;

  // First step: parts[0] × parts[1]
  const first = parseMultExpr(parts[0] + 'x' + parts[1]);
  if (!first) return null;
  const steps = [first];

  // Each subsequent step: result_prev × parts[k]
  for (let k = 2; k < parts.length; k++) {
    const prev = steps[steps.length - 1].result;
    const next = parseMultExpr(String(prev) + 'x' + parts[k]);
    if (!next) return null;
    steps.push(next);
  }
  return steps;
}

// ─── private drawing helpers ──────────────────────────────────────────────────

// Horizontal rectangle band spanning x1→x2 centered on y
function _drawHBand(x1, y, x2, bw, col, filled) {
  push(); blendMode(BLEND); rectMode(CORNERS);
  if (filled) { fill(col); noStroke(); }
  else        { noFill(); stroke(col); strokeWeight(Math.max(1.5, bw * 0.1)); }
  rect(x1, y - bw / 2, x2, y + bw / 2, 0);
  pop();
}

// Vertical rectangle band spanning y1→y2 centered on x
function _drawVBand(x, y1, y2, bw, col, filled) {
  push(); blendMode(BLEND); rectMode(CORNERS);
  if (filled) { fill(col); noStroke(); }
  else        { noFill(); stroke(col); strokeWeight(Math.max(1.5, bw * 0.1)); }
  rect(x - bw / 2, y1, x + bw / 2, y2, 0);
  pop();
}

// One horizontal op-chain band at y, circles evenly from cL to cR
function _drawOpHBand(y, tokens, cL, cR, CR, pad) {
  const n   = tokens.length;
  const pos = tokens.map((_, i) => [
    n === 1 ? (cL + cR) / 2 : cL + (i / (n - 1)) * (cR - cL),
    y,
  ]);

  // Pass 1 — belts (behind circles)
  for (let i = 0; i < n - 1; i++) {
    const local = tokens[i].val * tokens[i].sign + tokens[i + 1].val * tokens[i + 1].sign;
    drawBelt(pos[i][0], pos[i][1], CR + pad,
             pos[i+1][0], pos[i+1][1], CR + pad,
             local >= 0, MUL_COL.chains[i % 4]);
  }

  // Pass 2 — circles (in front of belts)
  for (let i = 0; i < n; i++) {
    const [cx, cy] = pos[i];
    const numStr   = (tokens[i].sign < 0 ? '-' : '') + String(tokens[i].val);
    // Erase belt colour behind the circle
    push(); noStroke(); fill(0, 0, 100); ellipse(cx, cy, CR * 2, CR * 2); pop();
    // Draw number circle
    randomSeed(tokens[i].colorSeed);
    reshuffleColors();
    push(); translate(cx, cy); drawNumber(numStr, 0, 0, CR); pop();
  }
}

// One vertical op-chain band at x, circles evenly from cT to cB
function _drawOpVBand(x, tokens, cT, cB, CR, pad) {
  const n   = tokens.length;
  const pos = tokens.map((_, i) => [
    x,
    n === 1 ? (cT + cB) / 2 : cT + (i / (n - 1)) * (cB - cT),
  ]);

  // Pass 1 — belts
  for (let i = 0; i < n - 1; i++) {
    const local = tokens[i].val * tokens[i].sign + tokens[i + 1].val * tokens[i + 1].sign;
    drawBelt(pos[i][0], pos[i][1], CR + pad,
             pos[i+1][0], pos[i+1][1], CR + pad,
             local >= 0, MUL_COL.chains[i % 4]);
  }

  // Pass 2 — circles
  for (let i = 0; i < n; i++) {
    const [cx, cy] = pos[i];
    const numStr   = (tokens[i].sign < 0 ? '-' : '') + String(tokens[i].val);
    push(); noStroke(); fill(0, 0, 100); ellipse(cx, cy, CR * 2, CR * 2); pop();
    randomSeed(tokens[i].colorSeed);
    reshuffleColors();
    push(); translate(cx, cy); drawNumber(numStr, 0, 0, CR); pop();
  }
}

// ─── main draw ────────────────────────────────────────────────────────────────
function drawMultiplication(parsed) {
  if (!parsed || !MUL_COL.hCol) return;

  const { sideA, sideB, result } = parsed;
  const positive = result >= 0;
  const { bw, obw, pad, lgap, dgap, oh, decExt } = CONFIG;
  // CR is decoupled from band thickness: circleScale lets circles be smaller than the band
  const CR = (obw / 2) * CONFIG.circleScale;
  // bandMargin insets the circle span from the band edges
  const bm = CONFIG.bandMargin;

  // Band thickness depends on whether the side is a chain or a simple number
  const bandHH = sideA.type === 'chain' ? obw : bw;
  const bandVW = sideB.type === 'chain' ? obw : bw;

  // ── Build sections for each operand ────────────────────────────────────────
  function buildSections(side) {
    if (side.type === 'chain') {
      // Chain: use the digit decomposition of abs(round(result)), padded to ≥2
      const d = side.digits;
      return (d.length === 1 ? [0, d[0]] : d).map(c => ({ count: c, isDecimal: false }));
    }
    // Simple: integer digits inside square, decimal digits extend outside
    const intPad = side.intDigits.length === 1 ? [0, side.intDigits[0]] : side.intDigits;
    const secs   = intPad.map(c => ({ count: c, isDecimal: false }));
    (side.decDigits || []).forEach(c => secs.push({ count: c, isDecimal: true }));
    return secs;
  }

  const sectsA  = buildSections(sideA);
  const sectsB  = buildSections(sideB);
  const intSecsA = sectsA.filter(s => !s.isDecimal);
  const intSecsB = sectsB.filter(s => !s.isDecimal);
  const decSecsA = sectsA.filter(s =>  s.isDecimal);
  const decSecsB = sectsB.filter(s =>  s.isDecimal);
  const nIntA   = intSecsA.length;
  const nIntB   = intSecsB.length;

  // ── Section sizing ──────────────────────────────────────────────────────────
  // sectionSize = count × bandThickness + (count−1) × lineGap + thickness × 0.5
  const secSzH = sec => { const n = Math.max(1, sec.count); return n * bandHH + Math.max(0, n-1) * lgap + bandHH * 0.5; };
  const secSzV = sec => { const n = Math.max(1, sec.count); return n * bandVW + Math.max(0, n-1) * lgap + bandVW * 0.5; };

  const secHszArr = intSecsA.map(secSzH);
  const secVszArr = intSecsB.map(secSzV);

  const totalSecH = secHszArr.reduce((s, v) => s + v, 0) + Math.max(0, nIntA - 1) * dgap;
  const totalSecV = secVszArr.reduce((s, v) => s + v, 0) + Math.max(0, nIntB - 1) * dgap;

  // Square must fit all content; enforce a sane minimum so it never collapses
  const sqSize = Math.max(totalSecH, totalSecV, bandHH * 3, bandVW * 3);

  const cx = width  / 2;
  const cy = height / 2;
  const sqL = cx - sqSize / 2,  sqR = cx + sqSize / 2;
  const sqT = cy - sqSize / 2,  sqB = cy + sqSize / 2;

  // Center each axis's content inside the square
  const contentH = secHszArr.reduce((s, v) => s + v, 0) + Math.max(0, nIntA - 1) * dgap;
  const contentV = secVszArr.reduce((s, v) => s + v, 0) + Math.max(0, nIntB - 1) * dgap;

  const secHstarts = []; let yy = sqT + (sqSize - contentH) / 2;
  for (let g = 0; g < nIntA; g++) { secHstarts.push(yy); yy += secHszArr[g] + dgap; }
  const secVstarts = []; let xx = sqL + (sqSize - contentV) / 2;
  for (let g = 0; g < nIntB; g++) { secVstarts.push(xx); xx += secVszArr[g] + dgap; }

  // ── Decimal section sizes (extend outside the square) ──────────────────────
  const minDecSzH = sec => { const n = Math.max(1, sec.count); return n * bandHH + Math.max(0, n-1) * lgap + bandHH; };
  const minDecSzV = sec => { const n = Math.max(1, sec.count); return n * bandVW + Math.max(0, n-1) * lgap + bandVW; };

  const decSzA = decSecsA.length > 0 ? Math.max(...decSecsA.map(minDecSzH)) * (1 + decExt / 100) : 0;
  const decSzB = decSecsB.length > 0 ? Math.max(...decSecsB.map(minDecSzV)) * (1 + decExt / 100) : 0;

  // Extended square edges (including decimal zones)
  const sqBext = sqB + decSecsA.length * decSzA;
  const sqRext = sqR + decSecsB.length * decSzB;

  // Full band spans — equalized so both axes have the same visual length
  const hBandL = sqL - oh;
  const vBandT = sqT - oh;
  let hBandR = sqRext + oh;
  let vBandB = sqBext + oh;
  // Extend the shorter axis to match the longer one for visual balance
  const _hLen = hBandR - hBandL;
  const _vLen = vBandB - vBandT;
  if (_hLen > _vLen) { vBandB = vBandT + _hLen; }
  else if (_vLen > _hLen) { hBandR = hBandL + _vLen; }

  // Op-chain circle span: capped to integer square + overhang, inset by bandMargin
  const cL = sqL - oh + CR + bm,   cR_op = sqR + oh - CR - bm;
  const cT = sqT - oh + CR + bm,   cB_op = sqB + oh - CR - bm;

  // ── Compute Y positions for horizontal bands (operand A) ───────────────────
  const rowGroups = [];
  for (let g = 0; g < nIntA; g++) {
    const sec = intSecsA[g], count = sec.count, ys = [];
    if (count > 0) {
      const secTop = secHstarts[g], secSz = secHszArr[g];
      const maxLg  = count > 1 ? Math.max(0, (secSz - count * bandHH) / (count - 1)) : 0;
      const lg     = Math.min(lgap, maxLg);
      const grpH   = count * bandHH + (count - 1) * lg;
      const sy     = secTop + (secSz - grpH) / 2;
      for (let k = 0; k < count; k++) ys.push(sy + bandHH / 2 + k * (bandHH + lg));
    }
    rowGroups.push({ ys, isDecimal: false });
  }
  let curDecY = sqB;
  for (let g = 0; g < decSecsA.length; g++) {
    const sec = decSecsA[g], count = sec.count, ys = [];
    if (count > 0) {
      const avail = decSzA - bandHH;
      const maxLg = count > 1 ? Math.max(0, (avail - count * bandHH) / (count - 1)) : 0;
      const lg    = Math.min(lgap, maxLg);
      const grpH  = count * bandHH + (count - 1) * lg;
      const sy    = curDecY + (decSzA - grpH) / 2;
      for (let k = 0; k < count; k++) ys.push(sy + bandHH / 2 + k * (bandHH + lg));
    }
    rowGroups.push({ ys, isDecimal: true });
    curDecY += decSzA;
  }

  // ── Compute X positions for vertical bands (operand B) ─────────────────────
  const colGroups = [];
  for (let g = 0; g < nIntB; g++) {
    const sec = intSecsB[g], count = sec.count, xs = [];
    if (count > 0) {
      const secLeft = secVstarts[g], secSz = secVszArr[g];
      const maxLg   = count > 1 ? Math.max(0, (secSz - count * bandVW) / (count - 1)) : 0;
      const lg      = Math.min(lgap, maxLg);
      const grpW    = count * bandVW + (count - 1) * lg;
      const sx      = secLeft + (secSz - grpW) / 2;
      for (let k = 0; k < count; k++) xs.push(sx + bandVW / 2 + k * (bandVW + lg));
    }
    colGroups.push({ xs, isDecimal: false });
  }
  let curDecX = sqR;
  for (let g = 0; g < decSecsB.length; g++) {
    const sec = decSecsB[g], count = sec.count, xs = [];
    if (count > 0) {
      const avail = decSzB - bandVW;
      const maxLg = count > 1 ? Math.max(0, (avail - count * bandVW) / (count - 1)) : 0;
      const lg    = Math.min(lgap, maxLg);
      const grpW  = count * bandVW + (count - 1) * lg;
      const sx    = curDecX + (decSzB - grpW) / 2;
      for (let k = 0; k < count; k++) xs.push(sx + bandVW / 2 + k * (bandVW + lg));
    }
    colGroups.push({ xs, isDecimal: true });
    curDecX += decSzB;
  }

  // ── Dashed separator line parameters ───────────────────────────────────────
  const dashSeg = bw * 2.5;
  const dashOn  = dashSeg * CONFIG.decimalDashRatio;
  const dashOff = dashSeg * (1 - CONFIG.decimalDashRatio);

  // ── Drawing order: vertical bands → horizontal bands → dashes on top ────────
  // Dashes are drawn LAST so they are always visible. Drawing them after the
  // crossing bands (V dash after H bands, H dash after V bands) also gives the
  // bands a chance to visually "break" the dashes, reinforcing the effect.
  // Using lineCap='butt' prevents SQUARE-cap segment overlap (which made dashes
  // look solid when strokeCap(SQUARE) was set).

  // 1. All vertical bands (integer + decimal sections)
  for (const grp of colGroups) {
    for (const bx of grp.xs) {
      if (sideB.type === 'chain') {
        _drawOpVBand(bx, sideB.tokens, cT, cB_op, CR, pad);
      } else {
        _drawVBand(bx, vBandT, vBandB, bw, MUL_COL.vCol, positive);
      }
    }
  }

  // 2. All horizontal bands on top (integer + decimal sections)
  for (const grp of rowGroups) {
    for (const ry of grp.ys) {
      if (sideA.type === 'chain') {
        _drawOpHBand(ry, sideA.tokens, cL, cR_op, CR, pad);
      } else {
        _drawHBand(hBandL, ry, hBandR, bw, MUL_COL.hCol, positive);
      }
    }
  }

  // 3. Vertical decimal dashed line at x = sqR — drawn after H bands so they
  //    visually break the dash, and lineCap='butt' ensures clean segments
  if (decSecsB.length > 0) {
    push(); blendMode(BLEND);
    stroke(MUL_COL.vCol); strokeWeight(bw); noFill();
    drawingContext.lineCap = 'butt';
    drawingContext.setLineDash([dashOn, dashOff]);
    line(sqR, vBandT, sqR, vBandB);
    drawingContext.setLineDash([]);
    drawingContext.lineCap = 'round'; // restore p5 default
    pop();
  }

  // 4. Horizontal decimal dashed line at y = sqB — drawn after V bands
  if (decSecsA.length > 0) {
    push(); blendMode(BLEND);
    stroke(MUL_COL.hCol); strokeWeight(bw); noFill();
    drawingContext.lineCap = 'butt';
    drawingContext.setLineDash([dashOn, dashOff]);
    line(hBandL, sqB, hBandR, sqB);
    drawingContext.setLineDash([]);
    drawingContext.lineCap = 'round';
    pop();
  }

  randomSeed(); // reset p5 random state
}
