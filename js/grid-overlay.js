// grid-overlay.js — draws the 12-column grid guide (see css/grid-overlay.css).
// Set this to false to hide the grid guide on every page.
const SHOW_GRID_OVERLAY = true;

// --viewport-width = document.documentElement.clientWidth, i.e. the actual
// current device width MINUS a real scrollbar's width, whenever one is
// present — exactly what the grid (see css/grid-overlay.css) and any
// full-bleed section are sized against instead of 100vw. Different
// browsers disagree on whether 100vw itself already excludes the
// scrollbar or a fixed-position right/left offset does, so rather than
// lean on either, this measures the one number that's unambiguous by
// definition and pushes it in directly.
function updateViewportWidth() {
  document.documentElement.style.setProperty(
    "--viewport-width",
    `${document.documentElement.clientWidth}px`,
  );
}
updateViewportWidth();
window.addEventListener("load", updateViewportWidth);
window.addEventListener("resize", updateViewportWidth);
// content loading in (fonts, images) can grow the page past the
// scrolling threshold without the window itself ever resizing
if (window.ResizeObserver) {
  new ResizeObserver(updateViewportWidth).observe(document.body);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!SHOW_GRID_OVERLAY) return;
  const overlay = document.createElement("div");
  overlay.className = "grid-overlay";
  for (let i = 0; i < 12; i++) overlay.appendChild(document.createElement("div"));
  document.body.appendChild(overlay);
});
