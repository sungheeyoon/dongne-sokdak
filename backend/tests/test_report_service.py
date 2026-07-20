import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock
from app.services.report_service import (
    ReportService,
    calculate_distance,
    enrich_report_data,
    parse_location,
)
from app.schemas.report import ReportCreate, ReportCategory, Location
from tests.fakes import FakeSpatialReportCache


def make_report(report_id="r1", **overrides):
    report = {
        "id": report_id,
        "user_id": "user-123",
        "title": f"Report {report_id}",
        "description": "Desc",
        "location": "POINT(126.9780 37.5665)",
        "address": "Seoul",
        "category": "OTHER",
        "status": "OPEN",
        "vote_count": 0,
        "comment_count": 0,
        "distance_meters": 100,
    }
    report.update(overrides)
    return report


def make_spatial_supabase(report=None, total=1):
    """Mock supabase whose spatial RPCs always serve one report page."""
    report = report or make_report()
    supabase = MagicMock()

    def rpc(name, params):
        call = MagicMock()
        if name.startswith("count_"):
            call.execute.return_value = MagicMock(data=total)
        else:
            call.execute.return_value = MagicMock(data=[dict(report)])
        return call

    supabase.rpc.side_effect = rpc
    return supabase


def make_service(supabase=None):
    supabase = supabase or make_spatial_supabase()
    return ReportService(supabase, FakeSpatialReportCache()), supabase


NEARBY = {"lat": 37.5665, "lng": 126.9780}
BOUNDS = {"north": 37.6, "south": 37.5, "east": 127.0, "west": 126.9}


# --- calculate_distance / parse_location (pure helpers stay module-level) ---

def test_calculate_distance_same_point_is_zero():
    assert calculate_distance(37.5665, 126.9780, 37.5665, 126.9780) == pytest.approx(0)


def test_calculate_distance_known_points():
    # Seoul City Hall to Gangnam Station, roughly 8.6km apart.
    dist = calculate_distance(37.5665, 126.9780, 37.4979, 127.0276)
    assert dist == pytest.approx(8800, rel=0.05)


def test_parse_location_wkb():
    # WKB for POINT(126.9780 37.5665)
    wkb_hex = "0101000000703D0AD7A3BF5F40B0726891EDC84240"
    result = parse_location(wkb_hex)
    assert result["lat"] == pytest.approx(37.5665)
    assert result["lng"] == pytest.approx(126.9780)


def test_parse_location_invalid():
    result = parse_location("invalid")
    assert result["lat"] == 37.5665  # Default Seoul lat
    assert result["lng"] == 126.9780  # Default Seoul lng


def test_parse_location_falsy_returns_default():
    assert parse_location(None) == {"lat": 37.5665, "lng": 126.9780}
    assert parse_location("") == {"lat": 37.5665, "lng": 126.9780}


def test_parse_location_dict_passthrough():
    loc = {"lat": 1.0, "lng": 2.0}
    assert parse_location(loc) is loc


def test_parse_location_malformed_point_falls_back_to_default():
    result = parse_location("POINT(abc def)")
    assert result == {"lat": 37.5665, "lng": 126.9780}


def test_enrich_report_data_has_real_counts():
    report = {
        "id": "report-123",
        "title": "Test",
        "location": "POINT(126.9780 37.5665)",
        "vote_count": 10,
        "comment_count": 5,
    }

    result = enrich_report_data(report)

    assert result["vote_count"] == 10
    assert result["comment_count"] == 5


def test_enrich_report_data_defaults_missing_counts():
    report = {
        "id": "report-123",
        "title": "Test",
        "location": "POINT(126.9780 37.5665)",
    }

    result = enrich_report_data(report)

    assert result["vote_count"] == 0
    assert result["comment_count"] == 0
    assert result["user_voted"] is False


# --- create ---

