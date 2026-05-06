# PLAN — Frontend Refactoring & Performance

> **CRITICAL INSTRUCTIONS**: After completing each phase:
> 1. ✅ Check off completed task checkboxes
> 2. 🧪 Run all quality gate validation commands below the phase
> 3. ⚠️ Verify ALL quality gate items pass
> 4. 📅 Update "Last Updated" date
> 5. 📝 Document learnings in Notes section
> 6. ➡️ Only then proceed to next phase
>
> ⛔ DO NOT skip quality gates or proceed with failing checks

- **Created**: 2026-05-06
- **Last Updated**: 2026-05-06
- **Owner**: sungheeyoon
- **Scope**: Medium (3 phases, 8–11h)
- **Companion**: `PLAN_backend_refactor_perf.md`

---

## 1. Overview

`reports` 피처는 Clean Architecture(`domain → data → presentation`)로 마이그레이션되었으나 **레거시 잔재가 공존**하고 있다.

- 사용처가 0인 hooks/UI 모듈이 빌드 산출물에 포함되어 번들 크기를 늘림
- Admin 페이지는 절반(메인)이 ViewModel을 쓰고 절반(users/settings/reports)이 레거시 `useAdmin`/`useReportManagement` 를 씀 — 이중 구현
- 데이터 레이어가 두 갈래(`lib/api/*` ↔ `features/*/data/*`)로 흩어져 신규 기능 추가 시 어느 쪽에 두어야 할지 혼란
- `MapComponent.tsx` 603줄, `console.log` 132개, 운영 경로에 `DebugClusterer` 래퍼가 들어 있음

**목표**
1. Dead code / 디버그 코드 제거 → 번들 축소·운영 노이즈 제거
2. 레거시 → Clean Architecture 단일화 → 신규 기능 위치 모호성 해소
3. `MapComponent` 책임 분해 → 유지보수성 + 마운트 비용 절감
4. 테스트 인프라(Vitest + RTL) 도입 → 회귀 방지

**비목표**
- 시각적 디자인 변경 없음 (UI 동작 동일)
- 백엔드 변경은 `PLAN_backend_refactor_perf.md` 에서 다룸

---

## 2. Context Map

### 제거/이동 대상
| 파일 | 라인 | 상태 | 처리 |
|---|---|---|---|
| `frontend/src/hooks/useReports.ts` | 124 | import 0 | 삭제 |
| `frontend/src/hooks/useNeighborhoodReports.ts` | 47 | import 0 | 삭제 |
| `frontend/src/hooks/useNeighborhoodFilter.ts` | 242 | import 0 | 삭제 |
| `frontend/src/shared/ui/AppHeader.tsx` | 526 | re-export만 | 삭제 |
| `frontend/src/shared/ui/Navbar.tsx` | 243 | 미사용 | 삭제 |
| `frontend/src/shared/ui/HeroSection.tsx` | 143 | re-export만 | 삭제 |
| `frontend/src/shared/ui/demo/UIShowcase.tsx` | 508 | `/components` 데모 라우트 전용 | dev 가드 또는 삭제 |
| `frontend/src/shared/ui/demo/OriginalAuthModal.tsx` | 204 | 동상 | 동일 |
| `frontend/src/shared/ui/demo/DemoData.ts` | — | 동상 | 동일 |
| `frontend/src/components/ImageUploadDebug.tsx` | — | 디버그 | 삭제 |
| `frontend/src/components/debug/MapDebugPanel.tsx` | — | 디버그 | 삭제 |
| `frontend/src/lib/utils/environmentTest.ts` | — | dev 헬퍼 | dev 가드 |
| `frontend/src/components/MapComponent.tsx:68-75` | — | `DebugClusterer` | 인라인 제거 → `MarkerClusterer` 직접 사용 |

### 수정 대상
| 파일 | 변경 |
|---|---|
| `frontend/src/hooks/useAdmin.ts` (270L) | `features/admin/presentation/hooks/useAdminViewModel.ts` 로 흡수 후 삭제 |
| `frontend/src/hooks/useReportManagement.ts` (278L) | `features/admin/presentation/hooks/useReportManagementViewModel.ts` 로 이전 |
| `frontend/src/app/admin/users/page.tsx` | `useAdmin` → `useAdminViewModel` |
| `frontend/src/app/admin/settings/page.tsx` | 동상 |
| `frontend/src/app/admin/reports/page.tsx` | 동상 |
| `frontend/src/components/admin/ReportDetailModal.tsx` | `useReportManagement` import 경로 갱신 |
| `frontend/src/components/admin/ReportManagement.tsx` | 동상 |
| `frontend/src/lib/api/reports.ts` (249L) | `features/reports/data/apiReportRepository.ts` 내부로 흡수 |
| `frontend/src/lib/api/comments.ts` | `features/reports/data/apiCommentRepository.ts` 로 흡수 |
| `frontend/src/lib/api/votes.ts` | `features/reports/data/apiVoteRepository.ts` 로 흡수 |
| `frontend/src/app/reports/[id]/page.tsx` | `lib/api/reports` → repository 경유 ViewModel 사용 |
| `frontend/src/app/my-reports/page.tsx` | 동상 |
| `frontend/src/components/MapComponent.tsx` (603L) | 3-4 모듈로 분해 (Phase 3) |

