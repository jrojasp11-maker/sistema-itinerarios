/**
 * Interacciones inspiradas en Framer (spring, magnetic, cursor glow, reveals).
 * Vanilla JS — respeta prefers-reduced-motion.
 */
(function initMotion() {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;

  const spring = "cubic-bezier(0.34, 1.45, 0.64, 1)";

  /* Cursor spotlight en el mapa */
  const mapStage = document.querySelector(".map-stage");
  const spotlight = document.createElement("div");
  spotlight.className = "cursor-spotlight";
  spotlight.setAttribute("aria-hidden", "true");
  if (mapStage) {
    mapStage.appendChild(spotlight);
    mapStage.addEventListener(
      "pointermove",
      (e) => {
        const rect = mapStage.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        spotlight.style.setProperty("--spot-x", `${x}%`);
        spotlight.style.setProperty("--spot-y", `${y}%`);
        spotlight.classList.add("active");
      },
      { passive: true },
    );
    mapStage.addEventListener("pointerleave", () => spotlight.classList.remove("active"));
  }

  /* Botones magnéticos */
  document.querySelectorAll("[data-magnetic]").forEach((btn) => {
    const strength = Number(btn.dataset.magneticStrength) || 0.35;
    btn.addEventListener("pointermove", (e) => {
      const rect = btn.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      btn.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      btn.style.transition = "transform 80ms ease-out";
    });
    btn.addEventListener("pointerleave", () => {
      btn.style.transform = "";
      btn.style.transition = `transform 420ms ${spring}`;
    });
  });

  /* Reveal al entrar en viewport (panel lateral) */
  const revealTargets = document.querySelectorAll("[data-reveal]");
  if (revealTargets.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    revealTargets.forEach((el, i) => {
      el.style.setProperty("--reveal-delay", `${Math.min(i * 60, 240)}ms`);
      io.observe(el);
    });
  }

  /* Parallax suave en orbes ambientales */
  const orbs = document.querySelectorAll(".orb");
  let orbTick = 0;
  document.addEventListener(
    "pointermove",
    (e) => {
      if (!orbs.length) return;
      cancelAnimationFrame(orbTick);
      orbTick = requestAnimationFrame(() => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        orbs.forEach((orb, i) => {
          const factor = (i + 1) * 6;
          orb.style.transform = `translate(${nx * factor}px, ${ny * factor}px)`;
        });
      });
    },
    { passive: true },
  );
})();
