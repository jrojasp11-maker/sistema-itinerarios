import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app):
    try:
        from itinerary_service.infrastructure.repository import Base
        from itinerary_service.dependencies import engine
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logging.info("Database tables created successfully")
    except Exception as e:
        logging.warning("Database unavailable: %s. Itinerary API will fail.", e)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from airport_service.main import app as airport_app
from itinerary_service.main import app as itinerary_app

app.mount("/api/airport", airport_app)
app.mount("/api/itinerary", itinerary_app)
