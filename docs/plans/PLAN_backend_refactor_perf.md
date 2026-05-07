# PLAN — Backend Refactoring & Performance

- **Created**: 2026-05-06
- **Last Updated**: 2026-05-06 (§8 review)
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

### 2.1 라우트 thin화 미완 — `api/v1/reports.py` (187줄)

- [x] **`get_nearby_reports`**: `report_service.get_nearby_reports()`로 추출 완료.
- [x] **`get_reports_in_bounds`**: `report_service.get_reports_in_bounds()`로 추출 완료.
- [x] **`update_report`** / **`delete_report`**: service로 위임 완료.
- [x] **`get_report`**: `report_service.get_report_by_id()` 사용 완료.
- [x] **`benchmark_nearby_rest`**: `report_service.benchmark_nearby_rest_python()`으로 이동 완료.
- [x] **`get_my_neighborhood_reports`**: service 추출 및 의존 정리 완료.

### 2.2 캐시 객체 위치

- [x] `nearby_cache`, `bounds_cache`를 `report_service.py`로 이동 완료.

### 2.3 로깅 일관성 — `print()` 잔존

- [x] `app/services/admin_service.py` — `logger.error`로 교체 완료 (파일 제거됨).
- [x] `app/services/report_service.py:54` — logger로 교체 완료.
- [x] `app/utils/wkb_parser.py:72–79` — 제거 완료.
- [x] `app/core/config.py` 및 `app/core/sentry.py` — `logger`로 교체 완료.

### 2.4 Service 시그니처/계약 불일치

- [x] **`enrich_report_data`** dead param (`current_user_id`) 제거 완료.
- [x] **에러 반환 패턴 통일** — 대부분의 service에서 `HTTPException`을 직접 raise하도록 통일 완료.
- [x] `services/__init__.py` — split된 admin services (`admin_dashboard_service` 등)로 통일 완료. `AdminService` 제거.

### 2.5 잔존 N+1

- [x] **`comment_service.get_comments_by_report`**: join(`profiles`) 사용하여 해결 완료.
- [x] **`profile_service.get_my_profile` / `get_user_profile`**: 단일 RPC(`get_profile_with_stats`)로 최적화 완료. `20260508_get_profile_with_stats.sql` 추가.

### 2.6 인라인 import / 코드 정리

- [x] `app/api/admin/routes_users.py`, `routes_reports.py` — 인라인 import 정리 완료.
- [x] `app/services/comment_service.py` — 인라인 import 정리 완료.

### 2.7 테스트 커버리지 공백

- [x] **`AdminService` (split services) 테스트**: `tests/test_admin_service.py` 업데이트 완료.
- [x] **통합 테스트**: `tests/test_admin_report_service.py` 추가 및 `test_reports_endpoint.py` 검증 완료.
- [x] `services/admin` coverage report 확인 및 일부 보완 완료 (현재 전체 약 55%).

### 2.8 보너스 — 큰 파일 분할 검토

- [x] `app/services/admin_service.py` 분할 완료: `admin/dashboard_service.py`, `admin/user_service.py`, `admin/report_service.py`, `admin/log_service.py`.

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

---

## 7. 최종 결과 요약 (2026-05-08)

1.  **AdminService 완전 분할**:
    -   `AdminService` (540줄)를 `dashboard`, `user`, `report`, `log` 서비스로 분리 완료.
    -   관련 라우트 전체를 새 서비스 레이어로 이관하고 기존 `admin_service.py` 제거.
2.  **프로필 성능 최적화 (RPC)**:
    -   `get_profile_with_stats` RPC 도입으로 프로필 및 통계 조회 쿼리를 단일 요청으로 통합.
    -   `profile_service`에서 N+1성 쿼리 제거 및 응답 지연 시간 단축.
3.  **로깅 시스템 표준화**:
    -   프로젝트 전반(`config`, `sentry`, `wkb_parser` 등)의 `print()` 문을 구조화된 `logger` 호출로 교체.
4.  **품질 검증**:
    -   전체 테스트 34건 Pass 확인.
    -   `api/v1/reports.py`의 'thin handler' 원칙 적용으로 가독성 및 유지보수성 향상.

---

## 8. 추가 리뷰 (2026-05-06)

§1–§7 적용 검증 (34 tests pass, `reports.py` 205줄, `print()` 0건) 후 정밀 리뷰 결과.

### 완료 (P0/P1/P2 전체)

- **§8.1 N+1/정확도**: `get_reports_within_radius` / `get_reports_in_bounds` / 단건 조회에 `vote_count`/`comment_count` 추가 → `/reports/nearby`·`/bounds`·`/my-neighborhood`의 카운트 0 회귀 해결. 마이그레이션 `20260508_update_spatial_rpcs_with_counts.sql`.
- **§8.2 Admin 풀스캔 제거**: `get_admin_dashboard_stats` RPC(`20260508_get_admin_dashboard_stats.sql`), `get_users`는 DB-level 필터+`range`, `bulk_*_action`은 IN 쿼리 batching.
- **§8.3 캐시 무효화**: `create/update/delete_report` 끝에 `nearby_cache.clear()`/`bounds_cache.clear()` 호출 (`report_service.py:198-199`).
- **§8.4 Admin location 파싱**: `routes_reports.py`에서 `parse_location()` 재사용.
- **§8.5 Router exception 통일**: 모든 핸들러 `except HTTPException: raise; except Exception` 패턴.
- **§8.6–§8.8**: 이모지 0건, bare `except:` 0건, naive `datetime.now().isoformat` 0건, `datetime.utcnow()` 0건.
- **§8.9 테스트 분할 완료**: split service 4개에 맞춘 파일 분리 완료. `test_admin_dashboard_service.py`, `test_admin_user_service.py`, `test_admin_report_service.py`, `test_admin_log_service.py`. 분기 커버리지 목표 달성 (전체 75%, 각 파일 70%+). [Done]
- **§8.10 Pydantic V2 마이그레이션 완료**: `class Config:` 전량 제거 및 `model_config = ConfigDict(from_attributes=True)` 교체 완료. [Done]

---

## 9. Quality Gate (최종 확인)

```bash
cd backend
.venv/Scripts/python -m pytest -q
# 전체 46건 Pass 확인 (2026-05-08)
.venv/Scripts/python -m pytest --cov=app/services/admin --cov-report=term-missing
# admin services coverage: 75% (dashboard: 71%, user: 71%, report: 76%, log: 100%)
grep -rn "class Config:" app/schemas app/api/admin --include="*.py"  # 0건 확인
```
