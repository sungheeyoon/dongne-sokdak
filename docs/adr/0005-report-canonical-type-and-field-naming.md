# 제보(Report) canonical 타입은 하나, admin은 확장으로 파생한다

같은 `reports` 테이블을 읽는 두 slice가 Report를 독립적으로 손으로 재작성해 필드명(`voteCount`/`votesCount`)과 상태·카테고리 타입(enum vs 재선언된 리터럴 유니언)이 drift했다. 이 drift는 frontend에만 있는 게 아니라 backend admin API(`vote_count`/`comment_count` vs `votes_count`/`comments_count`)에도 있었다 — frontend의 손-모델은 실제로 존재하는 backend admin 응답 필드명을 그대로 반영한 것이었다. `features/reports/domain/entities.ts`가 이미 `@/types`의 `Report`를 재정의 없이 재수출하는 선례가 있어, 이를 canonical 소스로 확정한다: `frontend/src/features/admin/domain/entities.ts`의 `ReportManagement`는 `Omit<Report, 'location'>`(admin 목록 응답엔 location이 없음)에 admin 전용 필드(`userNickname`, `userEmail`, `adminComment`, `assignedAdminId`, `assignedAdminNickname`)를 얹어 파생하고, `ReportDetail`은 다시 `ReportManagement`를 확장한다. backend `api/admin/schemas.py`의 `vote_count`/`comment_count`도 main report 스키마(`schemas/report.py`)와 이름을 맞춘다.

## Considered Options

- **frontend repository 매핑에서만 이름을 흡수하고 backend admin API는 그대로 둔다**: `apiAdminRepository.ts`의 mapper가 이미 snake_case→camelCase 변환의 seam이라 frontend만 고치면 표면적으로 더 작은 변경이 된다. 하지만 drift의 근본 원인(같은 개념에 대한 backend 응답 필드명 자체가 두 벌)이 그대로 남아, admin API를 쓰는 다음 소비자(예: 다른 관리 도구)가 다시 같은 함정에 빠질 수 있어 기각.
- **`ReportManagement`를 계속 손으로 유지하되 `status`/`category` 타입만 `Report`에서 import**: 부분적 재사용이라 여전히 필드명 drift(`votesCount` 등)를 막지 못하고, 다음에 `Report`에 필드가 추가되면 또 수동 미러링이 필요해 candidate 6이 지적한 문제를 절반만 해결한다 — 기각.

## Consequences

admin 화면의 투표/댓글 카운트 렌더링이 `votesCount`/`commentsCount` → `voteCount`/`commentCount`로 바뀐다(`components/admin/ReportManagement.tsx`, `ReportDetailModal.tsx`). `voteCount`/`commentCount`는 `Report`에서 상속되어 optional(`number | undefined`)이 되지만, admin API는 항상 값을 채워 보내므로 런타임 동작에는 영향이 없다. `imageUrl`/`address`는 `string | null`에서 `Report`와 같은 `string | undefined` 관례로 바뀐다 — 기존 소비 코드가 전부 truthy 체크(`&&`, `|| ''`)라 안전하다.
