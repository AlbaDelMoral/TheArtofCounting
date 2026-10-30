// play.js — unified Play page: numbers, addition/subtraction, multiplication
// all in one canvas + one panel. One calculator drives all three: what you
// type decides which mode is shown (a plain number list → numbers, a sum →
// addition/subtraction, an "x" expression → multiplication).
// Depends on: p5.js, number-system.js, addition-system.js, multiplication-system.js

// ─── per-mode CONFIG objects ────────────────────────────────────────────────
// Each mode keeps its own settings; the shared NUMBER_REPRESENTATION slice
// (ring/tick/decimal-ring look) is identical in all three, same as before.
const CONFIG_NUMBERS = {
  numCircles: 6, // mid of the count slider's 1–10 range
  compScale: 0.5, // mid of the size slider's 0–100 range
  sizeVariation: 0.475, // mid of the spread slider's 0–95 range
  overlapFactor: 0,
  ...NUMBER_REPRESENTATION,
  bokeh: 0,
  grainAmount: 0,
  reality: 0,
};

const CONFIG_OPERATIONS = {
  numOps: 1,
  numChainNums: 4, // mid of the length slider's 2–6 range
  compScale: 0.5, // mid of the size slider's 0–100 range
  sizeVariation: 0.475, // mid of the spread slider's 0–95 range
  chainSpacing: 0.275, // mid of the spacing slider's -95–150 range
  valueSizeInfluence: 0.9,
  beltMarginRatio: 0.05, // fixed — no longer user-adjustable
  beltStrokeRatio: 0.02, // thinner than multiplication's own 0.04 — these pills get much bigger
  beltStrokeMax: 1, // px cap — ratio alone keeps growing with a bigger pill, which looked too thick at large sizes
  ...NUMBER_REPRESENTATION,
  bokeh: 0,
  grainAmount: 0,
  reality: 0,
};

const CONFIG_MULTIPLICATION = {
  bw: 5.5, // mid of the thickness slider's 1–10 range
  oh: 10, // mid of the overhang slider's 0–20 range
  lgap: 5.5, // mid of the line gap slider's 1–10 range
  dgap: 50, // mid of the digit gap slider's 0–100 range
  decExt: 45,
  obw: 10, // close to bw's default so a sum operand's band isn't wildly thicker than a digit band
  circleScale: 0.85,
  bandMargin: 0,
  beltMarginRatio: 0.05, // same fixed ratio as Addition/Subtraction
  beltStrokeRatio: 0.04,
  showSquareOutline: false,
  showChainOutline: false,
  ...NUMBER_REPRESENTATION,
  bokeh: 0,
  grainAmount: 0,
  reality: 0,
};

let activeMode = "numbers"; // 'numbers' | 'operations' | 'multiplication'
let CONFIG = CONFIG_NUMBERS; // mutable — number/addition/multiplication-system.js read this global

function setActiveMode(mode) {
  activeMode = mode;
  CONFIG =
    mode === "numbers"
      ? CONFIG_NUMBERS
      : mode === "operations"
        ? CONFIG_OPERATIONS
        : CONFIG_MULTIPLICATION;
  _syncDropdowns();
}

// ─── shared canvas state ────────────────────────────────────────────────────
let canvasBgHex = "#ffffff";
let _exportTransparent = false;

// ─── numbers-mode state ─────────────────────────────────────────────────────
let compositionData = [];
let composition = [];
let customNums = [];

function generateCompositionData() {
  const nums = customNums.length > 0 ? customNums : null;
  const count = nums ? nums.length : CONFIG_NUMBERS.numCircles;
  compositionData = [];
  for (let i = 0; i < count; i++) {
    compositionData.push({
      sizeT: random(1),
      numStr: nums ? nums[i] : randomNum(),
      colorSeed: floor(random(999983)),
      angle: random(TWO_PI),
      rotationSpeed: (random() < 0.5 ? -1 : 1) * random(0.003, 0.018),
      fontIdx: floor(random(FONTS.length)),
    });
  }
  computeNumbersPositions();
}

function computeNumbersPositions(allowOverflow = false) {
  composition = [];
  const n = compositionData.length;
  if (n === 0) return;

  const { areaX, areaY, areaW, areaH } = getPanelArea();
  const m = min(areaW, areaH);
  const radii = compositionData.map((d) => {
    const lo = Math.max(0.01, CONFIG_NUMBERS.compScale * (1 - CONFIG_NUMBERS.sizeVariation));
    const hi = CONFIG_NUMBERS.compScale * (1 + CONFIG_NUMBERS.sizeVariation);
    return lerp(lo, hi, d.sizeT) * m;
  });

  const xs0 = [radii[0]];
  for (let i = 1; i < n; i++)
    xs0.push(xs0[i - 1] + (radii[i - 1] + radii[i]) * (1 - CONFIG_NUMBERS.overlapFactor));
  const totalW0 = xs0[n - 1] + radii[n - 1];
  const maxR0 = Math.max(...radii);

  const scaleW = totalW0 > areaW ? areaW / totalW0 : 1;
  const scaleH = maxR0 * 2 > areaH ? areaH / (maxR0 * 2) : 1;
  const scale = allowOverflow ? 1 : Math.min(scaleW, scaleH, 1);

  const scaledR = radii.map((r) => r * scale);
  const xs = [scaledR[0]];
  for (let i = 1; i < n; i++)
    xs.push(xs[i - 1] + (scaledR[i - 1] + scaledR[i]) * (1 - CONFIG_NUMBERS.overlapFactor));
  const totalW = xs[n - 1] + scaledR[n - 1];

  const ox = areaX + (areaW - totalW) / 2;
  const cy = areaY + areaH / 2;

  for (let i = 0; i < n; i++) {
    composition.push({
      x: ox + xs[i],
      y: cy,
      r: scaledR[i],
      numStr: compositionData[i].numStr,
      colorSeed: compositionData[i].colorSeed,
    });
  }
}

function reshuffleNumbersColors() {
  compositionData.forEach((d, i) => {
    d.colorSeed = Math.floor(Math.random() * 999983);
    if (composition[i]) composition[i].colorSeed = d.colorSeed;
  });
  const keys = Object.keys(NUMBER_BG_COLORS);
  const vals = keys.map((k) => NUMBER_BG_COLORS[k]);
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  keys.forEach((k, i) => {
    NUMBER_BG_COLORS[k] = vals[i];
  });
}

// ─── operations-mode state ──────────────────────────────────────────────────
let chainData = [];
let chains = [];
let customOps = [];

// Random (non-custom) chains are always plain numbers — only a typed
// expression can contain a multiplication term — so wrap each randomNum()
// string in the same { kind:'num', ... } shape parseChainsWithMult produces,
// and everything downstream can treat both sources identically.
function _makeNumTerm(str) {
  const value = parseFloat(str);
  return { kind: "num", sign: value < 0 ? -1 : 1, value, str: String(Math.abs(value)) };
}

// CONFIG used to size/draw a multiplication embedded as an addition operand
// — same as the live CONFIG_MULTIPLICATION (so slider changes still apply)
// except no overhang, for now: the overhang is tuned for multiplication
// mode's own full-canvas chain and reads as too much extra space once the
// whole thing is also shrunk down to sit inside a belt.
function _embeddedMultConfig() {
  return { ...CONFIG_MULTIPLICATION, oh: 0 };
}

// Colors for one embedded multiplication term — same per-step shuffle
// _shuffleAllSteps does for multiplication mode's own chain, just returned
// instead of written into the global _stepColorSets/MUL_COL (this term isn't
// necessarily the active multiplication-mode chain). One color set per step,
// since a chain like "8x9x5" draws one square per step.
function _makeMultColorSets(steps) {
  return steps.map((step) => {
    const pool = shuffle(SWATCHES.slice());
    const colorSet = {
      hCol: pool[0].col,
      vCol: pool[1 % pool.length].col,
      chains: [2, 3, 4, 5].map((j) => _p5ToCss(pool[j % pool.length].col)),
    };
    for (const side of [step.sideA, step.sideB]) {
      if (side && side.tokens) {
        side.tokens.forEach((t) => {
          t.colorSeed = floor(random(999983));
        });
      }
    }
    return colorSet;
  });
}

