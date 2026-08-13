"""작성자 표시 정보(닉네임·아바타·이메일) 조회.

`comments.user_id`와 `reports.user_id`는 `auth.users(id)`를 가리키고,
`profiles.id` 역시 `auth.users(id)`다. 두 값은 같지만 **`comments`/`reports`와
`profiles` 사이에는 외래키가 없다** — PostgREST는 외래키로만 임베딩 경로를
찾으므로 `profiles!comments_user_id_fkey(...)` 같은 조인은 스키마 캐시에서
관계를 찾지 못하고 PGRST200으로 실패한다.

그래서 작성자 정보는 임베딩이 아니라 명시적 조회로 가져온다. 같은 파일의
`CommentService.create_comment`가 이미 쓰던 방식이며, 여기서 공용화한다.
"""

from typing import Any, Dict, Iterable, List, Optional

from starlette.concurrency import run_in_threadpool
from supabase.client import Client

from app.core.logging import get_logger
from app.utils.blocking_db import execute

logger = get_logger(__name__)

UNKNOWN_NICKNAME = "알 수 없음"


def _unique(user_ids: Iterable[Optional[str]]) -> List[str]:
    seen: Dict[str, None] = {}
    for user_id in user_ids:
        if user_id:
            seen.setdefault(str(user_id), None)
    return list(seen)


async def fetch_profiles(supabase: Client, user_ids: Iterable[Optional[str]]) -> Dict[str, Dict[str, Any]]:
    """user_id -> {nickname, avatar_url}. 프로필이 없는 작성자는 결과에서 빠진다."""
    ids = _unique(user_ids)
    if not ids:
        return {}

    response = await execute(
        supabase.table("profiles").select("id, nickname, avatar_url").in_("id", ids)
    )
    return {row["id"]: row for row in (response.data or [])}


async def fetch_emails(supabase: Client, user_ids: Iterable[Optional[str]]) -> Dict[str, str]:
    """user_id -> email.

    이메일은 `auth.users`에만 있고 PostgREST로 노출되지 않으므로 Auth Admin API로
    읽는다. id 단건 조회라 호출 수는 **서로 다른 작성자 수**에 비례한다 —
    관리자 목록은 페이지 크기가 제한돼 있어 그 안에서 끝난다.

    소셜 로그인에 이메일 동의가 없으면 빈 문자열이 오는데, 이 경우 키를 넣지 않아
    호출자가 '이메일 없음'을 구분할 수 있게 한다.
    """
    ids = _unique(user_ids)
    if not ids:
        return {}

    emails: Dict[str, str] = {}
    for user_id in ids:
        try:
            response = await run_in_threadpool(supabase.auth.admin.get_user_by_id, user_id)
        except Exception as exc:  # 한 명을 못 읽었다고 목록 전체를 실패시키지 않는다
            logger.warning(f"이메일 조회 실패 (user_id={user_id}): {exc}")
            continue

        email = getattr(getattr(response, "user", None), "email", None)
        if email:
            emails[user_id] = email

    return emails


def attach_author(row: Dict[str, Any], profiles: Dict[str, Dict[str, Any]], emails: Dict[str, str]) -> Dict[str, Any]:
    """행에 작성자 표시 필드를 붙인다 — 프론트엔드가 읽는 평평한 이름을 쓴다."""
    profile = profiles.get(str(row.get("user_id"))) or {}
    row["user_nickname"] = profile.get("nickname") or UNKNOWN_NICKNAME
    row["user_avatar_url"] = profile.get("avatar_url")
    row["user_email"] = emails.get(str(row.get("user_id")))
    return row
