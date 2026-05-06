import pytest
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
    
    assert "error" not in result
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
    
    result = await create_comment(mock_supabase, comment_in, "user-123")
    
    assert result["error"] == "Report not found"
    assert result["status_code"] == 404

@pytest.mark.asyncio
async def test_create_reply_success(mocker):
    mock_supabase = mocker.Mock()
    report_id = uuid4()
    parent_id = uuid4()
    user_id = "user-123"
    comment_in = CommentCreate(
        report_id=report_id,
        content="Test reply",
        parent_comment_id=parent_id
    )
    
    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(report_id)}]
        elif name == "comments":
            # For select (parent check)
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(parent_id), "parent_comment_id": None}]
            # For insert
            mock.insert.return_value.execute.return_value.data = [{
                "id": str(uuid4()),
                "report_id": str(report_id),
                "user_id": user_id,
                "content": "Test reply",
                "parent_comment_id": str(parent_id)
            }]
        elif name == "profiles":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"nickname": "tester"}]
        return mock

    mock_supabase.table.side_effect = mock_table
    
    result = await create_comment(mock_supabase, comment_in, user_id)
    
    assert "error" not in result
    assert result["parent_comment_id"] == str(parent_id)

@pytest.mark.asyncio
async def test_get_comments_by_report(mocker):
    mock_supabase = mocker.Mock()
    report_id = str(uuid4())
    user_id = "user-123"
    
    comments_data = [
        {"id": "1", "report_id": report_id, "user_id": user_id, "content": "Parent 1", "parent_comment_id": None},
        {"id": "2", "report_id": report_id, "user_id": user_id, "content": "Reply 1-1", "parent_comment_id": "1"}
    ]
    
    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": report_id}]
        elif name == "comments":
            mock.select.return_value.eq.return_value.order.return_value.execute.return_value.data = comments_data
        elif name == "profiles":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"nickname": "tester"}]
        return mock

    mock_supabase.table.side_effect = mock_table
    
    result = await get_comments_by_report(mock_supabase, report_id)
    
    assert len(result) == 1
    assert result[0]["content"] == "Parent 1"
    assert len(result[0]["replies"]) == 1
    assert result[0]["replies"][0]["content"] == "Reply 1-1"

@pytest.mark.asyncio
async def test_update_comment_success(mocker):
    mock_supabase = mocker.Mock()
    comment_id = str(uuid4())
    user_id = "user-123"
    comment_update = CommentUpdate(content="Updated content")
    
    def mock_table(name):
        mock = mocker.Mock()
        if name == "comments":
            # For select
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": comment_id, "user_id": user_id}]
            # For update
            mock.update.return_value.eq.return_value.execute.return_value.data = [{"id": comment_id, "user_id": user_id, "content": "Updated content"}]
        elif name == "profiles":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"nickname": "tester"}]
        return mock

    mock_supabase.table.side_effect = mock_table
    
    result = await update_comment(mock_supabase, comment_id, comment_update, user_id)
    
    assert result["content"] == "Updated content"

@pytest.mark.asyncio
async def test_update_comment_unauthorized(mocker):
    mock_supabase = mocker.Mock()
    comment_id = str(uuid4())
    comment_update = CommentUpdate(content="Updated content")
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": comment_id, "user_id": "other-user"}]
    
    result = await update_comment(mock_supabase, comment_id, comment_update, "user-123")
    
    assert result["error"] == "Not authorized"
    assert result["status_code"] == 403

@pytest.mark.asyncio
async def test_delete_comment_success(mocker):
    mock_supabase = mocker.Mock()
    comment_id = str(uuid4())
    user_id = "user-123"
    
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"user_id": user_id}]
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [{"id": comment_id}]
    
    result = await delete_comment(mock_supabase, comment_id, user_id)
    
    assert result is None

@pytest.mark.asyncio
async def test_delete_comment_not_found(mocker):
    mock_supabase = mocker.Mock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    
    result = await delete_comment(mock_supabase, "non-existent", "user-123")
    
    assert result["error"] == "Comment not found"
    assert result["status_code"] == 404
