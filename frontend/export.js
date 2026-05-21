/**
 * Exportar lista de itinerarios como PNG (html2canvas) o PDF (jsPDF).
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

  async function exportCapture(kind) {
    const items = window.AeroRutasAPI.lastLoadedItineraries;
    if (!items || !items.length) {
      window.AeroRutasAPI.showToast("No hay itinerarios para exportar.", "warn");
      return;
    }

    window.AeroRutasAPI.showToast("Generando exportación…", "ok", 1200);
    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `aerorutas-itinerarios-${stamp}`;

    try {
      if (kind === "png") {
        const listEl = document.getElementById("panelList");
        if (!listEl || typeof html2canvas !== "function") {
          throw new Error("html2canvas no disponible");
        }
        
        // Hacemos que el panel esté visible para la captura aunque el scroll esté oculto
        const originalOverflow = listEl.style.overflow;
        const originalMaxHeight = listEl.style.maxHeight;
        listEl.style.overflow = "visible";
        listEl.style.maxHeight = "none";

        const canvas = await html2canvas(listEl, {
          backgroundColor: "#06080f", // Fondo oscuro Draco
          scale: Math.min(2, window.devicePixelRatio || 1.5),
          useCORS: true,
          logging: false,
        });

        // Restaurar estilos
        listEl.style.overflow = originalOverflow;
        listEl.style.maxHeight = originalMaxHeight;

        canvas.toBlob((blob) => {
          if (!blob) throw new Error("PNG vacío");
          downloadBlob(blob, `${baseName}.png`);
          window.AeroRutasAPI.showToast("PNG descargado.", "ok", 2600);
        }, "image/png");
        return;
      }

      // Exportar PDF nativo usando jsPDF
      const jsPDFCtor = window.jspdf?.jsPDF || window.jsPDF;
      if (!jsPDFCtor) {
        throw new Error("jsPDF no disponible");
      }
      
      const pdf = new jsPDFCtor({ orientation: "portrait", unit: "mm", format: "a4" });
      const margin = 15;
      let y = margin;

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("AeroRutas — Registro de Itinerarios", margin, y);
      y += 10;
      
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Fecha de exportación: ${new Date().toLocaleString("es-CO")}`, margin, y);
      y += 5;
      pdf.text(`Total de rutas registradas: ${items.length}`, margin, y);
      y += 15;

      // Iterar sobre los itinerarios para dibujarlos en el PDF
      items.forEach((item, index) => {
        if (y > 270) {
          pdf.addPage();
          y = margin;
        }

        const origin = window.AeroRutasAPI.findAirport(item.aeropuerto_salida_id);
        const destination = window.AeroRutasAPI.findAirport(item.aeropuerto_llegada_id);
        const origName = origin ? origin.city : item.aeropuerto_salida_id;
        const destName = destination ? destination.city : item.aeropuerto_llegada_id;
        const status = item.estado || "Planeado";
        const duration = item.duracion_minutos ? `${item.duracion_minutos} min` : "—";
        const date = item.fecha_viaje || "—";

        pdf.setFont("helvetica", "bold");
        pdf.text(`${index + 1}. ${origName} (${item.aeropuerto_salida_id}) -> ${destName} (${item.aeropuerto_llegada_id})`, margin, y);
        y += 6;
        
        pdf.setFont("helvetica", "normal");
        pdf.text(`Fecha: ${date}  |  Duración: ${duration}  |  Estado: ${status}`, margin + 5, y);
        y += 10;
      });

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
