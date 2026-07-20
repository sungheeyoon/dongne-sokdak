from typing import Optional
from pydantic import BaseModel


class RadiusQueryParams(BaseModel):
    """Shared param source for get/count_reports_within_radius (see ADR-0004)."""

    target_lat: float
    target_lng: float
    radius_meters: float
    category_filter: Optional[str] = None
    search_query: Optional[str] = None

    def for_count(self) -> dict:
        return self.model_dump()

    def for_get(self, offset: int, limit: int) -> dict:
        return {**self.model_dump(), "result_offset": offset, "result_limit": limit}


class BoundsQueryParams(BaseModel):
    """Shared param source for get/count_reports_in_bounds (see ADR-0004)."""

    north: float
    south: float
    east: float
    west: float
    category_filter: Optional[str] = None
    search_query: Optional[str] = None

    def for_count(self) -> dict:
        return self.model_dump()

    def for_get(self, offset: int, limit: int) -> dict:
        return {**self.model_dump(), "result_offset": offset, "result_limit": limit}
