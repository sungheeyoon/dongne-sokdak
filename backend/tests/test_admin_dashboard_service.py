import pytest
from app.services import admin_dashboard_service

@pytest.mark.asyncio
async def test_get_dashboard_stats_success(mocker):
    mock_supabase = mocker.Mock()
    
    # Mock response for RPC
    mock_stats = {
        "total_users": 3,
        "active_users": 2,
        "admin_count": 1,
        "open_reports": 1
    }
    
    mock_supabase.rpc.return_value.execute.return_value.data = mock_stats
    
    result = await admin_dashboard_service.get_dashboard_stats(mock_supabase)
    
    assert result["total_users"] == 3
    assert result["active_users"] == 2
    assert result["admin_count"] == 1
    assert result["open_reports"] == 1
