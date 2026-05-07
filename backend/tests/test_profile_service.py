import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock
from uuid import uuid4
from datetime import datetime
from app.services.profile_service import (
    get_my_profile,
    update_profile,
    get_user_profile,
    update_avatar,
    update_neighborhood,
    delete_neighborhood
)
from app.schemas.profile import ProfileUpdate, NeighborhoodUpdate, NeighborhoodInfo

@pytest.mark.asyncio
async def test_get_my_profile_existing(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    mock_profile_with_stats = {
        "id": user_id,
        "nickname": "tester",
        "avatar_url": "http://example.com/avatar.png",
        "created_at": datetime.now().isoformat(),
        "stats": {
            "report_count": 5,
            "comment_count": 5,
            "vote_count": 5
        }
    }
    
    mock_rpc = mocker.Mock()
    mock_rpc.execute.return_value.data = mock_profile_with_stats
    mock_supabase.rpc.return_value = mock_rpc
    
    result = await get_my_profile(mock_supabase, user_id)
    
    assert result["nickname"] == "tester"
    assert result["stats"]["report_count"] == 5
    assert result["user_id"] == user_id

@pytest.mark.asyncio
async def test_get_my_profile_new(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    
    mock_profile_with_stats = {
        "id": user_id,
        "nickname": "tester",
        "avatar_url": None,
        "created_at": datetime.now().isoformat(),
        "stats": {"report_count": 0, "comment_count": 0, "vote_count": 0}
    }

    mock_rpc = mocker.Mock()
    # First call: profile not found, Second call (after insert): profile found
    mock_rpc.execute.side_effect = [
        mocker.Mock(data=None),
        mocker.Mock(data=mock_profile_with_stats)
    ]
    mock_supabase.rpc.return_value = mock_rpc
    
    # Mock insert
    mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [{"id": user_id}]
    
    # Mock auth admin
    mock_user = mocker.Mock()
    mock_user.user.email = "tester@example.com"
    mock_supabase.auth.admin.get_user_by_id.return_value = mock_user
    
    result = await get_my_profile(mock_supabase, user_id)
    
    assert result["nickname"] == "tester"
    assert result["user_id"] == user_id
    assert mock_supabase.rpc.call_count == 2

@pytest.mark.asyncio
async def test_update_profile_duplicate_nickname(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    profile_in = ProfileUpdate(nickname="existing_nick")
    
    mock_supabase.table.return_value.select.return_value.neq.return_value.eq.return_value.execute.return_value.data = [{"id": "other-user"}]
    
    with pytest.raises(HTTPException) as excinfo:
        await update_profile(mock_supabase, user_id, profile_in)
    
    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Nickname already in use"

@pytest.mark.asyncio
async def test_update_profile_success(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    profile_in = ProfileUpdate(nickname="new_nick")
    
    def mock_table(name):
        mock = mocker.Mock()
        if name == "profiles":
            # Nickname duplicate check
            mock.select.return_value.neq.return_value.eq.return_value.execute.return_value.data = []
            # Update
            mock.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id, "nickname": "new_nick"}]
        return mock

    mock_supabase.table.side_effect = mock_table
    
    result = await update_profile(mock_supabase, user_id, profile_in)
    
    assert result["nickname"] == "new_nick"

@pytest.mark.asyncio
async def test_get_user_profile_success(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    mock_profile_with_stats = {
        "id": user_id,
        "nickname": "public_user",
        "avatar_url": None,
        "created_at": datetime.now().isoformat(),
        "stats": {
            "report_count": 10,
            "comment_count": 5,
            "vote_count": 0
        }
    }

    mock_rpc = mocker.Mock()
    mock_rpc.execute.return_value.data = mock_profile_with_stats
    mock_supabase.rpc.return_value = mock_rpc
    
    result = await get_user_profile(mock_supabase, user_id)
    
    assert result["nickname"] == "public_user"
    assert result["stats"]["report_count"] == 10
    assert result["user_id"] == user_id

@pytest.mark.asyncio
async def test_update_avatar(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    avatar_url = "http://new-avatar.com"
    
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id}]
    
    result = await update_avatar(mock_supabase, user_id, avatar_url)
    
    assert result["avatar_url"] == avatar_url

@pytest.mark.asyncio
async def test_update_neighborhood(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    n_info = NeighborhoodInfo(place_name="My Home", address="123 Street", lat=37.5, lng=127.0)
    n_update = NeighborhoodUpdate(neighborhood=n_info)
    
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id}]
    
    result = await update_neighborhood(mock_supabase, user_id, n_update)
    
    assert result["place_name"] == "My Home"

@pytest.mark.asyncio
async def test_delete_neighborhood(mocker):
    mock_supabase = mocker.Mock()
    user_id = str(uuid4())
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{"id": user_id}]
    
    result = await delete_neighborhood(mock_supabase, user_id)
    
    assert result is True
