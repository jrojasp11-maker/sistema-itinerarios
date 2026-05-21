class ServiceUnavailableError(Exception):
    """Se lanza cuando API Colombia no responde."""

    def __init__(self, message: str = "Servicio de aeropuertos no disponible"):
        self.message = message
        super().__init__(self.message)


class AirportNotFoundError(Exception):
    """Se lanza cuando un ID de aeropuerto no existe."""

    def __init__(self, airport_id: str):
        self.airport_id = airport_id
        super().__init__(f"Aeropuerto '{airport_id}' no encontrado")
