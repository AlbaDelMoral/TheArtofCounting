// nav menu — each main title (Numbers/Addition/Multiplication/Complex
// Operations) is a dropdown holding its 4 subtitles. Only the chapter
// currently scrolled into view has its dropdown open; the rest stay
// closed. The same links double as an anchor nav (click to jump) and a
// scroll-spy (highlight + open whichever chapter/subsection is in view).
(function () {
  const titles = Array.from(document.querySelectorAll(".point-line-plane-title"));
  if (!titles.length) return;

  // pair each title with the dropdown right after it in the markup
  const chapters = titles
    .filter((title) => title.tagName === "A")
    .map((title) => {
      const dropdown = title.nextElementSibling;
      const subLinks = Array.from(dropdown.querySelectorAll("a"));
      return { title, dropdown, subLinks };
    });

  function activateChapter(chapter) {
    chapters.forEach((c) => {
      const isThisOne = c === chapter;
      c.title.classList.toggle("is-active", isThisOne);
      c.dropdown.classList.toggle("is-open", isThisOne);
      if (!isThisOne) c.subLinks.forEach((l) => l.classList.remove("is-active"));
    });
  }

  // tiny dot between the line and the numbers, tracking the active subtitle
  function moveDot(chapter, activeLink) {
    const dot = chapter.dropdown.querySelector(".point-line-plane-dot");
    if (!dot || !activeLink) return;
    const top =
      activeLink.offsetTop + activeLink.offsetHeight / 2 - dot.offsetHeight / 2;
    dot.style.top = `${top}px`;
  }

  const allSubSections = [];
  chapters.forEach((chapter) => {
    chapter.subLinks.forEach((link) => {
      const section = document.querySelector(link.getAttribute("href"));
      if (section) allSubSections.push({ section, link, chapter });
    });
  });

  let activeMatch = allSubSections[0];

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const match = allSubSections.find((s) => s.section === entry.target);
        if (!match) return;

        activeMatch = match;
        activateChapter(match.chapter);
        match.chapter.subLinks.forEach((l) =>
          l.classList.toggle("is-active", l === match.link)
        );
        moveDot(match.chapter, match.link);
      });
    },
    { rootMargin: "-40% 0px -40% 0px" }
  );

  allSubSections.forEach(({ section }) => observer.observe(section));

  // re-measure on resize/font-load — the subtitle text wraps differently at
  // different widths, which shifts each link's offsetTop
  function remeasureDot() {
    if (activeMatch) moveDot(activeMatch.chapter, activeMatch.link);
  }
  window.addEventListener("load", remeasureDot);
  window.addEventListener("resize", remeasureDot);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(remeasureDot);
  }
  remeasureDot();
})();

// intro number line — fills the ENTIRE width of the horizontal line with
// ticks (not just a fixed -10..10), so it has to be generated from the
// actual viewport width rather than hardcoded, and regenerated on resize
(function () {
  const axis = document.querySelector(".intro-axis");
  if (!axis) return;

  const TICK_SPACING = 60; // px — must match .intro-axis > span's transform in css/learn.css

  function updateIntroAxis() {
    const axisLeft = axis.getBoundingClientRect().left;
    const rightCount = Math.ceil((window.innerWidth - axisLeft) / TICK_SPACING) + 1;
    const leftCount = Math.ceil(axisLeft / TICK_SPACING) + 1;

    let html = "";
    for (let n = -leftCount; n <= rightCount; n++) {
      if (n === 0) continue;
      html +=
        n < 0
          ? `<span style="--n:${n}"><span class="intro-axis-minus">-</span>${-n}</span>`
          : `<span style="--n:${n}">${n}</span>`;
    }
    axis.innerHTML = html;
  }

  window.addEventListener("load", updateIntroAxis);
  window.addEventListener("resize", updateIntroAxis);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(updateIntroAxis);
  }
  updateIntroAxis();
})();
