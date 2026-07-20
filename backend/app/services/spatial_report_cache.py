"""지도 조회(Map Query) 결과 캐시.

주변 조회(Nearby Query)/영역 조회(Bounds Query) 결과를 담는다.
키 조립·TTL·maxsize는 구현 세부사항이며 호출자에게 노출되지 않는다.
무효화 정책은 ADR-0001: 제보 변이 시 invalidate_all()만 사용한다.

get은 저장된 객체를 복사 없이 그대로 반환한다 — 호출자는 반환값을 변이하지 말고,
사용자별 오버레이(user_voted 등)는 복사본 위에서 적용해야 한다.
"""
import time
from typing import Any, Callable, Dict, Optional

from cachetools import TTLCache

_TTL_SECONDS = 15
_MAXSIZE = 1000


class SpatialReportCache:
    def __init__(self, timer: Callable[[], float] = time.monotonic) -> None:
        self._nearby: TTLCache = TTLCache(maxsize=_MAXSIZE, ttl=_TTL_SECONDS, timer=timer)
        self._bounds: TTLCache = TTLCache(maxsize=_MAXSIZE, ttl=_TTL_SECONDS, timer=timer)

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