// Builds the { terms, sizeTs, colorSeeds, ... } data bundle a chain's own
// layout/draw step needs, from a plain array of parsed terms — recursing
// into any 'chain' term's own nested terms (a parenthesized chain used AS
// an operand of another chain, e.g. "(3x4) + (5+6)"), so a nested chain gets
// exactly the same stable per-circle randomness (sizeT, colorSeed, rotation)
// a top-level chain does, prepared once rather than re-rolled every frame.
function _prepareTermsData(terms) {
  const n = terms.length;
  const preparedTerms = terms.map((t) => {
    if (t.kind === "mult") return { ...t, colorSets: _makeMultColorSets(t.steps) };
    if (t.kind === "chain") return { ...t, nested: _prepareTermsData(t.terms) };
    return t;
  });

  const mags = preparedTerms.map((t) => Math.log10(Math.abs(t.value) + 1));
  const maxM = Math.max(...mags, 0.001);
  const sizeTs = mags.map((m) => {
    const magT = m / maxM;
    const rndT = random(1);
    return lerp(rndT, magT, CONFIG_OPERATIONS.valueSizeInfluence);
  });

  return {
    terms: preparedTerms,
    sizeTs,
    colorSeeds: Array.from({ length: n }, () => floor(random(999983))),
    beltColorSeeds: Array.from({ length: n - 1 }, () => floor(random(999983))),
    angles: Array.from({ length: n }, () => random(TWO_PI)),
    rotSpeeds: Array.from(
      { length: n },
      () => (random() < 0.5 ? -1 : 1) * random(0.003, 0.018),
    ),
    fontIdxs: Array.from({ length: n }, () => floor(random(FONTS.length))),
  };
}

function generateChainData() {
  const parsed = customOps.length > 0 ? customOps : null;
  const count = parsed ? parsed.length : CONFIG_OPERATIONS.numOps;
  chainData = [];

  for (let c = 0; c < count; c++) {
    const terms = parsed
      ? parsed[c]
      : Array.from({ length: CONFIG_OPERATIONS.numChainNums }, () => _makeNumTerm(randomNum()));
    chainData.push(_prepareTermsData(terms));
  }
  computeOperationsPositions();
}

// Lays out one chain's own nodes + belts in LOCAL coordinates, centered on
// (0,0) along both axes — reusable for a top-level chain row (shifted into
// panel space by the caller afterward, below) and for a nested chain term —
// a parenthesized chain used AS one operand of another chain, e.g.
// "(3x4) + (5+6)" — laid out exactly the same way but unconstrained
// (fitW/fitH = Infinity), so it always comes out at its own natural size
// instead of being squeezed to fit anywhere.
function _layoutChainTerms(data, m, fitW, fitH) {
  const terms = data.terms;
  const n = terms.length;

  // Scaled down so the "size" slider's useful range reaches further (~0.8)
  // before the auto-fit-to-area clamp below caps it, instead of saturating
  // almost immediately (~0.2) like a 1:1 mapping did.
  const SIZE_SCALE = 0.2;
  const effScale = CONFIG_OPERATIONS.compScale * SIZE_SCALE;
  const lo = Math.max(0.01, effScale * (1 - CONFIG_OPERATIONS.sizeVariation));
  const hi = effScale * (1 + CONFIG_OPERATIONS.sizeVariation);

  const radii = data.sizeTs.map((t) => lerp(lo, hi, t) * m);

  // When the chain has a multiplication term, every OTHER operand — plain
  // numbers and nested chains alike — matches ITS size instead of its own
  // magnitude/natural layout, so the imaginary square and everything around
  // it read as one consistent band (same height throughout), instead of
  // being disproportionately sized next to it. A nested chain's own
  // circles/belts still lay out independently below; it's the WHOLE nested
  // pill that then gets uniformly rescaled to match (chainScale) — same
  // principle as a multiplication's squareScale.
  const multIdx = terms.findIndex((t) => t.kind === "mult");
  if (multIdx !== -1) {
    for (let i = 0; i < n; i++) if (i !== multIdx) radii[i] = radii[multIdx];
  }

  // Minimum breathing room between adjacent operands, regardless of how
  // different their sizes are — chainSpacing alone is a % of (r1+r2), so
  // two very differently-sized shapes (e.g. a small nested chain next to a
  // big multiplication square) could otherwise end up nearly touching.
  const MIN_GAP = m * 0.04;
  const gapAt = (r1, r2, minGap) => Math.max((r1 + r2) * CONFIG_OPERATIONS.chainSpacing, minGap);

  const xs0 = [radii[0]];
  for (let i = 1; i < n; i++)
    xs0.push(xs0[i - 1] + radii[i - 1] + radii[i] + gapAt(radii[i - 1], radii[i], MIN_GAP));
  const totalW0 = xs0[n - 1] + radii[n - 1];
  const maxR0 = Math.max(...radii);

  const scaleW = totalW0 > fitW ? fitW / totalW0 : 1;
  const scaleH = maxR0 * 2 > fitH ? fitH / (maxR0 * 2) : 1;
  const scale = Math.min(scaleW, scaleH, 1);

  const scaledR = radii.map((r) => r * scale);
  const xs = [scaledR[0]];
  for (let i = 1; i < n; i++)
    xs.push(xs[i - 1] + scaledR[i - 1] + scaledR[i] + gapAt(scaledR[i - 1], scaledR[i], MIN_GAP * scale));
  const totalW = xs[n - 1] + scaledR[n - 1];
  const lx0 = -totalW / 2; // local coords, centered on 0

  const nodes = terms.map((term, i) => {
    const node = {
      x: lx0 + xs[i],
      y: 0,
      r: scaledR[i],
      kind: term.kind,
      colorSeed: data.colorSeeds[i],
      fontIdx: data.fontIdxs[i],
    };
    if (term.kind === "mult") {
      node.sign = term.sign;
      node.steps = term.steps;
      node.colorSets = term.colorSets;
      node.exprStr = term.exprStr;
      // How much to scale the whole chain's own CONFIG_MULTIPLICATION
      // staircase geometry so its FULL visible extent — bounding square
      // (always a true square, see _computeStepOffsets) + overhang, the
      // actual band tips, not just the bare bounding square — lands on
      // node.r. That mirrors how a plain circle's own radius already
      // equals node.r: both shapes fill the same footprint, so the belt
      // (sized from node.r too, same as any normal circle-circle belt)
      // wraps BOTH with the same proportional margin instead of one of
      // them sitting flush against the belt's wall (_multGeometryCore
      // reads the generic CONFIG pointer directly, so it must be pointed
      // at CONFIG_MULTIPLICATION for this call, not CONFIG_OPERATIONS).
      const prevConfig = CONFIG;
      const embeddedConfig = _embeddedMultConfig();
      CONFIG = embeddedConfig;
      const { offsets, half: naturalHalf } = _computeStepOffsets(term.steps);
      const naturalFull = naturalHalf + embeddedConfig.oh;
      CONFIG = prevConfig;
      node.stepOffsets = offsets;
      // Shrunk by ringMarginRatio first — the same margin a plain number's
      // ring leaves against its own bg circle edge — so the multiplication
      // squares don't sit flush against the belt wall either.
      const targetFull = node.r * (1 - CONFIG_OPERATIONS.ringMarginRatio);
      node.squareScale = naturalFull > 0 ? targetFull / naturalFull : 1;
    } else if (term.kind === "chain") {
      // Lay out the nested chain at its own natural size first (uncon-
      // strained — fitW/fitH = Infinity — so its circles are never squeezed
      // to fit anywhere), then uniformly rescale the WHOLE nested pill so
      // its own half-width lands on node.r — same principle as a
      // multiplication's squareScale (Part 15.3): every top-level operand
      // ends up filling the identical footprint, so the outer belt wraps
      // all of them with the same margin instead of one sitting tiny next
      // to the others. The nested circles' own PROPORTIONS to each other
      // are preserved; only the pill's overall scale changes.
      const nestedLayout = _layoutChainTerms(term.nested, m, Infinity, Infinity);
      node.nestedLayout = nestedLayout;
      node.nestedData = term.nested;
      node.chainScale = nestedLayout.halfW > 0 ? node.r / nestedLayout.halfW : 1;
    } else {
      node.numStr = (term.value < 0 ? "-" : "") + term.str;
    }
    return node;
  });

  const lightSwatches = SWATCHES.filter((s) => s.type === "light");
  const basePool = lightSwatches.length > 0 ? lightSwatches : SWATCHES;
  const belts = [];

  for (let i = 0; i < n - 1; i++) {
    const valA = terms[i].value;
    const valB = terms[i + 1].value;
    const outerA = getOuterCss(data.colorSeeds[i]);
    const outerB = getOuterCss(data.colorSeeds[i + 1]);
    const excluded = new Set([outerA, outerB]);
    const available = basePool.filter((s) => {
      const key = `${floor(red(s.col))},${floor(green(s.col))},${floor(blue(s.col))}`;
      return !excluded.has(key);
    });
    const pickPool = available.length > 0 ? available : basePool;

    randomSeed(data.beltColorSeeds[i]);
    const swatchCol = pickPool[floor(random(pickPool.length))].col;
    belts.push({
      cssColor: `rgb(${floor(red(swatchCol))},${floor(green(swatchCol))},${floor(blue(swatchCol))})`,
      resultPositive: valA + valB >= 0,
    });
  }
  randomSeed();

  // node.r for each top-level shape is already its own full half-extent
  // (circle radius / square's full visible half / nested pill's own
  // halfW), so the chain's own bounding half-width/half-height for ITS
  // parent (if this call is itself building a nested chain) is just that.
  return { nodes, belts, halfW: totalW / 2, halfH: maxR0 * scale };
}

