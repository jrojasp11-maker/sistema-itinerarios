from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from itinerary_service.api.routes import router
from itinerary_service.dependencies import lifespan

app = FastAPI(
    title="Itinerary Service",
    description="Microservicio CRUD de itinerarios empresariales",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "itinerary-service"}
