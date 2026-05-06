# PLAN — Backend Refactoring & Performance

- **Created**: 2026-05-06
- **Last Updated**: 2026-05-06
- **Owner**: sungheeyoon
- **Status**: Phase 1·2 본 작업 완료 / **잔여 정리 항목 존재** (§ 4 참조)
- **Companion**: `PLAN_frontend_refactor_perf.md`

---

## 1. 완료 요약 (Phase 1·2)

| Phase | 결과 |
|---|---|
| 1A — services 레이어 도입 | `report_service`, `comment_service`, `vote_service`, `profile_service` 신설. `api/v1/*` 라우트 일부를 service로 위임. `pytest`/`pytest-mock` 단위 테스트 도입. |
| 1B — admin routes 분리 | `admin/routes.py` (1171줄) → `routes_dashboard / users / reports / settings` 4개 파일 + `AdminService` 클래스 (540줄). `admin/__init__.py`에서 1회 prefix 부여, 외부 URL 동등성 유지. |
| 2 — N+1 fix + 캐시 정리 | `20260507_get_reports_paginated.sql` RPC + `count_reports_paginated` 추가. `report_service.list_reports()` RPC 경로로 전환, `enrich_report_data`에서 하드코딩 `0` 제거. `nearby_cache`/`bounds_cache` 키에서 `current_user_id` 제거, `user_voted`는 별도 batch lookup으로 합성. |

---

## 2. 코드 리뷰 결과 — 잔여/미흡 항목

> Phase 1·2의 **목표는 충족**했지만, 라우트 파일 검토에서 *thin handler* 원칙을 완전히 만족하지 못한 부분과 일관성 결함이 다수 발견됨. 아래 체크리스트는 후속 정리(또는 Phase 3)로 처리할 항목.

### 2.1 라우트 thin화 미완 — `api/v1/reports.py` (405줄)

- [ ] **`get_nearby_reports`** 핸들러(79–161줄)에 캐시 lookup, RPC 카운트/페치, `user_voted` 배치 합성 로직이 약 80줄 인라인. `report_service.get_nearby_reports()`로 추출 필요.
- [ ] **`get_reports_in_bounds`** 핸들러(163–241줄)도 동일 패턴이 그대로 중복. `report_service.get_reports_in_bounds()`로 추출 + `nearby`와 공통화(가령 `_apply_user_voted(items, supabase, current_user_id)` 헬퍼).
- [ ] **`update_report`** / **`delete_report`** (302–357줄): 소유자 검증 + supabase 호출이 라우트에 인라인. `report_service.update_report()`, `report_service.delete_report()`로 위임.
- [ ] **`get_report`** (284–300줄): `supabase.table("reports").select(...)` 직접 호출. `report_service.get_report_by_id()` 신설.
- [ ] **`benchmark_nearby_rest`** (361–403줄): 벤치마크 코드라도 라우트 파일에 두지 말고 `report_service.benchmark_nearby_rest_python()`로 이동(또는 `api/v1/benchmarks.py`로 분리).
- [ ] **`get_my_neighborhood_reports`** (243–282줄): 프로필 조회 후 `get_nearby_reports`를 함수 호출로 재사용 — service 추출 시 의존 정리.

### 2.2 캐시 객체 위치

- [ ] `nearby_cache`, `bounds_cache` (`reports.py:19–20`)는 라우트 모듈의 글로벌 상태. service로 옮기면 테스트/공유가 깔끔해짐. 현재는 `tests/test_reports_endpoint.py`에서 `from app.api.v1.reports import nearby_cache, bounds_cache`로 fixture가 라우트 모듈을 직접 import 중.

### 2.3 로깅 일관성 — `print()` 잔존

Phase 2 quality gate 항목 *"`api/v1/reports.py` 의 `print(...)` 제거"* 는 수행됐으나 **다른 모듈의 `print()`는 미처리**:

- [ ] `app/services/admin_service.py` — `print(f"❌ ...")` 5건 (45, 78, 110, 324, 351줄). `app.core.logging.get_logger(__name__)`로 교체.
- [ ] `app/services/report_service.py:54` — `print(f"Location parsing failed: {e}")` 잔존. logger로 교체.
- [ ] `app/utils/wkb_parser.py:72–79` — `__main__` 가드 안의 디버그 출력. `if __name__ == "__main__":` 블록으로 감싸기 또는 제거.

### 2.4 Service 시그니처/계약 불일치

- [ ] **`enrich_report_data(report, supabase, current_user_id=None)`** (`report_service.py:58`) — `current_user_id` 매개변수가 **함수 본문에서 미사용**(dead parameter). `user_voted`는 호출자가 batch로 채움. 시그니처에서 제거하거나 사용처에서 인자 삭제.
- [ ] **에러 반환 패턴 비일관** — `comment_service`, `vote_service`, `profile_service`는 `{"error": "...", "status_code": 404}` 딕셔너리를 반환하고 라우트에서 `if "error" in result: raise HTTPException(...)`로 풀어냄. 파이썬다운 패턴은 service에서 **직접 `HTTPException` 또는 도메인 예외 raise**. `admin_service`(예외 raise)와도 일관성 깨짐. 통일 결정 필요.
- [ ] `services/__init__.py` — `report/comment/vote/profile_service`는 모듈 import, `admin_service`는 누락. 호출 측은 `AdminService` 클래스를 직접 import. 패턴 통일(전부 모듈 함수 또는 전부 클래스).

