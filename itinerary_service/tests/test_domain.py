"""Tests del dominio — sin base de datos ni HTTP real.
Demuestra el valor de la arquitectura hexagonal: los fakes sustituyen
los adaptadores reales y el dominio se testea en puro Python.
"""
import pytest
from uuid import uuid4
from datetime import date, timedelta

from itinerary_service.domain.models import ItineraryCreate, FlightStatus
from itinerary_service.domain.service import ItineraryService
from itinerary_service.domain.ports import IItineraryRepository, IAirportValidatorPort
from itinerary_service.domain.exceptions import ServiceUnavailableError, InvalidAirportsError


# ── Fakes (dobles de prueba) ────────────────────────────────────────────────

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
    """Por defecto valida todo. Se puede configurar para simular fallos."""
    def __init__(self, valid=True, raise_unavailable=False):
        self._valid = valid
        self._raise = raise_unavailable

    async def validate(self, salida_id, llegada_id):
        if self._raise:
            raise ServiceUnavailableError("Airport Service caído (simulado)")
        return self._valid


# ── Tests ───────────────────────────────────────────────────────────────────

def make_data(**kwargs):
    defaults = dict(
        usuario_id=uuid4(),
        aeropuerto_salida_id="BOG",
        aeropuerto_llegada_id="MDE",
        fecha_viaje=date.today() + timedelta(days=7),
        duracion_minutos=55,
        estado=FlightStatus.PLANEADO,
    )
    return ItineraryCreate(**(defaults | kwargs))


@pytest.mark.asyncio
async def test_create_itinerary_happy_path():
    svc = ItineraryService(FakeItineraryRepository(), FakeAirportValidator(valid=True))
    result = await svc.create(make_data())
    assert result.aeropuerto_salida_id == "BOG"
    assert result.estado == FlightStatus.PLANEADO


@pytest.mark.asyncio
async def test_create_fails_if_airports_invalid():
    svc = ItineraryService(FakeItineraryRepository(), FakeAirportValidator(valid=False))
    with pytest.raises(InvalidAirportsError):
        await svc.create(make_data())


@pytest.mark.asyncio
async def test_create_fails_if_airport_service_down():
    svc = ItineraryService(FakeItineraryRepository(), FakeAirportValidator(raise_unavailable=True))
    with pytest.raises(ServiceUnavailableError):
        await svc.create(make_data())


@pytest.mark.asyncio
async def test_filter_by_date():
    repo = FakeItineraryRepository()
    svc  = ItineraryService(repo, FakeAirportValidator())
    today = date.today()
    tomorrow = today + timedelta(days=1)

    await svc.create(make_data(fecha_viaje=today))
    await svc.create(make_data(fecha_viaje=tomorrow))

    results = await svc.list_itineraries(fecha=today)
    assert len(results) == 1
    assert results[0].fecha_viaje == today


@pytest.mark.asyncio
async def test_delete_itinerary():
    repo = FakeItineraryRepository()
    svc  = ItineraryService(repo, FakeAirportValidator())
    item = await svc.create(make_data())
    await svc.delete(item.id)
    assert await repo.get_by_id(item.id) is None
