const host = window.location.hostname || "localhost";
const protocol = window.location.protocol === "https:" ? "https:" : "http:";
const API = {
  airport: `${protocol}//${host}:8001`,
  itinerary: `${protocol}//${host}:8002`,
};

/** Límites geográficos proyectados al mapa real (GeoJSON → SVG 470×680) */
const MAP_BOUNDS = {
  minLng: -78.990935,
  maxLng: -66.876326,
  minLat: -4.298187,
  maxLat: 12.437303,
  x0: 36,
  y0: 48,
  width: 398,
  height: 584,
};

/** Aeropuertos destacados para la vista "Principales" */
const PRINCIPAL_IDS = new Set([
  "BOG", "MDE", "CLO", "CTG", "BAQ", "BGA", "PEI", "SMR", "VVC", "AXM",
  "CUC", "MTR", "PSO", "LET", "UIB", "TCO", "EOH", "MZL",
]);

const principalSeeds = [
  { id: "BOG", name: "El Dorado", city: "Bogotá", lat: 4.7016, lng: -74.1469, isPrincipal: true },
  { id: "MDE", name: "José María Córdova", city: "Medellín", lat: 6.1645, lng: -75.4231, isPrincipal: true },
  { id: "CLO", name: "Alfonso Bonilla Aragón", city: "Cali", lat: 3.5432, lng: -76.3816, isPrincipal: true },
  { id: "CTG", name: "Rafael Núñez", city: "Cartagena", lat: 10.4424, lng: -75.513, isPrincipal: true },
  { id: "BAQ", name: "Ernesto Cortissoz", city: "Barranquilla", lat: 10.8896, lng: -74.7808, isPrincipal: true },
  { id: "BGA", name: "Palonegro", city: "Bucaramanga", lat: 7.1265, lng: -73.1848, isPrincipal: true },
  { id: "PEI", name: "Matecaña", city: "Pereira", lat: 4.8126, lng: -75.7395, isPrincipal: true },
  { id: "SMR", name: "Simón Bolívar", city: "Santa Marta", lat: 11.1196, lng: -74.2306, isPrincipal: true },
  { id: "VVC", name: "La Vanguardia", city: "Villavicencio", lat: 4.1679, lng: -73.6138, isPrincipal: true },
  { id: "AXM", name: "El Edén", city: "Armenia", lat: 4.4526, lng: -75.7683, isPrincipal: true },
  { id: "CUC", name: "Camilo Daza", city: "Cúcuta", lat: 7.9275, lng: -72.5115, isPrincipal: true },
  { id: "MTR", name: "Los Garzones", city: "Montería", lat: 8.8234, lng: -75.8258, isPrincipal: true },
  { id: "PSO", name: "Antonio Nariño", city: "Pasto", lat: 1.2136, lng: -77.2911, isPrincipal: true },
  { id: "LET", name: "Alfredo Vásquez Cobo", city: "Leticia", lat: -4.1936, lng: -69.9432, isPrincipal: true },
  { id: "UIB", name: "El Caraño", city: "Quibdó", lat: 5.6908, lng: -76.6412, isPrincipal: true },
  { id: "TCO", name: "La Florida", city: "Tumaco", lat: 1.8147, lng: -78.7492, isPrincipal: true },
  { id: "EOH", name: "Olaya Herrera", city: "Medellín", lat: 6.219, lng: -75.5905, isPrincipal: true },
  { id: "MZL", name: "La Nubia", city: "Manizales", lat: 5.0296, lng: -75.4647, isPrincipal: true },
];

/** Catálogo completo indexado por IATA (se llena desde la API) */
const airportCatalog = new Map();

const LABEL_OFFSETS = {
  BOG: { dx: 0, dy: -16 },
  MDE: { dx: 14, dy: -14 },
  EOH: { dx: -16, dy: 8 },
  PEI: { dx: -14, dy: -12 },
  AXM: { dx: -12, dy: 6 },
  MZL: { dx: 12, dy: 4 },
  CLO: { dx: -14, dy: 10 },
  BGA: { dx: 12, dy: -10 },
  CUC: { dx: 10, dy: -12 },
};

const RECENT_ROUTES_KEY = "aerorutas_recent_routes";
const THEME_KEY = "aerorutas_theme";
const CRUISE_KMH = 750;
const ROUTING_FACTOR = 1.12;
const GROUND_MINUTES = 25;

const state = {
  origin: null,
  destination: null,
  activeTab: "new",
  lastSelected: null,
  mapMode: "principal",
  airportSearch: "",
};

