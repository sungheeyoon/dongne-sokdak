import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from app.main import app
from app.api.deps import get_supabase
from app.api.v1.reports import nearby_cache, bounds_cache
from app.services.report_service import enrich_report_data
from datetime import datetime
from uuid import uuid4

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_caches_and_overrides():
    nearby_cache.clear()
    bounds_cache.clear()
    app.dependency_overrides = {}
    yield
    app.dependency_overrides = {}

def create_mock_report(report_id=None, user_id=None):
    return {
        "id": str(report_id or uuid4()),
        "user_id": str(user_id or uuid4()),
        "title": "Test Report",
        "description": "Test Description",
        "location": "0101000000703D0AD7A3BF5F40B0726891EDC84240", # POINT(126.9780 37.5665)
        "address": "Seoul",
        "category": "OTHER",
        "status": "OPEN",
        "image_url": None,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "vote_count": 0,
        "comment_count": 0,
        "user_voted": False
    }

def test_enrich_report_data_has_real_counts():
    # Mock supabase client
    mock_supabase = MagicMock()
    
    report = {
        "id": "report-123",
        "title": "Test",
        "location": "POINT(126.9780 37.5665)",
        "vote_count": 10,
        "comment_count": 5
    }
    
    result = enrich_report_data(report, mock_supabase)
    
    assert result["vote_count"] == 10
    assert result["comment_count"] == 5

def test_get_nearby_reports_caching():
    mock_supabase = MagicMock()
    app.dependency_overrides[get_supabase] = lambda: mock_supabase
    
    # Mock RPCs
    mock_count_res = MagicMock(data=1)
    report_data = create_mock_report()
    report_data["distance_meters"] = 100
    mock_reports_res = MagicMock(data=[report_data])
    
    mock_rpc_call = MagicMock()
    mock_rpc_call.execute.side_effect = [mock_count_res, mock_reports_res]
    mock_supabase.rpc.return_value = mock_rpc_call
    
    # First call - cache miss
    response = client.get("/api/v1/reports/nearby?lat=37.5665&lng=126.9780")
    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == report_data["id"]
    assert mock_supabase.rpc.call_count == 2
    
    # Second call - cache hit
    response = client.get("/api/v1/reports/nearby?lat=37.5665&lng=126.9780")
    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == report_data["id"]
    assert mock_supabase.rpc.call_count == 2 # Still 2

def test_get_nearby_reports_authenticated_cache_hit_with_voted_lookup():
    mock_supabase = MagicMock()
    app.dependency_overrides[get_supabase] = lambda: mock_supabase
    
    # 1. Fill cache with an anonymous call
    mock_count_res = MagicMock(data=1)
    report_data = create_mock_report()
    mock_reports_res = MagicMock(data=[report_data])
    
    mock_rpc_call = MagicMock()
    mock_rpc_call.execute.side_effect = [mock_count_res, mock_reports_res]
    mock_supabase.rpc.return_value = mock_rpc_call
    
    client.get("/api/v1/reports/nearby?lat=37.5665&lng=126.9780")
    assert mock_supabase.rpc.call_count == 2
    
    # 2. Call as authenticated user - should hit cache but call votes table
    mock_votes_res = MagicMock(data=[{"report_id": report_data["id"]}])
    mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = mock_votes_res
    
    response = client.get(f"/api/v1/reports/nearby?lat=37.5665&lng=126.9780&current_user_id={uuid4()}")
    
    assert response.status_code == 200
    assert response.json()["items"][0]["user_voted"] is True
    assert mock_supabase.rpc.call_count == 2 # No more RPC calls
    mock_supabase.table.assert_called_with("votes")

def test_get_bounds_reports_caching():
    mock_supabase = MagicMock()
    app.dependency_overrides[get_supabase] = lambda: mock_supabase
    
    mock_count_res = MagicMock(data=1)
    report_data = create_mock_report()
    mock_reports_res = MagicMock(data=[report_data])
    
    mock_rpc_call = MagicMock()
    mock_rpc_call.execute.side_effect = [mock_count_res, mock_reports_res]
    mock_supabase.rpc.return_value = mock_rpc_call
    
    # First call - cache miss
    response = client.get("/api/v1/reports/bounds?north=37.6&south=37.5&east=127.0&west=126.9")
    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == report_data["id"]
    assert mock_supabase.rpc.call_count == 2
    
    # Second call - cache hit
    response = client.get("/api/v1/reports/bounds?north=37.6&south=37.5&east=127.0&west=126.9")
    assert response.status_code == 200
    assert mock_supabase.rpc.call_count == 2
    
    # Call as authenticated user
    mock_votes_res = MagicMock(data=[])
    mock_supabase.table.return_value.select.return_value.eq.return_value.in_.return_value.execute.return_value = mock_votes_res
    
    response = client.get(f"/api/v1/reports/bounds?north=37.6&south=37.5&east=127.0&west=126.9&current_user_id={uuid4()}")
    assert response.status_code == 200
    assert mock_supabase.rpc.call_count == 2
    mock_supabase.table.assert_called_with("votes")
