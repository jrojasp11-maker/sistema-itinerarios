from pydantic import BaseModel


class Airport(BaseModel):
    id: str
    nombre: str
    ciudad: str
    departamento: str
    lat: float
    lng: float
