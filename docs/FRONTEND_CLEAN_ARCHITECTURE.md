# Frontend Clean Architecture Guide (Dongne Sokdak)

This document outlines the Clean Architecture structure for the Dongne Sokdak frontend. Moving towards this architecture ensures separation of concerns, higher testability, and modularity.

## Core Layers & Strict Dependency Rules

The frontend will be divided into specific functional layers. 
**CRITICAL RULE: Inner layers MUST NOT depend on outer layers.**
The exact dependency direction: `app/` → `features/` → `shared/`

### 1. Domain Layer (`src/domain/`)
The innermost layer. It contains the core business rules and types. It has **no dependencies** on React, Next.js, or external IO (Supabase).
- **Entities**: TypeScript interfaces/types defining the core data models (e.g., `Report`, `User`, `Comment`).
- **Use Cases**: Pure logic handling. Asynchronous operations are allowed but they MUST NOT execute side-effects directly (no `router.push`, no `toast`). They only orchestrate entities and data.
- **Dependency Rule**: `Domain ↛ Presentation`, `Domain ↛ Data`

### 2. Data Layer (`src/data/`)
Responsible for data retrieval and manipulation, handling all external IO.
- **Repositories**: Classes or object wrappers implementing data operations. They format API/DB responses into Domain Entities.
- **Data Sources**: Supabase clients, `fetch` calls, Kakao Maps API.
- **Dependency Rule**: `Data ↛ Presentation`

### 3. Presentation Layer (`src/presentation/` & `src/app/`)
The outermost layer handling UI and state.
- **Hooks / ViewModels (`useXXXViewModel`)**: strictly calls **UseCases**. It MUST NOT directly call Supabase or contain raw API logic.
- **UI Components**: Simple React components that render UI and bind events to the ViewModel.
- **Pages (`src/app/`)**: Next.js App Router pages that compose components and inject Use Cases.

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
**Kakao Maps API is strictly a DATA layer implementation.**
- **Domain**: Knows only about generic `MapBounds` and `Location`.
- **Data**: `KakaoMapRepository` interacts with `window.kakao`.
- **Presentation**: Renders the map UI. It **MUST NOT** directly manipulate `kakao.maps` objects. If presentation touches `kakao`, the domain is polluted.

---

## Feature-by-Feature Mapping

### 1. Features: Authentication (`auth`)
- **Domain**: Entity: `User`, `Session` | Use Cases: `LoginUseCase`, `LogoutUseCase`
- **Data**: Repository: `AuthRepository` (Supabase Auth API)
- **Presentation**: Components: `LoginButton` | Hooks: `useAuthViewModel`

### 2. Features: Reports / Board (`reports`)
- **Domain**: Entity: `Report`, `Comment`, `Vote` | Use Cases: `GetReportsByMapBoundsUseCase`, `CreateReportUseCase`, `AddCommentUseCase`
- **Data**: Repository: `ReportRepository` (Supabase `reports`, `comments`)
- **Presentation**: Components: `ReportCard`, `ReportModal` | Hooks: `useReportsViewModel`

### 3. Features: Maps & Location (`map`)
- **Domain**: Entity: `Location`, `MapBounds` | Use Cases: `SearchLocationUseCase`, `ReverseGeocodeUseCase`
- **Data**: Repository: `KakaoMapRepository` (Kakao Maps API)
- **Presentation**: Components: `MapComponent` | Hooks: `useMapControllerViewModel`

### 4. Features: User Profile (`profile`)
- **Domain**: Entity: `Profile` | Use Cases: `UpdateProfileUseCase`, `SetMyNeighborhoodUseCase`
- **Data**: Repository: `ProfileRepository` (Supabase `profiles`)
- **Presentation**: Components: `Avatar`, `ProfileEditModal` | Hooks: `useProfileViewModel`

### 5. Features: Admin (`admin`)
- **Domain**: Entity: `ReportedContent` | Use Cases: `FetchAdminStatsUseCase`, `ResolveReportedContentUseCase`
- **Data**: Repository: `AdminRepository`
- **Presentation**: Components: `AdminSidebar`, `ReportManagementTable` | Hooks: `useAdminViewModel`
