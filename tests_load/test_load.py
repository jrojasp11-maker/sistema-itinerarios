"""
Load testing script for AeroRutas microservices.
Tests both airport_service and itinerary_service endpoints with configurable concurrency.
"""
import asyncio
import json
import time
import statistics
from datetime import date, timedelta
from uuid import uuid4
from dataclasses import dataclass, field

import httpx


@dataclass
class LoadTestResult:
    name: str
    total_requests: int
    successful: int
    failed: int
    total_time: float
    response_times: list = field(default_factory=list)
    throughput: float = 0.0
    avg_time: float = 0.0
    p50: float = 0.0
    p95: float = 0.0
    p99: float = 0.0
    min_time: float = 0.0
    max_time: float = 0.0

    def compute(self):
        n = len(self.response_times)
        if n == 0:
            return
        self.avg_time = statistics.mean(self.response_times)
        self.min_time = min(self.response_times)
        self.max_time = max(self.response_times)
        sorted_times = sorted(self.response_times)
        self.p50 = sorted_times[int(n * 0.50)]
        self.p95 = sorted_times[int(n * 0.95)]
        self.p99 = sorted_times[int(n * 0.99)]
        self.throughput = self.total_requests / self.total_time if self.total_time > 0 else 0

    def summary(self) -> str:
        self.compute()
        return (
            f"  {self.name}:\n"
            f"    Total: {self.total_requests}, OK: {self.successful}, Fail: {self.failed}\n"
            f"    Throughput: {self.throughput:.1f} req/s\n"
            f"    Times (ms) - avg: {self.avg_time*1000:.1f}, "
            f"p50: {self.p50*1000:.1f}, p95: {self.p95*1000:.1f}, "
            f"p99: {self.p99*1000:.1f}, "
            f"min: {self.min_time*1000:.1f}, max: {self.max_time*1000:.1f}"
        )


class LoadTester:
    """Generic load tester using httpx async client."""

    def __init__(self, base_url: str, concurrency: int = 10, total_requests: int = 100):
        self.base_url = base_url.rstrip("/")
        self.concurrency = concurrency
        self.total_requests = total_requests

    async def _worker(self, client: httpx.AsyncClient, sem: asyncio.Semaphore,
                       task_func, results: list):
        async with sem:
            t0 = time.perf_counter()
            try:
                await task_func(client)
                elapsed = time.perf_counter() - t0
                results.append(("ok", elapsed))
            except Exception:
                elapsed = time.perf_counter() - t0
                results.append(("fail", elapsed))

    async def run(self, task_func, name: str) -> LoadTestResult:
        sem = asyncio.Semaphore(self.concurrency)
        results = []
        t_start = time.perf_counter()

        async with httpx.AsyncClient(base_url=self.base_url, timeout=10.0) as client:
            workers = [
                self._worker(client, sem, task_func, results)
                for _ in range(self.total_requests)
            ]
            await asyncio.gather(*workers)

        t_total = time.perf_counter() - t_start
        response_times = [r[1] for r in results]
        successful = sum(1 for r in results if r[0] == "ok")
        failed = sum(1 for r in results if r[0] == "fail")

        return LoadTestResult(
            name=name,
            total_requests=len(results),
            successful=successful,
            failed=failed,
            total_time=t_total,
            response_times=response_times,
        )


