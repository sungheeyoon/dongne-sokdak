# 로딩 스켈레톤은 실제 컴포넌트와 코로케이트하고 구조를 공유한다

`shared/ui/LoadingSpinner.tsx`의 `CardSkeleton`은 `shared/ui/ReportCard.tsx`의 레이아웃을 손으로 베껴 그린 독립적인 `div` 뭉치였다. `ReportCard`가 `UiCard` 기반 구조(헤더의 제목+상태뱃지, 본문의 설명+조건부 이미지+통계줄, 그리고 별도 밴드인 주소+카테고리 푸터)로 다시 만들어졌을 때 스켈레톤은 따라 바뀌지 않았고, 결국 푸터 밴드 자체가 통째로 빠진 채 옛 치수(고정 `h-32` 이미지, `border-2` 등)로 남아 실제 카드와 어긋났다. 이후 모든 로딩 스켈레톤(`ReportCard`, 제보 상세 페이지, `Comments`)은 실제 컴포넌트와 같은 파일에 두고, 같은 레이아웃 프리미티브를 재사용하도록 한다 — `ReportCard`류는 `UiCard`/`UiCardHeader`/`UiCardContent`/`UiCardFooter`를, `Comments`는 `CommentItem`에서 추출한 조각(아바타, 이름+시간줄 등)을 공유한다.

## Considered Options

- **독립 유지, 치수만 재동기화**: 지금 당장은 더 빠르지만 이번과 똑같은 경로로 다시 드리프트된다 — 원인(구조적 결합 없음)을 그대로 두고 증상만 고치는 것이라 기각.
- **Comments는 리팩터링 없이 스켈레톤만 눈대중으로 재조정**: `CommentItem`이 프리미티브로 쪼개져 있지 않아 `ReportCard`만큼 자연스러운 공유 지점이 없었지만, 원칙을 예외 없이 적용하기 위해 `CommentItem`을 조각으로 추출하는 리팩터링을 함께 하기로 했다.

## Consequences

- `ReportCardSkeleton`은 `LoadingSpinner.tsx`가 아니라 `shared/ui/ReportCard.tsx`에 `ReportCard`와 나란히 정의된다. `LoadingSpinner.tsx`에는 범용 `LoadingSpinner`/`SkeletonLoader`만 남는다.
- `CommentItem`은 아바타/이름+시간줄/본문/액션버튼줄 조각으로 분리되고, 댓글 스켈레톤은 그 조각들을 그대로 사용한다.
- 제보 상세 페이지 스켈레톤은 실제 `Card`의 4개 구역(헤더/상세내용/위치+지도/액션)을 따라가도록 확장된다 — 지도 자리만 예외적으로 실제 프리미티브 대신 단순 사각형으로 대체한다(지도 자체를 흉내낼 수 없으므로).
- 앞으로 이 세 컴포넌트의 레이아웃을 바꾸는 사람은 같은 파일 안에서 스켈레톤도 함께 보게 되어, 구조적으로 드리프트가 재발하기 어렵다.
