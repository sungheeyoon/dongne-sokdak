import pytest
from fastapi import HTTPException
from uuid import uuid4
from app.services.admin.user_service import AdminUserService


def make_service(mocker):
    mock_supabase = mocker.Mock()
    mock_log_admin_activity = mocker.AsyncMock()
    return AdminUserService(mock_supabase, log_admin_activity=mock_log_admin_activity), mock_supabase


@pytest.mark.asyncio
async def test_update_user_role_success(mocker):
    service, mock_supabase = make_service(mocker)
    user_id = str(uuid4())
    admin_id = str(uuid4())

    # Mock find user
    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": user_id, "role": "user", "email": "user@test.com"
    }
    # Mock update
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id, "role": "admin"}]

    result = await service.update_user_role(user_id, "admin", "Test reason", admin_id)

    assert result["new_role"] == "admin"
    assert result["old_role"] == "user"

@pytest.mark.asyncio
async def test_update_user_role_self_error(mocker):
    service, mock_supabase = make_service(mocker)
    admin_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": admin_id, "role": "admin"
    }

    with pytest.raises(HTTPException) as excinfo:
        await service.update_user_role(admin_id, "user", "Resign", admin_id)

    assert excinfo.value.status_code == 400
    assert "자신의 역할은 변경할 수 없습니다" in excinfo.value.detail

@pytest.mark.asyncio
async def test_bulk_user_action_success(mocker):
    service, mock_supabase = make_service(mocker)
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

    result = await service.bulk_user_action(
        user_ids, "deactivate", "Spam", None, admin_id, "admin"
    )

    assert result["success_count"] == 2
    assert len(result["results"]) == 2

@pytest.mark.asyncio
async def test_get_users_success(mocker):
    service, mock_supabase = make_service(mocker)
    mock_users = [{"id": str(uuid4()), "email": "u1@test.com"}]

    mock_query = mocker.Mock()
    mock_query.order.return_value.range.return_value.execute.return_value.data = mock_users
    mock_supabase.table.return_value.select.return_value = mock_query

    result = await service.get_users()

    assert len(result) == 1
    assert result[0]["email"] == "u1@test.com"

@pytest.mark.asyncio
async def test_set_user_active_status_success(mocker):
    service, mock_supabase = make_service(mocker)
    user_id = str(uuid4())
    admin_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": user_id, "is_active": True, "role": "user"
    }
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id, "is_active": False}]

    result = await service.set_user_active_status(user_id, False, admin_id, "admin")

    assert result["is_active"] == False

@pytest.mark.asyncio
async def test_bulk_user_action_role_change_success(mocker):
    service, mock_supabase = make_service(mocker)
    u1 = str(uuid4())
    admin_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": u1, "role": "user"}
    ]

    result = await service.bulk_user_action(
        [u1], "change_role", "Promote", "moderator", admin_id, "admin"
    )

    assert result["success_count"] == 1
    mock_supabase.table.return_value.update.return_value.in_.return_value.execute.assert_called()

@pytest.mark.asyncio
async def test_get_my_info_success(mocker):
    service, mock_supabase = make_service(mocker)
    user_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": user_id, "email": "me@test.com", "nickname": "Me", "role": "admin", "is_active": True
    }

    result = await service.get_my_info(user_id)

    assert result["id"] == user_id
    assert result["email"] == "me@test.com"
    assert result["role"] == "admin"

@pytest.mark.asyncio
async def test_get_my_info_not_found(mocker):
    service, mock_supabase = make_service(mocker)
    user_id = str(uuid4())

    mock_supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = None

    result = await service.get_my_info(user_id)

    assert result is None
