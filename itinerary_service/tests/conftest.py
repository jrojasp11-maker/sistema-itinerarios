from datetime import date, timedelta
from uuid import uuid4

import pytest

from itinerary_service.domain.exceptions import ServiceUnavailableError
from itinerary_service.domain.models import FlightStatus, Itinerary, ItineraryCreate
from itinerary_service.domain.ports import IAirportValidatorPort, IItineraryRepository


class FakeItineraryRepository(IItineraryRepository):
    def __init__(self):
        self._store: dict = {}

    async def save(self, item):
        self._store[str(item.id)] = item
        return item

    async def get_by_id(self, id):
        return self._store.get(str(id))

    async def list_all(self):
        return list(self._store.values())

    async def list_by_date(self, fecha):
        return [i for i in self._store.values() if i.fecha_viaje == fecha]

    async def update(self, id, data):
        item = self._store.get(str(id))
        if not item:
            return None
        updated = item.model_copy(update=data.model_dump(exclude_none=True))
        self._store[str(id)] = updated
        return updated

    async def delete(self, id):
        return self._store.pop(str(id), None) is not None


class FakeAirportValidator(IAirportValidatorPort):
    def __init__(self, valid=True, raise_unavailable=False):
        self._valid = valid
        self._raise = raise_unavailable

    async def validate(self, salida_id, llegada_id):
        if self._raise:
            raise ServiceUnavailableError("Airport Service caído (simulado)")
        return self._valid


def make_itinerary_create(**kwargs):
    defaults = dict(
        usuario_id=uuid4(),
        aeropuerto_salida_id="BOG",
        aeropuerto_llegada_id="MDE",
        fecha_viaje=date.today() + timedelta(days=7),
        duracion_minutos=55,
        estado=FlightStatus.PLANEADO,
    )
    return ItineraryCreate(**(defaults | kwargs))


@pytest.fixture
def repo():
    return FakeItineraryRepository()


@pytest.fixture
def valid_validator():
    return FakeAirportValidator(valid=True)


@pytest.fixture
def invalid_validator():
    return FakeAirportValidator(valid=False)


@pytest.fixture
def unavailable_validator():
    return FakeAirportValidator(raise_unavailable=True)
