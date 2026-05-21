# Roadmap AeroRutas

## Implementado (esta entrega)

- UI con patrones inspirados en Framer: bento de ruta, cursor spotlight, botones magnéticos, reveals, spring easing
- Tiempo de vuelo estimado junto a distancia Haversine
- Búsqueda de aeropuertos en mapa (resaltado / atenuación)
- Rutas recientes en `localStorage`
- Tema claro/oscuro persistente
- Enlaces OpenAPI en barra superior
- Reintento al fallar carga de itinerarios
- Manifest PWA básico
- README profesional en español

## Corto plazo

| Prioridad | Feature | Notas |
|-----------|---------|-------|
| Alta | Export PDF / compartir ruta | `window.print()` o jsPDF ligero |
| Alta | Tests E2E smoke | Playwright contra `docker compose` |
| Media | Iconos PWA 192/512 | SVG → PNG en `frontend/assets/` |
| Media | Accesibilidad audit | axe en CI, skip links |

## Medio plazo

- Caché offline del catálogo de aeropuertos (Service Worker)
- Filtro por departamento / región
- Panel de métricas (rutas más usadas, km totales)
- Integración SSO / roles (solo lectura vs operador)

## Largo plazo

- Notificaciones de cambio de estado de itinerario
- Sincronización multi-dispositivo de borradores
- Dashboard analítico para operaciones aéreas
