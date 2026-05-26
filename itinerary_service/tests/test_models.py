from datetime import date, timedelta
from uuid import uuid4

import pytest
from pydantic import ValidationError

from itinerary_service.domain.models import FlightStatus, ItineraryCreate, ItineraryUpdate


class TestItineraryCreate:
    def test_valid_creation(self):
        data = ItineraryCreate(
            usuario_id=uuid4(),
            aeropuerto_salida_id="BOG",
            aeropuerto_llegada_id="MDE",
            fecha_viaje=date.today() + timedelta(days=7),
            duracion_minutos=55,
        )
        assert data.aeropuerto_salida_id == "BOG"
        assert data.estado == FlightStatus.PLANEADO

    def test_normalizes_iata_codes(self):
        data = ItineraryCreate(
            usuario_id=uuid4(),
            aeropuerto_salida_id=" bog ",
            aeropuerto_llegada_id=" MDE ",
            fecha_viaje=date.today(),
            duracion_minutos=30,
        )
        assert data.aeropuerto_salida_id == "BOG"
        assert data.aeropuerto_llegada_id == "MDE"

    def test_rejects_same_airport(self):
        with pytest.raises(ValidationError, match="no pueden ser iguales"):
            ItineraryCreate(
                usuario_id=uuid4(),
                aeropuerto_salida_id="BOG",
                aeropuerto_llegada_id="BOG",
                fecha_viaje=date.today(),
                duracion_minutos=30,
            )

    def test_rejects_short_iata_code(self):
        with pytest.raises(ValidationError, match="3 y 10 caracteres"):
            ItineraryCreate(
                usuario_id=uuid4(),
                aeropuerto_salida_id="BO",
                aeropuerto_llegada_id="MDE",
                fecha_viaje=date.today(),
                duracion_minutos=30,
            )

    def test_rejects_long_iata_code(self):
        with pytest.raises(ValidationError, match="3 y 10 caracteres"):
            ItineraryCreate(
                usuario_id=uuid4(),
                aeropuerto_salida_id="A" * 11,
                aeropuerto_llegada_id="MDE",
                fecha_viaje=date.today(),
                duracion_minutos=30,
            )

    def test_rejects_zero_duration(self):
        with pytest.raises(ValidationError, match="mayor a 0"):
            ItineraryCreate(
                usuario_id=uuid4(),
                aeropuerto_salida_id="BOG",
                aeropuerto_llegada_id="MDE",
                fecha_viaje=date.today(),
                duracion_minutos=0,
            )

    def test_rejects_negative_duration(self):
        with pytest.raises(ValidationError, match="mayor a 0"):
            ItineraryCreate(
                usuario_id=uuid4(),
                aeropuerto_salida_id="BOG",
                aeropuerto_llegada_id="MDE",
                fecha_viaje=date.today(),
                duracion_minutos=-10,
            )

    def test_custom_status(self):
        data = ItineraryCreate(
            usuario_id=uuid4(),
            aeropuerto_salida_id="BOG",
            aeropuerto_llegada_id="MDE",
            fecha_viaje=date.today(),
            duracion_minutos=30,
            estado=FlightStatus.COMPLETADO,
        )
        assert data.estado == FlightStatus.COMPLETADO


class TestItineraryUpdate:
    def test_partial_update(self):
        data = ItineraryUpdate(duracion_minutos=90)
        assert data.duracion_minutos == 90
        assert data.fecha_viaje is None
        assert data.estado is None

    def test_rejects_zero_duration(self):
        with pytest.raises(ValidationError, match="mayor a 0"):
            ItineraryUpdate(duracion_minutos=0)

    def test_allows_none_duration(self):
        data = ItineraryUpdate()
        assert data.duracion_minutos is None

    def test_full_update(self):
        data = ItineraryUpdate(
            fecha_viaje=date(2025, 12, 25),
            duracion_minutos=120,
            estado=FlightStatus.CANCELADO,
        )
        assert data.fecha_viaje == date(2025, 12, 25)
        assert data.duracion_minutos == 120
        assert data.estado == FlightStatus.CANCELADO