### 현재 의존도

```mermaid
flowchart LR
    Pages[app/*/page.tsx] -->|legacy| LibApi[lib/api/*]
    Pages -->|legacy| Hooks[hooks/use*]
    Pages -->|new| VM[features/*/presentation/hooks]
    VM --> Data[features/*/data]
    Data --> LibApi
    LibApi --> Backend[(API)]
    Hooks --> LibApi

    style LibApi fill:#fdd
    style Hooks fill:#fdd
```

### 목표 의존도 (Phase 2 완료 후)

```mermaid
flowchart LR
    Pages[app/*/page.tsx] --> VM[features/*/presentation/hooks]
    VM --> UC[features/*/domain/usecases]
    UC --> Repo[features/*/data/*Repository]
    Repo --> Backend[(API)]
```

---

## 3. Architecture Decisions

| 결정 | 근거 |
|---|---|
| `lib/api/*` 의 fetch 함수를 repository 내부로 흡수 | 데이터 접근 경로를 1개로 단일화. 외부 import 면이 좁아져 변경 영향 분석이 쉬워짐. |
| Admin도 `features/admin` 슬라이스로 통합 | 메인 어드민 페이지가 이미 `useAdminViewModel` 사용 중. 일관성. |
| `MapComponent`는 3 파일로만 분해 (과분할 금지) | 600줄 단일 파일 → `MapComponent`(루트), `useKakaoMapBounds`(훅), `MapMarkerLayer`(클러스터+마커) |
| Vitest 채택 (Jest 아님) | Next.js 16 / Vite-style ESM 친화. RTL과 호환. |
| 데모 페이지 `/components` 는 환경 변수 가드 후 유지 | 디자인 시스템 카탈로그로 가치 있음. `NEXT_PUBLIC_ENABLE_DEMO_ROUTES === 'true'` 일 때만 라우트 등록. |

---

## 4. Phase Breakdown

### Phase 1 — Dead Code 제거 + 테스트 인프라 도입 (2-3h)

**Goal**: 미사용 모듈 일괄 제거, 운영 디버그 코드 격리, Vitest+RTL 셋업

**Context Map**: 위 "제거 대상" 표 + `frontend/package.json`, `frontend/vitest.config.ts`(신규)

**Test Strategy**
- Vitest + @testing-library/react + jsdom 환경 셋업
- 첫 테스트로 `formatToAdministrativeAddress`, `isValidReportCoordinate` 등 lib/utils 순수 함수에 대한 단위 테스트 3-5개 (smoke)
- Coverage target: 이번 phase 자체는 5% 미만이어도 OK (인프라 도입이 목적)

**Tasks**
- [ ] **RED**: `frontend/__tests__/lib/utils/addressUtils.test.ts` 작성 (실패 확인)
- [ ] **GREEN**: Vitest 설정 (`vitest.config.ts`, `tsconfig` paths 인식, jsdom)
- [ ] **GREEN**: `package.json` 에 `"test": "vitest"`, `"test:coverage": "vitest --coverage"` 추가
- [ ] **GREEN**: 실행 → 테스트 그린
- [ ] **REFACTOR**: 위 표의 미사용 파일 7개 일괄 삭제
- [ ] **REFACTOR**: `shared/ui/index.ts` 에서 삭제된 컴포넌트 export 제거
- [ ] **REFACTOR**: `MapComponent.tsx:68-75` `DebugClusterer` 제거 → `MarkerClusterer` 직접 사용 (`:571` `:596`)
- [ ] **REFACTOR**: `console.log` 일괄 정리. `process.env.NODE_ENV === 'development'` 가드를 적용하거나 `debug` 모듈 도입. 132건 → 0건 (production)
- [ ] **REFACTOR**: `app/components/page.tsx` 를 `process.env.NEXT_PUBLIC_ENABLE_DEMO_ROUTES` 로 가드. 미가드 시 `notFound()`

