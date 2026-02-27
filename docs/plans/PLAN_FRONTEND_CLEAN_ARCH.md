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
  1. [ ] Define Domain (Entities: `User`, UseCases: `getSessionUseCase`).
  2. [ ] Define Data (Repository: Supabase Auth interactions).
  3. [ ] Define Presentation (Hooks: `useAuthViewModel` calling usecases ONLY, no router/toast inside viewmodel logic).
- **Quality Gate**:
  - [ ] `tsc --noEmit` and `npm run build` succeeds cleanly.
  - [ ] Manual test: User login/logout flow functional.

### Phase 3: Refactor Profile & Admin (`profile`, `admin`)
**Goal**: Migrate user profile and admin management to Clean Architecture slices.
- **Tasks**:
  1. [ ] Define Domain & Data for Profile & Admin.
  2. [ ] Define local `profile` store if necessary (no leaking into shared).
  3. [ ] Migrate presentation components.
- **Quality Gate**:
  - [ ] `tsc --noEmit` and `npm run build` succeeds cleanly.

### Phase 4: Refactor Map Features (`map`)
**Goal**: Isolate map interaction. Kakao Maps MUST NOT leak into Presentation.
- **Tasks**:
  1. [ ] Define Domain (`MapBounds`, `Location` types).
  2. [ ] Define Data (`KakaoMapRepository` mapping raw kakao data to Domain).
  3. [ ] Define Presentation (`MapComponent` utilizing the pure Domain types).
- **Quality Gate**:
  - [ ] `tsc --noEmit` succeeds. Presentation files have ZERO `kakao` type imports.
  - [ ] Manual test: Map renders and centers correctly on load.

### Phase 5-1: Reports (Fetch & Render)
**Goal**: Migrate report listing and fetching.
- **Tasks**:
  1. [ ] Define `Report` entity.
  2. [ ] Define `GetReportsUseCase` and `ReportRepository` to fetch from Supabase.
  3. [ ] Implement `ReportList` and `ReportCard` for rendering.
- **Quality Gate**:
  - [ ] `npm run build` succeeds. Reports render properly on map.

### Phase 5-2: Reports (Vote & Comment)
**Goal**: Migrate interaction logic (likes, comments).
- **Tasks**:
  1. [ ] Add `Comment`, `Vote` entities, and relevant UseCases.
  2. [ ] Update Repository with insert/update methods.
  3. [ ] Implement `VoteButton` and `Comments` presentation.
- **Quality Gate**:
  - [ ] `npm run build` succeeds. Users can vote/comment successfully.

### Phase 5-3: Reports (Create & Mutate)
**Goal**: Migrate heavy creation forms, image uploads, and post modifications.
- **Tasks**:
  1. [ ] Add `CreateReportUseCase` and `UploadImageUseCase`.
  2. [ ] Migrate Create/Edit Modals.
- **Quality Gate**:
  - [ ] `tsc --noEmit` and `npm run build` succeeds.
  - [ ] Complete E2E flow testing: Post creation with image works correctly.

---
**Progress Tracking**:
- [x] Phase 0.5 Started | [x] Phase 0.5 Completed
- [x] Phase 1 Started | [x] Phase 1 Completed
- [ ] Phase 2 Started | [ ] Phase 2 Completed
- [ ] Phase 3 Started | [ ] Phase 3 Completed
- [ ] Phase 4 Started | [ ] Phase 4 Completed
- [ ] Phase 5-1 Started | [ ] Phase 5-1 Completed
- [ ] Phase 5-2 Started | [ ] Phase 5-2 Completed
- [ ] Phase 5-3 Started | [ ] Phase 5-3 Completed