const photoCache = new Map();
let airportMedia = { fallback: "", airports: {} };

const $ = (selector) => document.querySelector(selector);
const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  seedPrincipalAirports();
  cacheElements();
  setDefaultTravelDate();
  await Promise.all([loadMapConfig(), loadAirportMedia()]);
  initDocLinks();
  initTheme();
  bindEvents();
  renderAirports();
  updateMapFilterCount();
  renderRecentRoutes();
  await loadAirportsFromApi();
  updateClock();
  updateSelection();
  setInterval(updateClock, 1000);
  checkHealth();
  setInterval(checkHealth, 20000);
  await loadItineraries();
  refreshIcons();
  updateTabIndicator();
  requestAnimationFrame(() => document.body.classList.add("app-ready"));
}

function seedPrincipalAirports() {
  airportCatalog.clear();
  principalSeeds.forEach((airport) => {
    const entry = { ...airport };
    positionAirport(entry);
    airportCatalog.set(entry.id, entry);
  });
}

function setDefaultTravelDate() {
  const today = new Date().toISOString().slice(0, 10);
  els.travelDate.min = today;
}

async function loadMapConfig() {
  try {
    const response = await fetch("./assets/map-config.json");
    if (!response.ok) return;
    const config = await response.json();
    if (config.path) {
      els.colombiaOutlinePath?.setAttribute("d", config.path);
      els.colombiaBorder?.setAttribute("d", config.path);
      els.colombiaBorderGlow?.setAttribute("d", config.path);
    }
  } catch {
    // El SVG de respaldo mantiene la silueta aunque falle la configuración.
  }
}

async function loadAirportMedia() {
  try {
    const response = await fetch("./assets/airport-media.json");
    if (response.ok) airportMedia = await response.json();
  } catch {
    airportMedia = {
      fallback:
        "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=720&q=80",
      airports: {},
    };
  }
}

