// home-cartesian.js — places coordinate points on the Cartesian plane

// ── Toggle background hover effect ───────────────────────────────────────────
const BG_HOVER = true;
// ─────────────────────────────────────────────────────────────────────────────

const POINTS = [
  { x:  3, y:  7, src: 'assets/images/1.png' },
  { x: -5, y:  5, src: 'assets/images/2.png' },
  { x:  6, y:  2, src: 'assets/images/3.png' },
  { x: -7, y: -2, src: 'assets/images/4.png' },
  { x:  2, y: -6, src: 'assets/images/5.png' },
  { x: -3, y: -5, src: 'assets/images/6.png' },
];

const RANGE = 10;

function addProjectionLines(plane, pct_x, pct_y) {
  const hLine = document.createElement('div');
  hLine.className = 'cp-proj cp-proj-h';
  hLine.style.top   = pct_y + '%';
  hLine.style.left  = Math.min(pct_x, 50) + '%';
  hLine.style.width = Math.abs(pct_x - 50) + '%';
  plane.appendChild(hLine);

  const vLine = document.createElement('div');
  vLine.className = 'cp-proj cp-proj-v';
  vLine.style.left   = pct_x + '%';
  vLine.style.top    = Math.min(pct_y, 50) + '%';
  vLine.style.height = Math.abs(pct_y - 50) + '%';
  plane.appendChild(vLine);
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function createLightbox() {
  const lb = document.createElement('div');
  lb.id = 'cp-lightbox';
  lb.innerHTML = `<div class="cp-lb-backdrop"></div><img class="cp-lb-img" src="" alt="">`;
  document.body.appendChild(lb);

  const close = () => lb.classList.remove('cp-lb-open');
  lb.querySelector('.cp-lb-backdrop').addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  return lb;
}

function openLightbox(lb, src) {
  lb.querySelector('.cp-lb-img').src = src;
  lb.classList.add('cp-lb-open');
}
// ─────────────────────────────────────────────────────────────────────────────

function placeCPPoints() {
  const plane = document.querySelector('.home-cartesian');
  if (!plane) return;

  // BG overlay — always centred on the axis intersection
  let overlay = null;
  if (BG_HOVER) {
    overlay = document.createElement('div');
    overlay.className = 'cp-bg-overlay';
    const banner = plane.closest('.home-banner') || plane.parentElement;
    banner.appendChild(overlay);
  }

  const lightbox = createLightbox();

  POINTS.forEach(({ x, y, src }) => {
    const pct_x = 50 + (x / RANGE) * 50;
    const pct_y = 50 - (y / RANGE) * 50;
    const isPos = x >= 0;

    addProjectionLines(plane, pct_x, pct_y);

    const wrap = document.createElement('div');
    wrap.className = 'cp-point ' + (isPos ? 'cp-pos' : 'cp-neg');
    wrap.style.left = pct_x + '%';
    wrap.style.top  = pct_y + '%';

    const num = ((Math.abs(x * 73 + y * 37) % 900) + 100);
    wrap.innerHTML = `<span class="cp-dot"></span><div class="cp-header"><span class="cp-label">${num}</span></div>`;

    // Hover → bg image fades in at the centre
    if (BG_HOVER && overlay) {
      wrap.addEventListener('mouseenter', () => {
        overlay.style.backgroundImage = `url('${src}')`;
        overlay.classList.add('cp-bg-visible');
      });
      wrap.addEventListener('mouseleave', () => {
        overlay.classList.remove('cp-bg-visible');
      });
    }

    // Click → lightbox
    wrap.style.cursor = 'pointer';
    wrap.addEventListener('click', () => openLightbox(lightbox, src));

    plane.appendChild(wrap);
  });
}

document.addEventListener('DOMContentLoaded', placeCPPoints);
