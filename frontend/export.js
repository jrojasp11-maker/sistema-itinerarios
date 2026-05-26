/**
 * AeroRutas — Exportación premium de itinerarios.
 * PNG: Captura completa del panel de itinerarios con html2canvas.
 * PDF: Reporte corporativo de 2+ páginas con mapa incrustado y tabla de itinerarios.
 */
(function initItineraryExport() {
  function boot() {
    if (!window.AeroRutasAPI) {
      requestAnimationFrame(boot);
      return;
    }
    document.getElementById("exportPng")?.addEventListener("click", () => exportCapture("png"));
    document.getElementById("exportPdf")?.addEventListener("click", () => exportCapture("pdf"));
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Espera a que las librerías CDN estén disponibles (máx 5 seg).
   */
  function waitForLib(check, label, timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (check()) return resolve();
      const t0 = Date.now();
      const iv = setInterval(() => {
        if (check()) { clearInterval(iv); resolve(); }
        else if (Date.now() - t0 > timeout) { clearInterval(iv); reject(new Error(`${label} no disponible después de ${timeout}ms`)); }
      }, 100);
    });
  }

  /**
   * Captura un elemento del DOM como un Data URL PNG usando html2canvas.
   */
  async function captureElement(el, opts = {}) {
    await waitForLib(() => typeof html2canvas === "function", "html2canvas");
    const canvas = await html2canvas(el, {
      backgroundColor: opts.bg || "#06080f",
      scale: opts.scale || 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      ...opts,
    });
    return canvas;
  }

  async function exportCapture(kind) {
    const items = window.AeroRutasAPI.lastLoadedItineraries;
    if (!items || !items.length) {
      window.AeroRutasAPI.showToast("No hay itinerarios para exportar. Carga la pestaña Itinerarios primero.", "warn");
      return;
    }

    window.AeroRutasAPI.showToast("Generando exportación…", "ok", 2500);
    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `aerorutas-itinerarios-${stamp}`;

    try {
      if (kind === "png") {
        await exportPng(baseName, items);
      } else {
        await exportPdf(baseName, items);
      }
    } catch (err) {
      console.error("[AeroRutas Export]", err);
      window.AeroRutasAPI.showToast(`Error al exportar: ${err.message}`, "error");
    }
  }

  // ═══════════════════════════════════
  // PNG Export — Captura el panel de itinerarios completo
  // ═══════════════════════════════════
  async function exportPng(baseName, items) {
    const listEl = document.getElementById("panelList");
    if (!listEl) throw new Error("Panel de itinerarios no encontrado");

    // Guardar estilos originales del panel
    const originalStyles = {
      display: listEl.style.display,
      height: listEl.style.height,
      maxHeight: listEl.style.maxHeight,
      overflow: listEl.style.overflow,
    };

    // Expandir panel temporalmente para captura completa
    listEl.style.display = "block";
    listEl.style.height = "auto";
    listEl.style.maxHeight = "none";
    listEl.style.overflow = "visible";

    // Ocultar botones de exportación durante la captura
    const exportBtns = listEl.querySelectorAll(".export-actions, [data-delete-id]");
    exportBtns.forEach(b => b.style.display = "none");

    try {
      const canvas = await captureElement(listEl, { scale: 2 });

      // Restaurar estilos
      Object.assign(listEl.style, originalStyles);
      exportBtns.forEach(b => b.style.display = "");

      canvas.toBlob((blob) => {
        if (!blob) throw new Error("PNG vacío");
        downloadBlob(blob, `${baseName}.png`);
        window.AeroRutasAPI.showToast("PNG descargado correctamente.", "ok", 2600);
      }, "image/png");
    } catch (err) {
      // Restaurar estilos en caso de error
      Object.assign(listEl.style, originalStyles);
      exportBtns.forEach(b => b.style.display = "");
      throw err;
    }
  }

  // ═══════════════════════════════════
  // PDF Export — Reporte corporativo premium con mapa
  // ═══════════════════════════════════
  async function exportPdf(baseName, items) {
    await waitForLib(() => (window.jspdf?.jsPDF || window.jsPDF), "jsPDF");

    const jsPDFCtor = window.jspdf?.jsPDF || window.jsPDF;
    const pdf = new jsPDFCtor({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const margin = 15;
    const contentW = pageW - 2 * margin;

    // ── Capturar mapa como imagen ──
    let mapDataUrl = null;
    const mapSvg = document.getElementById("mapSvg");
    if (mapSvg) {
      try {
        const mapCanvas = await captureElement(mapSvg, { scale: 2, bg: "#06080f" });
        mapDataUrl = mapCanvas.toDataURL("image/png");
      } catch (e) {
        console.warn("[AeroRutas Export] No se pudo capturar el mapa:", e);
      }
    }

    // ════════════════════════════
    // PÁGINA 1: Portada corporativa
    // ════════════════════════════
    // Fondo oscuro completo
    pdf.setFillColor(6, 8, 15);
    pdf.rect(0, 0, pageW, pageH, "F");

    // Barra superior dorada
    pdf.setFillColor(245, 158, 11);
    pdf.rect(0, 0, pageW, 3, "F");

    // Logo y título
    let y = 20;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(28);
    pdf.setTextColor(245, 158, 11);
    pdf.text("AeroRutas", margin, y);
    y += 8;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(160, 160, 175);
    pdf.text("Itinerarios Empresariales · Colombia", margin, y);
    y += 6;

    // Línea divisoria dorada
    pdf.setDrawColor(245, 158, 11);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageW - margin, y);
    y += 10;

    // Metadatos del reporte
    pdf.setFontSize(9);
    pdf.setTextColor(140, 140, 155);
    pdf.text(`Fecha de exportación: ${new Date().toLocaleString("es-CO")}`, margin, y);
    y += 5;
    pdf.text(`Total de rutas registradas: ${items.length}`, margin, y);
    y += 5;

    // Contar estados
    const statusCount = { Planeado: 0, Completado: 0, Cancelado: 0 };
    items.forEach(it => {
      const st = it.estado || "Planeado";
      if (statusCount[st] !== undefined) statusCount[st]++;
    });
    pdf.text(`Planeados: ${statusCount.Planeado}  |  Completados: ${statusCount.Completado}  |  Cancelados: ${statusCount.Cancelado}`, margin, y);
    y += 12;

    // ── Insertar mapa ──
    if (mapDataUrl) {
      const mapW = contentW;
      const mapH = mapW * (680 / 470); // Preservar aspect ratio del SVG
      const maxMapH = pageH - y - 20;
      const finalH = Math.min(mapH, maxMapH);
      const finalW = finalH * (470 / 680);
      const mapX = (pageW - finalW) / 2;

      pdf.addImage(mapDataUrl, "PNG", mapX, y, finalW, finalH);
      y += finalH + 5;
    }

    // Pie de página 1
    pdf.setFontSize(7);
    pdf.setTextColor(100, 100, 115);
    pdf.text("Generado por AeroRutas — Sistema de Itinerarios Empresariales", pageW / 2, pageH - 8, { align: "center" });

    // ════════════════════════════
    // PÁGINA 2+: Detalle de itinerarios
    // ════════════════════════════
    pdf.addPage();

    // Fondo oscuro
    pdf.setFillColor(6, 8, 15);
    pdf.rect(0, 0, pageW, pageH, "F");

    // Barra superior dorada
    pdf.setFillColor(245, 158, 11);
    pdf.rect(0, 0, pageW, 2, "F");

    y = 14;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(245, 158, 11);
    pdf.text("Detalle de Itinerarios", margin, y);
    y += 10;

    items.forEach((item, index) => {
      if (y > pageH - 30) {
        // Nueva página
        pdf.addPage();
        pdf.setFillColor(6, 8, 15);
        pdf.rect(0, 0, pageW, pageH, "F");
        pdf.setFillColor(245, 158, 11);
        pdf.rect(0, 0, pageW, 2, "F");
        y = 14;
      }

      const origin = window.AeroRutasAPI.findAirport(item.aeropuerto_salida_id);
      const destination = window.AeroRutasAPI.findAirport(item.aeropuerto_llegada_id);
      const origName = origin ? origin.city : item.aeropuerto_salida_id;
      const destName = destination ? destination.city : item.aeropuerto_llegada_id;
      const status = item.estado || "Planeado";
      const duration = item.duracion_minutos ? `${item.duracion_minutos} min` : "—";
      const date = item.fecha_viaje || "—";

      // Tarjeta de itinerario
      const cardH = 22;
      pdf.setFillColor(14, 17, 26);
      pdf.roundedRect(margin, y - 4, contentW, cardH, 2, 2, "F");

      // Borde lateral según estado
      const statusColors = {
        Planeado: [245, 158, 11],    // Ámbar
        Completado: [34, 197, 94],    // Verde
        Cancelado: [239, 68, 68],     // Rojo
      };
      const sc = statusColors[status] || statusColors.Planeado;
      pdf.setFillColor(sc[0], sc[1], sc[2]);
      pdf.rect(margin, y - 4, 3, cardH, "F");

      // Número de ruta
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(245, 158, 11);
      pdf.text(`#${index + 1}`, margin + 6, y + 2);

      // Ruta
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(230, 230, 240);
      const routeText = `${origName} (${item.aeropuerto_salida_id})  →  ${destName} (${item.aeropuerto_llegada_id})`;
      pdf.text(routeText, margin + 18, y + 2);

      // Detalles
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(140, 140, 155);
      pdf.text(`Fecha: ${date}   |   Duración: ${duration}   |   Estado: ${status}`, margin + 18, y + 10);

      y += cardH + 4;
    });

    // Pie de página final
    const totalPages = pdf.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFontSize(7);
      pdf.setTextColor(100, 100, 115);
      pdf.text(`Página ${p} de ${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
    }

    pdf.save(`${baseName}.pdf`);
    window.AeroRutasAPI.showToast("PDF descargado correctamente.", "ok", 2600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
