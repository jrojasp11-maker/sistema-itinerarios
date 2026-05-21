from datetime import date
from enum import Enum

from pydantic import BaseModel, ConfigDict, UUID4, field_validator


class FlightStatus(str, Enum):
    PLANEADO = "Planeado"
    COMPLETADO = "Completado"
    CANCELADO = "Cancelado"


class ItineraryCreate(BaseModel):
    usuario_id: UUID4
    aeropuerto_salida_id: str
    aeropuerto_llegada_id: str
    fecha_viaje: date
    duracion_minutos: int
    estado: FlightStatus = FlightStatus.PLANEADO

    @field_validator("aeropuerto_salida_id", "aeropuerto_llegada_id")
    @classmethod
    def normalizar_iata(cls, value: str) -> str:
        code = value.strip().upper()
        if len(code) < 3 or len(code) > 10:
            raise ValueError("El código de aeropuerto debe tener entre 3 y 10 caracteres")
        return code

    @field_validator("duracion_minutos")
    @classmethod
    def duracion_positiva(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("La duración debe ser mayor a 0 minutos")
        return value

    @field_validator("aeropuerto_llegada_id")
    @classmethod
    def aeropuertos_distintos(cls, value: str, info) -> str:
        salida = info.data.get("aeropuerto_salida_id")
        if salida and value == salida:
            raise ValueError("El aeropuerto de salida y llegada no pueden ser iguales")
        return value


class Itinerary(ItineraryCreate):
    id: UUID4

    model_config = ConfigDict(from_attributes=True)


class ItineraryUpdate(BaseModel):
    fecha_viaje: date | None = None
    duracion_minutos: int | None = None
    estado: FlightStatus | None = None

    @field_validator("duracion_minutos")
    @classmethod
    def duracion_positiva(cls, value: int | None) -> int | None:
        if value is not None and value <= 0:
            raise ValueError("La duración debe ser mayor a 0 minutos")
        return value