function computeOperationsPositions() {
  chains = [];
  const nChains = chainData.length;
  if (nChains === 0) return;

  const { areaX, areaY, areaW, areaH } = getPanelArea();
  const m = min(areaW, areaH);
  const rowH = areaH / nChains;

  for (let c = 0; c < nChains; c++) {
    const data = chainData[c];
    const cy = areaY + rowH * (c + 0.5);
    const { nodes, belts } = _layoutChainTerms(data, m, areaW, rowH);
    const cx = areaX + areaW / 2;
    for (const node of nodes) {
      node.x += cx;
      node.y += cy;
    }
    chains.push({ circles: nodes, belts });
  }
}

// Recurses into every 'chain' term's own nested terms too, so a nested
// chain's colors reshuffle right along with the rest of the page.
function _reshuffleTermsData(data) {
  data.colorSeeds = data.colorSeeds.map(() => Math.floor(Math.random() * 999983));
  data.beltColorSeeds = data.beltColorSeeds.map(() => Math.floor(Math.random() * 999983));
  data.terms.forEach((t) => {
    if (t.kind === "mult") t.colorSets = _makeMultColorSets(t.steps);
    else if (t.kind === "chain") _reshuffleTermsData(t.nested);
  });
}

function reshuffleOperationsColors() {
  chainData.forEach(_reshuffleTermsData);
  computeOperationsPositions();
}

// Draws one chain's belts + nodes at the current transform origin —
// reusable for the top-level operations chain and, recursively, for a
// nested chain term (a parenthesized chain used as another chain's own
// operand, e.g. the "(5+6)" in "(3x4) + (5+6)"), which just translates to
// its own node's position and calls back into this same function.
// `data` is the prepared-data object (angles/rotSpeeds/fontIdxs) parallel
// to `nodes` — chainData[c] at the top level, node.nestedData when nested.
function _drawChainNodes(nodes, belts, data, shapeAlpha, textAlpha) {
  for (let i = 0; i < data.angles.length; i++) data.angles[i] += data.rotSpeeds[i];

  blendMode(BLEND);
  drawingContext.globalAlpha = shapeAlpha;
  for (let i = 0; i < belts.length; i++) {
    const belt = belts[i];
    const cA = nodes[i];
    const cB = nodes[i + 1];
    // Same r for both sides regardless of kind — every node's r is already
    // its own FULL visible extent (circle radius / square's full visible
    // half, see squareScale / nested pill's own halfW), so this produces
    // one uniform-width belt (no taper) that wraps any pair of shapes with
    // the same margin: flat where a square is involved, round otherwise.
    const RA = cA.r * (1 + CONFIG_OPERATIONS.beltMarginRatio);
    const RB = cB.r * (1 + CONFIG_OPERATIONS.beltMarginRatio);
    if (cA.kind === "mult" && cB.kind === "mult") {
      drawBeltSquareToSquare(cA.x, cA.y, RA, cB.x, cB.y, RB, belt.resultPositive, belt.cssColor);
    } else if (cA.kind === "mult") {
      drawBeltToSquare(cB.x, cB.y, RB, cA.x, cA.y, RA, belt.resultPositive, belt.cssColor);
    } else if (cB.kind === "mult") {
      drawBeltToSquare(cA.x, cA.y, RA, cB.x, cB.y, RB, belt.resultPositive, belt.cssColor);
    } else {
      // circle-circle OR circle-chain OR chain-chain — a nested chain has
      // no flat edge of its own, so it's wrapped exactly like a circle.
      drawBelt(cA.x, cA.y, RA, cB.x, cB.y, RB, belt.resultPositive, belt.cssColor);
    }
  }

  drawingContext.globalAlpha = 1;
  for (let i = 0; i < nodes.length; i++) {
    const circle = nodes[i];
    const f = FONTS[data.fontIdxs[i]];

    if (circle.kind === "chain") {
      // No erase/backdrop here on purpose — the outer belt's own color is
      // meant to still show as margin around this nested pill (see the
      // reference image), not be fully covered the way a mult square's
      // gaps need to be. scale(chainScale) uniformly resizes the whole
      // nested pill (all its r-based math is in the nested chain's own
      // local units) to match node.r, same as a multiplication square's
      // own scale(squareScale).
      push();
      translate(circle.x, circle.y);
      scale(circle.chainScale);
      _drawChainNodes(circle.nestedLayout.nodes, circle.nestedLayout.belts, circle.nestedData, shapeAlpha, textAlpha);
      pop();
      continue;
    }

    if (circle.kind === "mult") {
      // circle.r is the square's FULL visible extent (core + overhang,
      // see squareScale) — big enough to fully erase any belt color
      // behind it before the square's own bands are drawn on top.
      const eraseHalf = circle.r;
      const prevConfig = CONFIG;

      if (shapeAlpha > 0) {
        push();
        noStroke();
        // drawMultiplication never paints its own background — unlike a
        // number circle, whose gaps end up CONFIG.bgColor because
        // drawNumber paints that over this same erase step. Painting it
        // here directly keeps the square's gaps the same grey instead of
        // staying this erase fill's own color (previously plain white).
        fill(CONFIG_OPERATIONS.bgColor[0], CONFIG_OPERATIONS.bgColor[1], CONFIG_OPERATIONS.bgColor[2]);
        rectMode(CENTER);
        rect(circle.x, circle.y, eraseHalf * 2, eraseHalf * 2);
        pop();

        push();
        translate(circle.x, circle.y);
        scale(circle.squareScale);
        drawingContext.globalAlpha = shapeAlpha;
        CONFIG = _embeddedMultConfig();
        const lastIdx = circle.steps.length - 1;
        for (let s = 0; s < circle.steps.length; s++) {
          const cs = circle.colorSets[s];
          MUL_COL.hCol = cs.hCol;
          MUL_COL.vCol = cs.vCol;
          MUL_COL.chains = cs.chains;
          // sign only ever flips the LAST step's fill (filled vs
          // outlined) — that's the step whose result is the value this
          // term actually contributes to the addition chain. Earlier
          // steps keep their own natural sign, same as multiplication
          // mode would render them.
          const step = circle.steps[s];
          const effStep = (s === lastIdx && circle.sign < 0)
            ? { ...step, result: -step.result }
            : step;
          const off = circle.stepOffsets[s];
          push();
          translate(off.ox, off.oy);
          drawMultiplication(effStep, 0, 0);
          pop();
        }
        CONFIG = prevConfig;
        pop();
      }

      if (textAlpha > 0) {
        push();
        translate(circle.x, circle.y);
        const fs = Math.round(circle.r * 0.5);
        drawingContext.globalAlpha = textAlpha;
        drawingContext.font = `${f.style} ${f.weight} ${fs}px ${f.family}, sans-serif`;
        drawingContext.textAlign = "center";
        drawingContext.textBaseline = "middle";
        drawingContext.fillStyle = "#111111";
        const lastResult = circle.steps[circle.steps.length - 1].result;
        const shownResult = circle.sign < 0 ? -lastResult : lastResult;
        const label = (circle.sign < 0 ? "-(" : "") + circle.exprStr + (circle.sign < 0 ? ")" : "") + " = " + shownResult;
        drawingContext.fillText(label, 0, 0);
        pop();
      }
      continue;
    }

    randomSeed(circle.colorSeed);
    reshuffleColors();

    if (shapeAlpha > 0) {
      push();
      noStroke();
      fill(0, 0, 100);
      ellipse(circle.x, circle.y, circle.r * 2, circle.r * 2);
      pop();

      push();
      translate(circle.x, circle.y);
      rotate(data.angles[i]);
      drawingContext.globalAlpha = shapeAlpha;
      drawNumber(circle.numStr, 0, 0, circle.r);
      pop();
    }

    if (textAlpha > 0) {
      push();
      translate(circle.x, circle.y);
      rotate(data.angles[i]);
      const fs = Math.round(circle.r * 0.65);
      drawingContext.globalAlpha = textAlpha;
      drawingContext.font = `${f.style} ${f.weight} ${fs}px ${f.family}, sans-serif`;
      drawingContext.textAlign = "center";
      drawingContext.textBaseline = "middle";
      drawingContext.fillStyle = "#111111";
      drawingContext.fillText(circle.numStr, 0, 0);
      pop();
    }
  }
}

