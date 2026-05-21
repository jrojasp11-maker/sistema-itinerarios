/**
 * Micro-interacciones ligeras: reveal en panel y respeta prefers-reduced-motion.
 */
(function initMotion() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const revealTargets = document.querySelectorAll("[data-reveal]");
  if (!revealTargets.length || !("IntersectionObserver" in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
  );

  revealTargets.forEach((el, i) => {
    el.style.setProperty("--reveal-delay", `${Math.min(i * 50, 180)}ms`);
    io.observe(el);
  });
})();
