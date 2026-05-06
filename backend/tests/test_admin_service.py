import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock
from uuid import uuid4
from datetime import datetime, date
from app.services import admin_dashboard_service, admin_user_service

@pytest.mark.asyncio
async def test_get_dashboard_stats_success(mocker):
    mock_supabase = mocker.Mock()
    
    # Mock responses for different tables
    mock_profiles = [
        {"id": "1", "role": "admin", "is_active": True, "created_at": date.today().isoformat()},
        {"id": "2", "role": "user", "is_active": True, "created_at": date.today().isoformat()},
        {"id": "3", "role": "moderator", "is_active": False, "created_at": "2020-01-01"}
    ]
    
    def mock_table(name):
        mock = mocker.Mock()
        if name == "profiles":
            mock.select.return_value.execute.return_value.data = mock_profiles
        elif name == "admin_activity_logs":
            mock.select.return_value.execute.return_value.data = []
        elif name == "reports":
            mock.select.return_value.execute.return_value.data = [{"status": "OPEN", "created_at": date.today().isoformat()}]
        elif name == "comments":
            mock.select.return_value.execute.return_value.data = []
        elif name == "votes":
            mock.select.return_value.execute.return_value.data = []
        return mock

    mock_supabase.table.side_effect = mock_table
    
    result = await admin_dashboard_service.get_dashboard_stats(mock_supabase)
    
    assert result["total_users"] == 3
    assert result["active_users"] == 2
    assert result["admin_count"] == 1
    assert result["open_reports"] == 1

@pytest.mark.asyncio
async def test_update_user_role_success(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    admin_id = str(uuid4())
    
    # Mock find user
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": user_id, "role": "user", "email": "user@test.com"
    }
    # Mock update
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id, "role": "admin"}]
    # Mock activity log
    mocker.patch("app.services.admin.user_service.log_admin_activity")
    
    result = await admin_user_service.update_user_role(mock_supabase, user_id, "admin", "Test reason", admin_id)
    
    assert result["new_role"] == "admin"
    assert result["old_role"] == "user"

@pytest.mark.asyncio
async def test_update_user_role_self_error(mocker):
    mock_supabase = mocker.Mock()
    admin_id = str(uuid4())
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": admin_id, "role": "admin"
    }
    
    with pytest.raises(HTTPException) as excinfo:
        await admin_user_service.update_user_role(mock_supabase, admin_id, "user", "Resign", admin_id)
        
    assert excinfo.value.status_code == 400
    assert "자신의 역할은 변경할 수 없습니다" in excinfo.value.detail

@pytest.mark.asyncio
async def test_bulk_user_action_success(mocker):
    mock_supabase = mocker.Mock()
    user_ids = [str(uuid4()), str(uuid4())]
    admin_id = str(uuid4())
    
    # Mock find user for each
    def mock_table(name):
        mock = mocker.Mock()
        if name == "profiles":
            mock.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
                "id": "some-id", "is_active": True, "role": "user"
            }
            mock.update.return_value.eq.return_value.execute.return_value.data = [{"id": "some-id"}]
        return mock
        
    mock_supabase.table.side_effect = mock_table
    mocker.patch("app.services.admin.user_service.log_admin_activity")
    
    result = await admin_user_service.bulk_user_action(
        mock_supabase, user_ids, "deactivate", "Spam", None, admin_id, "admin"
    )
    
    assert result["success_count"] == 2
    assert len(result["results"]) == 2
