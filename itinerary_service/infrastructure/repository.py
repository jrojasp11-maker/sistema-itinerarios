from datetime import date
from enum import Enum
from uuid import UUID

from sqlalchemy import Column, Date, Integer, String, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from itinerary_service.domain.models import Itinerary, ItineraryUpdate
from itinerary_service.domain.ports import IItineraryRepository


class Base(DeclarativeBase):
    pass


class ItineraryORM(Base):
    """Modelo relacional (RNF04). Solo vive en infraestructura."""

    __tablename__ = "itinerarios"

    id = Column(String(36), primary_key=True)
    usuario_id = Column(String(36), nullable=False)
    aeropuerto_salida_id = Column(String(10), nullable=False)
    aeropuerto_llegada_id = Column(String(10), nullable=False)
    fecha_viaje = Column(Date, nullable=False)
    duracion_minutos = Column(Integer, nullable=False)
    estado = Column(String(20), nullable=False, default="Planeado")


def _to_domain(row: ItineraryORM) -> Itinerary:
    return Itinerary(
        id=row.id,
        usuario_id=row.usuario_id,
        aeropuerto_salida_id=row.aeropuerto_salida_id,
        aeropuerto_llegada_id=row.aeropuerto_llegada_id,
        fecha_viaje=row.fecha_viaje,
        duracion_minutos=row.duracion_minutos,
        estado=row.estado,
    )


def _db_value(value):
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Enum):
        return value.value
    return value


class SQLAlchemyItineraryRepository(IItineraryRepository):
    """Adaptador de salida: persiste en PostgreSQL/SQLite vía SQLAlchemy."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, item: Itinerary) -> Itinerary:
        row = ItineraryORM(**{k: _db_value(v) for k, v in item.model_dump().items()})
        try:
            self._session.add(row)
            await self._session.commit()
            await self._session.refresh(row)
            return _to_domain(row)
        except Exception:
            await self._session.rollback()
            raise

    async def get_by_id(self, id: UUID) -> Itinerary | None:
        row = await self._session.get(ItineraryORM, str(id))
        return _to_domain(row) if row else None

    async def list_all(self) -> list[Itinerary]:
        result = await self._session.execute(
            select(ItineraryORM).order_by(ItineraryORM.fecha_viaje.desc())
        )
        return [_to_domain(row) for row in result.scalars()]

    async def list_by_date(self, fecha: date) -> list[Itinerary]:
        result = await self._session.execute(
            select(ItineraryORM)
            .where(ItineraryORM.fecha_viaje == fecha)
            .order_by(ItineraryORM.id.desc())
        )
        return [_to_domain(row) for row in result.scalars()]

    async def update(self, id: UUID, data: ItineraryUpdate) -> Itinerary | None:
        row = await self._session.get(ItineraryORM, str(id))
        if not row:
            return None

        try:
            for field, value in data.model_dump(exclude_none=True).items():
                setattr(row, field, _db_value(value))
            await self._session.commit()
            await self._session.refresh(row)
            return _to_domain(row)
        except Exception:
            await self._session.rollback()
            raise

    async def delete(self, id: UUID) -> bool:
        row = await self._session.get(ItineraryORM, str(id))
        if not row:
            return False

        try:
            await self._session.delete(row)
            await self._session.commit()
            return True
        except Exception:
            await self._session.rollback()
            raise


def make_engine(database_url: str):
    return create_async_engine(database_url, echo=False, pool_pre_ping=True)


def make_session_factory(engine):
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
