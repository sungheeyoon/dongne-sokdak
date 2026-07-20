import pytest
from fastapi import HTTPException
from uuid import uuid4
from app.services.comment_service import CommentService
from app.schemas.comment import CommentCreate, CommentUpdate


def make_service(mocker):
    mock_supabase = mocker.Mock()
    return CommentService(mock_supabase), mock_supabase


@pytest.mark.asyncio
async def test_create_comment_success(mocker):
    service, mock_supabase = make_service(mocker)
    report_id = uuid4()
    user_id = "user-123"
    comment_in = CommentCreate(
        report_id=report_id,
        content="Test comment"
    )

    mock_comment = {
        "id": str(uuid4()),
        "report_id": str(report_id),
        "user_id": user_id,
        "content": "Test comment",
        "parent_comment_id": None
    }

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

    result = await service.create_comment(comment_in, user_id)

    assert result["content"] == "Test comment"
    assert result["user_nickname"] == "tester"
    assert result["replies"] == []


@pytest.mark.asyncio
async def test_create_comment_report_not_found(mocker):
    service, mock_supabase = make_service(mocker)
    comment_in = CommentCreate(
        report_id=uuid4(),
        content="Test comment"
    )
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    with pytest.raises(HTTPException) as excinfo:
        await service.create_comment(comment_in, "user-123")

    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Report not found"


@pytest.mark.asyncio
async def test_get_comments_by_report(mocker):
    service, mock_supabase = make_service(mocker)
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

    result = await service.get_comments_by_report(report_id)

    assert len(result) == 1
    assert result[0]["content"] == "Parent 1"
    assert result[0]["user_nickname"] == "tester"
    assert len(result[0]["replies"]) == 1
    assert result[0]["replies"][0]["content"] == "Reply 1-1"


@pytest.mark.asyncio
async def test_update_comment_unauthorized(mocker):
    service, mock_supabase = make_service(mocker)
    comment_id = str(uuid4())
    comment_update = CommentUpdate(content="Updated content")

    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": comment_id, "user_id": "other-user"}]

    with pytest.raises(HTTPException) as excinfo:
        await service.update_comment(comment_id, comment_update, "user-123")

    assert excinfo.value.status_code == 403
    assert excinfo.value.detail == "Not authorized"