async def main():
    print("=" * 60)
    print("  AeroRutas - Load Tests")
    print("=" * 60)

    BASE_AIRPORT = "http://localhost:8001"
    BASE_ITINERARY = "http://localhost:8002"

    # We test against the actual running services.
    # If not available, we print a warning and simulate local results.
    airport_available = await _check_service(BASE_AIRPORT)
    itinerary_available = await _check_service(BASE_ITINERARY)

    if not airport_available and not itinerary_available:
        print("\n[!] No services running. Running simulated load test ")
        print("    against synthetic endpoints for report purposes.\n")
        await run_simulated_tests()
        return

    print(f"\n  Airport Service:  {'ONLINE' if airport_available else 'OFFLINE'}")
    print(f"  Itinerary Service: {'ONLINE' if itinerary_available else 'OFFLINE'}\n")

    all_results = []

    if airport_available:
        tester = LoadTester(BASE_AIRPORT, concurrency=5, total_requests=50)

        async def get_airports(client):
            r = await client.get("/airports/")
            r.raise_for_status()

        async def validate_airports(client):
            r = await client.get("/airports/validate",
                                 params={"salida_id": "BOG", "llegada_id": "MDE"})
            r.raise_for_status()

        r1 = await tester.run(get_airports, "GET /airports/")
        all_results.append(r1)
        print(r1.summary())

        r2 = await tester.run(validate_airports, "GET /airports/validate")
        all_results.append(r2)
        print(r2.summary())

    if itinerary_available:
        tester = LoadTester(BASE_ITINERARY, concurrency=5, total_requests=50)

        async def create_itinerary(client):
            payload = {
                "usuario_id": str(uuid4()),
                "aeropuerto_salida_id": "BOG",
                "aeropuerto_llegada_id": "MDE",
                "fecha_viaje": str(date.today() + timedelta(days=7)),
                "duracion_minutos": 55,
            }
            r = await client.post("/itineraries/", json=payload)
            r.raise_for_status()

        r3 = await tester.run(create_itinerary, "POST /itineraries/")
        all_results.append(r3)
        print(r3.summary())

    generate_report(all_results)


async def _check_service(url: str) -> bool:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{url}/health")
            return r.status_code == 200
    except Exception:
        return False


async def run_simulated_tests():
    """Run simulated load tests using in-process FastAPI TestClient."""
    print("  Running synthetic load tests in-process...\n")

    from fastapi import FastAPI
    from fastapi.testclient import TestClient

    # --- Airport Service app (simplified) ---
    airport_app = FastAPI()

    @airport_app.get("/airports/")
    async def list_airports():
        import asyncio
        await asyncio.sleep(0.005)  # simulate network latency
        return [
            {"id": "BOG", "nombre": "El Dorado", "ciudad": "Bogotá",
             "departamento": "Cundinamarca", "lat": 4.7, "lng": -74.2},
            {"id": "MDE", "nombre": "José María Córdova", "ciudad": "Medellín",
             "departamento": "Antioquia", "lat": 6.2, "lng": -75.4},
            {"id": "CLO", "nombre": "Alfonso Bonilla Aragón", "ciudad": "Cali",
             "departamento": "Valle del Cauca", "lat": 3.5, "lng": -76.4},
        ]

    @airport_app.get("/airports/validate")
    async def validate_airports(salida_id: str, llegada_id: str):
        import asyncio
        await asyncio.sleep(0.003)
        return {"valid": True, "salida_id": salida_id, "llegada_id": llegada_id}

    # --- Itinerary Service app (simplified) ---
    itinerary_app = FastAPI()
    fake_store = {}
    from fastapi import Request, status

    @itinerary_app.post("/itineraries/", status_code=status.HTTP_201_CREATED)
    async def create_itinerary(request: Request):
        import asyncio
        from uuid import uuid4
        await asyncio.sleep(0.005)
        data = await request.json()
        item = {**data, "id": str(uuid4()), "estado": "Planeado"}
        fake_store[item["id"]] = item
        return item

    @itinerary_app.get("/itineraries/")
    async def list_itineraries():
        import asyncio
        await asyncio.sleep(0.003)
        return list(fake_store.values())

    @itinerary_app.get("/health")
    async def health():
        return {"status": "ok"}

    airport_client = TestClient(airport_app)
    itinerary_client = TestClient(itinerary_app)

    all_results = []

    # --- Airport tests ---
    times_get = []
    for _ in range(100):
        t0 = time.perf_counter()
        r = airport_client.get("/airports/")
        elapsed = time.perf_counter() - t0
        if r.status_code == 200:
            times_get.append(elapsed)

    result_get = LoadTestResult(
        name="GET /airports/ (simulado)",
        total_requests=100, successful=len(times_get),
        failed=100 - len(times_get),
        total_time=sum(times_get), response_times=times_get,
    )
    all_results.append(result_get)
    print(result_get.summary())

    times_val = []
    for _ in range(100):
        t0 = time.perf_counter()
        r = airport_client.get("/airports/validate",
                               params={"salida_id": "BOG", "llegada_id": "MDE"})
        elapsed = time.perf_counter() - t0
        if r.status_code == 200:
            times_val.append(elapsed)

    result_val = LoadTestResult(
        name="GET /airports/validate (simulado)",
        total_requests=100, successful=len(times_val),
        failed=100 - len(times_val),
        total_time=sum(times_val), response_times=times_val,
    )
    all_results.append(result_val)
    print(result_val.summary())

    # --- Itinerary tests ---
    times_create = []
    for _ in range(100):
        payload = {
            "usuario_id": str(uuid4()),
            "aeropuerto_salida_id": "BOG",
            "aeropuerto_llegada_id": "MDE",
            "fecha_viaje": str(date.today() + timedelta(days=7)),
            "duracion_minutos": 55,
        }
        t0 = time.perf_counter()
        r = itinerary_client.post("/itineraries/", json=payload)
        elapsed = time.perf_counter() - t0
        if r.status_code == 201:
            times_create.append(elapsed)

    result_create = LoadTestResult(
        name="POST /itineraries/ (simulado)",
        total_requests=100, successful=len(times_create),
        failed=100 - len(times_create),
        total_time=sum(times_create), response_times=times_create,
    )
    all_results.append(result_create)
    print(result_create.summary())

    generate_report(all_results)


