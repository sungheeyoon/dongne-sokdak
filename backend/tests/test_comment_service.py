import pytest
from fastapi import HTTPException
from uuid import uuid4
from app.services.comment_service import CommentService
from app.schemas.comment import CommentCreate, CommentUpdate


@pytest.mark.asyncio
async def test_create_comment_success(make_service, mocker):
    service, mock_supabase = make_service(CommentService)
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
async def test_create_comment_report_not_found(make_service):
    service, mock_supabase = make_service(CommentService)
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
async def test_get_comments_by_report(make_service, mocker):
    service, mock_supabase = make_service(CommentService)
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
async def test_create_comment_reply_parent_not_found(make_service, mocker):
    service, mock_supabase = make_service(CommentService)
    report_id = uuid4()
    comment_in = CommentCreate(report_id=report_id, content="Reply", parent_comment_id=uuid4())

    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(report_id)}]
        elif name == "comments":
            mock.select.return_value.eq.return_value.execute.return_value.data = []
        return mock

    mock_supabase.table.side_effect = mock_table

    with pytest.raises(HTTPException) as excinfo:
        await service.create_comment(comment_in, "user-123")

    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Parent comment not found"


@pytest.mark.asyncio
async def test_create_comment_rejects_nested_reply(make_service, mocker):
    service, mock_supabase = make_service(CommentService)
    report_id = uuid4()
    parent_id = uuid4()
    comment_in = CommentCreate(report_id=report_id, content="Reply", parent_comment_id=parent_id)

    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(report_id)}]
        elif name == "comments":
            mock.select.return_value.eq.return_value.execute.return_value.data = [
                {"id": str(parent_id), "parent_comment_id": "grandparent-id"}
            ]
        return mock

    mock_supabase.table.side_effect = mock_table

    with pytest.raises(HTTPException) as excinfo:
        await service.create_comment(comment_in, "user-123")

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Nested replies are not supported"


@pytest.mark.asyncio
async def test_create_comment_insert_failed(make_service, mocker):
    service, mock_supabase = make_service(CommentService)
    report_id = uuid4()
    comment_in = CommentCreate(report_id=report_id, content="Test comment")

    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(report_id)}]
        elif name == "comments":
            mock.insert.return_value.execute.return_value.data = []
        return mock

    mock_supabase.table.side_effect = mock_table

    with pytest.raises(HTTPException) as excinfo:
        await service.create_comment(comment_in, "user-123")

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Failed to create comment"


@pytest.mark.asyncio
async def test_create_comment_defaults_nickname_when_profile_missing(make_service, mocker):
    service, mock_supabase = make_service(CommentService)
    report_id = uuid4()
    comment_in = CommentCreate(report_id=report_id, content="Test comment")
    mock_comment = {"id": str(uuid4()), "report_id": str(report_id), "user_id": "user-123", "content": "Test comment", "parent_comment_id": None}

    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(report_id)}]
        elif name == "comments":
            mock.insert.return_value.execute.return_value.data = [mock_comment]
        elif name == "profiles":
            mock.select.return_value.eq.return_value.execute.return_value.data = []
        return mock

    mock_supabase.table.side_effect = mock_table

    result = await service.create_comment(comment_in, "user-123")

    assert result["user_nickname"] == "사용자"
    assert result["user_avatar_url"] is None


@pytest.mark.asyncio
async def test_get_comments_by_report_report_not_found(make_service):
    service, mock_supabase = make_service(CommentService)
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    with pytest.raises(HTTPException) as excinfo:
        await service.get_comments_by_report(str(uuid4()))

    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Report not found"


@pytest.mark.asyncio
async def test_get_comments_by_report_defaults_nickname_when_profile_missing(make_service, mocker):
    service, mock_supabase = make_service(CommentService)
    report_id = str(uuid4())

    comments_data = [
        {"id": "1", "report_id": report_id, "user_id": "user-123", "content": "Parent 1", "parent_comment_id": None, "profiles": None},
    ]

    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": report_id}]
        elif name == "comments":
            mock.select.return_value.eq.return_value.order.return_value.execute.return_value.data = comments_data
        return mock

    mock_supabase.table.side_effect = mock_table

    result = await service.get_comments_by_report(report_id)

    assert result[0]["user_nickname"] == "알 수 없음"
    assert result[0]["user_avatar_url"] is None


