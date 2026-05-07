import pytest
import math
from unittest.mock import MagicMock, patch
from app.services.report_service import create_report, parse_location, list_reports
from app.schemas.report import ReportCreate, ReportCategory, Location

@pytest.mark.asyncio
async def test_create_report_success():
    # Mock supabase client
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "test-id", "title": "Test Report", "description": "Test Desc", "location": "POINT(126.9780 37.5665)", "address": "Seoul", "category": "DANGER", "status": "OPEN", "user_id": "user-123"}
    ]
    
    report_in = ReportCreate(
        title="Test Report",
        description="Test Desc",
        location=Location(lat=37.5665, lng=126.9780),
        address="Seoul",
        category=ReportCategory.OTHER,
        image_url=None
    )
    
    current_user_id = "user-123"
    
    result = await create_report(mock_supabase, report_in, current_user_id)
    
    assert result["title"] == "Test Report"
    assert result["location"]["lat"] == 37.5665
    assert result["location"]["lng"] == 126.9780
    mock_supabase.table.assert_called_with("reports")

def test_parse_location_wkb():
    # WKB for POINT(126.9780 37.5665)
    wkb_hex = "0101000000703D0AD7A3BF5F40B0726891EDC84240"
    result = parse_location(wkb_hex)
    assert result["lat"] == pytest.approx(37.5665)
    assert result["lng"] == pytest.approx(126.9780)

def test_parse_location_invalid():
    result = parse_location("invalid")
    assert result["lat"] == 37.5665  # Default Seoul lat
    assert result["lng"] == 126.9780 # Default Seoul lng

@pytest.mark.asyncio
async def test_list_reports_calls_rpcs():
    mock_supabase = MagicMock()
    
    # Mock count_reports_paginated
    mock_count_res = MagicMock()
    mock_count_res.data = 10
    
    # Mock get_reports_paginated
    mock_reports_res = MagicMock()
    mock_reports_res.data = [
        {"id": "r1", "title": "Report 1", "location": "POINT(126.9780 37.5665)", "vote_count": 5, "comment_count": 2}
    ]
    
    mock_supabase.rpc.side_effect = [
        MagicMock(execute=MagicMock(return_value=mock_count_res)),
        MagicMock(execute=MagicMock(return_value=mock_reports_res))
    ]
    
    result = await list_reports(mock_supabase, page=1, limit=5)
    
    assert result["totalCount"] == 10
    assert len(result["items"]) == 1
    assert result["items"][0]["id"] == "r1"
    assert result["items"][0]["vote_count"] == 5
    
    # Verify RPC calls
    assert mock_supabase.rpc.call_count == 2
    mock_supabase.rpc.assert_any_call("count_reports_paginated", {
        "category_filter": None,
        "status_filter": None,
        "user_id_filter": None,
        "search_query": None
    })
    mock_supabase.rpc.assert_any_call("get_reports_paginated", {
        "category_filter": None,
        "status_filter": None,
        "user_id_filter": None,
        "search_query": None,
        "result_page": 1,
        "result_limit": 5
    })

@pytest.mark.asyncio
async def test_list_reports_batch_user_voted():
    mock_supabase = MagicMock()
    
    # Mock RPCs
    mock_count_res = MagicMock(data=2)
    mock_reports_res = MagicMock(data=[
        {"id": "r1", "title": "Report 1", "location": "POINT(126.9780 37.5665)"},
        {"id": "r2", "title": "Report 2", "location": "POINT(126.9780 37.5665)"}
    ])
    
    mock_supabase.rpc.side_effect = [
        MagicMock(execute=MagicMock(return_value=mock_count_res)),
        MagicMock(execute=MagicMock(return_value=mock_reports_res))
    ]
    
    # Mock votes table lookup
    mock_votes_res = MagicMock(data=[{"report_id": "r1"}])
    mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = mock_votes_res
    
    result = await list_reports(mock_supabase, current_user_id="user-123")
    
    assert result["items"][0]["id"] == "r1"
    assert result["items"][0]["user_voted"] is True
    assert result["items"][1]["id"] == "r2"
    assert result["items"][1]["user_voted"] is False
    
    # Verify votes table call
    mock_supabase.table.assert_called_with("votes")
    mock_supabase.table.return_value.select.assert_called_with("report_id")