def generate_report(results: list[LoadTestResult]):
    print("\n" + "=" * 60)
    print("  LOAD TEST REPORT - RESULT SUMMARY")
    print("=" * 60)

    total_ok = sum(r.successful for r in results)
    total_fail = sum(r.failed for r in results)
    total_req = sum(r.total_requests for r in results)
    total_time = max(r.total_time for r in results) if results else 0

    print(f"\n  Total requests: {total_req}")
    print(f"  Successful:     {total_ok} ({total_ok/total_req*100:.1f}%)" if total_req else "")
    print(f"  Failed:         {total_fail}")
    print(f"  Total duration: {total_time:.2f}s")
    print(f"  Overall throughput: {total_req/total_time:.1f} req/s" if total_time else "")

    print("\n  Per-endpoint details:")
    print(f"  {'Endpoint':<30} {'Req':>5} {'OK':>5} "
          f"{'Fail':>5} {'Avg(ms)':>8} {'p95(ms)':>8} {'p99(ms)':>8}")
    print("  " + "-" * 75)

    for r in results:
        r.compute()
        print(f"  {r.name:<30} {r.total_requests:>5} {r.successful:>5} "
              f"{r.failed:>5} {r.avg_time*1000:>8.1f} "
              f"{r.p95*1000:>8.1f} {r.p99*1000:>8.1f}")

    print("=" * 60)

    # Save to JSON for LaTeX report
    report_data = {
        "total_requests": total_req,
        "successful": total_ok,
        "failed": total_fail,
        "total_time_seconds": round(total_time, 2),
        "overall_throughput": round(total_req / total_time, 1) if total_time else 0,
        "endpoints": []
    }
    for r in results:
        r.compute()
        report_data["endpoints"].append({
            "name": r.name,
            "total_requests": r.total_requests,
            "successful": r.successful,
            "failed": r.failed,
            "avg_time_ms": round(r.avg_time * 1000, 1),
            "p50_ms": round(r.p50 * 1000, 1),
            "p95_ms": round(r.p95 * 1000, 1),
            "p99_ms": round(r.p99 * 1000, 1),
            "min_ms": round(r.min_time * 1000, 1),
            "max_ms": round(r.max_time * 1000, 1),
            "throughput": round(r.throughput, 1),
        })

    with open("load_test_results.json", "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2, ensure_ascii=False)
    print("\n  Results saved to load_test_results.json")


if __name__ == "__main__":
    asyncio.run(main())
