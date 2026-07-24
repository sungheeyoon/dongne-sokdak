# 지도 조회 필터 술어는 SQL 헬퍼 함수로 공유하고, get/count 에러 정책을 raise로 통일한다

주변 조회·영역 조회의 get/count 4개 RPC(`get/count_reports_within_radius`, `get/count_reports_in_bounds`)는 category/search 필터 술어를 각자 손으로 복제해왔고, 4번의 마이그레이션에 걸쳐 시그니처가 drift했다(버려진 overload를 잡는 `738066c` 핫픽스 포함). 이 필터 술어를 `report_matches_filters(r, category_filter, search_query)` SQL boolean 헬퍼 함수 하나로 추출해 4개 함수가 공유하되, 공간 조건(`&&`, `ST_DWithin`)은 GiST 인덱스 푸시다운을 지키기 위해 각 함수 WHERE절에 그대로 인라인한다. `get/count_reports_paginated`는 공간 술어가 아예 없고 필터 집합도 다른(status/user_id 추가) 별개 도메인 개념(CONTEXT.md의 "일반 목록 페이지네이션", 지도 조회 아님)이라 이번 범위에서 제외한다. Python 쪽은 `rpc_params: Dict[str, Any]`를 `RadiusQueryParams`/`BoundsQueryParams` Pydantic 모델로 대체해 get/count가 같은 소스에서 파라미터를 파생시킨다(`.for_count()` / `.for_get(offset, limit)`). 동시에, count RPC 실패를 `total_count=0`으로 삼키던 비대칭 try/except를 제거하고 get과 동일하게 raise하도록 통일한다 — swallow는 `items`는 채워지는데 `totalPages=0`이 되는 모순 상태를 만들 수 있었다.

## Considered Options

- **`get/count_reports_paginated`까지 포함해 3벌 전부 하나의 필터 코어로 묶기**: 필터 파라미터 집합이 다르고(status/user_id 추가) 공간 술어가 아예 없어 억지로 묶으면 코어 안에 조건 분기가 늘어난다 — 기각.
- **공간 조건까지 포함한 `SETOF` 함수로 통합** (예: `filtered_reports_near(...)`): get/count의 리턴 타입이 달라 결국 두 벌 함수가 더 필요하고, 공간 인덱스가 함수 호출 경계를 넘어서도 잘 푸시다운되는지 매번 EXPLAIN으로 검증해야 하는 리스크가 있다 — 더 작은 boolean 헬퍼로 범위를 좁혔다.
- **count 실패를 graceful degrade(빈 목록/0)로 통일**: 시그니처 drift가 로그에만 남고 운영자가 못 볼 위험이 있다 — 기각, get과 동일하게 raise해 기존 라우트 레벨 `except Exception → HTTPException(400)` 안전망을 그대로 태운다.

## Consequences

count RPC 실패가 이제 지도 조회 전체를 400으로 실패시킨다(이전엔 총 개수만 조용히 0으로 틀렸다) — 견고성보다 가시성을 우선한 의도된 트레이드오프다. 로컬 Postgres 통합 테스트 인프라가 없어 SQL 헬퍼의 실제 동작·인덱스 사용은 스테이징에서 EXPLAIN으로 수동 검증한다; 자동화는 후속 과제로 남긴다.

2026-07-24 실행계획 검증에서 행 단위 필터 함수가 활성 bounds RPC의 병목으로 확인됐다. 프론트엔드가 사용하는 통합 RPC는 ADR-0010에 따라 선택 필터를 인라인하는 예외로 전환했으며, 이 ADR의 공유 함수 결정은 기존 주변 조회와 롤백용 RPC에만 남는다.