// ─── multiplication-mode state ──────────────────────────────────────────────
let parsedSteps = null;
let currentExpr = "14x15";
let _stepOffsets = [];
let _stepColorSets = [];

function _shuffleAllSteps(steps) {
  if (!steps || !steps.length) return;
  _stepColorSets = [];
  for (let i = 0; i < steps.length; i++) {
    const pool = shuffle(SWATCHES.slice());
    _stepColorSets.push({
      hCol: pool[0].col,
      vCol: pool[1 % pool.length].col,
      chains: [2, 3, 4, 5].map((j) => _p5ToCss(pool[j % pool.length].col)),
    });
    for (const side of [steps[i].sideA, steps[i].sideB]) {
      if (side && side.tokens) {
        side.tokens.forEach((t) => {
          t.colorSeed = floor(random(999983));
        });
      }
    }
  }
  if (_stepColorSets.length) {
    MUL_COL.hCol = _stepColorSets[0].hCol;
    MUL_COL.vCol = _stepColorSets[0].vCol;
    MUL_COL.chains = _stepColorSets[0].chains;
  }
}

function _randomMultExpr() {
  // Kept small so results don't balloon into dozens of digits: 2-4 operands,
  // mostly single/double digit values, occasionally a bit bigger.
  const n = floor(random(2, 5));
  const parts = [];
  for (let i = 0; i < n; i++) {
    const tier = random();
    let val;
    if (tier < 0.6) val = floor(random(2, 10));
    else if (tier < 0.9) val = floor(random(10, 30));
    else val = floor(random(30, 60));
    if (random() < 0.15) val = val + round(random(1, 9)) / 10;
    if (random() < 0.2) val = -val;
    parts.push(val);
  }
  return parts.join("x");
}

// Pure version of the staircase layout — no global state, so it can also be
// used to measure/draw a multiplication chain embedded as an addition
// operand (CONFIG must already be CONFIG_MULTIPLICATION when this runs,
// same requirement as _multSquareSize). Returns { offsets, half }: offsets
// is one { ox, oy, half } per step (centered on the whole chain's bounding
// box), half is that bounding box's own half-size — always a true square,
// since x and y accumulate the exact same increments at every step.
function _computeStepOffsets(steps) {
  if (!steps || !steps.length) return { offsets: [], half: 0 };

  const offsets = [];
  let cx = 0, cy = 0;
  let prevHalf = 0;
  for (let i = 0; i < steps.length; i++) {
    const half = _multSquareSize(steps[i]) / 2;
    if (i > 0) {
      cx += prevHalf + half;
      cy += prevHalf + half;
    }
    offsets.push({ ox: cx, oy: cy, half });
    prevHalf = half;
  }

  const first = offsets[0];
  const last = offsets[offsets.length - 1];
  const midX = (first.ox - first.half + last.ox + last.half) / 2;
  const midY = (first.oy - first.half + last.oy + last.half) / 2;
  for (const o of offsets) {
    o.ox -= midX;
    o.oy -= midY;
  }
  const bboxHalf = (last.ox + last.half - (first.ox - first.half)) / 2;
  return { offsets, half: bboxHalf };
}

function _computeOffsets(steps) {
  _stepOffsets = _computeStepOffsets(steps).offsets;
}

// Run on every multiplication slider (thickness, digit gap, line gap,
// overhang) change — these sliders are now reachable from "operations" mode
// too (whenever the current chain embeds a multiplication), not just from
// multiplication mode itself.
function _onMultGeometryChange() {
  // _computeOffsets reads the generic CONFIG pointer, so it must be pointed
  // at CONFIG_MULTIPLICATION regardless of which mode is actually active —
  // without this, adjusting a slider while viewing an operations chain would
  // compute multiplication-mode's OWN _stepOffsets against CONFIG_OPERATIONS
  // (missing bw/obw/lgap/dgap/oh entirely), corrupting it for when the user
  // switches back to multiplication mode.
  const prevConfig = CONFIG;
  CONFIG = CONFIG_MULTIPLICATION;
  _computeOffsets(parsedSteps);
  CONFIG = prevConfig;
  // The embedded square's own size/layout is cached at chain-generation
  // time (squareScale, stepOffsets) — recompute it so it always adapts to
  // the multiplication variables currently in effect, rather than staying
  // stuck with whatever they were when the chain was typed.
  if (activeMode === "operations") computeOperationsPositions();
}

// Formats one side of a multiplication step for the per-square reality
// label — a plain value for a simple operand, or the reconstructed
// expression (e.g. "6+2-8") for a parenthesized chain operand.
function _fmtMultSide(side) {
  if (!side) return "";
  if (side.type === "chain") {
    return (
      "(" +
      side.tokens
        .map((t, i) => (i === 0 ? (t.sign < 0 ? "-" : "") : t.sign < 0 ? "-" : "+") + t.val)
        .join("") +
      ")"
    );
  }
  return String(side.value);
}

function applyMultiplication(raw) {
  const res = parseMultChain(raw);
  if (!res) return false;
  // Switch CONFIG to CONFIG_MULTIPLICATION before any geometry below reads
  // it — multiplication-system.js's _multGeometryCore reads the shared
  // mutable CONFIG pointer directly. Switching only after this function
  // returns (as applyInput() used to) meant the very first switch into
  // multiplication mode from another mode computed geometry against the
  // PREVIOUS mode's CONFIG (missing bw/obw/lgap/dgap/... entirely).
  setActiveMode("multiplication");
  parsedSteps = res;
  currentExpr = raw.trim();
  _shuffleAllSteps(parsedSteps);
  _computeOffsets(parsedSteps);
  _fitMultiplicationView();
  return true;
}

