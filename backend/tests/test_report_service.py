import pytest
from unittest.mock import MagicMock
from app.services.report_service import ReportService, enrich_report_data, parse_location
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


# --- parse_location (pure helpers stay module-level) ---

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
