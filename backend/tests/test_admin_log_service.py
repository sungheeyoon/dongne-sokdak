import pytest
from app.services.admin import log_service

@pytest.mark.asyncio
async def test_get_admin_activity_logs_success(mocker):
    mock_supabase = mocker.Mock()
    mock_logs = [
        {"id": "log1", "action": "update_role", "admin": {"nickname": "admin1"}},
        {"id": "log2", "action": "delete_report", "admin": {"nickname": "admin1"}}
    ]
    
    mock_query = mocker.Mock()
    mock_query.eq.return_value = mock_query
    mock_query.order.return_value.range.return_value.execute.return_value.data = mock_logs
    mock_supabase.table.return_value.select.return_value = mock_query
    
    result = await log_service.get_admin_activity_logs(mock_supabase)
    
    assert len(result) == 2
    assert result[0]["id"] == "log1"

@pytest.mark.asyncio
async def test_get_admin_activity_logs_filter_action(mocker):
    mock_supabase = mocker.Mock()
    
    mock_query = mocker.Mock()
    mock_query.eq.return_value = mock_query
    mock_query.order.return_value.range.return_value.execute.return_value.data = []
    mock_supabase.table.return_value.select.return_value = mock_query
    
    await log_service.get_admin_activity_logs(mock_supabase, action="update_role")
    
    mock_query.eq.assert_any_call("action", "update_role")

@pytest.mark.asyncio
async def test_get_admin_activity_logs_error(mocker):
    mock_supabase = mocker.Mock()
    mock_supabase.table.side_effect = Exception("DB Error")
    
    result = await log_service.get_admin_activity_logs(mock_supabase)
    
    assert result == []
