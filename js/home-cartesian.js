// home-cartesian.js — places coordinate points on the Cartesian plane
//
// Anchor logic:
//   x >= 0  →  dot at top-left  of label (image extends right)
//   x <  0  →  dot at top-right of label (image extends left)
//
// Each point gets two projection lines: one to the x-axis, one to the y-axis.
//
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

const RANGE = 10; // axes run from -RANGE to +RANGE

function addProjectionLines(plane, pct_x, pct_y) {
  // Horizontal line: from point across to the y-axis (50%)
  const hLine = document.createElement('div');
  hLine.className = 'cp-proj cp-proj-h';
  hLine.style.top   = pct_y + '%';
  hLine.style.left  = Math.min(pct_x, 50) + '%';
  hLine.style.width = Math.abs(pct_x - 50) + '%';
  plane.appendChild(hLine);

  // Vertical line: from point down/up to the x-axis (50%)
  const vLine = document.createElement('div');
  vLine.className = 'cp-proj cp-proj-v';
  vLine.style.left   = pct_x + '%';
  vLine.style.top    = Math.min(pct_y, 50) + '%';
  vLine.style.height = Math.abs(pct_y - 50) + '%';
  plane.appendChild(vLine);
}

function placeCPPoints() {
  const plane = document.querySelector('.home-cartesian');
  if (!plane) return;

  // Background overlay — sits in .home-banner so it's behind everything
  let overlay = null;
  if (BG_HOVER) {
    overlay = document.createElement('div');
    overlay.className = 'cp-bg-overlay';
    const banner = plane.closest('.home-banner') || plane.parentElement;
    banner.appendChild(overlay);
  }

  POINTS.forEach(({ x, y, src }) => {
    const pct_x = 50 + (x / RANGE) * 50;
    const pct_y = 50 - (y / RANGE) * 50;
    const isPos = x >= 0;

    // Projection lines (added before the point so they render below it)
    addProjectionLines(plane, pct_x, pct_y);

    // Point: dot + coordinate label
    const wrap = document.createElement('div');
    wrap.className = 'cp-point ' + (isPos ? 'cp-pos' : 'cp-neg');
    wrap.style.left = pct_x + '%';
    wrap.style.top  = pct_y + '%';

    const label = `(${x}, ${y})`;
    wrap.innerHTML = isPos
      ? `<div class="cp-header"><span class="cp-dot"></span><span class="cp-label">${label}</span></div>`
      : `<div class="cp-header"><span class="cp-label">${label}</span><span class="cp-dot"></span></div>`;

    if (BG_HOVER && overlay) {
      wrap.addEventListener('mouseenter', () => {
        overlay.style.backgroundImage = `url('${src}')`;
        overlay.classList.add('cp-bg-visible');
      });
      wrap.addEventListener('mouseleave', () => {
        overlay.classList.remove('cp-bg-visible');
      });
    }

    plane.appendChild(wrap);
  });
}

document.addEventListener('DOMContentLoaded', placeCPPoints);
