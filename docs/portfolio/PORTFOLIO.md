# 동네속닥

### Location-based Community Service

`Next.js 16` `TypeScript` `FastAPI` `PostgreSQL` `PostGIS`

개발 2025.06–07 · 2026 리팩토링/성능 개선 · 1인 개발

[서비스](https://dongne-sokdak.vercel.app) · [GitHub](https://github.com/sungheeyoon/dongne-sokdak) · [Engineering Notes](./ENGINEERING_NOTES.md)

사용자가 현재 보고 선택한 지도 영역의 생활 정보를 확인하고 제보·투표·댓글로 공유하는 커뮤니티 서비스입니다. 현재 제품 화면은 반경 2km/3km 검색이 아니라 **지도 bounds 조회**를 사용합니다.

## Spatial Query Optimization

**Problem**

페이지와 전체 개수를 각각 조회하던 두 RPC를 하나로 합쳤지만 동시 부하 성능은 개선되지 않았습니다. 대표 강남 bounds의 공간 후보 8,039건마다 category/search 필터 함수가 호출되는 것이 실제 병목이었습니다.

**Solution**

`EXPLAIN (ANALYZE, BUFFERS)`로 공간 인덱스 검색과 필터 비용을 분리했습니다. 활성 RPC에는 선택 필터를 인라인해 PostgreSQL이 `NULL` 필터를 제거하도록 하고, 페이지와 전체 개수는 한 RPC에서 반환하도록 유지했습니다.

**Result**

- count SQL: `55.8ms → 6.6ms` — **88.2% 감소**
- 전체 SQL 3회 중앙값: `125.8ms → 16.0ms` — **87.3% 감소**
- API 3회 중앙값: **p50 13.6% 감소 · p99 23.8% 감소 · RPS 15.0% 증가**
- 실패율: 전후 모두 `0%`

## Query Optimization

**Problem**

목록 조회에서 제보마다 투표·댓글 수를 반복 조회해 `1 + 2N` 쿼리가 발생했습니다.

**Solution**

투표·댓글 집계를 페이지 RPC 내부로 옮기고, 로그인 사용자의 투표 여부만 한 번의 batch 조회로 합성했습니다.

**Result**

`1 + 2N Query → 2~3 Query`

## Map Interaction & Rendering

- 드래그·확대/축소는 즉시 재조회하지 않고 “이 지역 재검색” 전까지 dirty 상태만 유지
- 회귀 테스트: 지도 조작 20회 동안 bounds 커밋 0회, 재검색 후 1회
- 결정적 500개 입력에서 화면 안 80개만 렌더링하는 viewport culling 검증
- 줌 단계에 따라 Kakao 클러스터·30m 근접 그룹·개별 마커를 분리

## Load Testing

Locust 2.32.10으로 변경 전·후를 각각 3회 측정했습니다.

`4 workers · 동시 사용자 20명 · 90초 · 강남 80%/서울 20% bounds 1,000개 · 합성 데이터 10,006건`

| 지표 | 변경 전 중앙값 | 변경 후 중앙값 | 변화 |
| --- | ---: | ---: | ---: |
| p50 | 8.8초 | 7.6초 | 13.6% 감소 |
| p99 | 21초 | 16초 | 23.8% 감소 |
| 평균 | 8.835초 | 7.614초 | 13.8% 감소 |
| RPS | 2.09 | 2.40 | 15.0% 증가 |
| 실패율 | 0% | 0% | 동일 |

이 수치는 통제된 로컬 API·공유 Supabase 테스트 환경의 결과이며 운영 트래픽 SLA로 해석하지 않습니다. 원본 조건과 CSV는 [bounds benchmark report](../../backend/results/locust/BOUNDS_RPC_BENCHMARK_20260724.md)에 보존했습니다.