// Zooms/pans so the whole chain's bounding square sits centered inside the
// canvas, regardless of how big or small it ended up (random chains can
// range from tiny to huge). _computeOffsets() already centers the chain's
// bounding box on offset-space (0,0), i.e. on the canvas center, so we only
// need to scale around that same center point.
function _fitMultiplicationView() {
  if (!_stepOffsets.length) {
    _zoom = 1;
    _panX = 0;
    _panY = 0;
    return;
  }
  const first = _stepOffsets[0];
  const last = _stepOffsets[_stepOffsets.length - 1];
  const bboxW = last.ox + last.half - (first.ox - first.half);
  const bboxH = last.oy + last.half - (first.oy - first.half);
  const pad = 60;
  const availW = Math.max(50, width - pad * 2);
  const availH = Math.max(50, height - pad * 2);
  _zoom = constrain(Math.min(availW / bboxW, availH / bboxH), 0.02, 2.5);
  _panX = (width / 2) * (1 - _zoom);
  _panY = (height / 2) * (1 - _zoom);
}

// ─── pan / zoom (multiplication mode only) ─────────────────────────────────
let _zoom = 1.0;
let _panX = 0;
let _panY = 0;
let _dragging = false;
let _lastMX = 0;
let _lastMY = 0;

function _overUI() {
  // mouseX/mouseY are canvas-relative; the canvas is now offset from the
  // viewport's origin (it starts at column 3), so convert to viewport
  // coordinates before asking the DOM what's at that point.
  const rect = _canvasEl.elt.getBoundingClientRect();
  const el = document.elementFromPoint(mouseX + rect.left, mouseY + rect.top);
  return el && el.tagName !== "CANVAS";
}

// ─── input-mode detection ───────────────────────────────────────────────────
// Decides what the typed string means: an "x"/"×" → multiplication, a "+"/"-"
// sitting between two numbers → addition/subtraction, otherwise → a plain
// number list.
function _detectMode(str) {
  const s = str.trim();
  if (!s) return null;
  const compact = s.replace(/[\s,]/g, "");
  // Depth-aware: a × nested inside parens — "(3x4)+5" — doesn't make the
  // whole expression a multiplication; what's at the TOP level decides.
  // That lets a multiplication live as one operand of an addition chain
  // (applyOperations below renders it as the actual square, not a circle).
  let depth = 0, topX = false, topPM = false;
  for (let i = 0; i < compact.length; i++) {
    const c = compact[i];
    if      (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0) {
      if (/[x×*]/i.test(c)) topX = true;
      else if ((c === "+" || c === "-" || c === "−") && i > 0) topPM = true;
    }
  }
  if (topX) return "multiplication";
  if (topPM && /\d/.test(compact)) return "operations";
  return "numbers";
}

// ─── panel ───────────────────────────────────────────────────────────────────
let display; // shared calculator display element
const valSpans = {};
let _dropdowns = {}; // mode -> { wrapper, content }

// +/− glyph reflects actual expanded state: open AND not manually collapsed
// → "−" (click to close); anything else (closed, or open but disabled-grey
// for an inactive mode) → "+" (click to open).
function _updateDropdownArrow(wrapperElt) {
  const expanded =
    wrapperElt.classList.contains("panel-dropdown--open") &&
    !wrapperElt.classList.contains("panel-dropdown--collapsed");
  wrapperElt._arrowEl.textContent = expanded ? "−" : "+";
}

