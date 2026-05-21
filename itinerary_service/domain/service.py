from datetime import date
from uuid import UUID, uuid4

from itinerary_service.domain.exceptions import (
    InvalidAirportsError,
    ItineraryNotFoundError,
)
from itinerary_service.domain.models import Itinerary, ItineraryCreate, ItineraryUpdate
from itinerary_service.domain.ports import IAirportValidatorPort, IItineraryRepository


class ItineraryService:
    """Núcleo del dominio. No depende de FastAPI, SQLAlchemy ni httpx."""

    def __init__(
        self,
        repo: IItineraryRepository,
        airport_validator: IAirportValidatorPort,
    ):
        self._repo = repo
        self._airports = airport_validator

    async def create(self, data: ItineraryCreate) -> Itinerary:
        valid = await self._airports.validate(
            data.aeropuerto_salida_id,
            data.aeropuerto_llegada_id,
        )
        if not valid:
            raise InvalidAirportsError(
                data.aeropuerto_salida_id,
                data.aeropuerto_llegada_id,
            )

        item = Itinerary(id=uuid4(), **data.model_dump())
        return await self._repo.save(item)

    async def list_itineraries(self, fecha: date | None = None) -> list[Itinerary]:
        if fecha:
            return await self._repo.list_by_date(fecha)
        return await self._repo.list_all()

    async def get(self, id: UUID) -> Itinerary:
        item = await self._repo.get_by_id(id)
        if not item:
            raise ItineraryNotFoundError(id)
        return item

    async def update(self, id: UUID, data: ItineraryUpdate) -> Itinerary:
        item = await self._repo.update(id, data)
        if not item:
            raise ItineraryNotFoundError(id)
        return item

    async def delete(self, id: UUID) -> None:
        deleted = await self._repo.delete(id)
        if not deleted:
            raise ItineraryNotFoundError(id)
