from abc import ABC, abstractmethod

from airport_service.domain.models import Airport


class IAirportPort(ABC):
    """Puerto de salida: define qué necesita el dominio."""

    @abstractmethod
    async def get_all(self) -> list[Airport]:
        """Obtiene todos los aeropuertos colombianos."""
        ...

    @abstractmethod
    async def validate(self, salida_id: str, llegada_id: str) -> bool:
        """Verifica que ambos aeropuertos existen."""
        ...