function createPanel() {
  const panel = createDiv("").class("side-panel");

  // ── intro copy — sits above the calculator, explains what this page is ──────
  createP(
    "The Art of Counting turns numbers into shape and color — digits become rings, chains become belts, multiplications become bands. Type an expression below, or hit random, to see it drawn and make it your own.",
  )
    .class("panel-intro")
    .parent(panel);

  // ── calculator section (shared across all three modes) ──────────────────────
  // Same accordion shell as Numbers/Operations/Multiplication, but not
  // mode-tied — it's how the mode even gets picked in the first place — so
  // it's forced permanently open/clickable instead of going through
  // _dropdowns/_syncDropdowns (which only ever greys out the inactive mode
  // dropdowns).
  const { wrapper: calcWrapper, content: calcContent } = _buildDropdownShell("Calculator");
  calcWrapper.elt.classList.add("panel-dropdown--open");
  _updateDropdownArrow(calcWrapper.elt);
  const customSection = createDiv("").class("custom-section calculator");
  customSection.parent(calcContent);

  display = createElement("input").class("calc-display");
  display.attribute("type", "text");
  display.attribute("placeholder", "3, 5, 6  ·  2 + 3  ·  2 × 4");
  display.attribute("spellcheck", "false");
  display.parent(customSection);

  function applyInput() {
    const raw = display.value();
    const mode = _detectMode(raw);
    if (!mode) return;

    if (mode === "multiplication") {
      if (!applyMultiplication(raw)) return; // switches to multiplication mode internally
    } else if (mode === "operations") {
      const parsed = parseChainsWithMult(raw);
      if (!parsed.length) return;
      customOps = parsed;
      generateChainData();
      setActiveMode("operations");
    } else {
      const tokens = raw
        .trim()
        .split(/[\s,]+/)
        .filter((t) => /^-?\d+(\.\d+)?$/.test(t));
      customNums = tokens;
      generateCompositionData();
      setActiveMode("numbers");
    }
    redraw();
  }

  function clearInput() {
    if (activeMode === "numbers") {
      display.value("");
      customNums = [];
      generateCompositionData();
    } else if (activeMode === "operations") {
      display.value("");
      customOps = [];
      generateChainData();
      _syncDropdowns(); // clears any mult term, so Multiplication may need to close again
    } else {
      display.value("14x15");
      applyMultiplication("14x15");
    }
    redraw();
  }

  function backspaceInput() {
    display.value(display.value().slice(0, -1));
  }

  function randomAction() {
    if (activeMode === "numbers") {
      customNums = [];
      generateCompositionData();
      display.value("");
    } else if (activeMode === "operations") {
      customOps = [];
      generateChainData();
      _syncDropdowns(); // random chains never include a mult term
      display.value("");
    } else {
      const expr = _randomMultExpr();
      display.value(expr);
      applyMultiplication(expr);
    }
    redraw();
  }

  display.elt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyInput();
    if (e.key === "Escape") clearInput();
    e.stopPropagation();
  });

  // digit row — colored to match each digit's palette2.csv ring color
  const digitRow = createDiv("").class("calc-digit-row");
  digitRow.parent(customSection);
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 0].forEach((d) => {
    const btn = createElement("button", String(d)).class("calc-digit-btn");
    btn.parent(digitRow);
    const tier = NUMBER_COLORS[d] && NUMBER_COLORS[d]["10-100"];
    const hex = tier ? color(tier.H, tier.S, tier.B).toString("#rrggbb") : "#606369";
    btn.elt.style.setProperty("--calc-digit-color", hex);
    btn.mousePressed(() => display.value(display.value() + d));
  });

  // operator grid
  const opGrid = createDiv("").class("calc-op-grid");
  opGrid.parent(customSection);
  const opButtons = [
    { label: "(", insert: "(" },
    { label: ")", insert: ")" },
    { label: "⌫", action: backspaceInput },
    { label: "×", insert: " × " },
    { label: "/", insert: " / " },
    { label: ",", insert: ", " },
    { label: "+", insert: " + " },
    { label: "−", insert: " - " },
    { label: ".", insert: "." },
  ];
  opButtons.forEach(({ label, insert, action }) => {
    const btn = createElement("button", label).class("calc-btn");
    btn.parent(opGrid);
    btn.mousePressed(() => (action ? action() : display.value(display.value() + insert)));
  });

  const clearEqualsRow = createDiv("").class("calc-row");
  clearEqualsRow.parent(customSection);

  const clearBtn = createElement("button", "clear").class("calc-btn calc-clear-btn");
  clearBtn.parent(clearEqualsRow);
  clearBtn.mousePressed(() => clearInput());

  const equalsBtn = createElement("button", "=").class("calc-btn calc-equals-btn");
  equalsBtn.parent(clearEqualsRow);
  equalsBtn.mousePressed(() => applyInput());

  const randomBtn = createElement("button", "random").class("calc-btn calc-random-btn");
  randomBtn.parent(customSection);
  randomBtn.mousePressed(() => randomAction());

  // ── shared row/section builders ──────────────────────────────────────────────
  function addRow(container, key, label, mn, mx, val, step, onInput) {
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
      updateValues();
      redraw();
    });
    return sl;
  }

  function addColorRow(container, label, defaultHex, onChange) {
    const row = createDiv("").class("color-row");
    row.parent(container);
    createSpan(label).class("slider-label").parent(row);
    const swatch = createElement("input");
    swatch.attribute("type", "color");
    swatch.attribute("value", defaultHex);
    swatch.class("color-swatch");
    swatch.parent(row);
    swatch.input(() => onChange(swatch.value()));
  }

  // ── shared accordion shell — same markup/classes for every dropdown,
  // whether it's mode-tied (Numbers/Operations/Multiplication) or always-on
  // (Calculator) ────────────────────────────────────────────────────────────
  function _buildDropdownShell(title) {
    const wrapper = createDiv("").class("panel-dropdown");
    wrapper.parent(panel);

    const toggle = createDiv("").class("panel-section panel-dropdown-toggle");
    toggle.parent(wrapper);
    createSpan(title).class("panel-section-title").parent(toggle);
    const arrow = createSpan("+").class("panel-dropdown-arrow").parent(toggle);
    wrapper.elt._arrowEl = arrow.elt;
    toggle.elt.addEventListener("click", () => {
      if (wrapper.elt.classList.contains("panel-dropdown--open")) {
        wrapper.elt.classList.toggle("panel-dropdown--collapsed");
        _updateDropdownArrow(wrapper.elt);
      }
    });

    const contentOuter = createDiv("").class("panel-dropdown-content");
    contentOuter.parent(wrapper);
    const content = createDiv("").class("panel-dropdown-content-inner");
    content.parent(contentOuter);

    return { wrapper, content };
  }

  // ── collapsible "Technical variables" dropdown, one per mode ─────────────────
  // Which mode's dropdown is active is decided entirely by what the
  // calculator input resolves to (_detectMode → setActiveMode); the other
  // two stay greyed out and un-clickable (see
  // .panel-dropdown:not(.panel-dropdown--open) in panel.css). The active
  // one can still be clicked to collapse/expand its own sliders.
  function addDropdown(mode, title) {
    const { wrapper, content } = _buildDropdownShell(title);
    _dropdowns[mode] = { wrapper, content };
    return content;
  }

  const numbersContent = addDropdown("numbers", "Numbers");
  const sliderCount = addRow(
    numbersContent,
    "count",
    "count",
    1,
    10,
    CONFIG_NUMBERS.numCircles,
    1,
    (v) => {
      CONFIG_NUMBERS.numCircles = int(v);
      generateCompositionData();
    },
  );
  const sliderNumSize = addRow(
    numbersContent,
    "numSize",
    "size",
    0,
    100,
    CONFIG_NUMBERS.compScale * 100,
    1,
    (v) => {
      CONFIG_NUMBERS.compScale = v / 100;
      computeNumbersPositions(true);
    },
  );
  const sliderNumSpread = addRow(
    numbersContent,
    "numSpread",
    "spread",
    0,
    95,
    CONFIG_NUMBERS.sizeVariation * 100,
    1,
    (v) => {
      CONFIG_NUMBERS.sizeVariation = v / 100;
      computeNumbersPositions();
    },
  );

  const opsContent = addDropdown("operations", "Addition and Subtraction");
  addRow(opsContent, "length", "length", 2, 6, CONFIG_OPERATIONS.numChainNums, 1, (v) => {
    CONFIG_OPERATIONS.numChainNums = int(v);
    generateChainData();
  });
  addRow(opsContent, "opSize", "size", 0, 100, CONFIG_OPERATIONS.compScale * 100, 1, (v) => {
    CONFIG_OPERATIONS.compScale = v / 100;
    computeOperationsPositions();
  });
  addRow(
    opsContent,
    "opSpread",
    "spread",
    0,
    95,
    CONFIG_OPERATIONS.sizeVariation * 100,
    1,
    (v) => {
      CONFIG_OPERATIONS.sizeVariation = v / 100;
      computeOperationsPositions();
    },
  );
  addRow(
    opsContent,
    "spacing",
    "spacing",
    -95,
    150,
    CONFIG_OPERATIONS.chainSpacing * 100,
    1,
    (v) => {
      CONFIG_OPERATIONS.chainSpacing = v / 100;
      computeOperationsPositions();
    },
  );
  const multContent = addDropdown("multiplication", "Multiplication");
  // obw (the addition/subtraction op-chain's own band thickness) stays
  // proportional to bw, so the "thickness" slider also scales the
  // addition/subtraction bands whenever a parenthesized chain is a
  // multiplication operand.
  const OBW_RATIO = CONFIG_MULTIPLICATION.obw / CONFIG_MULTIPLICATION.bw;
  addRow(multContent, "bw", "thickness", 1, 10, CONFIG_MULTIPLICATION.bw, 0.1, (v) => {
    CONFIG_MULTIPLICATION.bw = v;
    CONFIG_MULTIPLICATION.obw = v * OBW_RATIO;
    _onMultGeometryChange();
  });
  addRow(multContent, "dgap", "digit gap", 0, 100, CONFIG_MULTIPLICATION.dgap, 1, (v) => {
    CONFIG_MULTIPLICATION.dgap = v;
    _onMultGeometryChange();
  });
  addRow(multContent, "lgap", "line gap", 1, 10, CONFIG_MULTIPLICATION.lgap, 0.1, (v) => {
    CONFIG_MULTIPLICATION.lgap = v;
    _onMultGeometryChange();
  });
  addRow(multContent, "oh", "overhang", 0, 20, CONFIG_MULTIPLICATION.oh, 1, (v) => {
    CONFIG_MULTIPLICATION.oh = v;
    _onMultGeometryChange();
  });

  // ── Artistic variables — shared across all three modes ───────────────────────
  const artSection = createDiv("").class("panel-section");
  artSection.parent(panel);
  createSpan("Artistic variables").class("panel-section-title").parent(artSection);

  addColorRow(panel, "background", canvasBgHex, (hex) => {
    canvasBgHex = hex;
  });
  const sliderBokeh = addRow(panel, "bokeh", "bokeh", 0, 30, CONFIG_NUMBERS.bokeh, 1, (v) => {
    CONFIG_NUMBERS.bokeh = int(v);
    CONFIG_OPERATIONS.bokeh = int(v);
    CONFIG_MULTIPLICATION.bokeh = int(v);
  });
  const sliderGrain = addRow(
    panel,
    "grain",
    "grain",
    0,
    100,
    CONFIG_NUMBERS.grainAmount,
    1,
    (v) => {
      CONFIG_NUMBERS.grainAmount = int(v);
      CONFIG_OPERATIONS.grainAmount = int(v);
      CONFIG_MULTIPLICATION.grainAmount = int(v);
    },
  );
  const sliderReality = addRow(
    panel,
    "reality",
    "reality",
    0,
    100,
    CONFIG_NUMBERS.reality,
    1,
    (v) => {
      CONFIG_NUMBERS.reality = int(v);
      CONFIG_OPERATIONS.reality = int(v);
      CONFIG_MULTIPLICATION.reality = int(v);
    },
  );

  const exportBtn = createElement("button", "export").class(
    "calc-btn calc-random-btn panel-export-btn",
  );
  exportBtn.parent(panel);
  exportBtn.mousePressed(() => saveHQ(false));

  updateValues();
  _syncDropdowns();
}

