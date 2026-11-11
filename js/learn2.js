// Anchor-nav scrollspy — highlights the nav link (and its parent main-group
// link) for whichever .learn-sub section is currently crossing the middle
// band of the viewport.
document.addEventListener("DOMContentLoaded", () => {
  const subs = document.querySelectorAll(".learn-sub");
  const navLinks = document.querySelectorAll(".learn-nav-sub, .learn-nav-main");
  const navGroups = document.querySelectorAll(".learn-nav-group");
  if (!subs.length || !navLinks.length) return;

  const navSubByHref = new Map();
  const navMainByHref = new Map();
  document.querySelectorAll(".learn-nav-sub").forEach((a) => navSubByHref.set(a.getAttribute("href").slice(1), a));
  document.querySelectorAll(".learn-nav-main").forEach((a) => navMainByHref.set(a.getAttribute("href").slice(1), a));

  const fadeEls = document.querySelectorAll(".learn-sub, #intro");

  const setActive = (id) => {
    navLinks.forEach((a) => a.classList.remove("is-active"));
    navGroups.forEach((g) => g.classList.remove("is-active"));
    fadeEls.forEach((el) => el.classList.remove("is-centered"));
    document.getElementById(id)?.classList.add("is-centered");

    const subLink = navSubByHref.get(id);
    if (subLink) subLink.classList.add("is-active");

    // either `id` is itself a main-linked section (e.g. the intro), or it's
    // a .learn-sub whose parent .learn-main carries the main link
    const mainId = navMainByHref.has(id) ? id : document.getElementById(id)?.closest(".learn-main")?.id;
    const mainLink = mainId ? navMainByHref.get(mainId) : null;
    if (mainLink) {
      mainLink.classList.add("is-active");
      mainLink.closest(".learn-nav-group")?.classList.add("is-active");
    }
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    },
    { rootMargin: "-40% 0px -50% 0px", threshold: 0 }
  );

  const introEl = document.getElementById("intro");
  if (introEl) observer.observe(introEl);
  subs.forEach((sub) => observer.observe(sub));
  setActive(introEl ? "intro" : subs[0].id);

  // clicking a nav link fades the content out, jumps it so that section's
  // GIF is centered in the viewport (base.css makes body the real scroll
  // container here, not window), then fades back in
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();

      document.body.classList.add("is-nav-fading");
      setTimeout(() => {
        const media = target.querySelector(".learn-media") || target;
        const rect = media.getBoundingClientRect();
        const delta = rect.top + rect.height / 2 - window.innerHeight / 2;
        document.body.scrollTop += delta;
        history.pushState(null, "", `#${id}`);
        document.body.classList.remove("is-nav-fading");
      }, 250);
    });
  });
});
