/**
 * Exportar itinerario como PNG (html2canvas) o PDF (jsPDF).
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

  function getSummary() {
    return window.AeroRutasAPI.getRouteSummary();
  }

  async function captureMapStage() {
    const stage = document.querySelector(".map-stage");
    if (!stage || typeof html2canvas !== "function") {
      throw new Error("html2canvas no disponible");
    }
    const tooltip = document.getElementById("mapTooltip");
    const hadTooltip = tooltip?.classList.contains("show");
    if (tooltip) tooltip.classList.remove("show");

    const miniPanel = document.getElementById("miniMapPanel");
    const miniWasOpen = miniPanel && !miniPanel.hidden;
    if (miniPanel) miniPanel.hidden = true;

    const canvas = await html2canvas(stage, {
      backgroundColor: null,
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      logging: false,
    });

    if (miniPanel && miniWasOpen) miniPanel.hidden = false;

    if (hadTooltip && tooltip) tooltip.classList.add("show");
    return canvas;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportCapture(kind) {
    const summary = getSummary();
    if (!summary.origin || !summary.destination) {
      window.AeroRutasAPI.showToast("Selecciona origen y destino antes de exportar.", "warn");
      return;
    }

    window.AeroRutasAPI.showToast("Generando exportación…", "ok", 1200);

    try {
      const canvas = await captureMapStage();
      const stamp = new Date().toISOString().slice(0, 10);
      const baseName = `aerorutas-${summary.origin.id}-${summary.destination.id}-${stamp}`;

      if (kind === "png") {
        canvas.toBlob((blob) => {
          if (!blob) throw new Error("PNG vacío");
          downloadBlob(blob, `${baseName}.png`);
          window.AeroRutasAPI.showToast("PNG descargado.", "ok", 2600);
        }, "image/png");
        return;
      }

      const jsPDFCtor = window.jspdf?.jsPDF || window.jsPDF;
      if (!jsPDFCtor) {
        throw new Error("jsPDF no disponible");
      }
      const pdf = new jsPDFCtor({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 14;
      const imgData = canvas.toDataURL("image/png");
      const imgRatio = canvas.width / canvas.height;
      const maxImgW = pageW - margin * 2;
      const maxImgH = pageH - margin * 2 - 36;
      let imgW = maxImgW;
      let imgH = imgW / imgRatio;
      if (imgH > maxImgH) {
        imgH = maxImgH;
        imgW = imgH * imgRatio;
      }
      const imgX = (pageW - imgW) / 2;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("AeroRutas — Itinerario", margin, margin);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      const lines = [
        `Origen: ${summary.origin.id} · ${summary.origin.city}`,
        `Destino: ${summary.destination.id} · ${summary.destination.city}`,
        `Fecha de viaje: ${summary.date || "—"}`,
        `Distancia (recta): ${summary.distance || "—"}`,
        `Vuelo estimado: ${summary.flightTime || "—"}`,
        `Generado: ${new Date().toLocaleString("es-CO")}`,
      ];
      lines.forEach((line, i) => {
        pdf.text(line, margin, margin + 8 + i * 6);
      });

      pdf.addImage(imgData, "PNG", imgX, margin + 32, imgW, imgH);
      pdf.save(`${baseName}.pdf`);
      window.AeroRutasAPI.showToast("PDF descargado.", "ok", 2600);
    } catch (err) {
      console.error(err);
      window.AeroRutasAPI.showToast("No se pudo exportar. Revisa la consola.", "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
