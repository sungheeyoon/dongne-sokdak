"""Contract tests for SpatialReportCache and its test fake.

Only the public interface is exercised — no cache keys, no internal storage.
"""
import pytest

from app.services.spatial_report_cache import SpatialReportCache
from tests.fakes import FakeSpatialReportCache


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


NEARBY_PARAMS = {
    "lat": 37.5665,
    "lng": 126.978,
    "radius_km": 3.0,
    "category": None,
    "search": None,
    "page": 1,
    "limit": 50,
}

BOUNDS_PARAMS = {
    "north": 37.6,
    "south": 37.5,
    "east": 127.0,
    "west": 126.9,
    "category": None,
    "search": None,
    "page": 1,
    "limit": 100,
}

VALUE = {"items": [{"id": "r1"}], "totalCount": 1, "totalPages": 1, "page": 1, "limit": 50}
OTHER_VALUE = {"items": [], "totalCount": 0, "totalPages": 0, "page": 1, "limit": 50}


@pytest.fixture(params=["real", "fake"])
def cache(request):
    if request.param == "real":
        return SpatialReportCache()
    return FakeSpatialReportCache()


class TestPutGetRoundtrip:
    def test_nearby_returns_stored_value(self, cache):
        cache.put_nearby(**NEARBY_PARAMS, value=VALUE)
        assert cache.get_nearby(**NEARBY_PARAMS) == VALUE

    def test_bounds_returns_stored_value(self, cache):
        cache.put_bounds(**BOUNDS_PARAMS, value=VALUE)
        assert cache.get_bounds(**BOUNDS_PARAMS) == VALUE

    def test_nearby_miss_before_put(self, cache):
        assert cache.get_nearby(**NEARBY_PARAMS) is None

    def test_bounds_miss_before_put(self, cache):
        assert cache.get_bounds(**BOUNDS_PARAMS) is None

    def test_put_overwrites_existing_entry(self, cache):
        cache.put_nearby(**NEARBY_PARAMS, value=VALUE)
        cache.put_nearby(**NEARBY_PARAMS, value=OTHER_VALUE)
        assert cache.get_nearby(**NEARBY_PARAMS) == OTHER_VALUE


class TestDistinctEntries:
    @pytest.mark.parametrize(
        "override",
        [
            {"lat": 37.0},
            {"lng": 127.0},
            {"radius_km": 5.0},
            {"category": "NOISE"},
            {"category": ""},
            {"search": "소음"},
            {"search": ""},
            {"page": 2},
            {"limit": 20},
        ],
    )
    def test_nearby_any_differing_param_is_a_miss(self, cache, override):
        cache.put_nearby(**NEARBY_PARAMS, value=VALUE)
        assert cache.get_nearby(**{**NEARBY_PARAMS, **override}) is None

    @pytest.mark.parametrize(
        "override",
        [
            {"north": 38.0},
            {"south": 37.0},
            {"east": 127.5},
            {"west": 126.5},
            {"category": "NOISE"},
            {"category": ""},
            {"search": "소음"},
            {"search": ""},
            {"page": 2},
            {"limit": 20},
        ],
    )
    def test_bounds_any_differing_param_is_a_miss(self, cache, override):
        cache.put_bounds(**BOUNDS_PARAMS, value=VALUE)
        assert cache.get_bounds(**{**BOUNDS_PARAMS, **override}) is None

    def test_search_none_and_empty_string_are_separate_entries(self, cache):
        cache.put_nearby(**{**NEARBY_PARAMS, "search": None}, value=VALUE)
        cache.put_nearby(**{**NEARBY_PARAMS, "search": ""}, value=OTHER_VALUE)
        assert cache.get_nearby(**{**NEARBY_PARAMS, "search": None}) == VALUE
        assert cache.get_nearby(**{**NEARBY_PARAMS, "search": ""}) == OTHER_VALUE

    def test_category_none_and_empty_string_are_separate_entries(self, cache):
        cache.put_bounds(**{**BOUNDS_PARAMS, "category": None}, value=VALUE)
        cache.put_bounds(**{**BOUNDS_PARAMS, "category": ""}, value=OTHER_VALUE)
        assert cache.get_bounds(**{**BOUNDS_PARAMS, "category": None}) == VALUE
        assert cache.get_bounds(**{**BOUNDS_PARAMS, "category": ""}) == OTHER_VALUE


class TestInvalidateAll:
    def test_all_gets_miss_after_invalidate(self, cache):
        cache.put_nearby(**NEARBY_PARAMS, value=VALUE)
        cache.put_bounds(**BOUNDS_PARAMS, value=VALUE)

        cache.invalidate_all()

        assert cache.get_nearby(**NEARBY_PARAMS) is None
        assert cache.get_bounds(**BOUNDS_PARAMS) is None


class TestTtlExpiry:
    """TTL is a property of the real adapter only — the fake never expires."""

    def test_hit_within_ttl(self):
        clock = FakeClock()
        cache = SpatialReportCache(timer=clock)
        cache.put_nearby(**NEARBY_PARAMS, value=VALUE)

        clock.advance(14)

        assert cache.get_nearby(**NEARBY_PARAMS) == VALUE

    def test_miss_after_ttl_elapsed(self):
        clock = FakeClock()
        cache = SpatialReportCache(timer=clock)
        cache.put_nearby(**NEARBY_PARAMS, value=VALUE)
        cache.put_bounds(**BOUNDS_PARAMS, value=VALUE)

        clock.advance(16)

        assert cache.get_nearby(**NEARBY_PARAMS) is None
        assert cache.get_bounds(**BOUNDS_PARAMS) is None
