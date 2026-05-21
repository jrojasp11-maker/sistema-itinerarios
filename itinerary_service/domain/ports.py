from abc import ABC, abstractmethod
from datetime import date
from uuid import UUID
from itinerary_service.domain.models import Itinerary, ItineraryCreate, ItineraryUpdate


class IItineraryRepository(ABC):
    """Puerto de salida hacia la base de datos.
    El dominio define qué necesita; la infraestructura decide cómo guardarlo."""

    @abstractmethod
    async def save(self, item: Itinerary) -> Itinerary: ...

    @abstractmethod
    async def get_by_id(self, id: UUID) -> Itinerary | None: ...

    @abstractmethod
    async def list_all(self) -> list[Itinerary]: ...

    @abstractmethod
    async def list_by_date(self, fecha: date) -> list[Itinerary]: ...

    @abstractmethod
    async def update(self, id: UUID, data: ItineraryUpdate) -> Itinerary | None: ...

    @abstractmethod
    async def delete(self, id: UUID) -> bool: ...


class IAirportValidatorPort(ABC):
    """Puerto de salida hacia el Airport Service.
    Desacopla el dominio del cliente HTTP concreto."""

    @abstractmethod
    async def validate(self, salida_id: str, llegada_id: str) -> bool:
        """Lanza ServiceUnavailableError si el Airport Service no responde."""
        ...
