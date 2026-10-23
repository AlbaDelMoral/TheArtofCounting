// nav.js — shared site navigation, injected into every page
// Structure: [small white logo → home] on left · [learn · play · gallery] on right

// ── debug grid ─────────────────────────────────────────────────────────────────
// Set to true to show the 12-column layout grid as a fixed overlay.
const DEBUG_GRID = false;

(function () {
  function buildNav() {
    const page = location.pathname.split("/").pop() || "index.html";

    function active(...pages) {
      return pages.includes(page) ? ' class="active"' : "";
    }

    // same check, but returns just the bare class name (for merging into an
    // element that already carries other classes, e.g. nav-link-item)
    function activeClass(...pages) {
      return pages.includes(page) ? " active" : "";
    }

    const isHome = page === "index.html" || page === "";

    const nav = document.createElement("nav");
    nav.className = "site-nav";
    nav.innerHTML = `
      <a href="index.html" class="nav-logo-link${isHome ? " nav-logo-link--hidden" : ""}" aria-label="Home">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 595.28 294.16" class="nav-logo-img" aria-hidden="true">
          <g>
            <path class="nav-logo-mark" d="M43.11,238.48V84.89H0v-21.12h43.11V0h22.9v63.77h63.33v21.12h-63.33v153.14c0,23.34,8.54,32.34,32.34,32.34h30.99v21.1h-33.24c-38.62,0-52.99-16.62-52.99-52.99Z"/>
            <path class="nav-logo-mark" d="M152.29,228.58c0-42.67,31.44-67.82,89.82-67.82h77.25v-19.76c0-38.17-24.25-60.18-66.92-60.18-39.07,0-62.88,18.41-68.71,46.25h-22.91c5.84-41.32,40.42-66.46,92.51-66.46,57.03,0,88.92,29.19,88.92,81.29v105.99c0,17.51,6.74,22,20.21,22h8.53v21.1h-13.47c-25.15,0-37.28-10.78-37.28-34.58v-13.48c-12.12,28.74-40.87,50.75-87.57,50.75s-80.39-24.7-80.39-65.11ZM319.35,198.49v-17.96h-79.04c-42.21,0-64.67,16.61-64.67,46.7s22.46,46.7,58.83,46.7c53.89,0,84.88-31.44,84.88-75.44Z"/>
            <path class="nav-logo-mark" d="M390.49,177.85c0-69.17,44.02-116.77,108.24-116.77,51.64,0,87.12,28.74,96.55,75.9h-23.8c-8.09-34.13-35.03-55.68-73.2-55.68-50.3,0-84.43,39.96-84.43,96.56s34.13,95.66,84.43,95.66c38.17,0,65.11-21.57,73.2-55.69h23.8c-8.98,46.7-45.35,76.35-97,76.35-64.67,0-107.79-46.25-107.79-116.31Z"/>
          </g>
        </svg>
      </a>

      <!-- desktop links — each item spans from the previous column's right edge
           (where the number sits) through the gap (dash, centered) to its own
           column's left edge (label) -->
      <div class="nav-links">
        <a href="learn.html" class="nav-link-item nav-link-learn${activeClass("learn.html")}"><span class="nav-num">1</span><span class="nav-label">Learn</span></a>
        <div class="nav-dropdown">
          <div class="nav-dropdown-inner">
            <a href="numbers.html" class="nav-link-item nav-link-play${activeClass("numbers.html", "operations.html", "multiplication.html")}"><span class="nav-num">2</span><span class="nav-label">Play</span></a>
            <div class="nav-dropdown-menu">
              <a href="numbers.html"${active("numbers.html")}>Numbers</a>
              <a href="operations.html"${active("operations.html")}>Operations</a>
              <a href="multiplication.html"${active("multiplication.html")}>Multiplication</a>
            </div>
          </div>
        </div>
        <a href="gallery.html" class="nav-link-item nav-link-about${activeClass("gallery.html")}"><span class="nav-num">3</span><span class="nav-label">About</span></a>
      </div>

      <!-- mobile hamburger button -->
      <button class="nav-hamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>

      <!-- mobile dropdown menu -->
      <div class="nav-mobile-menu">
        <a href="learn.html"${active("learn.html")}>Learn</a>
        <a href="numbers.html"${active("numbers.html")}>Numbers</a>
        <a href="operations.html"${active("operations.html")}>Operations</a>
        <a href="multiplication.html"${active("multiplication.html")}>Multiplication</a>
        <a href="gallery.html"${active("gallery.html")}>About</a>
      </div>
    `;

    document.body.prepend(nav);

    // ── hamburger toggle ────────────────────────────────────────────────────────
    const hamburger = nav.querySelector('.nav-hamburger');
    const mobileMenu = nav.querySelector('.nav-mobile-menu');

    hamburger.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('nav-mobile-menu--open');
      hamburger.classList.toggle('nav-hamburger--open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
    });

    // close when a link is tapped
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('nav-mobile-menu--open');
        hamburger.classList.remove('nav-hamburger--open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    // close on outside tap
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) {
        mobileMenu.classList.remove('nav-mobile-menu--open');
        hamburger.classList.remove('nav-hamburger--open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    if (DEBUG_GRID) {
      const overlay = document.createElement("div");
      overlay.style.cssText = [
        "position:fixed",
        "inset:0",
        "width:100%",
        "height:100%",
        "display:grid",
        "grid-template-columns:repeat(12,1fr)",
        "pointer-events:none",
        "z-index:99999",
      ].join(";");

      for (let i = 0; i < 12; i++) {
        const col = document.createElement("div");
        col.style.cssText = [
          "background:rgba(255,30,90,0.05)",
          "border-left:1px solid rgba(255,30,90,0.25)",
          "box-sizing:border-box",
        ].join(";");
        const label = document.createElement("span");
        label.textContent = i + 1;
        label.style.cssText = [
          "font-family:monospace",
          "font-size:9px",
          "color:rgba(255,30,90,0.45)",
          "padding:52px 4px 0",
          "display:block",
          "text-align:center",
        ].join(";");
        col.appendChild(label);
        overlay.appendChild(col);
      }
      document.body.appendChild(overlay);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildNav);
  } else {
    buildNav();
  }
})();
