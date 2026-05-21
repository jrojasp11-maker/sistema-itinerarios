from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from itinerary_service.dependencies import get_service
from itinerary_service.domain.exceptions import (
    InvalidAirportsError,
    ItineraryNotFoundError,
    ServiceUnavailableError,
)
from itinerary_service.domain.models import Itinerary, ItineraryCreate, ItineraryUpdate
from itinerary_service.domain.service import ItineraryService

router = APIRouter(prefix="/itineraries", tags=["itineraries"])


@router.post(
    "/",
    response_model=Itinerary,
    status_code=201,
    summary="Crea un itinerario (RF03, RF05, RF06)",
)
async def create_itinerary(
    data: ItineraryCreate,
    svc: ItineraryService = Depends(get_service),
):
    try:
        return await svc.create(data)
    except InvalidAirportsError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ServiceUnavailableError as e:
        raise HTTPException(status_code=503, detail=e.message)


@router.get(
    "/",
    response_model=list[Itinerary],
    summary="Lista itinerarios, filtrable por fecha (RF07)",
)
async def list_itineraries(
    fecha: date | None = Query(default=None, description="Filtrar por fecha de viaje"),
    svc: ItineraryService = Depends(get_service),
):
    return await svc.list_itineraries(fecha)


@router.get("/{id}", response_model=Itinerary)
async def get_itinerary(
    id: UUID,
    svc: ItineraryService = Depends(get_service),
):
    try:
        return await svc.get(id)
    except ItineraryNotFoundError:
        raise HTTPException(status_code=404, detail="Itinerario no encontrado")


@router.patch("/{id}", response_model=Itinerary)
async def update_itinerary(
    id: UUID,
    data: ItineraryUpdate,
    svc: ItineraryService = Depends(get_service),
):
    try:
        return await svc.update(id, data)
    except ItineraryNotFoundError:
        raise HTTPException(status_code=404, detail="Itinerario no encontrado")


@router.delete(
    "/{id}",
    status_code=204,
    summary="Elimina cualquier itinerario, incluyendo del día actual (RF08)",
)
async def delete_itinerary(
    id: UUID,
    svc: ItineraryService = Depends(get_service),
):
    try:
        await svc.delete(id)
    except ItineraryNotFoundError:
        raise HTTPException(status_code=404, detail="Itinerario no encontrado")