@pytest.mark.asyncio
async def test_create_report_success():
    service, supabase = make_service()
    supabase.table.return_value.insert.return_value.execute.return_value.data = [
        make_report()
    ]

    report_in = ReportCreate(
        title="Test Report",
        description="Test Desc",
        location=Location(lat=37.5665, lng=126.9780),
        address="Seoul",
        category=ReportCategory.OTHER,
        image_url=None,
    )

    result = await service.create_report(report_in, "user-123")

    assert result["location"]["lat"] == 37.5665
    assert result["location"]["lng"] == 126.9780
    supabase.table.assert_called_with("reports")


@pytest.mark.asyncio
async def test_create_report_returns_none_when_insert_fails():
    service, supabase = make_service()
    supabase.table.return_value.insert.return_value.execute.return_value.data = []

    report_in = ReportCreate(
        title="Test Report",
        description="Test Desc",
        location=Location(lat=37.5665, lng=126.9780),
        address="Seoul",
        category=ReportCategory.OTHER,
        image_url=None,
    )

    result = await service.create_report(report_in, "user-123")

    assert result is None


# --- list ---

@pytest.mark.asyncio
async def test_list_reports_calls_rpcs():
    supabase = MagicMock()
    mock_count_res = MagicMock(data=10)
    mock_reports_res = MagicMock(
        data=[make_report(vote_count=5, comment_count=2)]
    )
    supabase.rpc.side_effect = [
        MagicMock(execute=MagicMock(return_value=mock_count_res)),
        MagicMock(execute=MagicMock(return_value=mock_reports_res)),
    ]
    service = ReportService(supabase, FakeSpatialReportCache())

    result = await service.list_reports(page=1, limit=5)

    assert result["totalCount"] == 10
    assert len(result["items"]) == 1
    assert result["items"][0]["id"] == "r1"
    assert result["items"][0]["vote_count"] == 5

    assert supabase.rpc.call_count == 2
    supabase.rpc.assert_any_call("count_reports_paginated", {
        "category_filter": None,
        "status_filter": None,
        "user_id_filter": None,
        "search_query": None,
    })
    supabase.rpc.assert_any_call("get_reports_paginated", {
        "category_filter": None,
        "status_filter": None,
        "user_id_filter": None,
        "search_query": None,
        "result_page": 1,
        "result_limit": 5,
    })


@pytest.mark.asyncio
async def test_list_reports_batch_user_voted():
    supabase = MagicMock()
    mock_count_res = MagicMock(data=2)
    mock_reports_res = MagicMock(data=[make_report("r1"), make_report("r2")])
    supabase.rpc.side_effect = [
        MagicMock(execute=MagicMock(return_value=mock_count_res)),
        MagicMock(execute=MagicMock(return_value=mock_reports_res)),
    ]
    mock_votes_res = MagicMock(data=[{"report_id": "r1"}])
    supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = mock_votes_res
    service = ReportService(supabase, FakeSpatialReportCache())

    result = await service.list_reports(current_user_id="user-123")

    assert result["items"][0]["user_voted"] is True
    assert result["items"][1]["user_voted"] is False
    supabase.table.assert_called_with("votes")
    supabase.table.return_value.select.assert_called_with("report_id")


# --- map query caching ---

@pytest.mark.asyncio
async def test_nearby_same_params_is_cache_hit():
    service, supabase = make_service()

    first = await service.get_nearby_reports(**NEARBY)
    assert supabase.rpc.call_count == 2  # count + fetch

    second = await service.get_nearby_reports(**NEARBY)
    assert supabase.rpc.call_count == 2  # served from cache
    assert second == first


@pytest.mark.asyncio
async def test_bounds_same_params_is_cache_hit():
    service, supabase = make_service()

    first = await service.get_reports_in_bounds(**BOUNDS)
    assert supabase.rpc.call_count == 2

    second = await service.get_reports_in_bounds(**BOUNDS)
    assert supabase.rpc.call_count == 2
    assert second == first


