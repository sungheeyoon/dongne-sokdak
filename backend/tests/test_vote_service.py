import pytest
from fastapi import HTTPException
from uuid import uuid4
from app.services.vote_service import VoteService
from app.schemas.vote import VoteCreate


@pytest.mark.asyncio
async def test_create_vote_success(make_service, mocker):
    service, mock_supabase = make_service(VoteService)
    report_id = uuid4()
    user_id = "user-123"
    vote_in = VoteCreate(report_id=report_id)

    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(report_id)}]
        elif name == "votes":
            # For duplicate check
            mock.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
            # For insert
            mock.insert.return_value.execute.return_value.data = [{"id": "vote-123", "report_id": str(report_id), "user_id": user_id}]
        return mock

    mock_supabase.table.side_effect = mock_table

    result = await service.create_vote(vote_in, user_id)

    assert result["id"] == "vote-123"


@pytest.mark.asyncio
async def test_create_vote_duplicate(make_service, mocker):
    service, mock_supabase = make_service(VoteService)
    report_id = uuid4()
    user_id = "user-123"
    vote_in = VoteCreate(report_id=report_id)

    def mock_table(name):
        mock = mocker.Mock()
        if name == "reports":
            mock.select.return_value.eq.return_value.execute.return_value.data = [{"id": str(report_id)}]
        elif name == "votes":
            mock.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "existing"}]
        return mock

    mock_supabase.table.side_effect = mock_table

    with pytest.raises(HTTPException) as excinfo:
        await service.create_vote(vote_in, user_id)

    assert excinfo.value.status_code == 400
    assert excinfo.value.detail == "Already voted"


@pytest.mark.asyncio
async def test_delete_vote_success(make_service):
    service, mock_supabase = make_service(VoteService)
    report_id = str(uuid4())
    user_id = "user-123"

    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "vote-123"}]
    mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [{"id": "vote-123"}]

    result = await service.delete_vote(report_id, user_id)

    assert result is None


@pytest.mark.asyncio
async def test_get_vote_count(make_service, mocker):
    service, mock_supabase = make_service(VoteService)
    report_id = str(uuid4())
    mock_response = mocker.Mock()
    mock_response.count = 5
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_response

    result = await service.get_vote_count(report_id)

    assert result == 5


@pytest.mark.asyncio
async def test_check_vote_true(make_service):
    service, mock_supabase = make_service(VoteService)
    report_id = str(uuid4())
    user_id = "user-123"
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "some-id"}]

    result = await service.check_vote(report_id, user_id)

    assert result is True


@pytest.mark.asyncio
async def test_check_vote_false(make_service):
    service, mock_supabase = make_service(VoteService)
    report_id = str(uuid4())
    user_id = "user-123"
    mock_supabase.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    result = await service.check_vote(report_id, user_id)

    assert result is False
