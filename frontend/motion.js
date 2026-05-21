/**
 * Animaciones editoriales AeroRutas: reveals escalonados, pestañas y bloques dinámicos.
 * Respeta prefers-reduced-motion.
 */
(function initAeroMotion() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function revealImmediately(el) {
    if (!el) return;
    el.classList.add("is-revealed");
  }

  function revealAllStatic() {
    document.querySelectorAll("[data-reveal]").forEach(revealImmediately);
  }

  if (prefersReduced) {
    revealAllStatic();
    return;
  }

  const seen = new WeakSet();
  let revealIndex = 0;

  const revealObserver =
    "IntersectionObserver" in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              entry.target.classList.add("is-revealed");
              revealObserver.unobserve(entry.target);
            });
          },
          { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
        )
      : null;

  function registerReveal(el) {
    if (!el || seen.has(el)) return;
    seen.add(el);
    const delay = Math.min(revealIndex * 55, 240);
    revealIndex += 1;
    el.style.setProperty("--reveal-delay", `${delay}ms`);

    if (!revealObserver) {
      revealImmediately(el);
      return;
    }

    if (el.hidden) return;
    revealObserver.observe(el);
  }

  document.querySelectorAll("[data-reveal]").forEach(registerReveal);

  const dynamicIds = ["airportSpotlight", "recentRoutes", "routeStats"];
  dynamicIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    const attrObserver = new MutationObserver(() => {
      if (el.hidden) return;
      registerReveal(el);
      if (el.getBoundingClientRect().height > 0) {
        revealImmediately(el);
      }
      if (id === "routeStats") {
        el.querySelectorAll(".bento-cell").forEach((cell, i) => {
          cell.style.setProperty("--bento-delay", `${i * 70}ms`);
          cell.classList.add("bento-animate");
        });
      }
    });

    attrObserver.observe(el, { attributes: true, attributeFilter: ["hidden"] });
  });

  window.AeroMotion = { registerReveal, revealImmediately };
})();
