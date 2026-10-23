// grid-overlay.js — draws the 12-column grid guide (see css/grid-overlay.css).
// Set this to false to hide the grid guide on every page.
const SHOW_GRID_OVERLAY = true;

document.addEventListener("DOMContentLoaded", () => {
  if (!SHOW_GRID_OVERLAY) return;
  const overlay = document.createElement("div");
  overlay.className = "grid-overlay";
  for (let i = 0; i < 12; i++) overlay.appendChild(document.createElement("div"));
  document.body.appendChild(overlay);
});
