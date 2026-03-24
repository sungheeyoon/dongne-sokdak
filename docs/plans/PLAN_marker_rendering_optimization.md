# 📍 Frontend Marker Rendering Optimization Plan (Advanced React Core Edition)

**CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date
## 📝 Notes & Learnings
- **Last Updated: 2026-03-24**
- **Learnings**: 
  - Passing Object Literals (`position={{lat, lng}}`) or Inline Functions (`onClick={() => handleClick(report.id)}`) instantly destroys `React.memo` isolation. Primitivizing props into flat trees solves Re-render Thrashing.
  - Viewport DOM culling (stripping markers completely out of render array if they are offscreen) causes massive frame boosts. React schedules 80 nodes instantly compared to 500 nodes.
  - Using Concurrent Mode's `useTransition` allows expensive `<CustomOverlayMap>` reconciliations to run cleanly in background idle time without freezing CSS/Map native draggable layers.
6. ➡️ Only then proceed to next phase

⛔ DO NOT skip quality gates or proceed with failing checks

## Overview and Objectives
**Goal**: Completely eradicate DOM Thrashing (React Reconciliation freezes) when heavily dragging the map with 100~500 visible markers.
**Key Improvements Incorporated**:
- **Strict Memoization**: Primitives only (`lat={lat}`, `lng={lng}`) + `useCallback` function prop delegation to prevent inline function recreation.
- **Viewport Culling**: Aggressive spatial filtering (`isInBounds`) before React even mounts the node, drastically dropping DOM node count from 500 to ~80 instantly.
- **Concurrent UI Rendering**: Dropping `useDeferredValue` for explicit `useTransition(startTransition)`, intentionally flagging heavy Map Array reconciliations as `low priority scheduling` to unblock Kakao map panning animations.
- **Clusterer/Canvas Refactoring**: Shifting away from HTML `CustomOverlayMap` to Native Canvas/Image `akao.maps.Marker` for infinite scalability.

### 🗺️ Context Map
- `frontend/src/components/MapComponent.tsx`
- `frontend/src/features/map/presentation/components/MemoizedMapMarker.tsx` (New)

## Risk Assessment
| Risk | Probability | Impact | Mitigation Strategy |
|---|---|---|---|
| Native Canvas Marker losing custom styling | Medium | Medium | Export the `lucide-react` SVG as a static image string, or utilize standard Map Marker Image mapping rather than dynamic DOM nodes. |
| Stale Props on Selection | Low | High | Ensure `useCallback(handleMarkerClick)` doesn't close over stale state by passing the `reportId` outward instead of closing over `report`. |

## Rollback Strategy
**Phase 1-2**: Since the changes are restricted to component structuring within `MapComponent.tsx` and creating a new memoized file, rollback requires reverting the Git commit associated with this PR.

---

## 📅 Phase 1: Viewport Culling & Primitives-Only Memoization
- **Goal**: Severely cut down the actual DOM nodes React maps over, and ensure the nodes that *are* rendered don't re-render unless uniquely modified.

### Tasks (TDD Workflow)
- [x] **RED Task**: Log `render count` in the `MapMarker` component and prove that panning the map triggers thousands of re-renders due to inline `onClick={() => handle(id)}` and `position={{lat, lng}}`.
- [x] **GREEN Task**: Add `isInBounds(report, currentBounds)` utility inside the loop. Force React to return `null` for markers off-screen (e.g. 500 reports -> 80 DOM nodes).
- [x] **GREEN Task**: Create `MemoizedMapMarker.tsx` using `React.memo`. Strip all Objects/Functions into primitives: `<MemoizedMapMarker lat={lat} lng={lng} onClick={handleMarkerClick} id={report.id} />`.
- [x] **GREEN Task**: Export `handleMarkerClick` as a unified `useCallback((id: string) => {...}, [])` handler residing in `MapComponent`, passing standard `id` instead of a closure.
- [x] **REFACTOR Task**: Switch from heavy SVG DOM `<CustomOverlayMap>` to lightweight Canvas-rendered `<MapMarker>` mapped with Custom Icons if structurally feasible, ensuring `MarkerClusterer` binds to Canvas API.

### 🛡️ Quality Gate (Phase 1)
- [x] React DevTools -> "Highlight on Render": Dragging the map shows **Zero** green highlight flashes on existing markers.
- [x] Component only unmounts/mounts when exiting `isInBounds` or API refetching finishes.

---

## 📅 Phase 2: React 18 Concurrent Background Scheduling (`useTransition`)
- **Goal**: When new data fetching triggers an influx of 500 new coordinates, React natively freezes the main thread. We must explicitly deprioritize the React Virtual DOM diffing algorithm to maintain 60FPS Drag animations in Kakao Maps.

### Tasks
- [x] **RED Task**: Panning vigorously to an unseen area causes the map to "stutter/freeze" for 200ms when the `/bounds` API resolves and injects 500 nodes into `reports`.
- [x] **GREEN Task**: Initialize `const [isPending, startTransition] = useTransition()` whenever `reports` are injected into `validReports` or MapComponent State.
- [x] **GREEN Task**: Wrap `setValidReports(newReports)` inside `startTransition(() => { ... })` so that marker plotting dynamically yields to Browser Paint frames.

### 🛡️ Quality Gate (Phase 2)
- [x] **Chrome Performance Profiler**: Measure FPS during a pan that triggers an API fetch. Ensure no Long Tasks (>50ms) block the main thread.
- [x] **Macro Stress Test**: Compare Map dragging UX cleanly handles 100 / 300 / 500 markers efficiently.
