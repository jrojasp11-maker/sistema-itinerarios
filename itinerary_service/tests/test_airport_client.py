import httpx
import pytest

from itinerary_service.domain.exceptions import ServiceUnavailableError
from itinerary_service.infrastructure.airport_client import AirportServiceClient


class TestValidate:
    @pytest.mark.asyncio
    async def test_validate_valid(self, httpx_mock):
        client = AirportServiceClient("http://airport-svc:8001")
        httpx_mock.add_response(
            url="http://airport-svc:8001/airports/validate?salida_id=BOG&llegada_id=MDE",
            json={"valid": True, "salida_id": "BOG", "llegada_id": "MDE"},
        )
        result = await client.validate("BOG", "MDE")
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_invalid_returns_false(self, httpx_mock):
        client = AirportServiceClient("http://airport-svc:8001")
        httpx_mock.add_response(
            url="http://airport-svc:8001/airports/validate?salida_id=BOG&llegada_id=XYZ",
            status_code=404,
        )
        result = await client.validate("BOG", "XYZ")
        assert result is False

    @pytest.mark.asyncio
    async def test_validate_service_unavailable_503(self, httpx_mock):
        client = AirportServiceClient("http://airport-svc:8001")
        httpx_mock.add_response(
            url="http://airport-svc:8001/airports/validate?salida_id=BOG&llegada_id=MDE",
            status_code=503,
        )
        with pytest.raises(ServiceUnavailableError, match="no disponible"):
            await client.validate("BOG", "MDE")

    @pytest.mark.asyncio
    async def test_validate_timeout(self, httpx_mock):
        client = AirportServiceClient("http://airport-svc:8001")
        httpx_mock.add_exception(httpx.TimeoutException("timeout"))
        with pytest.raises(ServiceUnavailableError, match="timeout"):
            await client.validate("BOG", "MDE")

    @pytest.mark.asyncio
    async def test_validate_http_error(self, httpx_mock):
        client = AirportServiceClient("http://airport-svc:8001")
        httpx_mock.add_response(
            url="http://airport-svc:8001/airports/validate?salida_id=BOG&llegada_id=MDE",
            status_code=500,
        )
        with pytest.raises(ServiceUnavailableError, match="HTTP 500"):
            await client.validate("BOG", "MDE")

    @pytest.mark.asyncio
    async def test_validate_connection_error(self, httpx_mock):
        client = AirportServiceClient("http://airport-svc:8001")
        httpx_mock.add_exception(httpx.ConnectError("connection refused"))
        with pytest.raises(ServiceUnavailableError, match="inalcanzable"):
            await client.validate("BOG", "MDE")
