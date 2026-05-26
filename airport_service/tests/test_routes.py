import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from airport_service.api.routes import router

app = FastAPI()
app.include_router(router)


def _override_adapter(fake):
    from airport_service.api.routes import get_adapter
    app.dependency_overrides[get_adapter] = lambda: fake


def _clear_overrides():
    app.dependency_overrides.clear()


client = TestClient(app)


class TestListAirports:
    def test_list_all_airports(self, fake_adapter):
        _override_adapter(fake_adapter)
        resp = client.get("/airports/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        assert data[0]["id"] == "BOG"
        _clear_overrides()

    def test_list_airports_service_unavailable(self, fake_adapter_unavailable):
        _override_adapter(fake_adapter_unavailable)
        resp = client.get("/airports/")
        assert resp.status_code == 503
        assert "caída" in resp.json()["detail"]
        _clear_overrides()


class TestValidateAirports:
    def test_validate_valid_pair(self, fake_adapter):
        _override_adapter(fake_adapter)
        resp = client.get("/airports/validate", params={"salida_id": "BOG", "llegada_id": "MDE"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert data["salida_id"] == "BOG"
        assert data["llegada_id"] == "MDE"
        _clear_overrides()

    def test_validate_invalid_pair(self, fake_adapter):
        _override_adapter(fake_adapter)
        resp = client.get("/airports/validate", params={"salida_id": "BOG", "llegada_id": "XYZ"})
        assert resp.status_code == 404
        assert "no encontrados" in resp.json()["detail"]
        _clear_overrides()

    def test_validate_with_case_insensitive_ids(self, fake_adapter):
        _override_adapter(fake_adapter)
        resp = client.get("/airports/validate", params={"salida_id": "bog", "llegada_id": "mde"})
        assert resp.status_code == 200
        assert resp.json()["valid"] is True
        _clear_overrides()

    def test_validate_service_unavailable(self, fake_adapter_unavailable):
        _override_adapter(fake_adapter_unavailable)
        resp = client.get("/airports/validate", params={"salida_id": "BOG", "llegada_id": "MDE"})
        assert resp.status_code == 503
        _clear_overrides()

    def test_validate_whitespace_handling(self, fake_adapter):
        _override_adapter(fake_adapter)
        resp = client.get("/airports/validate", params={"salida_id": " BOG ", "llegada_id": " MDE "})
        assert resp.status_code == 200
        assert resp.json()["salida_id"] == "BOG"
        assert resp.json()["llegada_id"] == "MDE"
        _clear_overrides()
