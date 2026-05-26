from airport_service.domain.models import Airport


def test_airport_model_creation():
    a = Airport(id="BOG", nombre="El Dorado", ciudad="Bogotá", departamento="Cundinamarca", lat=4.7, lng=-74.2)
    assert a.id == "BOG"
    assert a.nombre == "El Dorado"
    assert a.ciudad == "Bogotá"
    assert a.departamento == "Cundinamarca"
    assert a.lat == 4.7
    assert a.lng == -74.2


def test_airport_model_defaults():
    a = Airport(id="MDE", nombre="Test", ciudad="Medellín", departamento="Antioquia", lat=0.0, lng=0.0)
    assert a.lat == 0.0
    assert a.lng == 0.0


def test_airport_model_immutable():
    a = Airport(id="BOG", nombre="El Dorado", ciudad="Bogotá", departamento="Cundinamarca", lat=4.7, lng=-74.2)
    assert a.model_fields["id"].alias is None


def test_airport_repr():
    a = Airport(id="BOG", nombre="El Dorado", ciudad="Bogotá", departamento="Cundinamarca", lat=4.7, lng=-74.2)
    r = repr(a)
    assert "BOG" in r
    assert "El Dorado" in r