@pytest.mark.asyncio
async def test_create_report_invalidates_map_caches():
    service, supabase = make_service()
    supabase.table.return_value.insert.return_value.execute.return_value.data = [
        make_report()
    ]
    await service.get_nearby_reports(**NEARBY)
    await service.get_reports_in_bounds(**BOUNDS)
    assert supabase.rpc.call_count == 4

    report_in = ReportCreate(
        title="New",
        description="Desc",
        location=Location(lat=37.5665, lng=126.9780),
        address="Seoul",
        category=ReportCategory.OTHER,
        image_url=None,
    )
    await service.create_report(report_in, "user-123")

    await service.get_nearby_reports(**NEARBY)
    await service.get_reports_in_bounds(**BOUNDS)
    assert supabase.rpc.call_count == 8  # both queries missed the cache


@pytest.mark.asyncio
async def test_update_report_invalidates_map_caches():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "user_id": "user-123"
    }
    supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [
        make_report(title="Updated")
    ]
    await service.get_nearby_reports(**NEARBY)
    await service.get_reports_in_bounds(**BOUNDS)
    assert supabase.rpc.call_count == 4

    await service.update_report("r1", {"title": "Updated"}, "user-123")

    await service.get_nearby_reports(**NEARBY)
    await service.get_reports_in_bounds(**BOUNDS)
    assert supabase.rpc.call_count == 8


@pytest.mark.asyncio
async def test_delete_report_invalidates_map_caches():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "user_id": "user-123"
    }
    await service.get_nearby_reports(**NEARBY)
    await service.get_reports_in_bounds(**BOUNDS)
    assert supabase.rpc.call_count == 4

    await service.delete_report("r1", "user-123")

    await service.get_nearby_reports(**NEARBY)
    await service.get_reports_in_bounds(**BOUNDS)
    assert supabase.rpc.call_count == 8


@pytest.mark.asyncio
async def test_nearby_cache_hit_applies_user_voted_overlay():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
        data=[{"report_id": "r1"}]
    )

    # Prime the cache anonymously
    anonymous = await service.get_nearby_reports(**NEARBY)
    assert anonymous["items"][0]["user_voted"] is False
    assert supabase.rpc.call_count == 2

    # Authenticated re-query hits the cache but overlays user_voted
    voted = await service.get_nearby_reports(**NEARBY, current_user_id="user-123")
    assert voted["items"][0]["user_voted"] is True
    assert supabase.rpc.call_count == 2
    supabase.table.assert_called_with("votes")

    # Cached anonymous entry must not have been mutated by the overlay
    anonymous_again = await service.get_nearby_reports(**NEARBY)
    assert anonymous_again["items"][0]["user_voted"] is False
    assert supabase.rpc.call_count == 2


@pytest.mark.asyncio
async def test_bounds_cache_hit_applies_user_voted_overlay():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = MagicMock(
        data=[{"report_id": "r1"}]
    )

    anonymous = await service.get_reports_in_bounds(**BOUNDS)
    assert anonymous["items"][0]["user_voted"] is False
    assert supabase.rpc.call_count == 2

    voted = await service.get_reports_in_bounds(**BOUNDS, current_user_id="user-123")
    assert voted["items"][0]["user_voted"] is True
    assert supabase.rpc.call_count == 2

    anonymous_again = await service.get_reports_in_bounds(**BOUNDS)
    assert anonymous_again["items"][0]["user_voted"] is False
    assert supabase.rpc.call_count == 2


# --- map query count RPC failures raise, same as get RPC failures (ADR-0004) ---

@pytest.mark.asyncio
async def test_nearby_count_rpc_error_raises():
    supabase = MagicMock()

    def rpc(name, params):
        call = MagicMock()
        if name.startswith("count_"):
            call.execute.side_effect = Exception("boom")
        else:
            call.execute.return_value = MagicMock(data=[make_report()])
        return call

    supabase.rpc.side_effect = rpc
    service = ReportService(supabase, FakeSpatialReportCache())

    with pytest.raises(Exception, match="boom"):
        await service.get_nearby_reports(**NEARBY)


@pytest.mark.asyncio
async def test_bounds_count_rpc_error_raises():
    supabase = MagicMock()

    def rpc(name, params):
        call = MagicMock()
        if name.startswith("count_"):
            call.execute.side_effect = Exception("boom")
        else:
            call.execute.return_value = MagicMock(data=[make_report()])
        return call

    supabase.rpc.side_effect = rpc
    service = ReportService(supabase, FakeSpatialReportCache())

    with pytest.raises(Exception, match="boom"):
        await service.get_reports_in_bounds(**BOUNDS)


