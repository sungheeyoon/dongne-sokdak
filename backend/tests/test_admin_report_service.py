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