// true if any term — at any nesting depth, including inside a nested
// 'chain' term's own operands — is a multiplication.
function _termsHaveMult(terms) {
  return terms.some((t) => t.kind === "mult" || (t.kind === "chain" && _termsHaveMult(t.terms)));
}

// Keeps the dropdown open/closed state in sync with activeMode (accordion:
// only the active mode's sliders are expanded) — except Multiplication also
// opens alongside Operations when the current chain embeds a multiplication
// term, since its sliders (thickness, digit gap, ...) directly affect that
// embedded square's own geometry too.
function _syncDropdowns() {
  const opsHasMult = activeMode === "operations" && customOps.some(_termsHaveMult);
  for (const mode in _dropdowns) {
    const isOpen = mode === activeMode || (mode === "multiplication" && opsHasMult);
    const wrapperElt = _dropdowns[mode].wrapper.elt;
    wrapperElt.classList.toggle("panel-dropdown--open", isOpen);
    // switching into a mode always expands it, even if the user had
    // collapsed it manually before switching away
    if (isOpen) wrapperElt.classList.remove("panel-dropdown--collapsed");
    _updateDropdownArrow(wrapperElt);
  }
}

function updateValues() {
  if (valSpans.count) valSpans.count.html(CONFIG_NUMBERS.numCircles);
  if (valSpans.numSize) valSpans.numSize.html(nf(CONFIG_NUMBERS.compScale, 1, 2));
  if (valSpans.numSpread) valSpans.numSpread.html(nf(CONFIG_NUMBERS.sizeVariation, 1, 2));

  if (valSpans.length) valSpans.length.html(CONFIG_OPERATIONS.numChainNums);
  if (valSpans.opSize) valSpans.opSize.html(nf(CONFIG_OPERATIONS.compScale, 1, 2));
  if (valSpans.opSpread) valSpans.opSpread.html(nf(CONFIG_OPERATIONS.sizeVariation, 1, 2));
  if (valSpans.spacing) valSpans.spacing.html(nf(CONFIG_OPERATIONS.chainSpacing, 1, 2));

  if (valSpans.bw) valSpans.bw.html(nf(CONFIG_MULTIPLICATION.bw, 1, 1) + "px");
  if (valSpans.dgap) valSpans.dgap.html(CONFIG_MULTIPLICATION.dgap + "px");
  if (valSpans.lgap) valSpans.lgap.html(nf(CONFIG_MULTIPLICATION.lgap, 1, 1) + "px");
  if (valSpans.oh) valSpans.oh.html(CONFIG_MULTIPLICATION.oh + "px");

  if (valSpans.bokeh) valSpans.bokeh.html(CONFIG_NUMBERS.bokeh + "px");
  if (valSpans.grain) valSpans.grain.html(CONFIG_NUMBERS.grainAmount);
  if (valSpans.reality) valSpans.reality.html(CONFIG_NUMBERS.reality);
}

