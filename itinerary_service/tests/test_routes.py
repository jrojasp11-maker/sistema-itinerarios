from datetime import date, timedelta
from uuid import uuid4

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from itinerary_service.api.routes import router
from itinerary_service.domain.models import FlightStatus, Itinerary, ItineraryCreate
from itinerary_service.domain.service import ItineraryService
from itinerary_service.tests.conftest import FakeAirportValidator, FakeItineraryRepository

app = FastAPI()
app.include_router(router)

client = TestClient(app)


def _make_service(repo=None, validator=None):
    from itinerary_service.dependencies import get_service
    svc = ItineraryService(
        repo or FakeItineraryRepository(),
        validator or FakeAirportValidator(valid=True),
    )
    app.dependency_overrides[get_service] = lambda: svc
    return svc


def _clear_overrides():
    app.dependency_overrides.clear()


class TestCreateItinerary:
    def test_create_success(self):
        svc = _make_service()
        payload = {
            "usuario_id": str(uuid4()),
            "aeropuerto_salida_id": "BOG",
            "aeropuerto_llegada_id": "MDE",
            "fecha_viaje": str(date.today() + timedelta(days=7)),
            "duracion_minutos": 55,
        }
        resp = client.post("/itineraries/", json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["aeropuerto_salida_id"] == "BOG"
        assert data["estado"] == "Planeado"
        _clear_overrides()

    def test_create_invalid_airports(self):
        svc = _make_service(validator=FakeAirportValidator(valid=False))
        payload = {
            "usuario_id": str(uuid4()),
            "aeropuerto_salida_id": "BOG",
            "aeropuerto_llegada_id": "XYZ",
            "fecha_viaje": str(date.today()),
            "duracion_minutos": 30,
        }
        resp = client.post("/itineraries/", json=payload)
        assert resp.status_code == 404
        _clear_overrides()

    def test_create_validation_error(self):
        payload = {
            "usuario_id": str(uuid4()),
            "aeropuerto_salida_id": "BOG",
            "aeropuerto_llegada_id": "BOG",
            "fecha_viaje": str(date.today()),
            "duracion_minutos": -1,
        }
        resp = client.post("/itineraries/", json=payload)
        assert resp.status_code == 422
        _clear_overrides()


class TestListItineraries:
    def test_list_all(self):
        svc = _make_service()
        payload = {
            "usuario_id": str(uuid4()),
            "aeropuerto_salida_id": "BOG",
            "aeropuerto_llegada_id": "MDE",
            "fecha_viaje": str(date.today()),
            "duracion_minutos": 30,
        }
        client.post("/itineraries/", json=payload)
        resp = client.get("/itineraries/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1
        _clear_overrides()

    def test_list_empty(self):
        _make_service()
        resp = client.get("/itineraries/")
        assert resp.status_code == 200
        assert resp.json() == []
        _clear_overrides()

    def test_filter_by_date(self):
        svc = _make_service()
        payload = {
            "usuario_id": str(uuid4()),
            "aeropuerto_salida_id": "BOG",
            "aeropuerto_llegada_id": "MDE",
            "fecha_viaje": str(date.today()),
            "duracion_minutos": 30,
        }
        client.post("/itineraries/", json=payload)
        resp = client.get("/itineraries/", params={"fecha": str(date.today())})
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        _clear_overrides()


class TestGetItinerary:
    def test_get_existing(self):
        svc = _make_service()
        payload = {
            "usuario_id": str(uuid4()),
            "aeropuerto_salida_id": "BOG",
            "aeropuerto_llegada_id": "MDE",
            "fecha_viaje": str(date.today()),
            "duracion_minutos": 30,
        }
        create_resp = client.post("/itineraries/", json=payload)
        item_id = create_resp.json()["id"]
        resp = client.get(f"/itineraries/{item_id}")
        assert resp.status_code == 200
        assert resp.json()["id"] == item_id
        _clear_overrides()

    def test_get_non_existing(self):
        _make_service()
        resp = client.get(f"/itineraries/{uuid4()}")
        assert resp.status_code == 404
        _clear_overrides()


class TestUpdateItinerary:
    def test_update_existing(self):
        svc = _make_service()
        payload = {
            "usuario_id": str(uuid4()),
            "aeropuerto_salida_id": "BOG",
            "aeropuerto_llegada_id": "MDE",
            "fecha_viaje": str(date.today()),
            "duracion_minutos": 30,
        }
        create_resp = client.post("/itineraries/", json=payload)
        item_id = create_resp.json()["id"]
        resp = client.patch(f"/itineraries/{item_id}", json={"duracion_minutos": 90})
        assert resp.status_code == 200
        assert resp.json()["duracion_minutos"] == 90
        _clear_overrides()

    def test_update_non_existing(self):
        _make_service()
        resp = client.patch(f"/itineraries/{uuid4()}", json={"duracion_minutos": 90})
        assert resp.status_code == 404
        _clear_overrides()


class TestDeleteItinerary:
    def test_delete_existing(self):
        svc = _make_service()
        payload = {
            "usuario_id": str(uuid4()),
            "aeropuerto_salida_id": "BOG",
            "aeropuerto_llegada_id": "MDE",
            "fecha_viaje": str(date.today()),
            "duracion_minutos": 30,
        }
        create_resp = client.post("/itineraries/", json=payload)
        item_id = create_resp.json()["id"]
        resp = client.delete(f"/itineraries/{item_id}")
        assert resp.status_code == 204
        _clear_overrides()

    def test_delete_non_existing(self):
        _make_service()
        resp = client.delete(f"/itineraries/{uuid4()}")
        assert resp.status_code == 404
        _clear_overrides()
