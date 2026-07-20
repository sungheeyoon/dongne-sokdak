from dataclasses import dataclass
from typing import Any, Awaitable, Callable, Dict, List, Optional, Tuple

LogAdminActivity = Callable[..., Awaitable[None]]
BuildDetails = Callable[[str], Dict[str, Any]]


@dataclass(frozen=True)
class AdminActionContext:
    """audit log 호출마다 함께 다니는 요청자 정보 묶음 — admin_id/ip_address/user_agent 세 값이
    perform_report_action, bulk_report_action, bulk_user_action 등 모든 admin mutation
    시그니처에 나란히 반복돼 data clump가 되는 것을 막는다."""

    admin_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


async def record_bulk_success(
    ids: List[str],
    *,
    id_field: str,
    message: str,
    action: str,
    target_type: str,
    context: AdminActionContext,
    log_admin_activity: LogAdminActivity,
    build_details: BuildDetails,
) -> Tuple[int, List[Dict[str, Any]]]:
    """bulk mutation 성공 id들에 대한 결과 기록 + audit log 순회.

    실제 DB mutation(update/delete)과 그 부수효과(예: 지도 조회 캐시 무효화,
    ADR-0001)는 호출부 책임으로 남긴다. user/report bulk 액션은 이 순회
    루프 모양만 같을 뿐 권한검사·자기 제외·payload 구성 규칙이 엔티티마다
    달라, 그 부분까지 하나의 코어로 묶으면 콜백 주입이 많아져 오히려
    읽기 어려워진다고 판단해 여기까지만 공유한다.
    """
    success_count = 0
    results: List[Dict[str, Any]] = []
    for item_id in ids:
        success_count += 1
        results.append({id_field: item_id, "status": "success", "message": message})
        await log_admin_activity(
            admin_id=context.admin_id,
            action=action,
            target_type=target_type,
            target_id=item_id,
            details=build_details(item_id),
            ip_address=context.ip_address,
            user_agent=context.user_agent,
        )
    return success_count, results
