"""Deterministic load scenario for the bounds endpoint used by the map UI."""

from itertools import count
import os

from locust import HttpUser, constant, task

from scripts.bounds_benchmark_cases import bounds_case_at


REQUEST_NAME = "GET /api/v1/reports/bounds"
WORKER_INDEX = int(os.getenv("BOUNDS_WORKER_INDEX", "0"))
WORKER_COUNT = max(int(os.getenv("BOUNDS_WORKER_COUNT", "1")), 1)
_case_sequence = count()


class BoundsReportUser(HttpUser):
    wait_time = constant(0.2)

    @task
    def view_current_map_bounds(self) -> None:
        params = bounds_case_at(next(_case_sequence), WORKER_INDEX, WORKER_COUNT)
        self.client.get(
            "/api/v1/reports/bounds",
            params=params,
            name=REQUEST_NAME,
        )
