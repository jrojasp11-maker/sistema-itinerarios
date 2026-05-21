from fastapi import APIRouter, Depends, HTTPException

from airport_service.domain.exceptions import ServiceUnavailableError
from airport_service.domain.models import Airport
from airport_service.domain.ports import IAirportPort
from airport_service.infrastructure.adapter import ApiColombiaAirportAdapter

router = APIRouter(prefix="/airports", tags=["airports"])


def get_adapter() -> IAirportPort:
    return ApiColombiaAirportAdapter()


@router.get("/", response_model=list[Airport], summary="Lista todos los aeropuertos colombianos")
async def list_airports(adapter: IAirportPort = Depends(get_adapter)):
    try:
        return await adapter.get_all()
    except ServiceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message)


@router.get(
    "/validate",
    summary="Verifica que dos aeropuertos existen (RF05)",
    response_model=dict,
)
async def validate_airports(
    salida_id: str,
    llegada_id: str,
    adapter: IAirportPort = Depends(get_adapter),
):
    try:
        valid = await adapter.validate(salida_id, llegada_id)
        if not valid:
            raise HTTPException(status_code=404, detail="Uno o ambos aeropuertos no encontrados")
        return {
            "valid": True,
            "salida_id": salida_id.strip().upper(),
            "llegada_id": llegada_id.strip().upper(),
        }
    except ServiceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=exc.message)