**Quality Gate**
```bash
cd frontend
npm run lint
npm run tsc:check
npm run build
npm run test
# Production console.log 카운트 확인
node -e "const fs=require('fs');const path=require('path');function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())w(p);else if(/\.(ts|tsx)$/.test(p)){const c=fs.readFileSync(p,'utf8');const lines=c.split('\n');lines.forEach((l,i)=>{if(/^\s*console\.log/.test(l)&&!/NODE_ENV/.test(l))console.log(p+':'+(i+1)+': '+l.trim())})}}}w('src')" | wc -l
# 0이어야 통과
```

**Rollback**
- 단일 커밋으로 묶고, 회귀 발생 시 `git revert <hash>`. 모든 삭제 파일이 `git log` 에 남아 있어야 함.

---

### Phase 2 — 레거시 hooks/lib API → Clean Architecture 흡수 (4-5h)

**Goal**: `hooks/use*` 와 `lib/api/*` 를 `features/*/(data|presentation)` 로 단일화

**Context Map**: 위 "수정 대상" 표

**Test Strategy**
- ViewModel hook 단위 테스트: `useAdminViewModel`, `useReportManagementViewModel`, `useReportsViewModel`
- Mocking: repository 인터페이스를 `vi.fn()` 으로 mock — 백엔드 의존 X
- Coverage target: 신규/수정 ViewModel hooks 80%

**Sub-Phase 2A — Admin 통합**
- [ ] **RED**: `__tests__/features/admin/useAdminViewModel.test.ts` — admin info / users / activities 시나리오 (실패)
- [ ] **GREEN**: `useAdmin.ts` 의 로직을 `features/admin/presentation/hooks/useAdminViewModel.ts` 로 이전 (이미 존재 시 보강)
- [ ] **GREEN**: `useReportManagement.ts` 를 `features/admin/presentation/hooks/useReportManagementViewModel.ts` 로 이전
- [ ] **GREEN**: 페이지 3개 (`admin/users`, `admin/settings`, `admin/reports`) import 경로 갱신
- [ ] **GREEN**: `components/admin/{ReportDetailModal,ReportManagement}.tsx` import 갱신
- [ ] **GREEN**: 어드민 라우트 4개 수동 검증 (목록, 상세, 상태변경)
- [ ] **REFACTOR**: 빈 `frontend/src/hooks/useAdmin.ts`, `useReportManagement.ts` 삭제

**Sub-Phase 2B — Reports 데이터 레이어 흡수**
- [ ] **RED**: `__tests__/features/reports/apiReportRepository.test.ts` — list / bounds / nearby / get / create / delete 케이스 (fetch mock)
- [ ] **GREEN**: `lib/api/reports.ts` 의 함수 로직을 `features/reports/data/apiReportRepository.ts` 안 메서드로 이전. snake_case→camelCase 변환은 repository 진입점에서 처리.
- [ ] **GREEN**: `lib/api/comments.ts`, `lib/api/votes.ts` 를 동일 패턴으로 흡수
- [ ] **GREEN**: `app/reports/[id]/page.tsx`, `app/my-reports/page.tsx` 를 ViewModel hook 경유로 변경 (`useReportDetailViewModel`, `useMyReportsViewModel` 신규 또는 기존 활용)
- [ ] **GREEN**: `apiVoteRepository.ts:7`, `apiCommentRepository.ts:8`, `apiReportRepository.ts:3` 의 `@/lib/api/*` import 제거
- [ ] **REFACTOR**: 빈 `lib/api/{reports,comments,votes}.ts` 삭제. `lib/api/config.ts` 만 유지 (모든 repository가 공유).

**Quality Gate**
```bash
cd frontend
npm run lint
npm run tsc:check
npm run build
npm run test -- --coverage --run
# 신규 ViewModel coverage ≥80% 확인
# 수동 검증 체크리스트:
#   - / 메인 (지도 + 리스트)
#   - /reports/[id] (상세)
#   - /my-reports (내 제보)
#   - /admin (대시보드)
#   - /admin/users, /admin/reports, /admin/settings
# grep으로 잔재 확인
grep -rn "from '@/lib/api/(reports|comments|votes)'" src && echo FAIL || echo OK
grep -rn "from '@/hooks/(useReports|useReportManagement|useAdmin|useNeighborhood)" src && echo FAIL || echo OK
```

**Rollback**
- Admin / Reports 두 sub-phase를 분리 커밋
- 어드민 회귀 시 2A 만 revert, 메인 회귀 시 2B 만 revert

---

### Phase 3 — MapComponent 분해 + 번들/렌더 최적화 (2-3h)

**Goal**: `MapComponent.tsx` 603줄 → 3 모듈, 마커 레이어 메모이제이션, 번들 분석

**Context Map**
- `frontend/src/components/MapComponent.tsx` (603L) → 분해
- 신규 `frontend/src/features/map/presentation/components/{MapView.tsx, MapMarkerLayer.tsx}` + `frontend/src/features/map/presentation/hooks/useKakaoMapBounds.ts`
- `frontend/src/components/MemoizedMapMarker.tsx` (유지, 검토)

