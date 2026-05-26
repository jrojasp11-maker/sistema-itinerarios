from uuid import uuid4

import pytest

from airport_service.domain.exceptions import ServiceUnavailableError
from airport_service.domain.models import Airport
from airport_service.domain.ports import IAirportPort


class FakeAirportAdapter(IAirportPort):
    def __init__(self, airports=None, raise_unavailable=False):
        self._airports = airports or [
            Airport(id="BOG", nombre="El Dorado", ciudad="Bogotá", departamento="Cundinamarca", lat=4.7, lng=-74.2),
            Airport(id="MDE", nombre="José María Córdova", ciudad="Medellín", departamento="Antioquia", lat=6.2, lng=-75.4),
            Airport(id="CLO", nombre="Alfonso Bonilla Aragón", ciudad="Cali", departamento="Valle del Cauca", lat=3.5, lng=-76.4),
        ]
        self._raise = raise_unavailable

    async def get_all(self) -> list[Airport]:
        if self._raise:
            raise ServiceUnavailableError("API Colombia caída (simulado)")
        return self._airports

    async def validate(self, salida_id: str, llegada_id: str) -> bool:
        if self._raise:
            raise ServiceUnavailableError("API Colombia caída (simulado)")
        ids = {a.id for a in self._airports}
        return salida_id.strip().upper() in ids and llegada_id.strip().upper() in ids


@pytest.fixture
def fake_adapter():
    return FakeAirportAdapter()


@pytest.fixture
def fake_adapter_unavailable():
    return FakeAirportAdapter(raise_unavailable=True)
