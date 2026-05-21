FROM python:3.11-slim

WORKDIR /app

COPY itinerary_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos la carpeta completa como paquete Python
COPY itinerary_service/ ./itinerary_service/

ENV PYTHONPATH=/app

EXPOSE 8002
CMD ["uvicorn", "itinerary_service.main:app", "--host", "0.0.0.0", "--port", "8002"]
