import os

import httpx

from airport_service.domain.exceptions import ServiceUnavailableError
from airport_service.domain.models import Airport
from airport_service.domain.ports import IAirportPort


class ApiColombiaAirportAdapter(IAirportPort):
    """Adapter HTTP para api-colombia.com."""

    DEFAULT_BASE_URL = "https://api-colombia.com/api/v1"
    TIMEOUT = 8.0

    def __init__(self, base_url: str | None = None):
        self._base_url = (
            base_url or os.getenv("API_COLOMBIA_URL", self.DEFAULT_BASE_URL)
        ).rstrip("/")

    async def get_all(self) -> list[Airport]:
        try:
            async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                response = await client.get(f"{self._base_url}/Airport")
                response.raise_for_status()
                return [
                    airport
                    for airport in (self._adapt(item) for item in response.json())
                    if airport.id
                ]
        except httpx.TimeoutException as exc:
            raise ServiceUnavailableError("API Colombia: timeout") from exc
        except httpx.HTTPStatusError as exc:
            raise ServiceUnavailableError(
                f"API Colombia: HTTP {exc.response.status_code}"
            ) from exc
        except httpx.RequestError as exc:
            raise ServiceUnavailableError(f"API Colombia: error de conexión - {exc}") from exc

    async def validate(self, salida_id: str, llegada_id: str) -> bool:
        airports = await self.get_all()
        ids = {airport.id for airport in airports}
        return salida_id.strip().upper() in ids and llegada_id.strip().upper() in ids

    def _adapt(self, raw: dict) -> Airport:
        city = raw.get("city") or {}
        if isinstance(city, dict):
            ciudad = city.get("name", "")
            departamento = (city.get("department") or {}).get("name", "")
        else:
            ciudad = str(city)
            departamento = ""

        # API Colombia devuelve los valores invertidos en los campos latitude/longitude.
        raw_lat_field = float(raw.get("latitude") or 0)
        raw_lng_field = float(raw.get("longitude") or 0)
        lat = raw_lng_field
        lng = raw_lat_field

        return Airport(
            id=str(raw.get("iataCode") or raw.get("id") or "").strip().upper(),
            nombre=raw.get("name", ""),
            ciudad=ciudad,
            departamento=departamento,
            lat=lat,
            lng=lng,
        )
