// home-cartesian.js — cartesian points + vertical carousel

const POINTS = [
  {
    x: 3,
    y: 7,
    src: "assets/images/1.png",
    color: "hsl(275, 77%, 43%)",
    title: "Piece title one",
    date: "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH", val: "12" },
      { key: "OVERLAY", val: "0.65" },
      { key: "THICKNESS", val: "2" },
      { key: "ROTATION", val: "34°" },
    ],
    desc: "Each ring in this piece encodes a single digit, its filled arc proportional to its value. The composition explores how abstract numerical data can be translated into pure visual form — familiar enough to feel mathematical, strange enough to feel like something else entirely. What begins as arithmetic ends as colour, rhythm, and weight.",
  },
  {
    x: -5,
    y: 5,
    src: "assets/images/2.png",
    color: "hsl(175, 100%, 36%)",
    title: "Piece title two",
    date: "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH", val: "7" },
      { key: "OVERLAY", val: "0.30" },
      { key: "THICKNESS", val: "4" },
      { key: "STEPS", val: "18" },
    ],
    desc: "Two numbers meet and a belt is drawn between them. The tangent arcs that connect their circles carry the logic of addition — not as a symbol, but as a physical relationship in space. This piece asks whether an operation can have a body, a tension, a pull. The answer, drawn here in soft lines, is yes.",
  },
  {
    x: 6,
    y: 2,
    src: "assets/images/3.png",
    color: "hsl(17, 100%, 50%)",
    title: "Piece title three",
    date: "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH", val: "15" },
      { key: "OVERLAY", val: "0.88" },
      { key: "THICKNESS", val: "1" },
      { key: "SCALE", val: "2.4x" },
    ],
    desc: "A grid of intersecting lines, each crossing a counted point of contact. Multiplication unfolds here as a spatial event — the Japanese line method reinterpreted through the visual grammar of the system. The result is less a calculation than a landscape: structured, quiet, and precise in a way numbers rarely get to be.",
  },
  {
    x: -7,
    y: -2,
    src: "assets/images/4.png",
    color: "hsl(215, 100%, 48%)",
    title: "Piece title four",
    date: "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH", val: "9" },
      { key: "OVERLAY", val: "0.45" },
      { key: "THICKNESS", val: "3" },
      { key: "OPACITY", val: "0.78" },
    ],
    desc: "Negative numbers have always lived in the margins — less than nothing, below zero, defined by absence. This piece gives them form. The hollow arcs mirror their positive counterparts but refuse to fill. There is a discipline in the empty arc, a kind of restraint that feels more honest than the solid ring it echoes.",
  },
  {
    x: 2,
    y: -6,
    src: "assets/images/5.png",
    color: "hsl(134, 78%, 40%)",
    title: "Piece title five",
    date: "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH", val: "11" },
      { key: "OVERLAY", val: "0.72" },
      { key: "THICKNESS", val: "2" },
      { key: "ROTATION", val: "91°" },
    ],
    desc: "Prime numbers have no pattern, no predictability, no formula that generates them cleanly. This piece places them on the plane and lets them sit in their irregularity. The circles do not align. The spacing is not even. That is the point — beauty emerging not from order but from the stubborn refusal of it.",
  },
  {
    x: 5,
    y: -4,
    src: "assets/images/7.png",
    color: "hsl(265, 100%, 46%)",
    title: "π",
    date: "May 24th 2026",
    author: "Username765456",
    params: [
      { key: "COUNT", val: "10" },
      { key: "SIZE", val: "0.59" },
      { key: "OVERLAP", val: "0.00" },
      { key: "SPREAD", val: "0.50" },
      { key: "BOKEH", val: "5px" },
      { key: "GRAIN", val: "45" },
      { key: "REALITY", val: "0" },
    ],
    desc: "3.14159265358979323846264338327... Ten digits of π, each encoded as a ring. No number has been studied more obsessively, approximated more desperately, or proven more impossible to pin down. Here it is held still for a moment — not as a decimal, not as a formula, but as colour and arc and proportion. Irrational, yes. But never without form.",
  },
  {
    x: -3,
    y: -5,
    src: "assets/images/8.png",
    color: "hsl(134, 78%, 40%)",
    title: "Piece title eight",
    date: "May 24th 2026",
    author: "Username765456",
    params: [
      { key: "COUNT", val: "9" },
      { key: "SIZE", val: "1.80" },
      { key: "REALITY", val: "100" },
      { key: "GRAIN", val: "30" },
    ],
    desc: "When the reality slider reaches its limit, the system drops its own grammar entirely. No rings, no arcs, no encoded values — just the numbers themselves, large and unapologetic against a field of green. It is the clearest the system ever gets, and somehow, at this scale and angle, the most disorienting.",
  },
];

