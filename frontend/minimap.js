/**
 * Mini-mapa satélite opcional (Leaflet + OSM) — no reemplaza el SVG principal.
 */
(function initMiniMap() {
  const STORAGE_KEY = "aerorutas_minimap";

  let map = null;
  let originMarker = null;
  let destMarker = null;
  let panelEl = null;
  let toggleBtn = null;
  let booted = false;

  function whenReady(fn) {
    if (window.AeroRutasAPI) {
      fn();
      return;
    }
    window.addEventListener("aerorutas:ready", () => fn(), { once: true });
  }

  function boot() {
    if (booted) return;
    panelEl = document.getElementById("miniMapPanel");
    toggleBtn = document.getElementById("toggleMiniMap");
    if (!panelEl || !toggleBtn) return;

    if (typeof L === "undefined") {
      requestAnimationFrame(boot);
      return;
    }

    booted = true;

    const saved = localStorage.getItem(STORAGE_KEY) === "1";
    if (saved) openPanel(false);

    toggleBtn.addEventListener("click", () => {
      if (panelEl.hidden) openPanel(true);
      else closePanel(true);
    });

    window.AeroRutasAPI.addSelectionListener(syncMarkers);
    syncMarkers();
  }

  function colombiaBounds() {
    const b = window.AeroRutasAPI.MAP_BOUNDS;
    return [
      [b.minLat, b.minLng],
      [b.maxLat, b.maxLng],
    ];
  }

  function ensureMap() {
    if (map) return map;
    const container = document.getElementById("miniMapLeaflet");
    if (!container || typeof L === "undefined") return null;

    map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 12,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.fitBounds(colombiaBounds(), { padding: [12, 12] });
    return map;
  }

  function markerIcon(kind) {
    const color = kind === "origin" ? "#5eb3ff" : "#7ee8c8";
    return L.divIcon({
      className: "mini-map-pin",
      html: `<span style="background:${color}"></span>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }

  function syncMarkers() {
    if (!map) return;
    const { origin, destination } = window.AeroRutasAPI.getState();

    if (originMarker) {
      map.removeLayer(originMarker);
      originMarker = null;
    }
    if (destMarker) {
      map.removeLayer(destMarker);
      destMarker = null;
    }

    const points = [];
    if (origin?.lat != null) {
      originMarker = L.marker([origin.lat, origin.lng], { icon: markerIcon("origin") })
        .addTo(map)
        .bindTooltip(`${origin.id} · origen`, { direction: "top" });
      points.push([origin.lat, origin.lng]);
    }
    if (destination?.lat != null) {
      destMarker = L.marker([destination.lat, destination.lng], {
        icon: markerIcon("destination"),
      })
        .addTo(map)
        .bindTooltip(`${destination.id} · destino`, { direction: "top" });
      points.push([destination.lat, destination.lng]);
    }

    if (points.length === 1) {
      map.setView(points[0], 7);
    } else if (points.length === 2) {
      map.fitBounds(points, { padding: [28, 28], maxZoom: 8 });
    } else {
      map.fitBounds(colombiaBounds(), { padding: [12, 12] });
    }
  }

  function openPanel(persist) {
    panelEl.hidden = false;
    toggleBtn.classList.add("active");
    toggleBtn.setAttribute("aria-pressed", "true");
    if (persist) localStorage.setItem(STORAGE_KEY, "1");

    const initMap = () => {
      const m = ensureMap();
      if (!m) return;
      m.invalidateSize({ animate: false });
      syncMarkers();
    };

    requestAnimationFrame(() => {
      initMap();
      setTimeout(initMap, 120);
    });
  }

  function closePanel(persist) {
    panelEl.hidden = true;
    toggleBtn.classList.remove("active");
    toggleBtn.setAttribute("aria-pressed", "false");
    if (persist) localStorage.setItem(STORAGE_KEY, "0");
  }

  function start() {
    whenReady(boot);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
