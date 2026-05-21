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
- Motion editorial (`motion.js`): reveals escalonados, transición de pestañas, bento y toasts.
- PWA: `manifest.webmanifest` (instalable en móvil).

Regenerar mapa desde GeoJSON:

```bash
python frontend/scripts/build_colombia_map.py
```

## Control de versiones con Git y GitHub

### Dónde ejecutar los comandos

1. **Terminal integrada de Cursor** — menú *Terminal → Nueva terminal* (o `` Ctrl+` ``).
2. **PowerShell de Windows** — botón derecho en Inicio → *Windows PowerShell* o *Terminal*.

En ambos casos, sitúate siempre en la carpeta del proyecto:

```powershell
cd c:\Users\user\Downloads\sistema_itinerarios
```

Si `git` o `gh` no se reconocen (no están en el PATH), usa la ruta completa del ejecutable:

| Herramienta | Ruta típica en Windows |
|-------------|-------------------------|
| Git | `C:\Program Files\Git\bin\git.exe` |
| GitHub CLI | `C:\Program Files\GitHub CLI\gh.exe` |

Ejemplo:

```powershell
& "C:\Program Files\Git\bin\git.exe" status
& "C:\Program Files\GitHub CLI\gh.exe" auth status
```

Instalación si faltan: [Git para Windows](https://git-scm.com/download/win) y [GitHub CLI](https://cli.github.com/). Tras instalar, cierra y vuelve a abrir la terminal.

### Rama actual del proyecto

- Rama de trabajo: **`feature/ui-refinement`**
- Historial reciente: dashboard editorial de aviación (`2700156`), base del proyecto con Docker (`47c0180`).

### Primera vez: revisar estado y publicar en GitHub

```powershell
cd c:\Users\user\Downloads\sistema_itinerarios

# 1) Ver cambios locales
git status

# 2) Iniciar sesión en GitHub (abre el navegador)
gh auth login

# 3) Comprobar que la sesión quedó activa
gh auth status

# 4) Crear repo privado y subir (solo la primera vez, si aún no hay remote)
gh repo create sistema-itinerarios --private --source=. --remote=origin --push
```

> **Importante:** no subas `.env` ni archivos con credenciales. `.gitignore` ya excluye secretos y `__pycache__`.

Si `gh auth status` indica que **no** hay sesión, haz `gh auth login` antes de `push`. Los commits locales se guardan igual; el remoto espera autenticación.

### Flujo diario (después del primer push)

```powershell
cd c:\Users\user\Downloads\sistema_itinerarios
git status
git add .                    # solo archivos que quieras versionar
git commit -m "feat(ui): animaciones editoriales en panel y mapa"
git push
```

Comandos útiles:

| Acción | Comando |
|--------|---------|
| Ver rama actual | `git branch --show-current` |
| Ver últimos commits | `git log --oneline -5` |
| Ver URL del remoto | `git remote -v` |
| Abrir el repo en el navegador | `gh repo view --web` |

### Alias en PowerShell (opcional)

Para no escribir la ruta completa cada vez, en la sesión actual:

```powershell
Set-Alias git "C:\Program Files\Git\bin\git.exe"
Set-Alias gh "C:\Program Files\GitHub CLI\gh.exe"
```

Los alias desaparecen al cerrar la terminal; para hacerlos permanentes, añádelos al perfil de PowerShell (`$PROFILE`).

## Roadmap (próximas mejoras)

- Exportar itinerario a PDF o enlace compartible
- Tests E2E (Playwright) en CI
- Iconos PWA dedicados
- Filtro avanzado de aeropuertos por departamento
- Modo offline con caché de catálogo

## Licencia

Uso interno / educativo — ajustar según política de tu organización.