function projectToMap(lat, lng) {
  const latClamped = Math.min(MAP_BOUNDS.maxLat, Math.max(MAP_BOUNDS.minLat, lat));
  const lngClamped = Math.min(MAP_BOUNDS.maxLng, Math.max(MAP_BOUNDS.minLng, lng));
  const xRatio = (lngClamped - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
  const yRatio = (MAP_BOUNDS.maxLat - latClamped) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  return {
    x: Math.round(MAP_BOUNDS.x0 + xRatio * MAP_BOUNDS.width),
    y: Math.round(MAP_BOUNDS.y0 + yRatio * MAP_BOUNDS.height),
  };
}

function positionAirport(airport) {
  if (Number.isFinite(airport.lat) && Number.isFinite(airport.lng)) {
    Object.assign(airport, projectToMap(airport.lat, airport.lng));
  }
}

function getVisibleAirports() {
  const list = [...airportCatalog.values()].filter(
    (airport) => Number.isFinite(airport.x) && Number.isFinite(airport.y),
  );
  if (state.mapMode === "all") {
    return list.sort((a, b) => a.id.localeCompare(b.id));
  }
  return list
    .filter((airport) => airport.isPrincipal || PRINCIPAL_IDS.has(airport.id))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function preferAirportCandidate(next, current) {
  const nextIntl = /internacional/i.test(next.name);
  const currentIntl = /internacional/i.test(current.name);
  if (nextIntl && !currentIntl) return true;
  if (!nextIntl && currentIntl) return false;
  return next.name.length > current.name.length;
}

function normalizeApiAirport(item) {
  const id = String(item.id || item.iataCode || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(id)) return null;

  const lat = Number(item.lat);
  const lng = Number(item.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  return {
    id,
    name: item.nombre || item.name || id,
    city: item.ciudad || item.city || "Colombia",
    departamento: item.departamento || "",
    lat,
    lng,
    isPrincipal: PRINCIPAL_IDS.has(id),
  };
}

function cacheElements() {
  Object.assign(els, {
    airportHealth: $("#airportHealth"),
    itineraryHealth: $("#itineraryHealth"),
    clock: $("#clock"),
    airportLayer: $("#airportLayer"),
    mapSvg: $("#mapSvg"),
    colombiaOutlinePath: $("#colombiaOutlinePath"),
    colombiaBorder: $("#colombiaBorder"),
    colombiaBorderGlow: $("#colombiaBorderGlow"),
    mapHint: $("#mapHint"),
    tooltip: $("#mapTooltip"),
    tooltipPhoto: $("#tooltipPhoto"),
    tooltipCode: $("#tooltipCode"),
    tooltipName: $("#tooltipName"),
    routeShadow: $("#routeShadow"),
    routeLine: $("#routeLine"),
    routePulse: $("#routePulse"),
    mapStage: document.querySelector(".map-stage"),
    tabIndicator: $("#tabIndicator"),
    selectionDock: $("#selectionDock"),
    dockOrigin: $("#dockOrigin"),
    dockDestination: $("#dockDestination"),
    clearSelection: $("#clearSelection"),
    airportSpotlight: $("#airportSpotlight"),
    spotlightPhoto: $("#spotlightPhoto"),
    spotlightRole: $("#spotlightRole"),
    spotlightCode: $("#spotlightCode"),
    spotlightName: $("#spotlightName"),
    spotlightCity: $("#spotlightCity"),
    originThumb: $("#originThumb"),
    destinationThumb: $("#destinationThumb"),
    originCode: $("#originCode"),
    originCity: $("#originCity"),
    destinationCode: $("#destinationCode"),
    destinationCity: $("#destinationCity"),
    routeStats: $("#routeStats"),
    routeDistance: $("#routeDistance"),
    routeFlightTime: $("#routeFlightTime"),
    airportSearch: $("#airportSearch"),
    recentRoutes: $("#recentRoutes"),
    recentChips: $("#recentChips"),
    linkAirportDocs: $("#linkAirportDocs"),
    linkItineraryDocs: $("#linkItineraryDocs"),
    themeToggle: $("#themeToggle"),
    itineraryForm: $("#itineraryForm"),
    travelDate: $("#travelDate"),
    duration: $("#duration"),
    userId: $("#userId"),
    generateUuid: $("#generateUuid"),
    toast: $("#toast"),
    saveButton: $("#saveButton"),
    dateFilter: $("#dateFilter"),
    clearFilter: $("#clearFilter"),
    refreshList: $("#refreshList"),
    itineraryList: $("#itineraryList"),
    listCount: $("#listCount"),
    mapFilterButtons: document.querySelectorAll(".map-filter-btn"),
    mapFilterCount: $("#mapFilterCount"),
  });
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => setTab(tab.dataset.tab));
  });

  els.clearSelection.addEventListener("click", clearSelection);
  els.generateUuid.addEventListener("click", () => {
    els.userId.value = crypto.randomUUID();
    els.userId.focus();
  });
  els.itineraryForm.addEventListener("submit", saveItinerary);
  els.dateFilter.addEventListener("input", loadItineraries);
  els.clearFilter.addEventListener("click", () => {
    els.dateFilter.value = "";
    loadItineraries();
  });
  els.refreshList.addEventListener("click", loadItineraries);
  els.itineraryList.addEventListener("click", (event) => {
    if (event.target.closest("#retryList")) {
      loadItineraries();
      return;
    }
    const button = event.target.closest("[data-delete-id]");
    if (button) deleteItinerary(button.dataset.deleteId);
  });

  els.mapFilterButtons.forEach((button) => {
    button.addEventListener("click", () => setMapMode(button.dataset.mapMode));
  });

  els.airportSearch?.addEventListener("input", () => {
    state.airportSearch = els.airportSearch.value.trim().toLowerCase();
    paintSearchHighlights();
  });

  els.recentRoutes?.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-recent-index]");
    if (!chip) return;
    const routes = loadRecentRoutes();
    const entry = routes[Number(chip.dataset.recentIndex)];
    if (entry) applyRecentRoute(entry);
  });

  els.themeToggle?.addEventListener("click", toggleTheme);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") clearSelection();
  });

  window.addEventListener("resize", () => {
    if (els.tooltip.classList.contains("show")) hideTooltip();
    updateTabIndicator();
  });
}

function initDocLinks() {
  if (els.linkAirportDocs) els.linkAirportDocs.href = `${API.airport}/docs`;
  if (els.linkItineraryDocs) els.linkItineraryDocs.href = `${API.itinerary}/docs`;
}

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = saved || (prefersLight ? "light" : "dark");
  document.documentElement.dataset.theme = theme === "light" ? "light" : "";
}

function toggleTheme() {
  const isLight = document.documentElement.dataset.theme === "light";
  if (isLight) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(THEME_KEY, "dark");
  } else {
    document.documentElement.dataset.theme = "light";
    localStorage.setItem(THEME_KEY, "light");
  }
}

