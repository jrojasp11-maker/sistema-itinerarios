import httpx
import pytest

from airport_service.domain.exceptions import ServiceUnavailableError
from airport_service.domain.models import Airport
from airport_service.infrastructure.adapter import ApiColombiaAirportAdapter


class TestAdaptMethod:
    def test_adapt_swaps_api_colombia_latitude_longitude_fields(self):
        adapter = ApiColombiaAirportAdapter()
        airport = adapter._adapt(
            {
                "iataCode": "BOG",
                "name": "Aeropuerto Internacional El Dorado",
                "city": {"name": "Bogotá", "department": {"name": "Cundinamarca"}},
                "latitude": -74.160003,
                "longitude": 4.698402,
            }
        )
        assert airport.id == "BOG"
        assert airport.lat == pytest.approx(4.698402)
        assert airport.lng == pytest.approx(-74.160003)

    def test_adapt_without_department(self):
        adapter = ApiColombiaAirportAdapter()
        airport = adapter._adapt(
            {
                "iataCode": "MDE",
                "name": "José María Córdova",
                "city": {"name": "Medellín", "department": None},
                "latitude": -75.4,
                "longitude": 6.2,
            }
        )
        assert airport.id == "MDE"
        assert airport.departamento == ""

    def test_adapt_city_as_string(self):
        adapter = ApiColombiaAirportAdapter()
        airport = adapter._adapt(
            {
                "iataCode": "CLO",
                "name": "Alfonso Bonilla Aragón",
                "city": "Cali",
                "latitude": -76.4,
                "longitude": 3.5,
            }
        )
        assert airport.ciudad == "Cali"
        assert airport.departamento == ""

    def test_adapt_fallback_iata_code(self):
        adapter = ApiColombiaAirportAdapter()
        airport = adapter._adapt(
            {
                "id": 123,
                "name": "Some Airport",
                "city": {"name": "City"},
                "latitude": 0,
                "longitude": 0,
            }
        )
        assert airport.id == "123"

    def test_adapt_fallback_when_iata_missing_and_id_missing(self):
        adapter = ApiColombiaAirportAdapter()
        airport = adapter._adapt(
            {
                "name": "No Code Airport",
                "city": {"name": "City"},
                "latitude": 0,
                "longitude": 0,
            }
        )
        assert airport.id == ""

    def test_adapt_strips_and_uppercases_iata(self):
        adapter = ApiColombiaAirportAdapter()
        airport = adapter._adapt(
            {
                "iataCode": " bog ",
                "name": "Test",
                "city": {"name": "City"},
                "latitude": 0,
                "longitude": 0,
            }
        )
        assert airport.id == "BOG"


class TestValidate:
    @pytest.mark.asyncio
    async def test_validate_valid_airports(self, httpx_mock):
        adapter = ApiColombiaAirportAdapter(base_url="http://test/api/v1")
        httpx_mock.add_response(
            url="http://test/api/v1/Airport",
            json=[
                {"iataCode": "BOG", "name": "El Dorado", "city": {"name": "Bogotá"}, "latitude": 4.7, "longitude": -74.2},
                {"iataCode": "MDE", "name": "José María Córdova", "city": {"name": "Medellín"}, "latitude": 6.2, "longitude": -75.4},
            ],
        )
        result = await adapter.validate("BOG", "MDE")
        assert result is True

    @pytest.mark.asyncio
    async def test_validate_invalid_airports(self, httpx_mock):
        adapter = ApiColombiaAirportAdapter(base_url="http://test/api/v1")
        httpx_mock.add_response(
            url="http://test/api/v1/Airport",
            json=[
                {"iataCode": "BOG", "name": "El Dorado", "city": {"name": "Bogotá"}, "latitude": 4.7, "longitude": -74.2},
            ],
        )
        result = await adapter.validate("BOG", "XYZ")
        assert result is False


class TestGetAll:
    @pytest.mark.asyncio
    async def test_get_all_filters_empty_ids(self, httpx_mock):
        adapter = ApiColombiaAirportAdapter(base_url="http://test/api/v1")
        httpx_mock.add_response(
            url="http://test/api/v1/Airport",
            json=[
                {"iataCode": "", "name": "No IATA", "city": {"name": "City"}, "latitude": 0, "longitude": 0},
                {"iataCode": "BOG", "name": "El Dorado", "city": {"name": "Bogotá"}, "latitude": 4.7, "longitude": -74.2},
            ],
        )
        airports = await adapter.get_all()
        assert len(airports) == 1
        assert airports[0].id == "BOG"

    @pytest.mark.asyncio
    async def test_get_all_returns_airport_objects(self, httpx_mock):
        adapter = ApiColombiaAirportAdapter(base_url="http://test/api/v1")
        httpx_mock.add_response(
            url="http://test/api/v1/Airport",
            json=[
                {"iataCode": "BOG", "name": "El Dorado", "city": {"name": "Bogotá"}, "latitude": 4.7, "longitude": -74.2},
            ],
        )
        airports = await adapter.get_all()
        assert len(airports) == 1
        assert isinstance(airports[0], Airport)

    @pytest.mark.asyncio
    async def test_get_all_timeout_raises_service_unavailable(self, httpx_mock):
        adapter = ApiColombiaAirportAdapter(base_url="http://test/api/v1")
        httpx_mock.add_exception(httpx.TimeoutException("timeout"))
        with pytest.raises(ServiceUnavailableError, match="timeout"):
            await adapter.get_all()

    @pytest.mark.asyncio
    async def test_get_all_http_error_raises_service_unavailable(self, httpx_mock):
        adapter = ApiColombiaAirportAdapter(base_url="http://test/api/v1")
        httpx_mock.add_response(url="http://test/api/v1/Airport", status_code=500)
        with pytest.raises(ServiceUnavailableError, match="HTTP 500"):
            await adapter.get_all()

    @pytest.mark.asyncio
    async def test_get_all_connection_error_raises_service_unavailable(self, httpx_mock):
        adapter = ApiColombiaAirportAdapter(base_url="http://test/api/v1")
        httpx_mock.add_exception(httpx.ConnectError("connection refused"))
        with pytest.raises(ServiceUnavailableError, match="error de conexión"):
            await adapter.get_all()
