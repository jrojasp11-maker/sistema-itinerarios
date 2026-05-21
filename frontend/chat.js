/**
 * Asistente de chat — parser en español (regex + catálogo IATA), sin API externa.
 */
(function initRouteChat() {
  const WEEKDAYS = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miercoles: 3,
    miércoles: 3,
    jueves: 4,
    viernes: 5,
    sabado: 6,
    sábado: 6,
  };

  let panel = null;
  let thread = null;
  let input = null;
  let fab = null;

  function boot() {
    if (!window.AeroRutasAPI) {
      requestAnimationFrame(boot);
      return;
    }
    panel = document.getElementById("chatPanel");
    thread = document.getElementById("chatThread");
    input = document.getElementById("chatInput");
    fab = document.getElementById("chatFab");
    if (!panel || !thread || !input || !fab) return;

    fab.addEventListener("click", () => togglePanel());
    document.getElementById("chatClose")?.addEventListener("click", () => togglePanel(false));
    document.getElementById("chatSend")?.addEventListener("click", () => handleSubmit());
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    });

    appendMessage(
      "bot",
      "Escribe en español, por ejemplo: «arma itinerario BOG → CLO el viernes» o «mañana MDE a BAQ».",
    );
  }

  function togglePanel(forceOpen) {
    const open = forceOpen === true || (forceOpen !== false && panel.hidden);
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    if (open) input.focus();
  }

  function appendMessage(role, text) {
    const div = document.createElement("div");
    div.className = `chat-msg ${role}`;
    div.textContent = text;
    thread.appendChild(div);
    thread.scrollTop = thread.scrollHeight;
  }

  function handleSubmit() {
    const raw = input.value.trim();
    if (!raw) return;
    input.value = "";
    appendMessage("user", raw);

    const parsed = parseSpanishItinerary(raw);
    if (!parsed.ok) {
      appendMessage("bot", parsed.error);
      return;
    }

    const result = window.AeroRutasAPI.selectAirportsById(parsed.originId, parsed.destId);
    if (!result.ok) {
      appendMessage("bot", result.error);
      return;
    }

    if (parsed.date) {
      window.AeroRutasAPI.setTravelDate(parsed.date);
    }

    const o = window.AeroRutasAPI.findAirport(parsed.originId);
    const d = window.AeroRutasAPI.findAirport(parsed.destId);
    const dateNote = parsed.date
      ? ` Fecha: ${parsed.date}.`
      : " Indica una fecha en el formulario si aún no la tienes.";
    appendMessage(
      "bot",
      `Listo: ${o?.city || parsed.originId} (${parsed.originId}) → ${d?.city || parsed.destId} (${parsed.destId}).${dateNote}`,
    );
    window.AeroRutasAPI.showToast("Ruta aplicada desde el asistente.", "ok", 2400);
  }

  function extractIataCodes(text) {
    const upper = text.toUpperCase();
    const found = [];
    const re = /\b([A-Z]{3})\b/g;
    let m;
    while ((m = re.exec(upper))) {
      const code = m[1];
      if (window.AeroRutasAPI.findAirport(code)) found.push(code);
    }
    return [...new Set(found)];
  }

  function parseOriginDest(text) {
    const normalized = text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

    const arrowMatch = normalized.match(
      /(?:desde|de)\s+([a-z]{3})\s+(?:hasta|a|hacia|→|->)\s+([a-z]{3})|([a-z]{3})\s*(?:→|->|—|-)\s*([a-z]{3})|([a-z]{3})\s+(?:a|hacia|hasta)\s+([a-z]{3})/i,
    );
    if (arrowMatch) {
      const o = (arrowMatch[1] || arrowMatch[3] || arrowMatch[5] || "").toUpperCase();
      const d = (arrowMatch[2] || arrowMatch[4] || arrowMatch[6] || "").toUpperCase();
      if (o && d) return { originId: o, destId: d };
    }

    const codes = extractIataCodes(text);
    if (codes.length >= 2) return { originId: codes[0], destId: codes[1] };
    if (codes.length === 1) {
      return { originId: codes[0], destId: null, partial: true };
    }
    return null;
  }

  function parseDatePhrase(text) {
    const lower = text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const today = startOfDay(new Date());

    if (/\bmanana\b|\bmañana\b/.test(lower) && !/\bpasado\b/.test(lower)) {
      return addDays(today, 1);
    }
    if (/\bpasado\s+manana\b/.test(lower)) {
      return addDays(today, 2);
    }

    const iso = lower.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);

    const dmy = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
    if (dmy) {
      const day = Number(dmy[1]);
      const month = Number(dmy[2]) - 1;
      let year = dmy[3] ? Number(dmy[3]) : today.getFullYear();
      if (year < 100) year += 2000;
      const candidate = new Date(year, month, day, 12, 0, 0);
      if (candidate >= today) return candidate;
    }

    for (const [name, targetDow] of Object.entries(WEEKDAYS)) {
      if (lower.includes(name)) {
        return nextWeekday(today, targetDow);
      }
    }

    const dayOfMonth = lower.match(/\bel\s+(\d{1,2})\b/);
    if (dayOfMonth) {
      const dayNum = Number(dayOfMonth[1]);
      let candidate = new Date(today.getFullYear(), today.getMonth(), dayNum, 12, 0, 0);
      if (candidate < today) {
        candidate = new Date(today.getFullYear(), today.getMonth() + 1, dayNum, 12, 0, 0);
      }
      return candidate;
    }

    return null;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
  }

  function addDays(d, n) {
    const out = new Date(d);
    out.setDate(out.getDate() + n);
    return out;
  }

  function nextWeekday(from, targetDow) {
    const d = startOfDay(from);
    let diff = (targetDow - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    return addDays(d, diff);
  }

  function toIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function parseSpanishItinerary(text) {
    const route = parseOriginDest(text);
    if (!route || route.partial) {
      return {
        ok: false,
        error: route?.partial
          ? "Encontré un código IATA pero necesito origen y destino (ej. BOG → CLO)."
          : "No reconocí la ruta. Usa códigos IATA y «→» o «de X a Y».",
      };
    }

    if (!window.AeroRutasAPI.findAirport(route.originId)) {
      return { ok: false, error: `El aeropuerto ${route.originId} no está en el catálogo.` };
    }
    if (!window.AeroRutasAPI.findAirport(route.destId)) {
      return { ok: false, error: `El aeropuerto ${route.destId} no está en el catálogo.` };
    }
    if (route.originId === route.destId) {
      return { ok: false, error: "Origen y destino deben ser distintos." };
    }

    const dateObj = parseDatePhrase(text);
    const travel = elsMinDate();
    let date = dateObj ? toIsoDate(dateObj) : null;
    if (date && travel && date < travel) {
      return { ok: false, error: `La fecha ${date} es anterior al mínimo permitido (${travel}).` };
    }

    return { ok: true, originId: route.originId, destId: route.destId, date };
  }

  function elsMinDate() {
    return window.AeroRutasAPI.getEls()?.travelDate?.min || "";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
