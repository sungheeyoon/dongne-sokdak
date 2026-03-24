# 📍 Frontend Map Bounds Optimization Plan (Senior Architecture Edition)

**CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ DO NOT skip quality gates or proceed with failing checks

## Overview and Objectives
**Goal**: Completely eliminate React Query instability and double-fetches caused by Kakao map interactions (panning, pinch zoom, inertia) while preserving highly responsive UX and establishing a clear Single Source of Truth for State.
**Key Improvements Incorporated**: 
- Fast, predictable snapshot key generation (No `JSON.stringify` overhead/ordering risks).
- Dynamic floating-point precision scaling based on zoom level.
- Hybrid fetch firing (`onDragEnd` instantaneous + `onBoundsChanged` debounced fallback).
- Unified initialization (No hacky `isFirstLoad` Mount flags; instead relying gracefully on actual map readiness).

## Risk Assessment
| Risk | Probability | Impact | Mitigation Strategy |
|---|---|---|---|
| Map not loading on first mount | Low | High | Treat initial load identically to normal bounds change. Ensure execution only proceeds `if (map)` and `if (bounds.getSouthWest())`. |
| React Query key thrashing from float precision | HIGH | High | Force stringified, deterministically formatted keys mathematically tied to zoom depth to ensure exact cache hit ratios. |

## Rollback Strategy
**Phase 1-3**: Since the changes are restricted to `components/MapComponent.tsx` and standard hooks, rollback simply requires reverting the Git commit associated with this PR.

---

## 📅 Phase 1: Dynamic Precision & Snapshot Single Source of Truth
- **Goal**: Re-architect how the bounding box state is communicated from the SDK to React Query to avoid the massive performance drop of `queryKey` thrashing.

### Tasks (TDD Workflow)
- [x] **GREEN Task**: Implement dynamic scale function `precisionByZoom(level)` (Zoom 1-3 -> 6 decimals, 4-6 -> 5 decimals, >6 -> 4 decimals).
- [x] **GREEN Task**: Implement a string formatter `toBoundsKey` to create deterministic keys like `37.1234,126.1234,37.1245,126.1245` completely evading `JSON.stringify`.
- [x] **GREEN Task**: Implement a snapshot ref `const lastBoundsRef = useRef<string | null>(null)` to completely block dispatch of identical visible areas.
- [x] **REFACTOR Task**: Align `useMapController` and `page.tsx` directly with `MapComponent`'s state flow.

### 🛡️ Quality Gate (Phase 1)
- [x] Code builds cleanly.
- [x] Verification Command: `pnpm check` or equivalent TS build.

---

## 📅 Phase 2: Hybrid Decoupled Invocation (UX vs Thrashing)
- **Goal**: Improve the UX response time when the user completes a standard drag, while retaining algorithmic safety for pinch-zooms and inertia glides.

### Tasks
- [x] **GREEN Task**: Configure `onDragEnd` to instantly bypass any debounce and forcibly fire the generic `handleMapBoundsChange` (immediate UX feedback).
- [x] **GREEN Task**: Keep `onBoundsChanged` bounded to a standard `200ms` debounce, treating it purely as a safety net (fallback) for pinch zooms or programmatic camera movements.
- [x] **REFACTOR Task**: Remove all manual, race-condition inducing `kakao.maps.event.addListener` handlers.

### 🛡️ Quality Gate (Phase 2)
- [x] E2E/Manual test confirms dragging snaps update instantaneously (0 debounce penalty).
- [x] Inertia panning does not spam the backend.

---

## 📅 Phase 3: Unified Load State (Kill the Timeout Hacks)
- **Goal**: Remove all convoluted `setTimeout` chaining meant to solve initial load races and treat first-load intrinsically as just another standard map bounds calculation.

### Tasks
- [x] **GREEN Task**: Remove the `setTimeout(handleMapBoundsChange, 400)` scattered within `useEffect` hooks regarding `center` modification.
- [x] **GREEN Task**: Instead of fragile `isFirstLoad`, refactor `handleMapBoundsChange` to gracefully abort `if (!map)` or `if (!bounds)` and consistently act as the single pipeline for both mount and updates.

### 🛡️ Quality Gate (Phase 3)
- [x] **Verification**: Network tab in devtools shows **exactly ONE** call to `/bounds` when the dashboard first appears.

---

## 📝 Notes & Learnings
- **Last Updated: 2026-03-24**
- **Learnings**: 
  - `JSON.stringify` on bounds carries ordering risks. A deterministic string builder (`toBoundsKey`) with zooming-adaptive decimal normalization (`.toFixed`) guarantees absolute `queryKey` integrity in React Query.
  - Relying exclusively on React mount timers (`isFirstLoad`) for map bounding causes synchronization issues. Waiting unconditionally for `if (map)` ensures exactly 1 API call when the underlying external SDK finishes rendering.
  - A dual-layer architecture (immediate explicit callback `onDragEnd` + debounced fallback `onBoundsChanged`) perfectly marries high-response UX with failsafe data validation for pinch/inertial scrolls.
