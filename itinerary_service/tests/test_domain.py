from datetime import date, timedelta
from uuid import uuid4

import pytest

from itinerary_service.domain.exceptions import (
    InvalidAirportsError,
    ItineraryNotFoundError,
    ServiceUnavailableError,
)
from itinerary_service.domain.models import FlightStatus, ItineraryUpdate
from itinerary_service.domain.service import ItineraryService
from itinerary_service.tests.conftest import make_itinerary_create


class TestCreate:
    @pytest.mark.asyncio
    async def test_happy_path(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        data = make_itinerary_create()
        result = await svc.create(data)
        assert result.aeropuerto_salida_id == "BOG"
        assert result.estado == FlightStatus.PLANEADO
        assert result.id is not None

    @pytest.mark.asyncio
    async def test_fails_if_airports_invalid(self, repo, invalid_validator):
        svc = ItineraryService(repo, invalid_validator)
        with pytest.raises(InvalidAirportsError):
            await svc.create(make_itinerary_create())

    @pytest.mark.asyncio
    async def test_fails_if_airport_service_down(self, repo, unavailable_validator):
        svc = ItineraryService(repo, unavailable_validator)
        with pytest.raises(ServiceUnavailableError):
            await svc.create(make_itinerary_create())


class TestList:
    @pytest.mark.asyncio
    async def test_list_all(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        await svc.create(make_itinerary_create())
        await svc.create(make_itinerary_create())
        results = await svc.list_itineraries()
        assert len(results) == 2

    @pytest.mark.asyncio
    async def test_list_empty(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        results = await svc.list_itineraries()
        assert results == []

    @pytest.mark.asyncio
    async def test_filter_by_date(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        today = date.today()
        tomorrow = today + timedelta(days=1)
        await svc.create(make_itinerary_create(fecha_viaje=today))
        await svc.create(make_itinerary_create(fecha_viaje=tomorrow))
        results = await svc.list_itineraries(fecha=today)
        assert len(results) == 1
        assert results[0].fecha_viaje == today

    @pytest.mark.asyncio
    async def test_filter_by_date_no_matches(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        await svc.create(make_itinerary_create(fecha_viaje=date.today()))
        results = await svc.list_itineraries(fecha=date(2020, 1, 1))
        assert results == []


class TestGet:
    @pytest.mark.asyncio
    async def test_get_existing(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        item = await svc.create(make_itinerary_create())
        result = await svc.get(item.id)
        assert result.id == item.id

    @pytest.mark.asyncio
    async def test_get_non_existing(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        with pytest.raises(ItineraryNotFoundError):
            await svc.get(uuid4())


class TestUpdate:
    @pytest.mark.asyncio
    async def test_update_existing(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        item = await svc.create(make_itinerary_create())
        updated = await svc.update(item.id, ItineraryUpdate(duracion_minutos=120))
        assert updated.duracion_minutos == 120
        assert updated.id == item.id

    @pytest.mark.asyncio
    async def test_update_non_existing(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        with pytest.raises(ItineraryNotFoundError):
            await svc.update(uuid4(), ItineraryUpdate(duracion_minutos=120))

    @pytest.mark.asyncio
    async def test_update_status(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        item = await svc.create(make_itinerary_create())
        updated = await svc.update(item.id, ItineraryUpdate(estado=FlightStatus.COMPLETADO))
        assert updated.estado == FlightStatus.COMPLETADO


class TestDelete:
    @pytest.mark.asyncio
    async def test_delete_existing(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        item = await svc.create(make_itinerary_create())
        await svc.delete(item.id)
        assert await repo.get_by_id(item.id) is None

    @pytest.mark.asyncio
    async def test_delete_non_existing(self, repo, valid_validator):
        svc = ItineraryService(repo, valid_validator)
        with pytest.raises(ItineraryNotFoundError):
            await svc.delete(uuid4())
