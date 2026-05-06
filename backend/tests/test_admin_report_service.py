import pytest
from unittest.mock import MagicMock
from uuid import uuid4
from app.services import admin_report_service

@pytest.mark.asyncio
async def test_get_reports_success(mocker):
    mock_supabase = mocker.Mock()
    mock_reports = [
        {"id": str(uuid4()), "title": "Report 1", "status": "OPEN"},
        {"id": str(uuid4()), "title": "Report 2", "status": "RESOLVED"}
    ]
    
    mock_query = mocker.Mock()
    mock_query.order.return_value.range.return_value.execute.return_value.data = mock_reports
    mock_supabase.table.return_value.select.return_value = mock_query
    
    result = await admin_report_service.get_reports(mock_supabase)
    
    assert len(result) == 2
    assert result[0]["title"] == "Report 1"

@pytest.mark.asyncio
async def test_get_report_detail_success(mocker):
    mock_supabase = mocker.Mock()
    report_id = str(uuid4())
    mock_report = {"id": report_id, "title": "Detail Report", "comments": []}
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = mock_report
    
    result = await admin_report_service.get_report_detail(mock_supabase, report_id)
    
    assert result["id"] == report_id
    assert result["title"] == "Detail Report"

@pytest.mark.asyncio
async def test_update_report_status_success(mocker):
    mock_supabase = mocker.Mock()
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
    
    result = await admin_report_service.update_report_status(
        mock_supabase, report_id, "RESOLVED", "Fixed", None, admin_id
    )
    
    assert result["new_status"] == "RESOLVED"
    assert result["old_status"] == "OPEN"

@pytest.mark.asyncio
async def test_perform_report_action_delete_success(mocker):
    mock_supabase = mocker.Mock()
    report_id = str(uuid4())
    admin_id = str(uuid4())
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": report_id, "title": "To Delete"
    }
    mocker.patch("app.services.admin.report_service.log_admin_activity")
    
    result = await admin_report_service.perform_report_action(
        mock_supabase, report_id, "delete", None, "Spam", None, None, admin_id, "admin"
    )
    
    assert result["action"] == "delete"
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_bulk_report_action_success(mocker):
    mock_supabase = mocker.Mock()
    r1, r2 = str(uuid4()), str(uuid4())
    report_ids = [r1, r2]
    admin_id = str(uuid4())
    
    mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": r1, "title": "R1"},
        {"id": r2, "title": "R2"}
    ]
    mocker.patch("app.services.admin.report_service.log_admin_activity")
    
    result = await admin_report_service.bulk_report_action(
        mock_supabase, report_ids, "change_status", "RESOLVED", None, "Comment", None, admin_id, "admin"
    )
    
    assert result["success_count"] == 2
    mock_supabase.table.return_value.update.return_value.in_.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_perform_report_action_assign_success(mocker):
    mock_supabase = mocker.Mock()
    report_id = str(uuid4())
    admin_id = str(uuid4())
    target_admin_id = str(uuid4())
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": report_id, "title": "Assign Me"
    }
    mocker.patch("app.services.admin.report_service.log_admin_activity")
    
    result = await admin_report_service.perform_report_action(
        mock_supabase, report_id, "assign", "Help", None, None, target_admin_id, admin_id, "admin"
    )
    
    assert result["action"] == "assign"
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_bulk_report_action_delete_success(mocker):
    mock_supabase = mocker.Mock()
    r1 = str(uuid4())
    admin_id = str(uuid4())
    
    mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": r1, "title": "R1"}
    ]
    mocker.patch("app.services.admin.report_service.log_admin_activity")
    
    result = await admin_report_service.bulk_report_action(
        mock_supabase, [r1], "delete", None, None, None, "Spam", admin_id, "admin"
    )
    
    assert result["success_count"] == 1
    mock_supabase.table.return_value.delete.return_value.in_.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_perform_report_action_update_status_success(mocker):
    mock_supabase = mocker.Mock()
    report_id = str(uuid4())
    admin_id = str(uuid4())
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": report_id, "title": "Status Update"
    }
    mocker.patch("app.services.admin.report_service.log_admin_activity")
    
    result = await admin_report_service.perform_report_action(
        mock_supabase, report_id, "update_status", "Nice", None, "RESOLVED", None, admin_id, "admin"
    )
    
    assert result["action"] == "update_status"
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_get_reports_error(mocker):
    mock_supabase = mocker.Mock()
    mock_supabase.table.side_effect = Exception("DB Error")
    
    result = await admin_report_service.get_reports(mock_supabase)
    assert result == []
