"""Deterministic load scenario for the bounds endpoint used by the map UI."""

from itertools import count

from locust import HttpUser, constant, task


REQUEST_NAME = "GET /api/v1/reports/bounds"
GANGNAM_CENTER = (37.4979, 127.0276)
SEOUL_CENTER = (37.5665, 126.9780)


def _grid_boxes(
    center: tuple[float, float],
    *,
    rows: int,
    columns: int,
    spacing: float,
    half_span: float,
) -> list[dict[str, str | int]]:
    center_lat, center_lng = center
    boxes: list[dict[str, str | int]] = []

    for row in range(rows):
        for column in range(columns):
            lat = center_lat + (row - (rows - 1) / 2) * spacing
            lng = center_lng + (column - (columns - 1) / 2) * spacing
            boxes.append(
                {
                    "north": f"{lat + half_span:.6f}",
                    "south": f"{lat - half_span:.6f}",
                    "east": f"{lng + half_span:.6f}",
                    "west": f"{lng - half_span:.6f}",
                    "page": 1,
                    "limit": 100,
                }
            )

    return boxes


# 1,000 reproducible viewports: 80% Gangnam hotspot, 20% broader Seoul.
# The large key set reduces repeated cache hits during a short benchmark.
BOUNDS_CASES = (
    _grid_boxes(GANGNAM_CENTER, rows=25, columns=32, spacing=0.0008, half_span=0.012)
    + _grid_boxes(SEOUL_CENTER, rows=10, columns=20, spacing=0.004, half_span=0.018)
)


class BoundsReportUser(HttpUser):
    wait_time = constant(0.2)
    _user_sequence = count()

    def on_start(self) -> None:
        self._case_index = next(self._user_sequence) * 37

    @task
    def view_current_map_bounds(self) -> None:
        params = BOUNDS_CASES[self._case_index % len(BOUNDS_CASES)]
        self._case_index += 1
        self.client.get(
            "/api/v1/reports/bounds",
            params=params,
            name=REQUEST_NAME,
        )
