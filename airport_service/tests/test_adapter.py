import pytest

from airport_service.infrastructure.adapter import ApiColombiaAirportAdapter


def test_adapt_swaps_api_colombia_latitude_longitude_fields():
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