const RANGE = 10;

// ── Carousel ──────────────────────────────────────────────────────────────────
let carActiveIndex = 0;

const CAR = {
  // ── layout ────────────────────────────────────────────────────────────────
  width: 36, // vw  — item width
  offsetX: 0, // vw  — shift whole carousel left(-) / right(+) from centre
  offsetY: 0, // vh  — shift whole carousel up(-) / down(+) from centre
  spacing: 10, // vh  — distance between item centres
  radius: 0, // px  — border radius on each item

  // ── scale per distance from active ────────────────────────────────────────
  scale0: 1.0, // active item
  scale1: 0.6, // ±1 items
  scale2: 0.3, // ±2 items

  // ── opacity per distance ──────────────────────────────────────────────────
  opacity0: 1.0,
  opacity1: 0.2,
  opacity2: 0,

  // ── blur per distance (px, 0 = off) ──────────────────────────────────────
  blur0: 0,
  blur1: 10,
  blur2: 10,

  // ── brightness per distance (1 = normal, <1 = darker) ────────────────────
  brightness0: 1.0,
  brightness1: 1.0,
  brightness2: 1.0,

  // ── how many items visible on each side (1 or 2) ─────────────────────────
  visible: 2,

  // ── animation ─────────────────────────────────────────────────────────────
  lerpSpeed: 0.09, // 0 = frozen, 1 = instant snap — controls scroll smoothness
  maxStep: 0.1,    // max positions moved per frame — caps speed for long jumps

  // ── interaction ───────────────────────────────────────────────────────────
  cooldown: 900, // ms — minimum time between wheel steps
};

// ── RAF-lerp state ────────────────────────────────────────────────────────────
let _carPos = 0; // current rendered position (float, drives all visuals)
let _carTarget = 0; // integer target index
let _carRafId = null;

function _lerp(a, b, t) {
  return a + (b - a) * t;
}

function _carStep() {
  const delta = _carTarget - _carPos;
  const raw = delta * CAR.lerpSpeed;
  // Cap per-frame movement so long jumps (hover on far points) stay smooth
  _carPos += Math.max(-CAR.maxStep, Math.min(CAR.maxStep, raw));
  _renderCarousel(_carPos);

  if (Math.abs(_carTarget - _carPos) > 0.0003) {
    _carRafId = requestAnimationFrame(_carStep);
  } else {
    _carPos = _carTarget;
    _renderCarousel(_carPos);
    _carRafId = null;
  }
}

function _carKick() {
  if (!_carRafId) _carRafId = requestAnimationFrame(_carStep);
}