### 2.5 잔존 N+1

- [ ] **`comment_service.get_comments_by_report`** (`comment_service.py:64–77`) — 댓글 N건당 `profiles.select().eq("id", comment["user_id"])` 호출. 댓글이 많을수록 비례 증가. `IN (...)` 쿼리 한 번으로 묶거나 supabase relation join(`comments?select=*,profiles(*)`)으로 해결.
- [ ] **`profile_service.get_my_profile` / `get_user_profile`** — `count="exact"` 쿼리 3건 직렬 실행. 단일 RPC(`get_profile_with_stats`)로 묶을 여지.

### 2.6 인라인 import / 코드 정리

- [ ] `app/api/admin/routes_users.py:96`, `routes_reports.py:158` — 함수 안에서 `from fastapi import HTTPException, status` import. 파일 상단으로 이동.
- [ ] `app/services/comment_service.py:105` — `update_comment` 안에서 `from datetime import datetime, timezone`. 상단으로 이동.

### 2.7 테스트 커버리지 공백

- [ ] **`AdminService` 테스트 0건** — 540줄 클래스의 권한 분기(`admin_role != "admin"`), 일괄 작업 결과 집계, 활동 로그 호출 등은 회귀 위험이 큼. 최소 `bulk_user_action` / `update_user_role` / `perform_report_action` 단위 테스트 추가.
- [ ] **통합 테스트 부재** — Phase 2 plan 의 *"100건 시드 → `/reports?limit=100` 응답 < 1s, vote/comment count 실측"* 통합 테스트가 실제로는 없음. `tests/test_reports_endpoint.py`는 mock 기반 단위 테스트만 있음. RPC SQL 자체의 회귀를 잡으려면 Supabase local 또는 별도 sqlite/pg 픽스처로 한두 개라도 추가.
- [ ] `services/admin_service` coverage report에 포함되지 않음(`--cov=app/services` 시 측정은 되나 0%). 게이트 지표 명시 필요.

### 2.8 보너스 — 큰 파일 분할 검토

- [ ] `app/services/admin_service.py`(540줄) — 도메인이 5종(dashboard/users/reports/logs/bulk). 라우트는 4개로 분리됐으니 service도 `admin/dashboard_service.py`, `admin/user_service.py`, `admin/report_service.py` 정도로 분할하면 라우트-서비스 1:1 매핑이 깔끔해짐. (선택)

---

## 3. 권장 처리 순서

| # | 작업 | 추정 |
|---|---|---|
| 1 | §2.3 로깅 일관성 (print → logger) — 5분 작업, 위험 0 | 5m |
| 2 | §2.4 `enrich_report_data` dead param 제거 + `services/__init__` 통일 | 15m |
| 3 | §2.6 인라인 import 정리 | 5m |
| 4 | §2.1 `reports.py` 라우트 thin화 (nearby/bounds/get/update/delete) — service에 함수 5개 추가, 라우트는 위임만 | 1.5–2h |
| 5 | §2.4 service 에러 반환 패턴 통일 (raise HTTPException 권장) | 30m |
| 6 | §2.5 `comment_service` N+1 제거 (IN 쿼리 또는 join) | 30m |
| 7 | §2.7 `AdminService` 단위 테스트 + 1–2개 통합 테스트 | 1h |
| 8 | §2.8 admin_service 분할 (선택) | 1h |

---

## 4. Quality Gate (잔여 정리 작업용)

```bash
cd backend
.venv/Scripts/python -c "from app.main import app; print('boot OK')"
.venv/Scripts/python -m pytest -q
.venv/Scripts/python -m pytest --cov=app/services --cov-report=term-missing
# print() 0건 확인 (utils/wkb_parser.py __main__ 제외)
grep -rn "print(" app --include="*.py" | grep -v "__main__" | grep -v "wkb_parser"
# 라우트 thin화 회귀 — reports.py 길이
wc -l app/api/v1/reports.py  # 목표: <250줄
```

---

## 5. Rollback Strategy

- 본 작업(Phase 1·2)은 이미 머지됨 — RPC `get_reports_paginated` 추가 외 DB 변경 없음.
- 후속 정리 작업은 모두 코드 리팩터링 → `git revert` 만으로 복구.

---

## 6. Notes & Learnings

- (Phase 1A) `services/` 레이어 도입과 `pytest`/`pytest-mock` 첫 도입으로 단위 테스트 기반 확보.
- (Phase 1B) 1171줄 `admin/routes.py` → 4파일 + `AdminService` 분리. 외부 URL 동등성은 `__init__.py`에서 prefix 1회로 보존.
- (Phase 2) `get_reports_paginated` RPC로 `/reports` 리스트의 `vote/comment count` 정확도 회복. 캐시 키에서 `user_id` 제거 → hit-rate 향상, 사용자별 voted는 단일 IN 쿼리로 합성.
- (리뷰) Phase 1A에서 `create_report` / `list_reports`만 service로 옮겼고 `nearby` / `bounds` / `get` / `update` / `delete` 핸들러는 라우트에 그대로 남아 *thin handler* 원칙 부분만 충족. 후속 정리 필요(§2.1).
- (리뷰) 로깅 정리는 `reports.py` 한 파일로 한정됐고 `admin_service.py` 등에는 `print()`가 그대로 남음 — 게이트 항목을 모듈 단위로 좁게 정의한 결과(§2.3).
