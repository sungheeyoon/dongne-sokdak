**CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ DO NOT skip quality gates or proceed with failing checks

# Feature Plan: Frontend Clean Architecture Restructuring
**Status**: Planning Phase
**Scope**: Large (15-25 hours)

## Overview & Objectives
Transition the existing Next.js frontend to a Feature-Sliced Clean Architecture. This will separate Domain logic, Data fetching, and UI components into distinct, isolated modules grouped by feature (`auth`, `reports`, `map`, `profile`, `admin`). Strict boundaries will be enforced.

## Risk Assessment
| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|----------------------|
| Domain/Presentation blur | High | High | Enforce ViewModel purity (hooks only call usecases, no Supabase APIs). Use `tsc` and lint checks. |
| Global State bleed | High | High | Strict store segregation: Shared stores for UI, Feature stores for specific feature data only. |
| Map Layer leaking | High | High | Isolate Kakao API strictly within Data Layer (`KakaoMapRepository`). Domain uses generic `Location`. |

## Rollback Strategy
If a phase breaks the application critically, `git reset --hard` to the commit before the phase began. 

---

## Phases

### Phase 0.5: Enforce Import Rules & Architectural Baseline
**Goal**: Implement strict boundaries before writing logic to prevent architecture decay over the phases.
- **Tasks**:
  - [x] Update ESLint or `tsconfig.json` mappings to enforce import flow (`app` -> `features` -> `shared`).
  - [x] Add `.eslintrc` or script boundary rule to fail build if `Data` or `Presentation` imports into `Domain`.
  - [x] Add `tsc --noEmit` checks to build scripts.
- **Quality Gate**:
  - [x] `tsc --noEmit` succeeds.
  - [x] Cross-boundary import tests or linting verifies domain purity.

### Notes (Phase 0.5)
- What changed: 강력한 린트 룰(`eslint-plugin-import`)과 `@/shared`, `@/features` 패스 에일리어스 설정.
- What broke unexpectedly: `app/layout.tsx`에서 구형 UI 컴포넌트를 직접 참조하던 경로들이 `tsc:check`에서 일부 경고 발생.
- Rule that almost got violated: 임시 작성된 유틸 함수가 `features/*/domain`을 가져오려던 참조 역전 시도.
- What rule saved the structure: `no-restricted-imports` 설정 덕분에 도메인 오염 시도가 빌드 전에 즉각 차단됨.

### Phase 1: Shared Infrastructure & Types Setup
**Goal**: Create the `shared` module and move generic UI components (e.g. `UiButton`, `UiInput`) to prevent naming conflicts with standard HTML elements.
- **Tasks**:
  1. [ ] Create `src/shared/` folder structure (`ui`, `utils`, `lib`, `stores`).
  2.- [x] Rename base UI components to `Ui` prefix (e.g., `UiButton.tsx`).
- [x] Fix imports globally.
- [x] Create `.env.example`.
- [x] Set up global UI stores (Toast, Modals) strictly for UI state.
- **Quality Gate**:
  - [x] `tsc --noEmit` and `npm run build` succeeds cleanly.

### Notes (Phase 1)
- What changed: 모든 기본 UI 컴포넌트를 `src/shared/ui/`로 이동 후 `Ui` 접두사 부착 (`Button` -> `UiButton`). 전역 상태 스토어를 `src/shared/stores/` 로 분리.
- What broke unexpectedly: UI 컴포넌트 내부에서 서로 얽혀있던 상대경로 import(`../button` 등) 와 외부에서 default export, named export를 섞어쓰던 코드들에서 다수의 TS 에러 발생.
- Rule that almost got violated: 임시로 `any` 타입을 남용하려 했으나 `tsc --noEmit` 품질 게이트에서 막혀 올바른 타입 혹은 Store 연동으로 수정함.
- What rule saved the structure: 개별 컴포넌트 리팩토링 후 `tsc:check` 실행 규칙 덕분에 런타임 이전에 수십 개의 경로 깨짐을 일괄 해결할 수 있었음.

