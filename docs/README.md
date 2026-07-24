# 동네속닥 문서 인덱스

_Last verified: 2026-07-24_

현재 동작은 코드와 아래의 **현재 문서**를 기준으로 판단합니다. 완료된 계획은 당시 작업 과정을 보존하는 역사 자료이며 현재 동작의 근거로 사용하지 않습니다.

## 현재 문서

| 문서 | 역할 |
| --- | --- |
| [`../README.md`](../README.md) | 제품 흐름, 핵심 성과, 실행 방법 |
| [`../CONTEXT.md`](../CONTEXT.md) | 프로젝트 도메인 용어 |
| [`FRONTEND_CLEAN_ARCHITECTURE.md`](FRONTEND_CLEAN_ARCHITECTURE.md) | 프론트엔드 계층과 의존성 규칙 |
| [`adr/`](adr/) | 현재까지 유지되는 설계 결정 |
| [`portfolio/PORTFOLIO.md`](portfolio/PORTFOLIO.md) | 면접관용 프로젝트 요약 |
| [`portfolio/ENGINEERING_NOTES.md`](portfolio/ENGINEERING_NOTES.md) | 문제 진단과 선택 근거 |
| [`../backend/README.md`](../backend/README.md) | 백엔드 구조와 실행 방법 |
| [`../backend/results/locust/BOUNDS_RPC_BENCHMARK_20260724.md`](../backend/results/locust/BOUNDS_RPC_BENCHMARK_20260724.md) | bounds 성능 측정 원문 |

## 현재 조회 경계

- 프론트엔드 지도와 목록은 `/api/v1/reports/bounds`를 사용합니다.
- 드래그·확대/축소는 dirty 상태만 만들며, “이 지역 재검색” 또는 명시적 지도 초점 변경 시 bounds를 커밋합니다.
- `/api/v1/reports/nearby`와 `/api/v1/reports/benchmark/nearby-rest`는 백엔드에 남아 있는 호환·벤치마크 경로이며 현재 제품 UI에서는 호출하지 않습니다.
- 포트폴리오 성능 수치는 `/bounds`의 동일 버전 3회 반복 측정만 사용합니다.

## 역사 자료

`plans/archive/`는 완료된 계획의 스냅샷입니다. 구현 중 체크리스트와 당시 측정값을 보존하지만, 이후 ADR이나 코드와 충돌하면 현재 문서와 코드를 우선합니다.

## 문서 유지 규칙

1. 성능 수치에는 원본 결과, 조건, 반복 횟수를 연결합니다.
2. 제품 UI가 호출하지 않는 API는 “현재 기능”으로 소개하지 않습니다.
3. 완료 계획은 `plans/archive/`로 이동하고 snapshot 배너를 붙입니다.
4. 임시 분석 보고서는 결론이 ADR·README·벤치마크 보고서에 반영되면 삭제합니다.
5. 로컬 Markdown 링크와 코드 경로는 변경 시 함께 검증합니다.
