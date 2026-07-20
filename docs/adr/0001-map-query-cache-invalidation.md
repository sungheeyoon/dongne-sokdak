# 지도 조회 캐시는 제보 변이에만 전체 무효화한다

지도 조회(Map Query — 주변 조회 + 영역 조회) 결과는 `SpatialReportCache`에 15초 TTL로 캐시된다. 캐시 무효화는 제보 자체의 변이(생성·수정·삭제·admin 상태 변경)에서만, clear-all 방식으로 일어난다. 투표·댓글로 인한 `vote_count`/`comment_count` 변화는 의도적으로 무효화하지 않는다 — 최대 15초의 eventual consistency를 받아들인다(사용자 본인의 투표 여부 `user_voted`는 캐시 밖 오버레이라 항상 즉시 정확하다).

## Considered Options

- **투표·댓글 변이도 무효화**: `vote_service`/`comment_service`가 캐시 module에 결합되고, 집계 수치 15초 지연은 사용자가 인지하기 어려워 이득이 없음 — 기각.
- **키/지역 단위 무효화**: 캐시 키를 역파싱해 공간 포함 여부를 판정해야 하며, 이는 공간 RPC의 WHERE 술어를 Python에 복제하는 것 — 기각. TTL 15초·maxsize 1000 규모에서 clear-all 비용은 무시 가능.

## Consequences

투표/댓글 직후 지도 마커의 집계 수치가 최대 15초 이전 값일 수 있다. 이것은 버그가 아니라 이 결정의 의도된 결과다.
