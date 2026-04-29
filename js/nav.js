// nav.js — shared site navigation, injected into every page
// Structure: [small white logo → home] on left · [learn · play · gallery] on right

(function () {
  function buildNav() {
    const page = location.pathname.split("/").pop() || "index.html";

    function active(...pages) {
      return pages.includes(page) ? ' class="active"' : "";
    }

    const isHome = page === "index.html" || page === "";

    const nav = document.createElement("nav");
    nav.className = "site-nav";
    nav.innerHTML = `
      <a href="index.html" class="nav-logo-link${isHome ? " nav-logo-link--hidden" : ""}" aria-label="Home">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 214.41 25.94" class="nav-logo-img" aria-hidden="true">
          <text style="fill:#000000;font-family:AeonikTRIAL-SemiBold,'Aeonik TRIAL';font-size:28.01px;font-weight:600"
                transform="translate(-.14 20.17)">
            <tspan style="letter-spacing:-.04em" x="0"      y="0">t</tspan>
            <tspan style="letter-spacing:-.05em" x="9.36"   y="0">h</tspan>
            <tspan style="letter-spacing:-.08em" x="24.62"  y="0">e </tspan>
            <tspan style="letter-spacing:-.03em" x="43"     y="0">a</tspan>
            <tspan style="letter-spacing:0"      x="57.85"  y="0">r</tspan>
            <tspan style="letter-spacing:-.08em" x="68.38"  y="0">t</tspan>
            <tspan style="letter-spacing:-.08em" x="76.47"  y="0"> </tspan>
            <tspan style="letter-spacing:-.05em" x="80.87"  y="0">o</tspan>
            <tspan style="letter-spacing:-.08em" x="96.17"  y="0">f</tspan>
            <tspan style="letter-spacing:-.08em" x="104.04" y="0"> </tspan>
            <tspan style="letter-spacing:-.04em" x="108.44" y="0">c</tspan>
            <tspan style="letter-spacing:-.05em" x="122.97" y="0">o</tspan>
            <tspan style="letter-spacing:-.05em" x="138.35" y="0">u</tspan>
            <tspan style="letter-spacing:-.05em" x="153.45" y="0">n</tspan>
            <tspan style="letter-spacing:-.03em" x="168.75" y="0">t</tspan>
            <tspan style="letter-spacing:-.04em" x="178.24" y="0">i</tspan>
            <tspan style="letter-spacing:-.05em" x="183.68" y="0">n</tspan>
            <tspan style="letter-spacing:-.08em" x="198.92" y="0">g</tspan>
          </text>
        </svg>
      </a>
      <div class="nav-links">
        <a href="learn.html"${active("learn.html")}>learn</a>
        <div class="nav-dropdown">
          <a href="numbers.html"${active("numbers.html", "operations.html")}>play</a>
          <div class="nav-dropdown-menu">
            <a href="numbers.html"${active("numbers.html")}>Numbers</a>
            <a href="operations.html"${active("operations.html")}>Operations</a>
          </div>
        </div>
        <a href="gallery.html"${active("gallery.html")}>gallery</a>
      </div>
    `;

    document.body.prepend(nav);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildNav);
  } else {
    buildNav();
  }
})();
