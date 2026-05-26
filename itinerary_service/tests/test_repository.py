from datetime import date, timedelta
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from itinerary_service.domain.models import FlightStatus, Itinerary, ItineraryCreate, ItineraryUpdate
from itinerary_service.infrastructure.repository import (
    Base,
    SQLAlchemyItineraryRepository,
)


@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with factory() as session:
        yield session
    await engine.dispose()


@pytest_asyncio.fixture
async def repo(db_session):
    return SQLAlchemyItineraryRepository(db_session)


def make_data(**kwargs):
    defaults = dict(
        usuario_id=uuid4(),
        aeropuerto_salida_id="BOG",
        aeropuerto_llegada_id="MDE",
        fecha_viaje=date.today() + timedelta(days=7),
        duracion_minutos=55,
        estado=FlightStatus.PLANEADO,
    )
    return ItineraryCreate(**(defaults | kwargs))


@pytest.mark.asyncio
class TestSQLAlchemyRepository:
    async def test_save_and_retrieve(self, repo):
        data = make_data()
        item = Itinerary(**{k: v for k, v in data.model_dump().items()}, id=uuid4())
        saved = await repo.save(item)
        assert saved.id == item.id
        assert saved.aeropuerto_salida_id == "BOG"

    async def test_get_by_id_not_found(self, repo):
        result = await repo.get_by_id(uuid4())
        assert result is None

    async def test_list_all_empty(self, repo):
        result = await repo.list_all()
        assert result == []

    async def test_list_all_with_data(self, repo):
        item = Itinerary(**make_data().model_dump(), id=uuid4())
        await repo.save(item)
        result = await repo.list_all()
        assert len(result) == 1

    async def test_list_by_date(self, repo):
        today = date.today()
        item = Itinerary(**make_data(fecha_viaje=today).model_dump(), id=uuid4())
        await repo.save(item)
        result = await repo.list_by_date(today)
        assert len(result) == 1
        assert result[0].fecha_viaje == today

    async def test_list_by_date_no_match(self, repo):
        result = await repo.list_by_date(date(2020, 1, 1))
        assert result == []

    async def test_update_existing(self, repo):
        item = Itinerary(**make_data().model_dump(), id=uuid4())
        await repo.save(item)
        updated = await repo.update(item.id, ItineraryUpdate(duracion_minutos=120))
        assert updated is not None
        assert updated.duracion_minutos == 120

    async def test_update_not_found(self, repo):
        result = await repo.update(uuid4(), ItineraryUpdate(duracion_minutos=120))
        assert result is None

    async def test_delete_existing(self, repo):
        item = Itinerary(**make_data().model_dump(), id=uuid4())
        await repo.save(item)
        result = await repo.delete(item.id)
        assert result is True
        assert await repo.get_by_id(item.id) is None

    async def test_delete_not_found(self, repo):
        result = await repo.delete(uuid4())
        assert result is False
