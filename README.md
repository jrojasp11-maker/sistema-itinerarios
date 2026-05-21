# AeroRutas — Sistema de itinerarios empresariales

Plataforma para planificar y registrar rutas aéreas corporativas en Colombia: mapa interactivo SVG, catálogo de aeropuertos (API Colombia vía microservicio) y CRUD de itinerarios con PostgreSQL.

## Arquitectura

| Componente | Puerto | Descripción |
|------------|--------|-------------|
| `airport-service` | 8001 | Aeropuertos (FastAPI + API Colombia) |
| `itinerary-service` | 8002 | Itinerarios (FastAPI + PostgreSQL) |
| `frontend` | 3000 | UI AeroRutas (HTML/CSS/JS) |

Documentación OpenAPI: `http://localhost:8001/docs` y `http://localhost:8002/docs`.

## Requisitos

- [Docker](https://www.docker.com/) y Docker Compose
- Navegador moderno (Chrome, Edge, Firefox)

## Ejecución con Docker

```bash
docker compose up --build
```

Abrir **http://localhost:3000**. Los chips de estado en la barra superior deben mostrar los servicios en línea.

### Prueba manual (smoke)

1. En el mapa, elegir origen y destino (marcadores lime/cyan).
2. Comprobar bento de ruta: distancia y tiempo de vuelo estimado.
3. Completar fecha, duración y UUID de usuario → **Guardar itinerario**.
4. Pestaña **Itinerarios**: listar, filtrar por fecha, eliminar.
5. Tras guardar, la ruta aparece en **Recientes** (localStorage).

## Desarrollo local (sin Docker)

```bash
# Terminal 1 — aeropuertos
cd airport_service && uvicorn main:app --host 0.0.0.0 --port 8001

# Terminal 2 — itinerarios (requiere Postgres y URL de aeropuertos)
cd itinerary_service && uvicorn main:app --host 0.0.0.0 --port 8002

# Terminal 3 — frontend estático
cd frontend && python -m http.server 3000
```

## Frontend

- Español, tema oscuro/claro (toggle en barra).
- Mapa: vista Principales / Todos, búsqueda por IATA o ciudad.
- Motion ligero (`motion.js`): spotlight en mapa, botones magnéticos, reveals.
- PWA: `manifest.webmanifest` (instalable en móvil).

Regenerar mapa desde GeoJSON:

```bash
python frontend/scripts/build_colombia_map.py
```

## Control de versiones (Git + GitHub)

Si Git no está en el PATH, instálalo desde [git-scm.com](https://git-scm.com/) o GitHub Desktop, reinicia la terminal y ejecuta:

```bash
cd sistema_itinerarios
git init
git checkout -b feature/framer-ui-professional
git add .
git commit -m "feat: UI estilo Framer, rutas recientes y documentación"
gh auth login
gh repo create sistema-itinerarios --private --source=. --remote=origin --push
```

> No subir `.env` ni credenciales; `.gitignore` ya excluye secretos y `__pycache__`.

## Roadmap (próximas mejoras)

- Exportar itinerario a PDF o enlace compartible
- Tests E2E (Playwright) en CI
- Iconos PWA dedicados
- Filtro avanzado de aeropuertos por departamento
- Modo offline con caché de catálogo

## Licencia

Uso interno / educativo — ajustar según política de tu organización.
