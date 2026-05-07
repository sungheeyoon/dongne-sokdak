import pytest
from fastapi import HTTPException
from uuid import uuid4
from app.services import admin_user_service

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
    u1, u2 = str(uuid4()), str(uuid4())
    user_ids = [u1, u2]
    admin_id = str(uuid4())
    
    # Mock find user for each
    def mock_table(name):
        mock = mocker.Mock()
        if name == "profiles":
            mock.select.return_value.in_.return_value.execute.return_value.data = [
                {"id": u1, "is_active": True, "role": "user"},
                {"id": u2, "is_active": True, "role": "user"}
            ]
            mock.update.return_value.in_.return_value.execute.return_value.data = [{"id": u1}, {"id": u2}]
        return mock
        
    mock_supabase.table.side_effect = mock_table
    mocker.patch("app.services.admin.user_service.log_admin_activity")
    
    result = await admin_user_service.bulk_user_action(
        mock_supabase, user_ids, "deactivate", "Spam", None, admin_id, "admin"
    )
    
    assert result["success_count"] == 2
    assert len(result["results"]) == 2

@pytest.mark.asyncio
async def test_get_users_success(mocker):
    mock_supabase = mocker.Mock()
    mock_users = [{"id": str(uuid4()), "email": "u1@test.com"}]
    
    mock_query = mocker.Mock()
    mock_query.order.return_value.range.return_value.execute.return_value.data = mock_users
    mock_supabase.table.return_value.select.return_value = mock_query
    
    result = await admin_user_service.get_users(mock_supabase)
    
    assert len(result) == 1
    assert result[0]["email"] == "u1@test.com"

@pytest.mark.asyncio
async def test_set_user_active_status_success(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    admin_id = str(uuid4())
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": user_id, "is_active": True, "role": "user"
    }
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id, "is_active": False}]
    mocker.patch("app.services.admin.user_service.log_admin_activity")
    
    result = await admin_user_service.set_user_active_status(mock_supabase, user_id, False, admin_id, "admin")
    
    assert result["is_active"] == False

@pytest.mark.asyncio
async def test_bulk_user_action_role_change_success(mocker):
    mock_supabase = mocker.Mock()
    u1 = str(uuid4())
    admin_id = str(uuid4())
    
    mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": u1, "role": "user"}
    ]
    mocker.patch("app.services.admin.user_service.log_admin_activity")
    
    result = await admin_user_service.bulk_user_action(
        mock_supabase, [u1], "change_role", "Promote", "moderator", admin_id, "admin"
    )
    
    assert result["success_count"] == 1
    mock_supabase.table.return_value.update.return_value.in_.return_value.execute.assert_called()
