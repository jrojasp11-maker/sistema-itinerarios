/**
 * Simulador de vuelo: avión animado sobre #routeLine (respeta prefers-reduced-motion).
 */
(function initFlightSimulator() {
  const DURATION_MS = 7500;
  let planeGroup = null;
  let playing = false;
  let rafId = 0;
  let startTime = 0;
  let pausedProgress = 0;
  let btn = null;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function boot() {
    if (!window.AeroRutasAPI) {
      requestAnimationFrame(boot);
      return;
    }
    planeGroup = document.getElementById("flightPlane");
    btn = document.getElementById("toggleFlightSim");
    if (!planeGroup || !btn) return;

    btn.addEventListener("click", togglePlayback);
    prefersReduced.addEventListener("change", onReducedChange);

    const api = window.AeroRutasAPI;
    const prev = api.onSelectionChange;
    api.onSelectionChange = () => {
      if (typeof prev === "function") prev();
      stopSimulation(true);
      updateButtonState();
    };

    updateButtonState();
  }

  function onReducedChange() {
    if (prefersReduced.matches) stopSimulation(true);
    updateButtonState();
  }

  function getRouteLine() {
    return window.AeroRutasAPI.getEls()?.routeLine;
  }

  function hasRoute() {
    const line = getRouteLine();
    return line?.classList.contains("visible") && line.getAttribute("d");
  }

  function updateButtonState() {
    if (!btn) return;
    const routeReady = hasRoute();
    btn.disabled = !routeReady;
    if (!routeReady) {
      btn.setAttribute("aria-pressed", "false");
      btn.title = "Selecciona origen y destino para simular";
    } else if (prefersReduced.matches) {
      btn.title = "Movimiento reducido activo: simulación deshabilitada";
      btn.disabled = true;
    } else {
      btn.title = playing ? "Pausar simulación" : "Simular vuelo sobre la ruta";
    }
  }

  function placePlaneAt(progress) {
    const line = getRouteLine();
    if (!line || !planeGroup) return;
    const len = line.getTotalLength();
    if (!len) return;
    const t = Math.max(0, Math.min(1, progress));
    const point = line.getPointAtLength(len * t);
    const ahead = line.getPointAtLength(Math.min(len, len * t + 4));
    const angle = (Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180) / Math.PI;
    planeGroup.setAttribute(
      "transform",
      `translate(${point.x}, ${point.y}) rotate(${angle + 90})`,
    );
    planeGroup.classList.add("visible");
  }

  function tick(now) {
    if (!playing) return;
    const elapsed = now - startTime;
    const progress = pausedProgress + elapsed / DURATION_MS;
    if (progress >= 1) {
      placePlaneAt(1);
      pausedProgress = 0;
      playing = false;
      updateButtonState();
      btn?.setAttribute("aria-pressed", "false");
      return;
    }
    placePlaneAt(progress);
    rafId = requestAnimationFrame(tick);
  }

  function startSimulation() {
    if (!hasRoute() || prefersReduced.matches) return;
    stopSimulation(false);
    playing = true;
    startTime = performance.now();
    btn?.setAttribute("aria-pressed", "true");
    updateButtonState();
    rafId = requestAnimationFrame(tick);
  }

  function stopSimulation(hidePlane) {
    playing = false;
    cancelAnimationFrame(rafId);
    if (hidePlane) {
      pausedProgress = 0;
      planeGroup?.classList.remove("visible");
      planeGroup?.removeAttribute("transform");
    }
    btn?.setAttribute("aria-pressed", "false");
    updateButtonState();
  }

  function togglePlayback() {
    if (!hasRoute() || prefersReduced.matches) return;
    if (playing) {
      const line = getRouteLine();
      const len = line?.getTotalLength() || 0;
      if (len) {
        const elapsed = performance.now() - startTime;
        pausedProgress = Math.min(1, pausedProgress + elapsed / DURATION_MS);
      }
      playing = false;
      cancelAnimationFrame(rafId);
      updateButtonState();
      return;
    }
    if (pausedProgress >= 1) pausedProgress = 0;
    startSimulation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
