import pytest
from fastapi import HTTPException
from unittest.mock import MagicMock, patch
from uuid import uuid4
from app.services.comment_service import (
    create_comment,
    get_comments_by_report,
    update_comment,
    delete_comment
)
from app.schemas.comment import CommentCreate, CommentUpdate

@pytest.mark.asyncio
async def test_create_comment_success(mocker):
    mock_supabase = mocker.Mock()
    report_id = uuid4()
    user_id = "user-123"
    comment_in = CommentCreate(
        report_id=report_id,
        content="Test comment"
    )
    
    # Mock report check
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(report_id)}]
    
    # Mock insert
    mock_comment = {
        "id": str(uuid4()),
        "report_id": str(report_id),
        "user_id": user_id,
        "content": "Test comment",
        "parent_comment_id": None
    }
    # We need to chain correctly for the second call or handle multiple calls
    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(report_id)}]
        elif name == "comments":
            mock.insert.return_value.execute.return_value.data = [mock_comment]
        elif name == "profiles":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"nickname": "tester", "avatar_url": "http://example.com/avatar.png"}]
        return mock

    mock_supabase.table.side_effect = mock_table
    
    result = await create_comment(mock_supabase, comment_in, user_id)
    
    assert result["content"] == "Test comment"
    assert result["user_nickname"] == "tester"
    assert result["replies"] == []

@pytest.mark.asyncio
async def test_create_comment_report_not_found(mocker):
    mock_supabase = mocker.Mock()
    comment_in = CommentCreate(
        report_id=uuid4(),
        content="Test comment"
    )
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    with pytest.raises(HTTPException) as excinfo:
        await create_comment(mock_supabase, comment_in, "user-123")
    
    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Report not found"

@pytest.mark.asyncio
async def test_get_comments_by_report(mocker):
    mock_supabase = mocker.Mock()
    report_id = str(uuid4())
    user_id = "user-123"
    
    comments_data = [
        {
            "id": "1", "report_id": report_id, "user_id": user_id, "content": "Parent 1", "parent_comment_id": None,
            "profiles": {"nickname": "tester", "avatar_url": None}
        },
        {
            "id": "2", "report_id": report_id, "user_id": user_id, "content": "Reply 1-1", "parent_comment_id": "1",
            "profiles": {"nickname": "tester", "avatar_url": None}
        }
    ]
    
    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": report_id}]
        elif name == "comments":
            # Chaining: .select().eq().order().execute()
            mock.select.return_value.eq.return_value.order.return_value.execute.return_value.data = comments_data
        return mock

    mock_supabase.table.side_effect = mock_table
    
    result = await get_comments_by_report(mock_supabase, report_id)
    
    assert len(result) == 1
    assert result[0]["content"] == "Parent 1"
    assert result[0]["user_nickname"] == "tester"
    assert len(result[0]["replies"]) == 1
    assert result[0]["replies"][0]["content"] == "Reply 1-1"

@pytest.mark.asyncio
async def test_update_comment_unauthorized(mocker):
    mock_supabase = mocker.Mock()
    comment_id = str(uuid4())
    comment_update = CommentUpdate(content="Updated content")
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": comment_id, "user_id": "other-user"}]
    
    with pytest.raises(HTTPException) as excinfo:
        await update_comment(mock_supabase, comment_id, comment_update, "user-123")
    
    assert excinfo.value.status_code == 403
    assert excinfo.value.detail == "Not authorized"