### Phase 2: Refactor Authentication (`auth`)
**Goal**: Isolate all authentication logic into `.features/auth/` slice enforcing pure ViewModels.
- **Tasks**:
  1. [x] Define Domain (Entities: `User`, UseCases: `getSessionUseCase`).
  2. [x] Define Data (Repository: Supabase Auth interactions).
  3. [x] Define Presentation (Hooks: `useAuthViewModel` calling usecases ONLY, no router/toast inside viewmodel logic).
- **Quality Gate**:
  - [x] `tsc --noEmit` and `npm run build` succeeds cleanly.
  - [x] Manual test: User login/logout flow functional.

### Notes (Phase 2)
- What changed: 기존 `src/components/auth`를 `src/features/auth/presentation/components`로 옮기고, `useUserStore`와 `lib/api/auth.ts`를 완전 분리.
- What broke unexpectedly: 소셜 로그인(`loginWithSocial`, `getToken`) 구현체가 누락되어 `callback/[provider]/page.tsx` 등 곳곳에서 타입 에러 발생.
- Rule that almost got violated: 뷰모델(`useAuthViewModel`) 내에서 Next.js `router`를 호출하여 리다이렉트하려 했으나, 순수 함수 규칙(사이드 이펙트 배제)을 따르기 위해 컴포넌트 레벨로 책임을 유지함.
- What rule saved the structure: `tsc:check` 덕분에 기존 `useAuth.ts`를 사용하던 10여 곳의 컴포넌트들을 정확히 식별하여 `useAuthViewModel`로 마이그레이션 및 파라미터 수정을 성공적으로 마칠 수 있었음.

### Phase 3: Refactor Profile & Admin (`profile`, `admin`)
**Goal**: Migrate user profile and admin management to Clean Architecture slices.
- **Tasks**:
  1. [x] Define Domain & Data for Profile & Admin.
  2. [x] Define local `profile` store if necessary (no leaking into shared).
  3. [x] Migrate presentation components.
- **Quality Gate**:
  - [x] `tsc --noEmit` and `npm run build` succeeds cleanly.

### Notes (Phase 3)
- What changed: Profile과 Admin 도메인의 Entity, UseCase, Repository를 구성하고 UI 컴포넌트(`apiProfileRepository.ts`, `useAdminViewModel.ts` 등)를 클린 아키텍처에 맞게 연결.
- What broke unexpectedly: Supabase Storage를 UI에서 직접 호출하던 레거시 로직이 발견되어 `apiProfileRepository` 내부로 격리 조작 필요했음.
- Rule that almost got violated: Admin UI 컴포넌트들이 `useState` 기반의 로직과 밀접하게 결합되어 있어, ViewModel을 통해 동일한 인터페이스를 노출시켜 UI 의존성을 유지하면서 도메인 계층만 교체함.
- What rule saved the structure: Presentation 계층과 Data 계층을 잇는 ViewModel의 Adapter 역할이 없었다면 UI 측 대공사가 발생했을 것임.

### Phase 4: Refactor Map Features (`map`)
**Goal**: Isolate map interaction. Kakao Maps MUST NOT leak into Presentation.
- **Tasks**:
  1. [x] Define Domain (`MapBounds`, `Location` types).
  2. [x] Define Data (`KakaoMapRepository` mapping raw kakao data to Domain).
  3. [x] Define Presentation (`MapComponent` utilizing the pure Domain types).
- **Quality Gate**:
  - [x] `tsc --noEmit` succeeds. Presentation files have ZERO `kakao` type imports.
  - [x] Manual test: Map renders and centers correctly on load.

