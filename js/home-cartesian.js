// home-cartesian.js — places coordinate points on the Cartesian plane

// ── Toggle background hover effect ───────────────────────────────────────────
const BG_HOVER = true;
// ─────────────────────────────────────────────────────────────────────────────

const POINTS = [
  {
    x: 3, y: 7, src: "assets/images/1.png",
    title:  "Piece title one",
    date:   "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH",    val: "12"   },
      { key: "OVERLAY",   val: "0.65" },
      { key: "THICKNESS", val: "2"    },
      { key: "ROTATION",  val: "34°"  },
    ],
    desc: "Each ring in this piece encodes a single digit, its filled arc proportional to its value. The composition explores how abstract numerical data can be translated into pure visual form — familiar enough to feel mathematical, strange enough to feel like something else entirely. What begins as arithmetic ends as colour, rhythm, and weight.",
  },
  {
    x: -5, y: 5, src: "assets/images/2.png",
    title:  "Piece title two",
    date:   "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH",    val: "7"    },
      { key: "OVERLAY",   val: "0.30" },
      { key: "THICKNESS", val: "4"    },
      { key: "STEPS",     val: "18"   },
    ],
    desc: "Two numbers meet and a belt is drawn between them. The tangent arcs that connect their circles carry the logic of addition — not as a symbol, but as a physical relationship in space. This piece asks whether an operation can have a body, a tension, a pull. The answer, drawn here in soft lines, is yes.",
  },
  {
    x: 6, y: 2, src: "assets/images/3.png",
    title:  "Piece title three",
    date:   "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH",    val: "15"   },
      { key: "OVERLAY",   val: "0.88" },
      { key: "THICKNESS", val: "1"    },
      { key: "SCALE",     val: "2.4x" },
    ],
    desc: "A grid of intersecting lines, each crossing a counted point of contact. Multiplication unfolds here as a spatial event — the Japanese line method reinterpreted through the visual grammar of the system. The result is less a calculation than a landscape: structured, quiet, and precise in a way numbers rarely get to be.",
  },
  {
    x: -7, y: -2, src: "assets/images/4.png",
    title:  "Piece title four",
    date:   "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH",    val: "9"    },
      { key: "OVERLAY",   val: "0.45" },
      { key: "THICKNESS", val: "3"    },
      { key: "OPACITY",   val: "0.78" },
    ],
    desc: "Negative numbers have always lived in the margins — less than nothing, below zero, defined by absence. This piece gives them form. The hollow arcs mirror their positive counterparts but refuse to fill. There is a discipline in the empty arc, a kind of restraint that feels more honest than the solid ring it echoes.",
  },
  {
    x: 2, y: -6, src: "assets/images/5.png",
    title:  "Piece title five",
    date:   "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH",    val: "11"   },
      { key: "OVERLAY",   val: "0.72" },
      { key: "THICKNESS", val: "2"    },
      { key: "ROTATION",  val: "91°"  },
    ],
    desc: "Prime numbers have no pattern, no predictability, no formula that generates them cleanly. This piece places them on the plane and lets them sit in their irregularity. The circles do not align. The spacing is not even. That is the point — beauty emerging not from order but from the stubborn refusal of it.",
  },
  {
    x: -3, y: -5, src: "assets/images/6.png",
    title:  "Piece title six",
    date:   "May 13th 2026",
    author: "Username765456",
    params: [
      { key: "LENGTH",    val: "6"    },
      { key: "OVERLAY",   val: "0.55" },
      { key: "THICKNESS", val: "5"    },
      { key: "STEPS",     val: "34"   },
    ],
    desc: "A sequence unfolds across the canvas — each term the sum of the two before it. The Fibonacci spiral rendered not as a curve but as a chain of number-circles, each one inheriting the weight of what came before it. Growth, encoded. Proportion, made visible. An old pattern seen for the first time.",
  },
];

const RANGE = 10;

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

// ── Lightbox ──────────────────────────────────────────────────────────────────
function createLightbox() {
  const lb = document.createElement("div");
  lb.id = "cp-lightbox";
  lb.innerHTML = `
    <div class="cp-lb-backdrop"></div>
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
  `;
  document.body.appendChild(lb);

  const close = () => lb.classList.remove("cp-lb-open");
  lb.querySelector(".cp-lb-backdrop").addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  return lb;
}

function openLightbox(lb, src, num, title, date, author, params, desc) {
  lb.querySelector(".cp-lb-img").src = src;
  lb.querySelector(".cp-lb-num").textContent = num;
  lb.querySelector(".cp-lb-title").textContent = title;
  lb.querySelector(".cp-lb-date").textContent = date;
  lb.querySelector(".cp-lb-author").textContent = "Created by " + author;
  lb.querySelector(".cp-lb-params").innerHTML = params
    .map(({ key, val }) => `<tr><td class="cp-lb-pk">${key}</td><td class="cp-lb-pv">${val}</td></tr>`)
    .join("");
  lb.querySelector(".cp-lb-desc").textContent = desc;
  lb.classList.add("cp-lb-open");
}
// ─────────────────────────────────────────────────────────────────────────────

function preloadImages() {
  POINTS.forEach(({ src }) => {
    const img = new Image();
    img.src = src;
  });
}

function placeCPPoints() {
  const plane = document.querySelector(".home-cartesian");
  if (!plane) return;

  // BG overlay — always centred on the axis intersection
  let overlay = null;
  if (BG_HOVER) {
    overlay = document.createElement("div");
    overlay.className = "cp-bg-overlay";
    const banner = plane.closest(".home-banner") || plane.parentElement;
    banner.appendChild(overlay);
  }

  const lightbox = createLightbox();

  POINTS.forEach(({ x, y, src, title, date, author, params, desc }) => {
    const pct_x = 50 + (x / RANGE) * 50;
    const pct_y = 50 - (y / RANGE) * 50;
    const isPos = x >= 0;

    addProjectionLines(plane, pct_x, pct_y);

    const wrap = document.createElement("div");
    wrap.className = "cp-point " + (isPos ? "cp-pos" : "cp-neg");
    wrap.style.left = pct_x + "%";
    wrap.style.top = pct_y + "%";

    const num = (Math.abs(x * 73 + y * 37) % 900) + 100;
    wrap.innerHTML = `<div class="cp-tag"><span class="cp-dot"></span><span class="cp-label">${num}</span></div>`;

    // Hover → bg image fades in at the centre
    if (BG_HOVER && overlay) {
      wrap.addEventListener("mouseenter", () => {
        overlay.style.backgroundImage = `url('${src}')`;
        overlay.classList.add("cp-bg-visible");
      });
      wrap.addEventListener("mouseleave", () => {
        overlay.classList.remove("cp-bg-visible");
      });
    }

    // Click → lightbox
    wrap.style.cursor = "pointer";
    wrap.addEventListener("click", () =>
      openLightbox(lightbox, src, num, title, date, author, params, desc),
    );

    plane.appendChild(wrap);
  });
}

document.addEventListener("DOMContentLoaded", placeCPPoints);