function _renderCarousel(pos) {
  const N = POINTS.length;
  const mobile = window.innerWidth <= 768;
  const rWidth = mobile ? 58 : CAR.width;
  const rSpacing = mobile ? 36 : CAR.spacing;

  document.querySelectorAll(".cp-car-item").forEach((item, i) => {
    // Circular offset — each item takes the shortest path around the loop
    let offset = (((i - pos) % N) + N) % N;
    if (offset > N / 2) offset -= N;
    const abs = Math.abs(offset);
    const lo = Math.floor(abs); // lower bracket
    const hi = lo + 1; // upper bracket
    const t = abs - lo; // fractional blend

    // Fixed layout — idempotent, cheap
    item.style.width = `${rWidth}vw`;
    item.style.borderRadius = `${CAR.radius}px`;
    item.style.transition = "none"; // RAF drives everything — no CSS transitions

    if (abs > CAR.visible + 0.5) {
      item.style.opacity = "0";
      item.style.visibility = "hidden";
      item.style.pointerEvents = "none";
      return;
    }

    const S = [CAR.scale0, CAR.scale1, CAR.scale2, 0];
    const O = [CAR.opacity0, CAR.opacity1, CAR.opacity2, 0];
    const B = [CAR.blur0, CAR.blur1, CAR.blur2, CAR.blur2];
    const L = [
      CAR.brightness0,
      CAR.brightness1,
      CAR.brightness2,
      CAR.brightness2,
    ];

    const scale = _lerp(S[lo] ?? 0, S[hi] ?? 0, t);
    const opac = _lerp(O[lo] ?? 0, O[hi] ?? 0, t);
    const blur = _lerp(B[lo] ?? 0, B[hi] ?? 0, t);
    const bright = _lerp(L[lo] ?? 1, L[hi] ?? 1, t);

    const ty = offset * rSpacing + CAR.offsetY;
    const tx = CAR.offsetX;

    item.style.visibility = "visible";
    item.style.opacity = opac;
    item.style.zIndex = Math.round(10 - abs);
    item.style.pointerEvents = "auto";
    item.style.cursor = abs < 0.5 ? "pointer" : "default";
    item.style.filter = `blur(${blur}px) brightness(${bright})`;
    // -50% centres the item on left:50% — offsetX shifts it further if needed
    item.style.transform = `translateX(calc(-50% + ${tx}vw)) translateY(calc(-50% + ${ty}vh)) scale(${scale})`;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

function createCarousel(lightbox) {
  const car = document.createElement("div");
  car.id = "cp-carousel";
  document.body.appendChild(car);

  POINTS.forEach((p, i) => {
    const item = document.createElement("div");
    item.className = "cp-car-item";

    const img = document.createElement("img");
    img.src = p.src;
    img.alt = p.title;
    img.draggable = false;
    item.appendChild(img);

    item.addEventListener("click", () => {
      if (i === carActiveIndex) openLightbox(lightbox, i);
      else carGoTo(i);
    });

    car.appendChild(item);
  });

  // Wheel — short cooldown so rapid scrolling steps cleanly, lerp handles smoothness
  let _wheelLock = false;
  window.addEventListener(
    "wheel",
    (e) => {
      if (
        document.getElementById("cp-lightbox")?.classList.contains("cp-lb-open")
      )
        return;
      e.preventDefault();
      if (_wheelLock) return;
      _wheelLock = true;
      setTimeout(() => {
        _wheelLock = false;
      }, CAR.cooldown);
      const N = POINTS.length;
      const next =
        e.deltaY > 0 ? (carActiveIndex + 1) % N : (carActiveIndex - 1 + N) % N;
      carGoTo(next);
    },
    { passive: false },
  );

  // Touch swipe — vertical swipe navigates the carousel on mobile
  let _touchY = null;
  window.addEventListener(
    "touchstart",
    (e) => {
      _touchY = e.touches[0].clientY;
    },
    { passive: true },
  );
  window.addEventListener(
    "touchend",
    (e) => {
      if (_touchY === null) return;
      const dy = e.changedTouches[0].clientY - _touchY;
      _touchY = null;
      if (Math.abs(dy) < 40) return; // ignore taps
      if (
        document.getElementById("cp-lightbox")?.classList.contains("cp-lb-open")
      )
        return;
      const N = POINTS.length;
      carGoTo(dy < 0 ? (carActiveIndex + 1) % N : (carActiveIndex - 1 + N) % N);
    },
    { passive: true },
  );

  _renderCarousel(0);
  // highlight the first point on load
  carGoTo(0);
}

function carGoTo(targetIdx) {
  const N = POINTS.length;
  // Find the shortest circular path from current integer position to targetIdx
  const base = Math.round(_carTarget);
  let delta = (((targetIdx - base) % N) + N) % N;
  if (delta > N / 2) delta -= N;
  _carTarget = base + delta;
  carActiveIndex = ((_carTarget % N) + N) % N;
  document.querySelectorAll(".cp-point").forEach((pt, i) => {
    pt.classList.toggle("cp-point-active", i === carActiveIndex);
  });
  _carKick();
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
let lbCurrentIndex = -1;

function createLightbox() {
  const lb = document.createElement("div");
  lb.id = "cp-lightbox";
  lb.innerHTML = `
    <div class="cp-lb-backdrop"></div>
    <button class="cp-lb-nav cp-lb-prev">
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polyline points="8,1 2,8 8,15" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <div class="cp-lb-inner">
      <div class="cp-lb-top">
        <div class="cp-lb-top-l">
          <span class="cp-lb-num"></span>
          <p class="cp-lb-title"></p>
        </div>
        <div class="cp-lb-top-r">
          <p class="cp-lb-date"></p>
          <p class="cp-lb-author"></p>
        </div>
      </div>
      <div class="cp-lb-media">
        <img class="cp-lb-img" src="" alt="">
      </div>
      <div class="cp-lb-bottom">
        <div class="cp-lb-bot-l">
          <table class="cp-lb-params"></table>
        </div>
        <div class="cp-lb-bot-r">
          <p class="cp-lb-desc"></p>
        </div>
      </div>
    </div>
    <button class="cp-lb-nav cp-lb-next">
      <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <polyline points="2,1 8,8 2,15" stroke="#1a1a1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;
  document.body.appendChild(lb);

  const close = () => lb.classList.remove("cp-lb-open");
  lb.querySelector(".cp-lb-backdrop").addEventListener("click", close);
  lb.querySelector(".cp-lb-prev").addEventListener("click", () =>
    navigateLightbox(lb, -1),
  );
  lb.querySelector(".cp-lb-next").addEventListener("click", () =>
    navigateLightbox(lb, 1),
  );

  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("cp-lb-open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") navigateLightbox(lb, -1);
    if (e.key === "ArrowRight") navigateLightbox(lb, 1);
  });

  return lb;
}

function _fillLightbox(lb, p) {
  const num = (Math.abs(p.x * 73 + p.y * 37) % 900) + 100;
  lb.querySelector(".cp-lb-img").src = p.src;
  lb.querySelector(".cp-lb-num").textContent = num;
  lb.querySelector(".cp-lb-title").textContent = p.title;
  lb.querySelector(".cp-lb-date").textContent = p.date;
  lb.querySelector(".cp-lb-author").textContent = "Created by " + p.author;
  lb.querySelector(".cp-lb-params").innerHTML = p.params
    .map(
      ({ key, val }) =>
        `<tr><td class="cp-lb-pk">${key}</td><td class="cp-lb-pv">${val}</td></tr>`,
    )
    .join("");
  lb.querySelector(".cp-lb-desc").textContent = p.desc;
}

function navigateLightbox(lb, delta) {
  lbCurrentIndex = (lbCurrentIndex + delta + POINTS.length) % POINTS.length;
  carGoTo(lbCurrentIndex);
  _fillLightbox(lb, POINTS[lbCurrentIndex]);
}

function openLightbox(lb, index) {
  lbCurrentIndex = index;
  _fillLightbox(lb, POINTS[index]);
  lb.classList.add("cp-lb-open");
}
// ─────────────────────────────────────────────────────────────────────────────

function addProjectionLines(plane, pct_x, pct_y) {
  const hLine = document.createElement("div");
  hLine.className = "cp-proj cp-proj-h";
  hLine.style.top = pct_y + "%";
  hLine.style.left = Math.min(pct_x, 50) + "%";
  hLine.style.width = Math.abs(pct_x - 50) + "%";
  plane.appendChild(hLine);

  const vLine = document.createElement("div");
  vLine.className = "cp-proj cp-proj-v";
  vLine.style.left = pct_x + "%";
  vLine.style.top = Math.min(pct_y, 50) + "%";
  vLine.style.height = Math.abs(pct_y - 50) + "%";
  plane.appendChild(vLine);
}

function preloadImages() {
  POINTS.forEach(({ src }) => {
    const img = new Image();
    img.src = src;
  });
}

function placeCPPoints() {
  const plane = document.querySelector(".home-cartesian");
  if (!plane) return;

  preloadImages();

  const lightbox = createLightbox();
  createCarousel(lightbox);

  POINTS.forEach(({ x, y, color }, index) => {
    const pct_x = 50 + (x / RANGE) * 50;
    const pct_y = 50 - (y / RANGE) * 50;
    const isPos = x >= 0;

    addProjectionLines(plane, pct_x, pct_y);

    const wrap = document.createElement("div");
    wrap.className = "cp-point " + (isPos ? "cp-pos" : "cp-neg");
    wrap.style.left = pct_x + "%";
    wrap.style.top = pct_y + "%";
    wrap.style.setProperty("--point-color", color);

    const num = (Math.abs(x * 73 + y * 37) % 900) + 100;
    wrap.innerHTML = `<div class="cp-tag"><span class="cp-dot"></span><span class="cp-label">${num}</span></div>`;

    // Hover → navigate carousel to this image
    wrap.addEventListener("mouseenter", () => carGoTo(index));

    // Click → open lightbox for this image
    wrap.style.cursor = "pointer";
    wrap.addEventListener("click", () => openLightbox(lightbox, index));

    plane.appendChild(wrap);
  });
}

document.addEventListener("DOMContentLoaded", placeCPPoints);
