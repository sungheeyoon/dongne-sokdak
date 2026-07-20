import pytest
from unittest.mock import MagicMock
from uuid import uuid4
from app.services.admin.report_service import AdminReportService
from app.services.report_service import ReportService
from tests.fakes import FakeSpatialReportCache


def make_admin_service(mocker):
    mock_supabase = mocker.Mock()
    return AdminReportService(mock_supabase, FakeSpatialReportCache()), mock_supabase


@pytest.mark.asyncio
async def test_get_reports_success(mocker):
    service, mock_supabase = make_admin_service(mocker)
    mock_reports = [
        {"id": str(uuid4()), "title": "Report 1", "status": "OPEN"},
        {"id": str(uuid4()), "title": "Report 2", "status": "RESOLVED"}
    ]

    mock_query = mocker.Mock()
    mock_query.order.return_value.range.return_value.execute.return_value.data = mock_reports
    mock_supabase.table.return_value.select.return_value = mock_query

    result = await service.get_reports()

    assert len(result) == 2
    assert result[0]["title"] == "Report 1"

@pytest.mark.asyncio
async def test_get_report_detail_success(mocker):
    service, mock_supabase = make_admin_service(mocker)
    report_id = str(uuid4())
    mock_report = {"id": report_id, "title": "Detail Report", "comments": []}

    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = mock_report

    result = await service.get_report_detail(report_id)

    assert result["id"] == report_id
    assert result["title"] == "Detail Report"

@pytest.mark.asyncio
async def test_update_report_status_success(mocker):
    service, mock_supabase = make_admin_service(mocker)
    report_id = str(uuid4())
    admin_id = str(uuid4())

    # Mock find report
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": report_id, "status": "OPEN", "title": "Test"
    }
    # Mock update
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": report_id, "status": "RESOLVED"}]
    # Mock activity log
    mocker.patch("app.services.admin.report_service.log_admin_activity")

    result = await service.update_report_status(
        report_id, "RESOLVED", "Fixed", None, admin_id
    )

    assert result["new_status"] == "RESOLVED"
    assert result["old_status"] == "OPEN"

@pytest.mark.asyncio
async def test_perform_report_action_delete_success(mocker):
    service, mock_supabase = make_admin_service(mocker)
    report_id = str(uuid4())
    admin_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": report_id, "title": "To Delete"
    }
    mocker.patch("app.services.admin.report_service.log_admin_activity")

    result = await service.perform_report_action(
        report_id, "delete", None, "Spam", None, None, admin_id, "admin"
    )

    assert result["action"] == "delete"
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_bulk_report_action_success(mocker):
    service, mock_supabase = make_admin_service(mocker)
    r1, r2 = str(uuid4()), str(uuid4())
    report_ids = [r1, r2]
    admin_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": r1, "title": "R1"},
        {"id": r2, "title": "R2"}
    ]
    mocker.patch("app.services.admin.report_service.log_admin_activity")

    result = await service.bulk_report_action(
        report_ids, "change_status", "RESOLVED", None, "Comment", None, admin_id, "admin"
    )

    assert result["success_count"] == 2
    mock_supabase.table.return_value.update.return_value.in_.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_perform_report_action_assign_success(mocker):
    service, mock_supabase = make_admin_service(mocker)
    report_id = str(uuid4())
    admin_id = str(uuid4())
    target_admin_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": report_id, "title": "Assign Me"
    }
    mocker.patch("app.services.admin.report_service.log_admin_activity")

    result = await service.perform_report_action(
        report_id, "assign", "Help", None, None, target_admin_id, admin_id, "admin"
    )

    assert result["action"] == "assign"
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_bulk_report_action_delete_success(mocker):
    service, mock_supabase = make_admin_service(mocker)
    r1 = str(uuid4())
    admin_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": r1, "title": "R1"}
    ]
    mocker.patch("app.services.admin.report_service.log_admin_activity")

    result = await service.bulk_report_action(
        [r1], "delete", None, None, None, "Spam", admin_id, "admin"
    )

    assert result["success_count"] == 1
    mock_supabase.table.return_value.delete.return_value.in_.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_perform_report_action_update_status_success(mocker):
    service, mock_supabase = make_admin_service(mocker)
    report_id = str(uuid4())
    admin_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": report_id, "title": "Status Update"
    }
    mocker.patch("app.services.admin.report_service.log_admin_activity")

    result = await service.perform_report_action(
        report_id, "update_status", "Nice", None, "RESOLVED", None, admin_id, "admin"
    )

    assert result["action"] == "update_status"
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_get_reports_error(mocker):
    service, mock_supabase = make_admin_service(mocker)
    mock_supabase.table.side_effect = Exception("DB Error")

    result = await service.get_reports()
    assert result == []