### Notes (Phase 4)
- What changed: 카카오맵 API 연동 로직(Places, Geocoder)을 Data 계층(`kakaoLocationRepository`)으로 캡슐화하고, 컴포넌트(`LocationSearch`, `MapComponent`)가 `useLocationViewModel`을 통해 도메인 엔티티(`PlaceSearchResult`)를 다루도록 리팩토링함.
- What broke unexpectedly: 지도 검색결과를 나타내는 기존 `PlaceResult[]` 카카오 전용 타입을 여러 컴포넌트(`MyNeighborhoodModal`, `LocationResultList`) 깊숙히 사용하고 있어 타입 에러가 다수 발생함.
- Rule that almost got violated: 기존 `window.kakao.maps` 직접 참조 부분을 UI에서 걷어내는 과정에서 임의의 타입(`any`)로 우회할 뻔 하였으나 도메인 룰을 강제하여 `PlaceSearchResult`로 안전하게 맵핑함.
- What rule saved the structure: 지속적인 `tsc --noEmit` 타입체크로 인해 컴파일 단계에서 카카오 의존성이 남아있는 UI 컴포넌트들을 정확히 찾아내어 런타임 버그를 100% 차단함.

### Phase 5-1: Reports (Fetch & Render)
**Goal**: Migrate report listing and fetching.
- **Tasks**:
  1. [x] Define `Report` entity.
  2. [x] Define `GetReportsUseCase` and `ReportRepository` to fetch from Supabase.
  3. [x] Implement `ReportList` and `ReportCard` for rendering.
- **Quality Gate**:
  - [x] `npm run build` succeeds. Reports render properly on map.

### Notes (Phase 5-1)
- What changed: `src/features/reports`에 Domain 엔티티와 UseCase, Data 레이어의 `apiReportRepository.ts`를 정의하고 UI 컴포넌트(`ReportList`, `ReportCard`)와 API 호출(`useReportsViewModel`)을 연결함.
- What broke unexpectedly: 별도로 발생한 치명적인 에러는 없었으나, 기존 `useReports` 훅을 그대로 대체하면서 인터페이스 일관성을 유지하는 데 집중함.
- Rule that almost got violated: 임시 파일이나 옛날 `components/ReportCard.tsx`가 잔존할 위험이 있었으나 안전하게 Features 폴더로 이동 후 삭제함.
- What rule saved the structure: `tsc:check` 검증을 지속적으로 실행하여 잔존 레거시 경로들을 식별하고 해결할 수 있었음.

### Phase 5-2: Reports (Vote & Comment)
**Goal**: Migrate interaction logic (likes, comments).
- **Tasks**:
  1. [x] Add `Comment`, `Vote` entities, and relevant UseCases.
  2. [x] Update Repository with insert/update methods.
  3. [x] Implement `VoteButton` and `Comments` presentation.
- **Quality Gate**:
  - [x] `npm run build` succeeds. Users can vote/comment successfully.

### Notes (Phase 5-2)
- What changed: `Vote` 및 `Comment` 도메인 엔티티, 인터페이스, UseCase, `apiVoteRepository`, `apiCommentRepository`를 정의하고 `useVotesViewModel`, `useCommentsViewModel` 뷰모델을 생성해 `VoteButton`, `Comments` 컴포넌트를 features/reports 로 마이그레이션함.
- What broke unexpectedly: 삭제된 과거 의존성 경로를 수정하다가 잘못된 줄을 지워 발생하는 import 누락 문제가 page.tsx에서 발생했으나 tsc 검증으로 즉각 치유함.
- Rule that almost got violated: 기존의 직접 호출(`addVote`, `getCommentsByReportId` 등)을 그대로 유지할 뻔 했으나, ViewModel 계층을 활용하여 엄격히 UseCase로 교체함.
- What rule saved the structure: ViewModels(`useCommentsViewModel`, `useVotesViewModel`)가 리액트 쿼리 비동기 로직과 도메인 모델 호출을 캡슐화해줌으로써, UI 컴포넌트의 책임을 순수 렌더링 영역으로 축소시킴.

