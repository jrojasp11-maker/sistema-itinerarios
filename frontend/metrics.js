/**
 * AeroRutas v2.0 — Módulo de Métricas y Filtro Regional
 * Draco Dark Dashboard
 */

/* ══════════════════════════════
   DATOS DE REGIONES DE COLOMBIA
══════════════════════════════ */
const REGION_MAP = {
  Andina: new Set([
    "BOG", "MDE", "EOH", "CLO", "BGA", "PEI", "AXM", "MZL",
    "CUC", "PSO", "VVC", "IBE", "CZU", "EJA", "MHF", "ACD",
  ]),
  Caribe: new Set([
    "BAQ", "CTG", "SMR", "MTR", "RCH", "SJE", "PVA", "ADN",
    "CSR", "OCV", "TLU", "BSC",
  ]),
  Pacífico: new Set([
    "TCO", "UIB", "BUN", "CRC", "NCI", "NVA",
  ]),
  Orinoquía: new Set([
    "VVC", "ACD", "ARQ", "PCR", "CPB", "EYP", "LPD", "SRO",
  ]),
  Amazonía: new Set([
    "LET", "MIT", "MQU", "API", "VAB", "PDA", "ECO",
  ]),
};

/** Obtiene la región de un aeropuerto por su IATA */
function getAirportRegion(airportId) {
  for (const [region, ids] of Object.entries(REGION_MAP)) {
    if (ids.has(airportId)) return region;
  }
  return null;
}

/* ══════════════════════════════
   ESTADO DEL FILTRO REGIONAL
══════════════════════════════ */
let activeRegion = "all";

function initRegionFilter() {
  const buttons = document.querySelectorAll(".region-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeRegion = btn.dataset.region;
      buttons.forEach((b) => {
        const active = b.dataset.region === activeRegion;
        b.classList.toggle("active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      applyRegionFilter();
    });
  });
}

function applyRegionFilter() {
  // Acceder al catálogo del app.js principal
  if (typeof airportCatalog === "undefined") return;

  airportCatalog.forEach((airport) => {
    const marker = document.getElementById(`airport-${airport.id}`);
    if (!marker) return;

    if (activeRegion === "all") {
      marker.classList.remove("region-dim");
      marker.style.pointerEvents = "";
    } else {
      const region = getAirportRegion(airport.id);
      const match = region === activeRegion;
      marker.classList.toggle("region-dim", !match);
      marker.style.pointerEvents = match ? "" : "none";
    }
  });

  // Actualizar contador
  updateRegionCount();
}

function updateRegionCount() {
  const el = document.getElementById("mapFilterCount");
  if (!el) return;

  if (activeRegion === "all") {
    const count = typeof getVisibleAirports === "function"
      ? getVisibleAirports().length
      : 0;
    el.textContent = `${count} aeropuertos`;
    return;
  }

  const regionIds = REGION_MAP[activeRegion];
  if (!regionIds) return;

  let count = 0;
  if (typeof airportCatalog !== "undefined") {
    airportCatalog.forEach((airport) => {
      if (regionIds.has(airport.id)) count++;
    });
  }
  el.textContent = `${count} en ${activeRegion}`;
}

/* ══════════════════════════════
   PANEL DE MÉTRICAS / ANALYTICS
══════════════════════════════ */
let cachedItineraries = [];

/** Llamada desde app.js cuando se cargan los itinerarios */
function onItinerariesLoaded(itineraries) {
  cachedItineraries = Array.isArray(itineraries) ? itineraries : [];
  // Renderizar métricas si la pestaña está activa
  if (document.getElementById("panelMetrics")?.classList.contains("active")) {
    renderMetrics();
  }
}