# --- 지도 조회 캐시 무효화 (ADR-0001: admin 상태 변경도 무효화 경로에 합류) ---

NEARBY = {"lat": 37.5665, "lng": 126.9780}


def make_map_report(status="OPEN"):
    return {
        "id": "r1",
        "user_id": "user-123",
        "title": "Report r1",
        "description": "Desc",
        "location": "POINT(126.9780 37.5665)",
        "address": "Seoul",
        "category": "OTHER",
        "status": status,
        "vote_count": 0,
        "comment_count": 0,
        "distance_meters": 100,
    }


def make_map_service(cache, report_state):
    """지도 조회용 ReportService — spatial RPC가 report_state의 현재 status를 반환한다."""
    supabase = MagicMock()

    def rpc(name, params):
        call = MagicMock()
        if name.startswith("count_"):
            call.execute.return_value = MagicMock(data=1)
        else:
            call.execute.return_value = MagicMock(
                data=[make_map_report(report_state["status"])]
            )
        return call

    supabase.rpc.side_effect = rpc
    return ReportService(supabase, cache)


@pytest.mark.asyncio
async def test_admin_status_change_immediately_visible_in_map_query(mocker):
    cache = FakeSpatialReportCache()
    report_state = {"status": "OPEN"}
    map_service = make_map_service(cache, report_state)

    mock_supabase = mocker.Mock()
    admin_service = AdminReportService(mock_supabase, cache)
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "r1", "status": "OPEN", "title": "Test"
    }

    def do_update():
        report_state["status"] = "RESOLVED"
        return MagicMock(data=[{"id": "r1", "status": "RESOLVED"}])

    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.side_effect = do_update
    mocker.patch("app.services.admin.report_service.log_admin_activity")

    first = await map_service.get_nearby_reports(**NEARBY)
    assert first["items"][0]["status"] == "OPEN"

    await admin_service.update_report_status("r1", "RESOLVED", None, None, str(uuid4()))

    second = await map_service.get_nearby_reports(**NEARBY)
    assert second["items"][0]["status"] == "RESOLVED"


@pytest.mark.asyncio
async def test_admin_bulk_action_immediately_visible_in_map_query(mocker):
    cache = FakeSpatialReportCache()
    report_state = {"status": "OPEN"}
    map_service = make_map_service(cache, report_state)

    mock_supabase = mocker.Mock()
    admin_service = AdminReportService(mock_supabase, cache)
    mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": "r1", "title": "R1"}
    ]

    def do_bulk_update():
        report_state["status"] = "RESOLVED"
        return MagicMock(data=[{"id": "r1", "status": "RESOLVED"}])

    mock_supabase.table.return_value.update.return_value.in_.return_value.execute.side_effect = do_bulk_update
    mocker.patch("app.services.admin.report_service.log_admin_activity")

    first = await map_service.get_nearby_reports(**NEARBY)
    assert first["items"][0]["status"] == "OPEN"

    await admin_service.bulk_report_action(
        ["r1"], "change_status", "RESOLVED", None, None, None, str(uuid4()), "admin"
    )

    second = await map_service.get_nearby_reports(**NEARBY)
    assert second["items"][0]["status"] == "RESOLVED"
