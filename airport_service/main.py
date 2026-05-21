from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from airport_service.api.routes import router

app = FastAPI(
    title="Airport Service",
    description="Microservicio de aeropuertos colombianos - Sistema de Itinerarios Empresariales",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción: restringir al origen del frontend.
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "airport-service"}