function loadRecentRoutes() {
  try {
    const raw = localStorage.getItem(RECENT_ROUTES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecentRoute(origin, destination) {
  const routes = loadRecentRoutes().filter(
    (r) => !(r.originId === origin.id && r.destId === destination.id),
  );
  routes.unshift({
    originId: origin.id,
    destId: destination.id,
    label: `${origin.id} → ${destination.id}`,
    savedAt: Date.now(),
  });
  localStorage.setItem(RECENT_ROUTES_KEY, JSON.stringify(routes.slice(0, 5)));
  renderRecentRoutes();
}

function renderRecentRoutes() {
  const routes = loadRecentRoutes();
  if (!els.recentRoutes || !els.recentChips) return;
  if (!routes.length) {
    els.recentRoutes.hidden = true;
    return;
  }
  els.recentRoutes.hidden = false;
  els.recentChips.innerHTML = routes
    .map(
      (route, index) =>
        `<button type="button" class="recent-chip" data-recent-index="${index}" title="Cargar ruta">${escapeHtml(route.label)}</button>`,
    )
    .join("");
}

function applyRecentRoute(entry) {
  const origin = airportCatalog.get(entry.originId);
  const destination = airportCatalog.get(entry.destId);
  if (!origin || !destination) {
    showToast("Uno de los aeropuertos de la ruta reciente ya no está disponible.", "warn");
    return;
  }
  state.origin = origin;
  state.destination = destination;
  state.lastSelected = destination;
  updateSelection();
  showToast(`Ruta ${entry.label} cargada.`, "ok", 2200);
}

function paintSearchHighlights() {
  const query = state.airportSearch;
  getVisibleAirports().forEach((airport) => {
    const group = document.getElementById(`airport-${airport.id}`);
    if (!group) return;
    const haystack = `${airport.id} ${airport.name} ${airport.city}`.toLowerCase();
    const match = !query || haystack.includes(query);
    group.classList.toggle("search-match", Boolean(query && match));
    group.classList.toggle("search-dim", Boolean(query && !match));
  });
}

function estimateFlightMinutes(km) {
  const airMinutes = ((km * ROUTING_FACTOR) / CRUISE_KMH) * 60;
  return Math.max(15, Math.round(airMinutes + GROUND_MINUTES));
}

function formatFlightEstimate(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `~${rest} min`;
  if (!rest) return `~${hours} h`;
  return `~${hours} h ${rest} min`;
}

function updateClock() {
  els.clock.textContent = new Date().toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

async function checkHealth() {
  await Promise.all([
    setHealth(els.airportHealth, `${API.airport}/health`, "Aeropuertos"),
    setHealth(els.itineraryHealth, `${API.itinerary}/health`, "Itinerarios"),
  ]);
}

async function setHealth(element, url, label) {
  const labelNode = element.querySelector(".chip-label");
  const statusNode = element.querySelector(".chip-status");
  try {
    const response = await fetchWithTimeout(url, {}, 3500);
    const online = response.ok;
    element.classList.toggle("up", online);
    element.classList.toggle("down", !online);
    if (labelNode) labelNode.textContent = label;
    if (statusNode) statusNode.textContent = online ? "En línea" : "Sin conexión";
  } catch {
    element.classList.remove("up");
    element.classList.add("down");
    if (labelNode) labelNode.textContent = label;
    if (statusNode) statusNode.textContent = "Sin conexión";
  }
}

async function loadAirportsFromApi() {
  try {
    const response = await fetchWithTimeout(`${API.airport}/airports/`, {}, 8000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const merged = new Map();

    data.forEach((item) => {
      const airport = normalizeApiAirport(item);
      if (!airport) return;
      const existing = merged.get(airport.id);
      if (!existing || preferAirportCandidate(airport, existing)) {
        merged.set(airport.id, airport);
      }
    });

    principalSeeds.forEach((seed) => {
      const fromApi = merged.get(seed.id);
      merged.set(seed.id, {
        ...seed,
        ...(fromApi || {}),
        isPrincipal: true,
      });
    });

    merged.forEach((airport, id) => {
      positionAirport(airport);
      airportCatalog.set(id, airport);
    });
  } catch {
    showToast("Usando aeropuertos principales en caché. Servicio de aeropuertos no disponible.", "warn", 5000);
  }

  renderAirports();
  updateMapFilterCount();
  updateSelection();
}

function setMapMode(mode) {
  if (mode !== "principal" && mode !== "all") return;
  state.mapMode = mode;

  els.mapFilterButtons.forEach((button) => {
    const active = button.dataset.mapMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  els.mapSvg.classList.toggle("mode-all", mode === "all");
  pruneSelectionToVisible();
  renderAirports();
  updateMapFilterCount();
  paintSearchHighlights();
  updateSelection();
}

function pruneSelectionToVisible() {
  const visible = new Set(getVisibleAirports().map((airport) => airport.id));
  if (state.origin && !visible.has(state.origin.id)) state.origin = null;
  if (state.destination && !visible.has(state.destination.id)) state.destination = null;
  if (!state.origin) state.destination = null;
  if (state.lastSelected && !visible.has(state.lastSelected.id)) {
    state.lastSelected = state.destination || state.origin;
  }
}

function updateMapFilterCount() {
  const principals = [...airportCatalog.values()].filter(
    (airport) => airport.isPrincipal || PRINCIPAL_IDS.has(airport.id),
  ).length;
  const total = airportCatalog.size;
  const visible = getVisibleAirports().length;

  if (state.mapMode === "all") {
    if (total > principals) {
      els.mapFilterCount.textContent = `${visible} de ${total} aeropuertos`;
    } else {
      els.mapFilterCount.textContent = `${visible} aeropuertos (servicio no conectado)`;
    }
  } else {
    els.mapFilterCount.textContent = `${visible} principales`;
  }

  els.mapFilterCount.title = `Catálogo API: ${total} · Principales: ${principals}`;
}

async function resolveAirportPhoto(airport) {
  if (!airport) return airportMedia.fallback;
  if (photoCache.has(airport.id)) return photoCache.get(airport.id);

  const catalog = airportMedia.airports?.[airport.id];
  let url = catalog?.image || airportMedia.fallback;

  if (catalog?.wiki) {
    try {
      const response = await fetchWithTimeout(
        `https://es.wikipedia.org/api/rest_v1/page/summary/${catalog.wiki}`,
        {},
        4500,
      );
      if (response.ok) {
        const payload = await response.json();
        url =
          payload.thumbnail?.source ||
          payload.originalimage?.source ||
          url;
      }
    } catch {
      // Se usa la imagen del catálogo local.
    }
  }

  photoCache.set(airport.id, url);
  return url;
}

function preloadAirportPhoto(airport) {
  resolveAirportPhoto(airport).then((url) => {
    const img = new Image();
    img.src = url;
  });
}

function renderAirports() {
  els.airportLayer.innerHTML = "";
  getVisibleAirports().forEach((airport) => {
    const offset = LABEL_OFFSETS[airport.id] || { dx: 0, dy: -14 };
    const group = svgEl("g", {
      class: "airport-marker",
      id: `airport-${airport.id}`,
      tabindex: "0",
      role: "button",
      "aria-label": `${airport.id}, ${airport.name}, ${airport.city}`,
    });
    const ring = svgEl("circle", {
      class: "marker-ring",
      cx: airport.x,
      cy: airport.y,
      r: 11,
    });
    const dot = svgEl("circle", {
      class: "marker-dot",
      cx: airport.x,
      cy: airport.y,
      r: 5,
    });
    const label = svgEl("text", {
      class: "marker-label",
      x: airport.x + offset.dx,
      y: airport.y + offset.dy,
    });
    label.textContent = airport.id;
    group.append(ring, dot, label);
    group.addEventListener("click", () => selectAirport(airport));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectAirport(airport);
      }
    });
    group.addEventListener("pointerenter", () => {
      preloadAirportPhoto(airport);
      showTooltip(airport);
    });
    group.addEventListener("pointerleave", hideTooltip);
    els.airportLayer.appendChild(group);
  });
  paintMarkers();
  paintSearchHighlights();
}

function svgEl(tag, attrs) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function selectAirport(airport) {
  const ref = airportCatalog.get(airport.id) || airport;
  if (!state.origin) {
    state.origin = ref;
  } else if (!state.destination && ref.id !== state.origin.id) {
    state.destination = ref;
  } else {
    state.origin = ref;
    state.destination = null;
  }
  state.lastSelected = ref;
  flashMarker(ref.id);
  updateSelection();
}

function flashMarker(airportId) {
  const group = document.getElementById(`airport-${airportId}`);
  if (!group) return;
  group.classList.remove("picked");
  void group.offsetWidth;
  group.classList.add("picked");
  window.setTimeout(() => group.classList.remove("picked"), 480);
}

function clearSelection() {
  state.origin = null;
  state.destination = null;
  state.lastSelected = null;
  updateSelection();
}

function updateSelection() {
  paintMarkers();
  updateAirportBox("origin", state.origin);
  updateAirportBox("destination", state.destination);
  updateSpotlight();
  updateRouteStats();

  els.dockOrigin.textContent = state.origin
    ? `${state.origin.id} · ${state.origin.city}`
    : "Sin seleccionar";
  els.dockDestination.textContent = state.destination
    ? `${state.destination.id} · ${state.destination.city}`
    : "Sin seleccionar";
  els.selectionDock.classList.toggle("visible", Boolean(state.origin));
  els.mapHint?.classList.toggle("hidden", Boolean(state.origin));

  if (state.origin && state.destination) {
    drawRoute(state.origin, state.destination);
  } else {
    els.routeShadow.classList.remove("visible");
    els.routeLine.classList.remove("visible");
    els.routeShadow.removeAttribute("d");
    els.routeLine.removeAttribute("d");
    els.mapStage?.classList.remove("route-active");
    els.routePulse?.setAttribute("opacity", "0");
    cancelAnimationFrame(routeAnimFrame);
  }
}

async function updateAirportBox(type, airport) {
  const code = type === "origin" ? els.originCode : els.destinationCode;
  const city = type === "origin" ? els.originCity : els.destinationCity;
  const thumb = type === "origin" ? els.originThumb : els.destinationThumb;
  const box = code.closest(".airport-box");
  code.textContent = airport ? airport.id : "---";
  city.textContent = airport ? airport.city : "Pendiente";
  box.classList.toggle("ready", Boolean(airport));

  if (!airport) {
    thumb.hidden = true;
    thumb.removeAttribute("src");
    return;
  }

  const photoUrl = await resolveAirportPhoto(airport);
  thumb.src = photoUrl;
  thumb.alt = `Aeropuerto ${airport.name}, ${airport.city}`;
  thumb.hidden = false;
}

async function updateSpotlight() {
  const airport = state.lastSelected || state.destination || state.origin;
  if (!airport) {
    els.airportSpotlight.hidden = true;
    return;
  }

  const role = state.lastSelected?.id === state.destination?.id ? "Destino" : "Origen";
  const photoUrl = await resolveAirportPhoto(airport);

  els.airportSpotlight.hidden = false;
  els.spotlightRole.textContent = role;
  els.spotlightRole.className = `spotlight-badge ${role === "Destino" ? "destination" : "origin"}`;
  els.spotlightCode.textContent = airport.id;
  els.spotlightName.textContent = airport.name;
  els.spotlightCity.textContent = `${airport.city} · Colombia`;
  els.spotlightPhoto.src = photoUrl;
  els.spotlightPhoto.alt = `Vista del aeropuerto ${airport.name}`;
}

function updateRouteStats() {
  if (!state.origin || !state.destination) {
    els.routeStats.hidden = true;
    return;
  }
  const km = haversineKm(state.origin, state.destination);
  const flightMin = estimateFlightMinutes(km);
  els.routeDistance.textContent = `${km.toLocaleString("es-CO", { maximumFractionDigits: 0 })} km`;
  if (els.routeFlightTime) {
    els.routeFlightTime.textContent = formatFlightEstimate(flightMin);
  }
  els.routeStats.hidden = false;
  els.routeStats.classList.add("is-revealed");
  els.routeStats.querySelectorAll(".bento-cell").forEach((cell, i) => {
    cell.style.setProperty("--bento-delay", `${i * 70}ms`);
    cell.classList.add("bento-animate");
  });
}

function haversineKm(origin, destination) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(destination.lat - origin.lat);
  const dLng = toRad(destination.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(origin.lat)) * Math.cos(toRad(destination.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function paintMarkers() {
  getVisibleAirports().forEach((airport) => {
    const group = document.getElementById(`airport-${airport.id}`);
    if (!group) return;
    group.classList.toggle("origin", state.origin?.id === airport.id);
    group.classList.toggle("destination", state.destination?.id === airport.id);
    group.classList.toggle(
      "dimmed",
      Boolean(state.origin) && ![state.origin?.id, state.destination?.id].includes(airport.id),
    );
  });
}

let routeAnimFrame = 0;

function drawRoute(origin, destination) {
  const controlX = (origin.x + destination.x) / 2;
  const controlY = (origin.y + destination.y) / 2 - 58;
  const path = `M${origin.x},${origin.y} Q${controlX},${controlY} ${destination.x},${destination.y}`;
  [els.routeShadow, els.routeLine].forEach((line) => line.setAttribute("d", path));

  const length = els.routeLine.getTotalLength();
  els.routeLine.style.strokeDasharray = `${length}`;
  els.routeLine.style.strokeDashoffset = `${length}`;
  els.routeShadow.classList.add("visible");
  els.routeLine.classList.add("visible");
  els.mapStage?.classList.add("route-active");

  cancelAnimationFrame(routeAnimFrame);
  animateRoutePulse(length);

  requestAnimationFrame(() => {
    els.routeLine.style.strokeDashoffset = "0";
  });
}

function animateRoutePulse(pathLength) {
  if (!els.routePulse || !els.routeLine) return;
  const start = performance.now();
  const duration = 1100;

  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 3;
    const point = els.routeLine.getPointAtLength(pathLength * eased);
    els.routePulse.setAttribute("cx", String(point.x));
    els.routePulse.setAttribute("cy", String(point.y));
    els.routePulse.classList.toggle("traveling", t < 0.98);

    if (t < 1) {
      routeAnimFrame = requestAnimationFrame(tick);
    } else {
      els.routePulse.setAttribute("opacity", "0");
    }
  };

  els.routePulse.setAttribute("opacity", "1");
  els.routePulse.classList.remove("traveling");
  void els.routePulse.offsetWidth;
  els.routePulse.classList.add("traveling");
  routeAnimFrame = requestAnimationFrame(tick);
}

async function showTooltip(airport) {
  const ctm = els.mapSvg.getScreenCTM();
  if (!ctm) return;

  const stageRect = els.mapSvg.parentElement.getBoundingClientRect();
  const point = els.mapSvg.createSVGPoint();
  point.x = airport.x;
  point.y = airport.y;
  const screenPoint = point.matrixTransform(ctm);
  const x = screenPoint.x - stageRect.left;
  const y = screenPoint.y - stageRect.top;

  els.tooltipCode.textContent = airport.id;
  els.tooltipName.textContent = `${airport.name} · ${airport.city}`;
  els.tooltip.style.left = `${x}px`;
  els.tooltip.style.top = `${y}px`;

  const photoUrl = await resolveAirportPhoto(airport);
  els.tooltipPhoto.src = photoUrl;
  els.tooltipPhoto.alt = `Foto de ${airport.name}`;
  els.tooltipPhoto.hidden = false;
  els.tooltip.classList.add("show", "with-photo");
}

function hideTooltip() {
  els.tooltip.classList.remove("show", "with-photo");
  els.tooltipPhoto.hidden = true;
}

function setTab(name) {
  state.activeTab = name;
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === name;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  const activePanel = name === "new" ? $("#panelNew") : $("#panelList");
  $("#panelNew").classList.toggle("active", name === "new");
  $("#panelList").classList.toggle("active", name === "list");
  if (activePanel) {
    activePanel.classList.remove("tab-enter");
    void activePanel.offsetWidth;
    activePanel.classList.add("tab-enter");
  }
  updateTabIndicator();
  if (name === "list") loadItineraries();
  refreshIcons();
}

function updateTabIndicator() {
  const indicator = els.tabIndicator;
  const activeTab = document.querySelector(".tab.active");
  if (!indicator || !activeTab) return;
  const bar = activeTab.closest(".tabbar");
  if (!bar) return;
  const barRect = bar.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();
  indicator.style.width = `${tabRect.width}px`;
  indicator.style.transform = `translateX(${tabRect.left - barRect.left}px)`;
}

async function saveItinerary(event) {
  event.preventDefault();

  if (!state.origin || !state.destination) {
    showToast("Selecciona origen y destino en el mapa.", "warn");
    return;
  }

  const date = els.travelDate.value;
  const duration = Number.parseInt(els.duration.value, 10);
  const userId = els.userId.value.trim();
  const status = new FormData(els.itineraryForm).get("status");
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!date) return showToast("Ingresa la fecha de viaje.", "warn");
  if (!Number.isFinite(duration) || duration <= 0) {
    return showToast("La duración debe ser mayor a cero.", "warn");
  }
  if (!uuidRegex.test(userId)) {
    return showToast("El Usuario ID debe ser un UUID válido.", "warn");
  }

  setSaving(true);
  try {
    const response = await fetchWithTimeout(`${API.itinerary}/itineraries/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario_id: userId,
        aeropuerto_salida_id: state.origin.id,
        aeropuerto_llegada_id: state.destination.id,
        fecha_viaje: date,
        duracion_minutos: duration,
        estado: status,
      }),
    }, 9000);

    if (!response.ok) {
      await handleApiError(response);
      return;
    }

    saveRecentRoute(state.origin, state.destination);
    showToast("Itinerario guardado correctamente.", "ok", 2600);
    clearSelection();
    els.travelDate.value = "";
    els.duration.value = "";
    await loadItineraries();
    setTimeout(() => setTab("list"), 700);
  } catch {
    showToast("No se pudo conectar con el servicio de itinerarios.", "error");
  } finally {
    setSaving(false);
  }
}

function setSaving(saving) {
  els.saveButton.disabled = saving;
  els.saveButton.querySelector("span").textContent = saving
    ? "Guardando..."
    : "Guardar itinerario";
}

async function handleApiError(response) {
  let detail = "Error inesperado.";
  try {
    const payload = await response.json();
    if (Array.isArray(payload.detail)) {
      detail = payload.detail[0]?.msg || detail;
    } else if (payload.detail) {
      detail = payload.detail;
    }
  } catch {
    detail = `HTTP ${response.status}`;
  }

  if (response.status === 404) {
    showToast("Uno de los aeropuertos no fue validado por el servicio.", "warn");
  } else if (response.status === 503) {
    showToast(`Servicio no disponible: ${detail}`, "error");
  } else {
    showToast(detail, response.status === 422 ? "warn" : "error");
  }
}

async function loadItineraries() {
  renderLoading();
  const filter = els.dateFilter.value;
  const url = new URL(`${API.itinerary}/itineraries/`);
  if (filter) url.searchParams.set("fecha", filter);

  try {
    const response = await fetchWithTimeout(url.toString(), {}, 7000);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const items = await response.json();
    renderItineraries(items, filter);
  } catch {
    els.listCount.textContent = "";
    els.itineraryList.innerHTML = `
      <div class="empty-state error-state" role="alert">
        <p>No fue posible cargar los itinerarios. Verifica que el servicio en el puerto 8002 esté activo.</p>
        <button type="button" class="retry-button" id="retryList">Reintentar</button>
      </div>`;
  }
  refreshIcons();
}

function renderLoading() {
  els.listCount.textContent = "Cargando...";
  els.itineraryList.innerHTML = `
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
    <div class="skeleton-card"></div>
  `;
}

function renderItineraries(items, filter) {
  els.listCount.textContent = `${items.length} itinerario${items.length === 1 ? "" : "s"}${filter ? ` · ${filter}` : ""}`;

  if (!items.length) {
    els.itineraryList.innerHTML = `<div class="empty-state">${filter ? "Sin itinerarios para esta fecha." : "Aún no hay itinerarios registrados."}</div>`;
    return;
  }

  els.itineraryList.innerHTML = items
    .map((item) => {
      const origin = findAirport(item.aeropuerto_salida_id);
      const destination = findAirport(item.aeropuerto_llegada_id);
      const duration = formatDuration(item.duracion_minutos);
      return `
      <article class="itinerary-card ${escapeHtml(item.estado)}">
        <div class="card-top">
          <div class="route-code">
            ${escapeHtml(item.aeropuerto_salida_id)}<span>→</span>${escapeHtml(item.aeropuerto_llegada_id)}
          </div>
          <span class="badge ${escapeHtml(item.estado)}">${escapeHtml(item.estado)}</span>
        </div>
        <div class="cities">${escapeHtml(origin?.city || item.aeropuerto_salida_id)} → ${escapeHtml(destination?.city || item.aeropuerto_llegada_id)}</div>
        <div class="card-meta">
          <span>${escapeHtml(item.fecha_viaje)} · ${duration}</span>
          <button class="delete-button" type="button" data-delete-id="${escapeHtml(item.id)}">
            <span class="icon-fallback">×</span>
            <i data-lucide="trash-2"></i>
            Eliminar
          </button>
        </div>
      </article>
    `;
    })
    .join("");
}

async function deleteItinerary(id) {
  if (!window.confirm("¿Eliminar este itinerario?")) return;

  try {
    const response = await fetchWithTimeout(`${API.itinerary}/itineraries/${id}`, {
      method: "DELETE",
    }, 7000);
    if (!response.ok && response.status !== 204) throw new Error(`HTTP ${response.status}`);
    await loadItineraries();
    showToast("Itinerario eliminado.", "ok", 2400);
  } catch {
    showToast("No se pudo eliminar el itinerario.", "error");
  }
}

function findAirport(id) {
  return airportCatalog.get((id || "").toUpperCase()) || null;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  if (!rest) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

function showToast(message, type = "error", timeout = 4200) {
  els.toast.textContent = message;
  els.toast.className = `toast floating-toast show ${type}`;
  window.clearTimeout(showToast.timer);
  if (timeout > 0) {
    showToast.timer = window.setTimeout(() => {
      els.toast.className = "toast floating-toast";
    }, timeout);
  }
}

async function fetchWithTimeout(url, options = {}, timeout = 6000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
    document.documentElement.classList.add("icons-ready");
  }
}
