"""작성자 정보 조회 회귀 테스트.

`comments`/`reports`와 `profiles` 사이에는 외래키가 없다 — PostgREST 임베딩
(`profiles!comments_user_id_fkey(...)`)은 스키마 캐시에서 관계를 못 찾고
PGRST200으로 실패한다. 여기 테스트는 그 조인이 되살아나지 않도록 고정한다.
"""

import pytest

from app.services.user_directory import (
    UNKNOWN_NICKNAME,
    attach_author,
    fetch_emails,
    fetch_profiles,
)


@pytest.mark.asyncio
async def test_fetch_profiles_maps_by_user_id(mocker):
    supabase = mocker.Mock()
    supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = [
        {"id": "u1", "nickname": "이웃1", "avatar_url": None},
        {"id": "u2", "nickname": "이웃2", "avatar_url": "http://example.com/a.png"},
    ]

    result = await fetch_profiles(supabase, ["u1", "u2", "u1"])

    assert set(result) == {"u1", "u2"}
    assert result["u2"]["nickname"] == "이웃2"
    # 중복 id는 한 번만 조회한다
    supabase.table.return_value.select.return_value.in_.assert_called_once_with("id", ["u1", "u2"])


@pytest.mark.asyncio
async def test_fetch_profiles_does_not_embed_profiles(mocker):
    """임베딩 문법을 쓰면 실서버에서 PGRST200으로 깨진다."""
    supabase = mocker.Mock()
    supabase.table.return_value.select.return_value.in_.return_value.execute.return_value.data = []

    await fetch_profiles(supabase, ["u1"])

    selected = supabase.table.return_value.select.call_args[0][0]
    assert "profiles!" not in selected
    assert "fkey" not in selected


@pytest.mark.asyncio
async def test_fetch_profiles_skips_query_when_no_ids(mocker):
    supabase = mocker.Mock()

    assert await fetch_profiles(supabase, [None, ""]) == {}
    supabase.table.assert_not_called()


@pytest.mark.asyncio
async def test_fetch_emails_reads_auth_users(mocker):
    """이메일은 profiles가 아니라 auth.users에 있다."""
    supabase = mocker.Mock()
    supabase.auth.admin.get_user_by_id.side_effect = lambda uid: mocker.Mock(
        user=mocker.Mock(email={"u1": "one@example.com"}.get(uid, ""))
    )

    result = await fetch_emails(supabase, ["u1", "u2"])

    # 소셜 로그인에 이메일 동의가 없으면 빈 문자열이 온다 — 키를 넣지 않아 '없음'을 구분시킨다
    assert result == {"u1": "one@example.com"}


@pytest.mark.asyncio
async def test_fetch_emails_survives_a_single_lookup_failure(mocker):
    """한 명을 못 읽었다고 목록 전체를 실패시키지 않는다."""
    supabase = mocker.Mock()

    def get_user_by_id(uid):
        if uid == "boom":
            raise RuntimeError("auth unavailable")
        return mocker.Mock(user=mocker.Mock(email="ok@example.com"))

    supabase.auth.admin.get_user_by_id.side_effect = get_user_by_id

    assert await fetch_emails(supabase, ["boom", "u1"]) == {"u1": "ok@example.com"}


def test_attach_author_falls_back_when_profile_missing():
    row = attach_author({"user_id": "ghost"}, {}, {})

    assert row["user_nickname"] == UNKNOWN_NICKNAME
    assert row["user_avatar_url"] is None
    assert row["user_email"] is None


def test_attach_author_uses_flat_field_names():
    """프론트엔드는 중첩 profiles가 아니라 평평한 이름을 읽는다."""
    row = attach_author(
        {"user_id": "u1"},
        {"u1": {"nickname": "이웃1", "avatar_url": "http://example.com/a.png"}},
        {"u1": "one@example.com"},
    )

    assert row["user_nickname"] == "이웃1"
    assert row["user_avatar_url"] == "http://example.com/a.png"
    assert row["user_email"] == "one@example.com"
