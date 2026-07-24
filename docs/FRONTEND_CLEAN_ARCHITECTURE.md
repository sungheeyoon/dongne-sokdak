# Frontend Clean Architecture Guide (Dongne Sokdak)

_Last verified: 2026-07-24_

This document outlines the Clean Architecture structure for the Dongne Sokdak frontend. Moving towards this architecture ensures separation of concerns, higher testability, and modularity.

## Core Layers & Strict Dependency Rules

The frontend is sliced **by feature**, with each feature owning its own three layers. Domain owns entities, use cases, and repository ports. Data implements those ports, while presentation acts as the composition boundary that wires a concrete data implementation to a use case.

**CRITICAL RULE: Inner layers MUST NOT depend on outer layers.**

```text
presentation/composition ──→ domain
          │
          └───────────────→ data ──→ domain ports

domain ──X──→ data/presentation
data   ──X──→ presentation
```

Each feature lives at `src/features/<slice>/` (e.g. `admin`, `auth`, `map`, `profile`, `reports`) with the structure:

```
src/features/<slice>/
├── domain/         # entities.ts, usecases.ts
├── data/           # api*Repository.ts (or kakaoMapRepository.ts)
└── presentation/
    ├── components/
    └── hooks/      # use<Name>ViewModel.ts
```

### 1. Domain Layer (`src/features/<slice>/domain/`)
The innermost layer. It contains the core business rules and types. It has **no dependencies** on React, Next.js, or external IO (Supabase).
- **Entities**: TypeScript interfaces/types defining the core data models (e.g., `Report`, `User`, `Comment`).
- **Use Cases**: Pure logic handling. Asynchronous operations are allowed but they MUST NOT execute side-effects directly (no `router.push`, no `toast`). They only orchestrate entities and data.
- **Dependency Rule**: `Domain ↛ Presentation`, `Domain ↛ Data`

### 2. Data Layer (`src/features/<slice>/data/`)
Responsible for data retrieval and manipulation, handling all external IO.
- **Repositories**: Classes or object wrappers implementing data operations. They format API/DB responses into Domain Entities — `snake_case → camelCase` conversion happens at the repository entry point.
- **Data Sources**: Supabase clients, `fetch` calls, Kakao Maps API.
- **Dependency Rule**: `Data → Domain`, `Data ↛ Presentation`. Feature-specific requests belong in repositories. Repositories may reuse the transport helpers in `src/lib/api/config.ts`; that shared module must not grow feature/domain behavior.

### 3. Presentation Layer (`src/features/<slice>/presentation/` & `src/app/`)
The outermost layer handling UI and state.
- **Hooks / ViewModels (`useXXXViewModel`)**: call use cases and wire concrete repositories at the outer composition boundary. They MUST NOT directly call Supabase or contain raw API logic.
- **UI Components**: Simple React components that render UI and bind events to the ViewModel.
- **Pages (`src/app/`)**: Next.js App Router pages that compose components and call ViewModels. Pages MUST NOT import from `lib/api/*` or use repository/use case directly.

---

## Technical Guidelines ⚠️ WARNINGS & PREVENTIONS

### 1. ViewModel Purity
- **DO NOT** use Supabase clients directly in a `useXXXViewModel`.
- **DO NOT** mix Application Service (routing/toasts) with Domain Logic inside the ViewModel. 
- Use Cases return domain results, and the Component or an orchestrator Hook decides when to `toast` or `router.push`.

### 2. Global State (Zustand) Structure
Store structure is critical. DO NOT mix domain data globally.
- **Feature Stores (`features/*/store.ts`)**: Used strictly for state specific to one feature (e.g., `features/auth/store.ts`).
- **Shared UI Stores (`shared/stores/`)**: Used ONLY for generic UI states (e.g., modals, toasts, dialogs).
- **DO NOT**: Let a shared store import feature-specific domain types. 
- **DO NOT**: Let a feature store import Use Cases from outside its feature.

### 3. Map Technology Inversion
**Imperative Kakao Maps API access is a DATA-layer adapter concern.**
- **Domain**: Knows only about generic `MapBounds` and `Location`.
- **Data**: `KakaoMapAdapter` and `KakaoLocationRepository` encapsulate `window.kakao`, event registration, bounds reads, geocoding, and imperative map commands.
- **Presentation**: May render the declarative `react-kakao-maps-sdk` components (`Map`, `MapMarker`, `MarkerClusterer`, `CustomOverlayMap`) but MUST NOT call `window.kakao` directly. See ADR-0003.

---

## Feature-by-Feature Mapping

### 1. Features: Authentication (`auth`)
- **Domain**: `User`, `Session`, `AuthRepository`, `AuthUseCases`
- **Data**: `supabaseAuthRepository`
- **Presentation**: `LoginForm`, `SignupForm`, `AuthDialog`, `useAuthViewModel`

### 2. Features: Reports / Board (`reports`)
- **Domain**: `Report`, `Comment`, repository ports, `ReportUseCases`, `CommentUseCases`, `VoteUseCases`
- **Data**: `ApiReportRepository`, `ApiCommentRepository`, `ApiVoteRepository`, `ApiImageRepository` (FastAPI boundary)
- **Presentation**: Components: `ReportCard`, `ReportModal` | Hooks: `useMapReportsViewModel`, `useListReportsViewModel`, `useCommentsViewModel`, `useVotesViewModel`

### 3. Features: Maps & Location (`map`)
- **Domain**: `Coordinates`, `Location`, `LocationRepository`, `LocationUseCases`
- **Data**: `KakaoLocationRepository`, `KakaoMapAdapter` (Kakao Maps API)
- **Presentation**: Components: `MapComponent`, `MapMarkerLayer` | Hooks: `useMapControllerViewModel`, `useKakaoMapBounds`

### 4. Features: User Profile (`profile`)
- **Domain**: `Profile`, `ProfileRepository`, `ProfileUseCases`
- **Data**: `apiProfileRepository`
- **Presentation**: `useProfileViewModel` and profile UI components

### 5. Features: Admin (`admin`)
- **Domain**: admin entities, `AdminRepository`, `AdminUseCases`
- **Data**: `apiAdminRepository`
- **Presentation**: admin components, `useAdminViewModel`, `useReportManagementViewModel`

---

## Testing

- Tests live at `frontend/__tests__/` mirroring the `src/` tree (e.g. `__tests__/features/admin/useAdminViewModel.test.tsx`).
- Stack: **Vitest + @testing-library/react + jsdom**. ViewModels mock the repository interface with `vi.fn()`; repositories mock `fetch`.
- `npm run test:coverage -- --run` produces a coverage report for inspection. CI currently gates lint, typecheck, and the full test suite; it does not enforce a numeric coverage threshold.
- Bundle size is tracked via `@next/bundle-analyzer`: `ANALYZE=true npm run build -- --webpack` produces `.next/analyze/*.html`.