# --- my neighborhood ---

@pytest.mark.asyncio
async def test_get_my_neighborhood_reports_delegates_to_nearby():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "neighborhood": {"lat": 37.5665, "lng": 126.9780}
    }

    result = await service.get_my_neighborhood_reports(current_user_id="user-123")

    assert len(result["items"]) == 1


@pytest.mark.asyncio
async def test_get_my_neighborhood_reports_raises_when_not_set():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "neighborhood": None
    }

    with pytest.raises(HTTPException) as excinfo:
        await service.get_my_neighborhood_reports(current_user_id="user-123")

    assert excinfo.value.status_code == 400


# --- get_report_by_id ---

@pytest.mark.asyncio
async def test_get_report_by_id_not_found():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    result = await service.get_report_by_id("missing")

    assert result is None


@pytest.mark.asyncio
async def test_get_report_by_id_flattens_list_counts_and_applies_user_voted():
    service, supabase = make_service()
    report = make_report()
    report["votes"] = [{"count": 3}]
    report["comments"] = [{"count": 2}]
    supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [report]
    supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [
        {"id": "vote-1"}
    ]

    result = await service.get_report_by_id("r1", current_user_id="user-123")

    assert result["vote_count"] == 3
    assert result["comment_count"] == 2
    assert result["user_voted"] is True


@pytest.mark.asyncio
async def test_get_report_by_id_flattens_dict_counts():
    service, supabase = make_service()
    report = make_report()
    report["votes"] = {"count": 7}
    report["comments"] = {"count": 4}
    supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [report]

    result = await service.get_report_by_id("r1")

    assert result["vote_count"] == 7
    assert result["comment_count"] == 4


# --- update_report error branches ---

@pytest.mark.asyncio
async def test_update_report_not_found_raises():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = None

    with pytest.raises(HTTPException) as excinfo:
        await service.update_report("missing", {"title": "New"}, "user-123")

    assert excinfo.value.status_code == 404


@pytest.mark.asyncio
async def test_update_report_unauthorized_raises():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "user_id": "other-user"
    }

    with pytest.raises(HTTPException) as excinfo:
        await service.update_report("r1", {"title": "New"}, "user-123")

    assert excinfo.value.status_code == 403


@pytest.mark.asyncio
async def test_update_report_update_failed_raises():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "user_id": "user-123"
    }
    supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = []

    with pytest.raises(HTTPException) as excinfo:
        await service.update_report("r1", {"title": "New"}, "user-123")

    assert excinfo.value.status_code == 400


# --- delete_report error branches ---

@pytest.mark.asyncio
async def test_delete_report_not_found_raises():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = None

    with pytest.raises(HTTPException) as excinfo:
        await service.delete_report("missing", "user-123")

    assert excinfo.value.status_code == 404


@pytest.mark.asyncio
async def test_delete_report_unauthorized_raises():
    service, supabase = make_service()
    supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "user_id": "other-user"
    }

    with pytest.raises(HTTPException) as excinfo:
        await service.delete_report("r1", "user-123")

    assert excinfo.value.status_code == 403


# --- benchmark_nearby_rest_python ---

@pytest.mark.asyncio
async def test_benchmark_nearby_rest_python_filters_by_radius_and_category():
    service, supabase = make_service()
    near_report = make_report("near", location="POINT(126.9780 37.5665)", category="OTHER")
    far_report = make_report("far", location="POINT(129.0756 35.1796)", category="OTHER")  # Busan
    supabase.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        near_report, far_report
    ]

    result = await service.benchmark_nearby_rest_python(37.5665, 126.9780, radius_km=3.0, category="OTHER")

    assert [r["id"] for r in result] == ["near"]
    assert result[0]["user_voted"] is False
    supabase.table.return_value.select.return_value.eq.assert_called_with("category", "OTHER")