@pytest.mark.asyncio
async def test_update_comment_not_found(make_service):
    service, mock_supabase = make_service(CommentService)
    comment_id = str(uuid4())
    comment_update = CommentUpdate(content="Updated content")

    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    with pytest.raises(HTTPException) as excinfo:
        await service.update_comment(comment_id, comment_update, "user-123")

    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Comment not found"


@pytest.mark.asyncio
async def test_update_comment_unauthorized(make_service):
    service, mock_supabase = make_service(CommentService)
    comment_id = str(uuid4())
    comment_update = CommentUpdate(content="Updated content")

    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": comment_id, "user_id": "other-user"}]

    with pytest.raises(HTTPException) as excinfo:
        await service.update_comment(comment_id, comment_update, "user-123")

    assert excinfo.value.status_code == 403
    assert excinfo.value.detail == "Not authorized"


@pytest.mark.asyncio
async def test_update_comment_success_enriches_with_profile(make_service, mocker):
    service, mock_supabase = make_service(CommentService)
    comment_id = str(uuid4())
    comment_update = CommentUpdate(content="Updated content")

    def mock_table(name):
        mock = mocker.Mock()
        if name == "comments":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": comment_id, "user_id": "user-123"}]
            mock.update.return_value.eq.return_value.execute.return_value.data = [
                {"id": comment_id, "content": "Updated content"}
            ]
        elif name == "profiles":
            mock.select.return_value.eq.return_value.execute.return_value.data = [
                {"nickname": "tester", "avatar_url": "http://example.com/a.png"}
            ]
        return mock

    mock_supabase.table.side_effect = mock_table

    result = await service.update_comment(comment_id, comment_update, "user-123")

    assert result["content"] == "Updated content"
    assert result["user_nickname"] == "tester"
    assert result["user_avatar_url"] == "http://example.com/a.png"


@pytest.mark.asyncio
async def test_update_comment_update_failed(make_service, mocker):
    service, mock_supabase = make_service(CommentService)
    comment_id = str(uuid4())
    comment_update = CommentUpdate(content="Updated content")

    def mock_table(name):
        mock = mocker.Mock()
        if name == "comments":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": comment_id, "user_id": "user-123"}]
            mock.update.return_value.eq.return_value.execute.return_value.data = []
        return mock

    mock_supabase.table.side_effect = mock_table

    with pytest.raises(HTTPException) as excinfo:
        await service.update_comment(comment_id, comment_update, "user-123")

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Update failed"


@pytest.mark.asyncio
async def test_delete_comment_not_found(make_service):
    service, mock_supabase = make_service(CommentService)
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    with pytest.raises(HTTPException) as excinfo:
        await service.delete_comment(str(uuid4()), "user-123")

    assert excinfo.value.status_code == 404
    assert excinfo.value.detail == "Comment not found"


@pytest.mark.asyncio
async def test_delete_comment_unauthorized(make_service):
    service, mock_supabase = make_service(CommentService)
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "other-user"}
    ]

    with pytest.raises(HTTPException) as excinfo:
        await service.delete_comment(str(uuid4()), "user-123")

    assert excinfo.value.status_code == 403
    assert excinfo.value.detail == "Not authorized"


@pytest.mark.asyncio
async def test_delete_comment_success(make_service):
    service, mock_supabase = make_service(CommentService)
    comment_id = str(uuid4())
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user-123"}
    ]
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [
        {"id": comment_id}
    ]

    await service.delete_comment(comment_id, "user-123")

    mock_supabase.table.return_value.delete.return_value.eq.assert_called_with("id", comment_id)


@pytest.mark.asyncio
async def test_delete_comment_delete_failed(make_service):
    service, mock_supabase = make_service(CommentService)
    comment_id = str(uuid4())
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"user_id": "user-123"}
    ]
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = []

    with pytest.raises(HTTPException) as excinfo:
        await service.delete_comment(comment_id, "user-123")

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Delete failed"
