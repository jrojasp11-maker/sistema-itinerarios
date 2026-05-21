FROM python:3.11-slim

WORKDIR /app

# Copiamos requirements desde el contexto raíz
COPY airport_service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos la carpeta completa como paquete Python
COPY airport_service/ ./airport_service/

ENV PYTHONPATH=/app

EXPOSE 8001
CMD ["uvicorn", "airport_service.main:app", "--host", "0.0.0.0", "--port", "8001"]