**Test Strategy**
- `useKakaoMapBounds` hook 테스트: bounds 변경 디바운스 / 정규화(`toFixed`) 동작
- `MapMarkerLayer` 통합: 100개 reports → 화면 밖 culling 동작 확인
- Coverage target: hooks 80%, components는 통합으로 대체

**Tasks**
- [ ] **RED**: `__tests__/features/map/useKakaoMapBounds.test.ts` — debounce, normalize, dragEnd 즉시 갱신
- [ ] **GREEN**: `useKakaoMapBounds(map, onBoundsChange, precisionByZoom)` hook 추출 (현 `MapComponent` 의 dispatchBoundsUpdate / handleMapBoundsChange / handleDragEnd / handleZoomChange)
- [ ] **GREEN**: `MapMarkerLayer` 컴포넌트 추출 — viewport culling + cluster 책임
- [ ] **GREEN**: 루트 `MapComponent.tsx` 는 카카오맵 로딩 / 컨테이너만 담당하도록 슬림화
- [ ] **REFACTOR**: `next.config.ts` `experimental.optimizePackageImports` 에 `react-kakao-maps-sdk` 추가 가능 여부 확인 (트리쉐이킹)
- [ ] **REFACTOR**: `app/page.tsx` 의 `dynamic(() => import('@/components/MapComponent'))` 경로 갱신
- [ ] **REFACTOR**: 번들 분석 (`@next/bundle-analyzer`) 일회성 실행 → before/after 비교 표 작성

**Quality Gate**
```bash
cd frontend
npm run lint
npm run tsc:check
npm run build
npm run test -- --run

# 번들 사이즈 비교
ANALYZE=true npm run build
# .next/analyze/client.html 의 main 청크 크기를 Phase 1 baseline 과 비교
# 회귀 ≤ +0%, 목표: -10% 이상

# 수동 검증
# - 지도 줌 in/out (1↔10) 시 클러스터 정상
# - 100+ 마커 영역 진입 시 프레임드롭 없음 (Performance 패널 60fps 근접)
# - 마커 클릭 → 상세 카드 표시 정상
```

**Rollback**
- 단일 커밋. 회귀 시 `git revert`. 카카오 SDK 동작이 미세하게 다를 수 있으므로 staging 에서 30분 이상 운영 검증 후 main merge.

---

## 5. Risk Assessment

| 위험 | 확률 | 영향 | 완화 |
|---|---|---|---|
| 레거시 hooks 삭제 시 미발견 import 경로 (예: 동적 import) | M | M | `tsc:check` + `next build` + grep 3중 검증 |
| `lib/api/*` 흡수 후 snake_case→camelCase 변환 누락 → 빈 데이터 | M | H | repository 단위 테스트로 응답 매핑 강제 검증 |
| MapComponent 분해 시 카카오 SDK lifecycle 변동 → 클러스터 깨짐 | M | H | `DebugClusterer` 의 console 로깅을 분해 직전 임시 복원하여 mount/unmount 추적 |
| Vitest jsdom 에서 카카오 SDK mock 부재 | H | L | 카카오 SDK 의존 hooks 는 Phase 3 까지는 통합 테스트로 우회. 단위 테스트는 순수 함수 위주. |
| 데모 라우트 가드 누락으로 운영 빌드에 노출 | L | L | Phase 1 quality gate 의 build artifact 검사로 catch |

---

## 6. Rollback Strategy

각 phase 단일 PR. 마이너 단위 sub-phase 도 별도 커밋. 회귀는 `git revert <commit>` 로 단일 명령 복구.

| Phase | 커밋 단위 | 복구 명령 |
|---|---|---|
| 1 | 1 PR | `git revert HEAD` |
| 2A | 1 commit | `git revert <2A-hash>` |
| 2B | 1 commit | `git revert <2B-hash>` |
| 3 | 1 PR | `git revert HEAD` |

---

## 7. Progress Tracking

- [ ] Phase 1 — Dead code + 테스트 인프라
  - [ ] Quality gate 통과
  - [ ] PR merged
- [ ] Phase 2A — Admin 통합
  - [ ] Quality gate 통과
- [ ] Phase 2B — Reports 데이터 레이어 흡수
  - [ ] Quality gate 통과
- [ ] Phase 3 — MapComponent 분해 + 번들 최적화
  - [ ] Quality gate 통과
  - [ ] 번들 사이즈 before/after 표 첨부

---

## 8. Notes & Learnings

> 각 phase 완료 시 아래에 5줄 이내로 학습/이슈 기록

- (Phase 1) —
- (Phase 2A) —
- (Phase 2B) —
- (Phase 3) —
