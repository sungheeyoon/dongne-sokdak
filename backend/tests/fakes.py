"""Test fakes implementing the same interfaces as production adapters."""
from typing import Any, Dict, Optional


class FakeSpatialReportCache:
    """In-memory fake with the same interface as SpatialReportCache.

    No TTL, no maxsize — entries live until invalidate_all().
    """

    def __init__(self) -> None:
        self._nearby: Dict[Any, Dict[str, Any]] = {}
        self._bounds: Dict[Any, Dict[str, Any]] = {}

    def get_nearby(
        self,
        *,
        lat: float,
        lng: float,
        radius_km: float,
        category: Optional[str],
        search: Optional[str],
        page: int,
        limit: int,
    ) -> Optional[Dict[str, Any]]:
        return self._nearby.get((lat, lng, radius_km, category, search, page, limit))

    def put_nearby(
        self,
        *,
        lat: float,
        lng: float,
        radius_km: float,
        category: Optional[str],
        search: Optional[str],
        page: int,
        limit: int,
        value: Dict[str, Any],
    ) -> None:
        self._nearby[(lat, lng, radius_km, category, search, page, limit)] = value

    def get_bounds(
        self,
        *,
        north: float,
        south: float,
        east: float,
        west: float,
        category: Optional[str],
        search: Optional[str],
        page: int,
        limit: int,
    ) -> Optional[Dict[str, Any]]:
        return self._bounds.get((north, south, east, west, category, search, page, limit))

    def put_bounds(
        self,
        *,
        north: float,
        south: float,
        east: float,
        west: float,
        category: Optional[str],
        search: Optional[str],
        page: int,
        limit: int,
        value: Dict[str, Any],
    ) -> None:
        self._bounds[(north, south, east, west, category, search, page, limit)] = value

    def invalidate_all(self) -> None:
        self._nearby.clear()
        self._bounds.clear()
