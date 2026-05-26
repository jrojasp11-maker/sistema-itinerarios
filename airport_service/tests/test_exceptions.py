from airport_service.domain.exceptions import AirportNotFoundError, ServiceUnavailableError


def test_service_unavailable_error_default():
    err = ServiceUnavailableError()
    assert err.message == "Servicio de aeropuertos no disponible"
    assert str(err) == "Servicio de aeropuertos no disponible"


def test_service_unavailable_error_custom():
    err = ServiceUnavailableError("Timeout en API Colombia")
    assert err.message == "Timeout en API Colombia"


def test_airport_not_found_error():
    err = AirportNotFoundError("XYZ")
    assert err.airport_id == "XYZ"
    assert "XYZ" in str(err)
    assert "no encontrado" in str(err)