function renderMetrics() {
  const container = document.getElementById("metricsContent");
  if (!container) return;

  const data = cachedItineraries;

  if (!data.length) {
    container.innerHTML = `
      <div class="metrics-empty">
        <div class="metrics-icon">✈️</div>
        <p>Guarda itinerarios para ver tus métricas de vuelo.</p>
      </div>`;
    return;
  }

  // ── Calcular KPIs ──
  const totalRoutes = data.length;

  // Total km (usando haversineKm del catálogo si está disponible)
  let totalKm = 0;
  const routeCounts = {};
  const statusCounts = { Planeado: 0, Completado: 0, Cancelado: 0 };
  const monthCounts = {};
  const airportFreq = {};

  data.forEach((it) => {
    const status = it.status || it.estado || "Planeado";
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const origId = it.origin_iata || it.iata_origen || "";
    const destId = it.destination_iata || it.iata_destino || "";

    // Frecuencia de aeropuertos
    if (origId) airportFreq[origId] = (airportFreq[origId] || 0) + 1;
    if (destId) airportFreq[destId] = (airportFreq[destId] || 0) + 1;

    // Rutas más usadas
    if (origId && destId) {
      const key = `${origId} → ${destId}`;
      routeCounts[key] = (routeCounts[key] || 0) + 1;
    }

    // Km usando haversine si el catálogo está disponible
    if (
      typeof airportCatalog !== "undefined" &&
      typeof haversineKm === "function" &&
      origId &&
      destId
    ) {
      const orig = airportCatalog.get(origId);
      const dest = airportCatalog.get(destId);
      if (orig && dest) {
        totalKm += haversineKm(orig, dest);
      }
    }

    // Rutas por mes
    const dateStr = it.travel_date || it.fecha_viaje || it.date || "";
    if (dateStr) {
      const month = dateStr.slice(0, 7); // "YYYY-MM"
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    }
  });

  // Aeropuerto más frecuente
  const topAirport = Object.entries(airportFreq)
    .sort((a, b) => b[1] - a[1])[0];

  // Top 5 rutas
  const topRoutes = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Meses ordenados (últimos 6)
  const sortedMonths = Object.entries(monthCounts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6);

  const maxMonthCount = Math.max(...sortedMonths.map((m) => m[1]), 1);

  // ── Renderizar ──
  const kmStr = totalKm > 0
    ? `${Math.round(totalKm).toLocaleString("es-CO")} km`
    : "—";

  const kmVueltas = totalKm > 0
    ? `${(totalKm / 40075).toFixed(2)}× la Tierra`
    : "";

  const topAirportName = topAirport
    ? `${topAirport[0]} (${topAirport[1]} vuelos)`
    : "—";

  const completedPct = totalRoutes
    ? Math.round((statusCounts.Completado / totalRoutes) * 100)
    : 0;

  // Barras de distribución de estado
  const totalStatus = Object.values(statusCounts).reduce((s, v) => s + v, 0) || 1;
  const distBars = ["Planeado", "Completado", "Cancelado"]
    .map((s) => {
      const pct = ((statusCounts[s] || 0) / totalStatus) * 100;
      return `<div class="status-dist-bar ${s}" style="flex: ${pct}"></div>`;
    })
    .join("");

  const distLegend = ["Planeado", "Completado", "Cancelado"]
    .map((s) => `
      <div class="status-dist-item">
        <span class="status-dot ${s}"></span>
        <span>${s}: ${statusCounts[s] || 0}</span>
      </div>`)
    .join("");

  // Barras por mes
  const monthBars = sortedMonths
    .map(([month, count]) => {
      const pct = Math.round((count / maxMonthCount) * 100);
      const label = formatMonth(month);
      return `
        <div class="bar-row">
          <span class="bar-label">${label}</span>
          <div class="bar-track">
            <div class="bar-fill" style="--bar-pct: ${pct}%"></div>
          </div>
          <span class="bar-value">${count}</span>
        </div>`;
    })
    .join("");

  // Top rutas
  const topRouteRows = topRoutes
    .map(([route, count], i) => `
      <div class="top-route-row" style="animation-delay: ${i * 60}ms">
        <span class="route-rank">#${i + 1}</span>
        <span class="route-name">${escapeHtml(route)}</span>
        <span class="route-count">${count} vuelo${count > 1 ? "s" : ""}</span>
      </div>`)
    .join("");

  container.innerHTML = `
    <!-- KPI Grid -->
    <div class="kpi-grid">
      <div class="kpi-card" style="--kpi-delay: 0ms">
        <span class="kpi-icon">🛫</span>
        <span class="kpi-value">${totalRoutes}</span>
        <span class="kpi-label">Total rutas</span>
        <span class="kpi-sub">${completedPct}% completadas</span>
      </div>
      <div class="kpi-card" style="--kpi-delay: 60ms">
        <span class="kpi-icon">📍</span>
        <span class="kpi-value">${kmStr}</span>
        <span class="kpi-label">Km totales</span>
        ${kmVueltas ? `<span class="kpi-sub">${kmVueltas}</span>` : ""}
      </div>
      <div class="kpi-card" style="--kpi-delay: 120ms">
        <span class="kpi-icon">🏆</span>
        <span class="kpi-value">${topAirport ? topAirport[0] : "—"}</span>
        <span class="kpi-label">Aeropuerto top</span>
        <span class="kpi-sub">${topAirport ? `${topAirport[1]} vuelos` : ""}</span>
      </div>
      <div class="kpi-card" style="--kpi-delay: 180ms">
        <span class="kpi-icon">✅</span>
        <span class="kpi-value">${completedPct}%</span>
        <span class="kpi-label">Completados</span>
        <span class="kpi-sub">${statusCounts.Completado} de ${totalRoutes}</span>
      </div>
    </div>

    <!-- Distribución de estados -->
    <div class="status-dist chart-section">
      <div class="chart-title">Distribución por estado</div>
      <div class="status-dist-bars">${distBars || '<div class="status-dist-bar Planeado" style="flex:100"></div>'}</div>
      <div class="status-dist-legend">${distLegend}</div>
    </div>

    ${sortedMonths.length > 1 ? `
    <!-- Rutas por mes -->
    <div class="chart-section">
      <div class="chart-title">Vuelos por mes</div>
      <div class="bar-chart">${monthBars}</div>
    </div>` : ""}

    ${topRoutes.length ? `
    <!-- Top rutas -->
    <div class="top-routes">
      <div class="chart-title">Rutas más frecuentes</div>
      <div class="top-routes-table">${topRouteRows}</div>
    </div>` : ""}
  `;

  // Animar barras (delay para que el CSS transition funcione)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      container.querySelectorAll(".bar-fill").forEach((bar) => {
        bar.classList.add("animate");
      });
    });
  });
}

function formatMonth(yyyymm) {
  const [year, month] = yyyymm.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
}

/* ══════════════════════════════
   INICIALIZACIÓN
══════════════════════════════ */
document.addEventListener("DOMContentLoaded", () => {
  initRegionFilter();

  // Botón de refrescar métricas
  const refreshBtn = document.getElementById("refreshMetrics");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", renderMetrics);
  }
});

// Escuchar cuando app.js esté listo
window.addEventListener("aerorutas:ready", () => {
  // Aplicar región inicial (all = sin filtro)
  applyRegionFilter();
});

// Exposición global para que app.js la llame
window.onItinerariesLoaded = onItinerariesLoaded;
window.applyRegionFilter = applyRegionFilter;
