// nav.js — shared site navigation, injected into every page
// Structure: [small white logo → home] on left · [learn · play · gallery] on right

// ── debug grid ─────────────────────────────────────────────────────────────────
// Set to true to show the 12-column layout grid as a fixed overlay.
const DEBUG_GRID = false;

(function () {
  // pages simple enough (no canvas/sketch scripts) to swap in-place via fetch
  // instead of a real page load — this is what lets the nav persist across
  // navigation instead of reloading (and blinking) every time. Play and its
  // sibling sketch pages run a large p5.js sketch + several interdependent
  // scripts that aren't safe to tear down/re-init generically, so those
  // still do a normal full page load.
  const SPA_SAFE_PAGES = new Set(["", "index.html", "learn.html"]);
  // scripts that must never be re-executed by the SPA swap: nav.js has
  // already run (the whole point is the nav persisting) and grid-overlay.js
  // is page-independent and already applied
  const SPA_SKIP_SCRIPTS = ["nav.js", "grid-overlay.js"];

  function isSpaSafe(page) {
    return SPA_SAFE_PAGES.has(page);
  }

  function pageNameFromUrl(href) {
    try {
      return new URL(href, location.href).pathname.split("/").pop() || "index.html";
    } catch (err) {
      return "";
    }
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function loadScript(src) {
    return new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = resolve; // don't let one bad script hang the whole swap
      document.body.appendChild(s);
    });
  }

  // runs the destination page's own scripts (in document order), skipping
  // the ones in SPA_SKIP_SCRIPTS, so e.g. learn.js's accordion/scroll-spy
  // setup actually binds to the freshly-swapped-in content
  async function runPageScripts(newDoc) {
    const scripts = Array.from(newDoc.querySelectorAll("script[src]"));
    for (const old of scripts) {
      const src = old.getAttribute("src");
      if (!src || SPA_SKIP_SCRIPTS.some((name) => src.endsWith(name))) continue;
      await loadScript(src);
    }
  }

  // keeps <head>'s stylesheets in sync with the destination page's own,
  // adding/removing only what differs (shared ones like base.css/layout.css
  // are left alone)
  function reconcileStylesheets(newHead) {
    const newLinks = Array.from(newHead.querySelectorAll('link[rel="stylesheet"]'));
    const newHrefs = newLinks.map((l) => l.getAttribute("href"));

    Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => {
      if (!newHrefs.includes(link.getAttribute("href"))) link.remove();
    });

    newLinks.forEach((l) => {
      const href = l.getAttribute("href");
      const exists = Array.from(
        document.head.querySelectorAll('link[rel="stylesheet"]')
      ).some((existing) => existing.getAttribute("href") === href);
      if (!exists) {
        const copy = document.createElement("link");
        copy.rel = "stylesheet";
        copy.href = href;
        document.head.appendChild(copy);
      }
    });
  }

  function buildNav() {
    let page = location.pathname.split("/").pop() || "index.html";

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

      <!-- desktop links — each item's label sits at its own column's left edge.
           Each item carries its own permanent icon (circle/line/square) —
           it no longer marks "active" by having a dot travel to it. -->
      <div class="nav-links">
        <a href="index.html" class="nav-link-item nav-link-home${activeClass("index.html", "")}"><span class="nav-icon nav-icon-circle"></span><span class="nav-label">Home</span></a>
        <a href="learn.html" class="nav-link-item nav-link-learn${activeClass("learn.html")}"><span class="nav-icon nav-icon-line"></span><span class="nav-label">Learn</span></a>
        <a href="play.html" class="nav-link-item nav-link-play${activeClass("play.html", "numbers.html", "operations.html", "multiplication.html")}"><span class="nav-icon nav-icon-square"></span><span class="nav-label">Play</span></a>
      </div>

      <!-- mobile pill — same pill as the desktop Home/Learn/Play one. Collapsed,
           it shows just the dot + "Menu" toggle; tapping it expands the pill
           leftward (the toggle itself never moves) to reveal Home/Learn/Play,
           and the toggle's own label flips to "Close". -->
      <div class="nav-mobile-pill">
        <a href="index.html" class="nav-link-item nav-mobile-link${activeClass("index.html", "")}"><span class="nav-mobile-link-inner"><span class="nav-icon nav-icon-circle"></span><span class="nav-label">Home</span></span></a>
        <a href="learn.html" class="nav-link-item nav-mobile-link${activeClass("learn.html")}"><span class="nav-mobile-link-inner"><span class="nav-icon nav-icon-line"></span><span class="nav-label">Learn</span></span></a>
        <a href="play.html" class="nav-link-item nav-mobile-link${activeClass("play.html", "numbers.html", "operations.html", "multiplication.html")}"><span class="nav-mobile-link-inner"><span class="nav-icon nav-icon-square"></span><span class="nav-label">Play</span></span></a>
        <button class="nav-hamburger" aria-label="Open menu" aria-expanded="false">
          <span class="nav-hamburger-icon">
            <span class="nav-hamburger-dot"></span>
            <svg class="nav-hamburger-x" viewBox="0 0 11 11" aria-hidden="true">
              <line x1="1" y1="1" x2="10" y2="10" />
              <line x1="10" y1="1" x2="1" y2="10" />
            </svg>
          </span>
          <span class="nav-label">Menu</span>
        </button>
      </div>
    `;

    document.body.prepend(nav);

    // ── Learn/Play cross-page transition ─────────────────────────────────────
    // Each nav item now carries its own permanent icon (no shared dot that
    // travels between items), so all this has to do is fade the item's
    // opacity down before it leaves and back up when it (re)arrives as
    // active — sharing the same CSS classes (nav-link-item--leaving/
    // --arriving/--settling, see css/layout.css). Two paths:
    //  1. SPA swap (index.html <-> learn.html): the nav element itself never
    //     gets destroyed, so this drives the whole leave→fetch→swap→arrive
    //     sequence directly, in one script.
    //  2. Real navigation (anything involving play.html's sketch pages, or
    //     if the fetch fails): the old page can only fade itself out before
    //     unloading, so it leaves a flag in sessionStorage and the arriving
    //     page reads it back to run the arrival half.
    (function setupNavTransition() {
      const STORAGE_KEY = "navArriving";
      const LEAVE_FADE_MS = 400;
      const SETTLE_MS = 600;

      function runArrival(activeLink) {
        if (!activeLink) return;
        activeLink.classList.add("nav-link-item--arriving");
        // force a synchronous style flush so the browser actually commits
        // the faded start state before we switch to the resting one —
        // relying on rAF timing alone for this is flaky and can skip the
        // transition entirely, making it look like a blink instead of a fade
        void activeLink.offsetWidth;
        activeLink.classList.remove("nav-link-item--arriving");
        activeLink.classList.add("nav-link-item--settling");
        setTimeout(() => {
          activeLink.classList.remove("nav-link-item--settling");
        }, SETTLE_MS);
      }

      // on a REAL load, pick up any arrival flag a previous page left behind
      let hadPendingArrival = false;
      try {
        hadPendingArrival = sessionStorage.getItem(STORAGE_KEY) === "1";
        sessionStorage.removeItem(STORAGE_KEY);
      } catch (err) {
        hadPendingArrival = false;
      }
      if (hadPendingArrival) runArrival(nav.querySelector(".nav-link-item.active"));

      async function performSpaNavigation(outgoingLink, incomingLink, href, destPage) {
        if (outgoingLink) outgoingLink.classList.add("nav-link-item--leaving");
        await sleep(LEAVE_FADE_MS);

        let html;
        try {
          const res = await fetch(href);
          if (!res.ok) throw new Error("bad response");
          html = await res.text();
        } catch (err) {
          // network hiccup — fall back to a real navigation rather than
          // leaving the page stuck half-faded
          window.location.href = href;
          return;
        }

        const newDoc = new DOMParser().parseFromString(html, "text/html");

        document.title = newDoc.title;
        reconcileStylesheets(newDoc.head);

        // insert the NEW content first, THEN remove the old — body is never
        // empty at any point this way. Removing first (even though it
        // happens in the same synchronous pass) left a gap where the fixed,
        // transparent-background nav had nothing behind it, which is what
        // read as the logo/navbar itself "blinking"
        const oldChildren = Array.from(document.body.children).filter(
          (child) => child !== nav && !child.classList.contains("grid-overlay")
        );
        const newChildren = Array.from(newDoc.body.children).map((child) =>
          document.importNode(child, true)
        );
        newChildren.forEach((child) => document.body.appendChild(child));
        oldChildren.forEach((child) => child.remove());

        await runPageScripts(newDoc);

        history.pushState({ spaPage: destPage }, "", href);
        page = destPage;
        window.scrollTo(0, 0);

        if (outgoingLink) outgoingLink.classList.remove("nav-link-item--leaving");
        // one pass over every .nav-link-item (desktop pill + mobile pill's
        // own copies) keeps both in sync regardless of which was clicked
        nav.querySelectorAll(".nav-link-item").forEach((l) => {
          l.classList.toggle("active", pageNameFromUrl(l.getAttribute("href")) === destPage);
        });
        // the logo hides itself on the homepage only — was set once at
        // buildNav() time and never revisited, so it stayed hidden/shown
        // from whichever page the nav first loaded on, regardless of
        // where an SPA swap actually lands
        const logoLink = nav.querySelector(".nav-logo-link");
        if (logoLink) {
          logoLink.classList.toggle(
            "nav-logo-link--hidden",
            destPage === "index.html" || destPage === ""
          );
        }

        runArrival(incomingLink);
      }

      async function restoreSpaPage(destPage) {
        const href = destPage === "index.html" || destPage === "" ? "index.html" : destPage;
        let html;
        try {
          const res = await fetch(href);
          if (!res.ok) throw new Error("bad response");
          html = await res.text();
        } catch (err) {
          window.location.reload();
          return;
        }
        const newDoc = new DOMParser().parseFromString(html, "text/html");
        document.title = newDoc.title;
        reconcileStylesheets(newDoc.head);
        const oldChildren = Array.from(document.body.children).filter(
          (child) => child !== nav && !child.classList.contains("grid-overlay")
        );
        const newChildren = Array.from(newDoc.body.children).map((child) =>
          document.importNode(child, true)
        );
        newChildren.forEach((child) => document.body.appendChild(child));
        oldChildren.forEach((child) => child.remove());
        await runPageScripts(newDoc);
        page = destPage;
        window.scrollTo(0, 0);

        nav.querySelectorAll(".nav-link-item").forEach((l) => {
          l.classList.toggle("active", pageNameFromUrl(l.getAttribute("href")) === destPage);
        });
        const logoLink = nav.querySelector(".nav-logo-link");
        if (logoLink) {
          logoLink.classList.toggle(
            "nav-logo-link--hidden",
            destPage === "index.html" || destPage === ""
          );
        }
      }

      // resolve from the (already-updated) URL rather than e.state, so this
      // also covers going back past our pushState entries to the page's
      // original, pre-SPA history entry (which carries no state at all) —
      // a real navigation's entry never reaches this listener at all, since
      // the browser unloads this document and reloads that one instead
      window.addEventListener("popstate", () => {
        const destPage = location.pathname.split("/").pop() || "index.html";
        if (isSpaSafe(destPage)) restoreSpaPage(destPage);
      });

      nav.querySelectorAll(".nav-link-item").forEach((link) => {
        link.addEventListener("click", (e) => {
          if (link.classList.contains("active")) return;
          const href = link.getAttribute("href");
          const activeLink = nav.querySelector(".nav-link-item.active");
          if (!href || !activeLink) return;
          e.preventDefault();
          const destPage = pageNameFromUrl(href);

          if (isSpaSafe(page) && isSpaSafe(destPage)) {
            performSpaNavigation(activeLink, link, href, destPage);
            return;
          }

          // real navigation (Play's sketch pages, etc.) — same leave-fade,
          // then a flag in sessionStorage so the destination's fresh load
          // can run the arrival half above
          try {
            sessionStorage.setItem(STORAGE_KEY, "1");
          } catch (err) {
            /* no sessionStorage — just navigate immediately below */
          }
          activeLink.classList.add("nav-link-item--leaving");
          setTimeout(() => {
            window.location.href = href;
          }, LEAVE_FADE_MS);
        });
      });
    })();

    // ── mobile pill toggle — expands in place to reveal Learn/Play; the
    // toggle button itself never moves, only its label flips Menu<->Close ──
    const mobilePill = nav.querySelector('.nav-mobile-pill');
    const hamburger = nav.querySelector('.nav-hamburger');
    const hamburgerLabel = hamburger.querySelector('.nav-label');

    function setMobilePillOpen(isOpen) {
      mobilePill.classList.toggle('nav-mobile-pill--open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      hamburger.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
      hamburgerLabel.textContent = isOpen ? 'Close' : 'Menu';
    }

    hamburger.addEventListener('click', () => {
      setMobilePillOpen(!mobilePill.classList.contains('nav-mobile-pill--open'));
    });

    // close when a Learn/Play link inside the pill is tapped
    mobilePill.querySelectorAll('.nav-mobile-link').forEach(link => {
      link.addEventListener('click', () => setMobilePillOpen(false));
    });

    // close on outside tap
    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) {
        setMobilePillOpen(false);
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
