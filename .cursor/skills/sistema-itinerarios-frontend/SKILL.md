---
name: sistema-itinerarios-frontend
description: Mantiene el frontend AeroRutas (HTML/CSS/JS) del sistema de itinerarios empresariales. Usar al editar el mapa SVG de Colombia, marcadores de aeropuertos, textos en español, o la integración con los servicios en puertos 8001/8002.
---

# Frontend Sistema de Itinerarios

## Estructura

- `frontend/index.html` — mapa SVG, panel lateral, textos en **español**
- `frontend/app.js` — estado, API, proyección geográfica → coordenadas SVG
- `frontend/styles.css` — tema oscuro AeroRutas (lime/cyan)

## Mapa y aeropuertos

1. Mapa: `colombia-map.svg` recortado con `clipPath` desde `map-config.json` (GeoJSON real).
2. Regenerar: `python frontend/scripts/build_colombia_map.py`.
3. Fotos de aeropuertos: `assets/airport-media.json` + Wikipedia REST; vista en `#airportSpotlight` y tooltip.
3. Cada aeropuerto en `airports[]` debe tener `id`, `name`, `city`, `lat`, `lng`.
4. `positionAllAirports()` proyecta con `MAP_BOUNDS` (mismos límites que el script de mapa).
5. Etiquetas densas: usar `LABEL_OFFSETS` para evitar solapamiento.
6. Catálogo desde `GET /airports/`; vista **Principales** (18 IATA) vs **Todos** (catálogo deduplicado de API Colombia).
7. Si el servicio en :8001 no responde, se usan semillas locales y un aviso en el contador del filtro.

## API desde el navegador

```javascript
const API = {
  airport: `http://${host}:8001`,
  itinerary: `http://${host}:8002`,
};
```

## Reglas de contenido

- Toda la UI visible al usuario en español (mensajes, chips, leyenda, toasts).
- No cambiar puertos ni contratos JSON (`aeropuerto_salida_id`, `usuario_id`, etc.) sin alinear backend.

## Verificación rápida

1. `docker compose up --build` o servicios locales en 8001/8002 y frontend en 3000.
2. Confirmar marcadores dentro del contorno de Colombia y ruta al elegir origen/destino.
3. Probar guardado de itinerario con UUID y fecha.