### Phase 5-3: Reports (Create & Mutate)
**Goal**: Migrate heavy creation forms, image uploads, and post modifications.
- **Tasks**:
  1. [x] Add `CreateReportUseCase` and `UploadImageUseCase`.
  2. [x] Migrate Create/Edit Modals.
- **Quality Gate**:
  - [x] `tsc --noEmit` and `npm run build` succeeds.
  - [x] `npm run build` succeeds. Image upload, object creation work smoothly.

### Notes (Phase 5-3)
- What changed: `apiReportRepository`에 mutate 메서드를 추가하고, `ImageRepository`와 `ImageUseCases`를 도입. Create/Edit에 특화된 `useMutateReportViewModel`, `useImageUploadViewModel`을 작성해 `ReportModal`, `EditReportModal`, `ImageUpload` 컴포넌트를 features/reports 로 마이그레이션.
- What broke unexpectedly: 삭제된 `getReportsInBounds` 메서드를 사용하던 `useReportsViewModel`에서 타입에러가 발생. `ReportsFilter`에 bound 속성을 병합하는 식으로 리팩토링하여 해결.
- Rule that almost got violated: 공용 `ImageUpload`를 `shared/`로 올릴 뻔했으나 현재는 리포트용이므로 `features/reports`에 통합.
- What rule saved the structure: Presentation 계층(모달)은 ViewModel 외부에 의존하지 않게 되면서 supabase api 등에 대한 의존성이 깔끔하게 분리됨.

### Phase 6: Map Marker Bounds Filtering Fix
**Goal**: Restore correct data fetching when map bounds change so that only visible markers are fetched.
- **Problem**: `useReportsViewModel` sends `north`, `south`, `east`, `west` parameters to `apiReportRepository.getReports`. However, `apiReportRepository.getReports` uses `getReports` instead of `getReportsInBounds` from `lib/api/reports.ts`. The backend `get_reports` API doesn't support bounding boxes (ignores the bounds parameters), resulting in all reports being loaded regardless of the map's current view.
- **Tasks**:
  1. [x] Update `ReportRepository` and `ReportUseCases` with an explicit `getReportsInBounds` method or modify `getReports` to smartly route to `getReportsInBounds` in `lib/api/reports.ts` if boundaries are present.
  2. [x] Update `apiReportRepository.ts` to implement this logic.
  3. [x] If using explicit method, update `useReportsViewModel.ts` to call `reportUseCases.getReportsInBounds(...)`.
- **Quality Gate**:
  - [x] Moving the map fetches new data, and markers outside the current view do not show up.

### Notes (Phase 6)
- What changed: `ReportRepository`, `ReportUseCases`, `apiReportRepository.ts`에 `getReportsInBounds` 메서드를 명시적으로 분리 추가하고 UI ViewModel 연동.
- What broke unexpectedly: 파일을 오가며 추가하는 과정에서 `ReportCategory` 타입 import 누락으로 빌드 에러가 발생했음.
- Rule that almost got violated: 단일 `getReports` 메서드 내에서 맵 바운드 여부를 if문으로 처리해 복잡도를 높일 뻔 했으나, 인터페이스 분리로 해결함.
- What rule saved the structure: `tsc --noEmit` 품질 게이트가 파이프라인 마무리를 든든히 지켜주어 무사히 수정함.

---
**Progress Tracking**:
- [x] Phase 0.5 Started | [x] Phase 0.5 Completed
- [x] Phase 1 Started | [x] Phase 1 Completed
- [x] Phase 2 Started | [x] Phase 2 Completed
- [x] Phase 3 Started | [x] Phase 3 Completed
- [x] Phase 4 Started | [x] Phase 4 Completed
- [x] Phase 5-1 Started | [x] Phase 5-1 Completed
- [x] Phase 5-2 Started | [x] Phase 5-2 Completed
- [x] Phase 5-3 Started | [x] Phase 5-3 Completed
- [x] Phase 6 Started | [x] Phase 6 Completed