// ─── canvas region — confined to columns 3 through the right margin ───────
// The slider panel occupies columns 1–2 (through their trailing gap); the
// visualization canvas is hard-limited to column 3 onward, so nothing drawn
// or panned can ever appear to the left of it. Reads the grid's own CSS vars
// (same ones panel.css / grid-overlay.css use) via a throwaway measuring div.
function _gridPx(varName) {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed; width:var(${varName}); visibility:hidden;`;
  document.body.appendChild(el);
  const w = el.getBoundingClientRect().width;
  el.remove();
  return w;
}

function _getCanvasRegion() {
  // Below panel.css's mobile breakpoint, the side panel becomes a bottom
  // sheet instead of a left column — nothing reserves columns 1–2 anymore,
  // so the canvas should use the full viewport width there, and its height
  // is shrunk by the actual rendered panel height so the composition sits
  // entirely above the sheet instead of being half-hidden behind it.
  if (window.innerWidth <= 768) {
    const panelEl = document.querySelector(".side-panel");
    const panelH = panelEl ? panelEl.getBoundingClientRect().height : 0;
    // panel.css caps the sheet at 50vh, so this normally never kicks in —
    // kept as a hard floor so the canvas can never drop below half the
    // screen even if the panel somehow renders taller (e.g. a very short
    // landscape viewport where its own min-height exceeds 50vh).
    const h = Math.max(window.innerHeight - panelH, window.innerHeight * 0.5);
    return { x: 0, y: 0, w: window.innerWidth, h };
  }
  const marginX = _gridPx("--grid-margin-x");
  const colWidth = _gridPx("--grid-col-width");
  const gap = _gridPx("--grid-gap");
  const col3Left = marginX + 2 * (colWidth + gap); // left edge of column 3
  const x = col3Left;
  const w = Math.max(100, window.innerWidth - marginX - col3Left);
  return { x, y: 0, w, h: window.innerHeight };
}

let _canvasEl; // the p5.Element wrapping our <canvas>, kept positioned to the region above

function _applyCanvasRegion() {
  const region = _getCanvasRegion();
  resizeCanvas(region.w, region.h);
  _canvasEl.position(region.x, region.y, "fixed");
  return region;
}

// ─── p5 lifecycle ───────────────────────────────────────────────────────────
function setup() {
  const region = _getCanvasRegion();
  _canvasEl = createCanvas(region.w, region.h);
  _canvasEl.position(region.x, region.y, "fixed");
  buildPalette();
  createPanel();
  // On mobile, _getCanvasRegion() shrinks canvas height by the panel's own
  // rendered height — but the panel didn't exist in the DOM yet when the
  // region above was first measured, so redo it now that createPanel() has
  // actually added it (before generateGrain(), which sizes its texture off
  // the canvas's current width/height).
  _applyCanvasRegion();
  generateGrain();
  generateCompositionData(); // default: numbers mode, random composition
  loop();
}

function draw() {
  blendMode(BLEND);
  if (_exportTransparent) {
    drawingContext.clearRect(0, 0, width, height);
  } else {
    drawingContext.fillStyle = canvasBgHex;
    drawingContext.fillRect(0, 0, width, height);
  }

  if (activeMode === "numbers") {
    for (let i = 0; i < composition.length; i++) {
      const item = composition[i];
      const data = compositionData[i];
      data.angle += data.rotationSpeed;

      randomSeed(item.colorSeed);
      reshuffleColors();
      const f = FONTS[data.fontIdx];

      push();
      translate(item.x, item.y);
      rotate(data.angle);

      const _r = CONFIG_NUMBERS.reality;
      drawingContext.globalAlpha = _r < 50 ? 1 : 1 - (_r - 50) / 50;
      drawNumber(item.numStr, 0, 0, item.r);

      if (CONFIG_NUMBERS.reality > 0) {
        const fontSize = Math.round(item.r * 0.65);
        drawingContext.globalAlpha = _r > 50 ? 1 : _r / 50;
        drawingContext.font = `${f.style} ${f.weight} ${fontSize}px ${f.family}, sans-serif`;
        drawingContext.textAlign = "center";
        drawingContext.textBaseline = "middle";
        drawingContext.fillStyle = "#111111";
        drawingContext.fillText(item.numStr, 0, 0);
      }

      drawingContext.globalAlpha = 1;
      pop();
    }
    randomSeed();
  } else if (activeMode === "operations") {
    for (let c = 0; c < chains.length; c++) {
      const chain = chains[c];
      const data = chainData[c];
      // Same piecewise crossfade as Numbers: the shape stays fully opaque
      // until the halfway point, then fades out; the text ramps in up to
      // the halfway point, then stays fully opaque — so at exactly 50 both
      // are shown at full opacity, instead of both sitting at 50%.
      const _rOps = CONFIG_OPERATIONS.reality;
      const shapeAlpha = _rOps < 50 ? 1 : 1 - (_rOps - 50) / 50;
      const textAlpha = _rOps > 50 ? 1 : _rOps / 50;
      _drawChainNodes(chain.circles, chain.belts, data, shapeAlpha, textAlpha);
    }
    randomSeed();
  } else if (activeMode === "multiplication") {
    // Same piecewise crossfade as Numbers — see the Operations branch above.
    const _rMul = CONFIG_MULTIPLICATION.reality;
    const shapeAlpha = _rMul < 50 ? 1 : 1 - (_rMul - 50) / 50;
    const textAlpha = _rMul > 50 ? 1 : _rMul / 50;

    push();
    translate(_panX, _panY);
    scale(_zoom);
    if (parsedSteps) {
      for (let i = 0; i < parsedSteps.length; i++) {
        const off = _stepOffsets[i] || { ox: 0, oy: 0, half: 0 };
        const cs = _stepColorSets[i] || _stepColorSets[0];
        if (cs) {
          MUL_COL.hCol = cs.hCol;
          MUL_COL.vCol = cs.vCol;
          MUL_COL.chains = cs.chains;
        }
        push();
        translate(off.ox, off.oy);
        drawingContext.globalAlpha = shapeAlpha;
        drawMultiplication(parsedSteps[i]);

        // Reality text for THIS step only, centered in THIS step's own
        // square — not one combined label in the middle of the canvas.
        if (textAlpha > 0) {
          const step = parsedSteps[i];
          const label = _fmtMultSide(step.sideA) + " × " + _fmtMultSide(step.sideB) + " = " + step.result;
          const fontSize = constrain(off.half * 0.36, 8, 80);
          drawingContext.globalAlpha = textAlpha;
          drawingContext.font = `900 normal ${fontSize}px KMRWaldenburg, sans-serif`;
          drawingContext.textAlign = "center";
          drawingContext.textBaseline = "middle";
          drawingContext.fillStyle = "#111111";
          drawingContext.fillText(label, width / 2, height / 2);
        }
        pop();
      }

      if (CONFIG_MULTIPLICATION.showChainOutline !== false && _stepOffsets.length) {
        const first = _stepOffsets[0];
        const last = _stepOffsets[_stepOffsets.length - 1];
        const left = width / 2 + first.ox - first.half;
        const top = height / 2 + first.oy - first.half;
        const right = width / 2 + last.ox + last.half;
        const bottom = height / 2 + last.oy + last.half;
        push();
        noFill();
        stroke(0, 100, 90);
        strokeWeight(1.5);
        rectMode(CORNERS);
        rect(left, top, right, bottom);
        pop();
      }
    }
    pop();
    drawingContext.globalAlpha = 1;

    if (parsedSteps && parsedSteps.length) {
      push();
      fill(0, 0, 55);
      noStroke();
      textSize(11);
      textAlign(CENTER);
      text(
        currentExpr + "  =  " + parsedSteps[parsedSteps.length - 1].result,
        width / 2,
        height - 20,
      );
      pop();
    }
  }

  if (CONFIG.bokeh > 0) {
    const snap = get();
    if (_exportTransparent) {
      drawingContext.clearRect(0, 0, width, height);
    } else {
      drawingContext.fillStyle = canvasBgHex;
      drawingContext.fillRect(0, 0, width, height);
    }
    drawingContext.filter = `blur(${CONFIG.bokeh}px)`;
    blendMode(BLEND);
    image(snap, 0, 0);
    drawingContext.filter = "none";
  }

  drawGrain();
  blendMode(BLEND);
}

// ─── save high-quality PNG ──────────────────────────────────────────────────
function saveHQ(transparent = false) {
  _exportTransparent = transparent;
  const origPD = pixelDensity();
  pixelDensity(activeMode === "numbers" ? 3 : 4);
  _applyCanvasRegion();
  draw();
  const ts =
    year() +
    nf(month(), 2) +
    nf(day(), 2) +
    "-" +
    nf(hour(), 2) +
    nf(minute(), 2) +
    nf(second(), 2);
  saveCanvas("visual-" + activeMode + "-" + ts, "png");
  _exportTransparent = false;
  pixelDensity(origPD);
  _applyCanvasRegion();
}

// ─── interaction ─────────────────────────────────────────────────────────────
function keyPressed() {
  if (document.activeElement.tagName === "INPUT") return;
  if (key === " ") {
    if (activeMode === "numbers") reshuffleNumbersColors();
    else if (activeMode === "operations") reshuffleOperationsColors();
    else {
      _shuffleAllSteps(parsedSteps);
      _computeOffsets(parsedSteps);
    }
    redraw();
  }
  if (key === "s" || key === "S") saveHQ(false);
  if (key === "t" || key === "T") saveHQ(true);
}

function windowResized() {
  _applyCanvasRegion();
  generateGrain();
  if (activeMode === "numbers") computeNumbersPositions();
  else if (activeMode === "operations") computeOperationsPositions();
  redraw();
}

// ─── pan / zoom handlers (multiplication mode only) ────────────────────────
function mouseWheel(event) {
  if (activeMode !== "multiplication" || _overUI()) return;
  const factor = event.delta > 0 ? 0.97 : 1.03;
  _panX = mouseX - (mouseX - _panX) * factor;
  _panY = mouseY - (mouseY - _panY) * factor;
  _zoom = constrain(_zoom * factor, 0.1, 10);
  redraw();
  return false;
}

function mousePressed() {
  if (activeMode !== "multiplication" || _overUI()) return;
  _dragging = true;
  _lastMX = mouseX;
  _lastMY = mouseY;
}

function mouseDragged() {
  if (activeMode !== "multiplication" || !_dragging) return;
  _panX += mouseX - _lastMX;
  _panY += mouseY - _lastMY;
  _lastMX = mouseX;
  _lastMY = mouseY;
  redraw();
}

function mouseReleased() {
  _dragging = false;
}

function doubleClicked() {
  if (activeMode !== "multiplication" || _overUI()) return;
  _fitMultiplicationView();
  redraw();
}

// ─── touch (mobile) ──────────────────────────────────────────────────────────
let _lastTouchDist = null;

function _touchOnPanel(e) {
  return !!(e && e.target && e.target.closest && e.target.closest(".side-panel"));
}

function touchStarted(e) {
  if (_touchOnPanel(e)) return;
  if (activeMode === "multiplication") {
    if (touches.length === 1) {
      _dragging = true;
      _lastMX = touches[0].x;
      _lastMY = touches[0].y;
    } else if (touches.length === 2) {
      _dragging = false;
      const dx = touches[1].x - touches[0].x;
      const dy = touches[1].y - touches[0].y;
      _lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }
  return false;
}

function touchMoved(e) {
  if (_touchOnPanel(e)) return;
  if (activeMode === "multiplication") {
    if (touches.length === 1 && _dragging) {
      _panX += touches[0].x - _lastMX;
      _panY += touches[0].y - _lastMY;
      _lastMX = touches[0].x;
      _lastMY = touches[0].y;
      redraw();
    } else if (touches.length === 2 && _lastTouchDist !== null) {
      const dx = touches[1].x - touches[0].x;
      const dy = touches[1].y - touches[0].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midX = (touches[0].x + touches[1].x) / 2;
      const midY = (touches[0].y + touches[1].y) / 2;
      const factor = dist / _lastTouchDist;
      _panX = midX - (midX - _panX) * factor;
      _panY = midY - (midY - _panY) * factor;
      _zoom = constrain(_zoom * factor, 0.1, 10);
      _lastTouchDist = dist;
      redraw();
    }
  }
  return false;
}

function touchEnded(e) {
  if (_touchOnPanel(e)) return;
  _dragging = false;
  _lastTouchDist = null;
}
