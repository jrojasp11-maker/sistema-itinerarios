import httpx

from itinerary_service.domain.exceptions import ServiceUnavailableError
from itinerary_service.domain.ports import IAirportValidatorPort


class AirportServiceClient(IAirportValidatorPort):
    """Adaptador HTTP hacia Airport Service."""

    def __init__(self, base_url: str):
        self._base_url = base_url.rstrip("/")

    async def validate(self, salida_id: str, llegada_id: str) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self._base_url}/airports/validate",
                    params={"salida_id": salida_id, "llegada_id": llegada_id},
                )
                if response.status_code == 404:
                    return False
                if response.status_code == 503:
                    raise ServiceUnavailableError(
                        "Airport Service no disponible. Intente más tarde."
                    )
                response.raise_for_status()
                return response.json().get("valid", False)
        except httpx.TimeoutException as exc:
            raise ServiceUnavailableError("Airport Service: timeout") from exc
        except httpx.HTTPStatusError as exc:
            raise ServiceUnavailableError(
                f"Airport Service respondió HTTP {exc.response.status_code}"
            ) from exc
        except httpx.RequestError as exc:
            raise ServiceUnavailableError(f"Airport Service inalcanzable: {exc}") from exc
