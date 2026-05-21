from uuid import UUID


class ServiceUnavailableError(Exception):
    def __init__(self, message: str = "Airport Service no disponible"):
        self.message = message
        super().__init__(self.message)


class ItineraryNotFoundError(Exception):
    def __init__(self, id: UUID):
        self.id = id
        super().__init__(f"Itinerario '{id}' no encontrado")


class InvalidAirportsError(Exception):
    def __init__(self, salida_id: str, llegada_id: str):
        super().__init__(
            f"Aeropuertos inválidos: salida='{salida_id}', llegada='{llegada_id}'"
        )
