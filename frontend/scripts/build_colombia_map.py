"""Genera assets/colombia-map.svg desde col.geo.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

with open(ASSETS / "col.geo.json", encoding="utf-8") as f:
    coords = json.load(f)["features"][0]["geometry"]["coordinates"][0]

lngs = [c[0] for c in coords]
lats = [c[1] for c in coords]
min_lng, max_lng = min(lngs), max(lngs)
min_lat, max_lat = min(lats), max(lats)
width, height = 470, 680
pad_x, pad_y = 36, 48


def project(lng: float, lat: float) -> tuple[float, float]:
    x = pad_x + (lng - min_lng) / (max_lng - min_lng) * (width - 2 * pad_x)
    y = pad_y + (max_lat - lat) / (max_lat - min_lat) * (height - 2 * pad_y)
    return round(x, 2), round(y, 2)


parts: list[str] = []
for i, (lng, lat) in enumerate(coords):
    x, y = project(lng, lat)
    parts.append(("M" if i == 0 else "L") + f"{x},{y}")
path = " ".join(parts) + " Z"

# Líneas interiores suaves (relieve) reutilizando el contorno escalado
inner_path = path.replace("M", "M").replace(" Z", "")
cx, cy = width / 2, height / 2
# Contorno secundario ~4% hacia el centro (aprox. vía transformación SVG)

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-label="Mapa de Colombia">
  <defs>
    <linearGradient id="terrainFill" x1="12%" y1="6%" x2="92%" y2="94%">
      <stop offset="0%" stop-color="#4a7c68"/>
      <stop offset="35%" stop-color="#2f5a4c"/>
      <stop offset="72%" stop-color="#1f3d34"/>
      <stop offset="100%" stop-color="#142a24"/>
    </linearGradient>
    <linearGradient id="terrainShade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(182,255,54,0.18)"/>
      <stop offset="55%" stop-color="rgba(56,228,210,0.06)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.35)"/>
    </linearGradient>
    <radialGradient id="terrainHighlight" cx="45%" cy="32%" r="62%">
      <stop offset="0%" stop-color="rgba(120,220,190,0.35)"/>
      <stop offset="100%" stop-color="rgba(56,228,210,0)"/>
    </radialGradient>
    <pattern id="topoLines" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)">
      <path d="M0 40 Q20 28 40 40 T80 40" fill="none" stroke="rgba(182,255,54,0.07)" stroke-width="1"/>
      <path d="M0 20 Q25 8 50 20 T100 20" fill="none" stroke="rgba(56,228,210,0.05)" stroke-width="1"/>
    </pattern>
    <filter id="terrainShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="14" flood-color="#000" flood-opacity="0.6"/>
      <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#b6ff36" flood-opacity="0.22"/>
    </filter>
    <clipPath id="clipColombia">
      <path d="{path}"/>
    </clipPath>
  </defs>
  <rect width="{width}" height="{height}" fill="#080b0f"/>
  <g clip-path="url(#clipColombia)">
    <path id="colombiaTerritory" d="{path}" fill="url(#terrainFill)" filter="url(#terrainShadow)"/>
    <rect width="{width}" height="{height}" fill="url(#topoLines)"/>
    <path d="{path}" fill="url(#terrainShade)" stroke="none"/>
    <path d="{path}" fill="url(#terrainHighlight)" stroke="none"/>
    <path d="{path}" fill="none" stroke="rgba(182,255,54,0.09)" stroke-width="1.2" transform="translate(4 6) scale(0.985)"/>
    <path d="{path}" fill="none" stroke="rgba(56,228,210,0.07)" stroke-width="1" transform="translate(-3 -4) scale(0.97)"/>
  </g>
  <path d="{path}" fill="none" stroke="#c8ff5a" stroke-width="2.8" stroke-linejoin="round"/>
  <path d="{path}" fill="none" stroke="rgba(56,228,210,0.35)" stroke-width="5" stroke-linejoin="round" opacity="0.45"/>
</svg>"""

(ASSETS / "colombia-map.svg").write_text(svg, encoding="utf-8")

meta = {
    "viewBox": [0, 0, width, height],
    "path": path,
    "minLng": min_lng,
    "maxLng": max_lng,
    "minLat": min_lat,
    "maxLat": max_lat,
    "x0": pad_x,
    "y0": pad_y,
    "width": width - 2 * pad_x,
    "height": height - 2 * pad_y,
}
(ASSETS / "map-config.json").write_text(
    json.dumps(meta, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
print(json.dumps(meta, indent=2))
