import os
from contextlib import asynccontextmanager

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from itinerary_service.domain.service import ItineraryService
from itinerary_service.infrastructure.airport_client import AirportServiceClient
from itinerary_service.infrastructure.repository import (
    Base,
    SQLAlchemyItineraryRepository,
    make_engine,
    make_session_factory,
)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./itinerarios.db")
AIRPORT_SVC_URL = os.getenv("AIRPORT_SERVICE_URL", "http://localhost:8001")

engine = make_engine(DATABASE_URL)
SessionLocal = make_session_factory(engine)


async def get_db():
    """Open one database session per request."""
    async with SessionLocal() as session:
        yield session


def get_service(session: AsyncSession = Depends(get_db)) -> ItineraryService:
    repo = SQLAlchemyItineraryRepository(session)
    airports = AirportServiceClient(AIRPORT_SVC_URL)
    return ItineraryService(repo=repo, airport_validator=airports)


@asynccontextmanager
async def lifespan(app):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
