# 📍 Frontend Marker Clusterer Optimization Plan

**CRITICAL INSTRUCTIONS**: After completing each phase:
1. ✅ Check off completed task checkboxes
2. 🧪 Run all quality gate validation commands
3. ⚠️ Verify ALL quality gate items pass
4. 📅 Update "Last Updated" date
5. 📝 Document learnings in Notes section
6. ➡️ Only then proceed to next phase

⛔ DO NOT skip quality gates or proceed with failing checks

## Overview and Objectives
**Goal**: Resolve the hidden severe memory leak and clustering recalculation bottleneck caused by React Anti-Patterns in the `MarkerClusterer`, and transition markers to native Canvas rendering for infinite scalability.

### 🗺️ Context Map
- `frontend/src/components/MapComponent.tsx`
- `frontend/src/components/MemoizedMapMarker.tsx`

### 📊 Current Bottleneck Analysis (Why is the Clusterer inefficient?)
1. **Silent Re-initialization Bug**: `MarkerClusterer` currently receives `calculator={[10, 30, 50]}` and `styles={[{...}, {...}]}` as inline arrays. In React, inline arrays generate a new memory pointer EVERY render. This forces the heavy Kakao SDK to **destroy and rebuild the clustering tree** every time you pan the map!
2. **DOM vs Canvas**: The clusterer is managing `<CustomOverlayMap>` (HTML `div` elements). Kakao's native clustering algorithm is mathematically optimized for native `MapMarker` (WebGL/Canvas Image) instances. Passing 500 HTML DOM nodes to be clustered stresses the DOM tree and browser paint cycles.

## Risk Assessment
| Risk | Probability | Impact | Mitigation Strategy |
|---|---|---|---|
| Losing Lucide SVG Styles | Medium | Medium | `<MapMarker>` requires static image paths. We must convert the SVG icons into Data URIs, or use standard optimized PNGs. |
| Click scaling logic restricted | High | Low | Native `MapMarker` doesn't support Tailwind `hover:scale-110`. We must change the `imageSize` prop dynamically when `isSelected=true`. |

## Rollback Strategy
**Phase 1-2**: Since the changes are restricted to `components/MapComponent.tsx` and `MemoizedMapMarker.tsx`, rollback requires reverting the Git commit associated with this PR.

---

## 📅 Phase 1: Clusterer Config Memoization (Quick Win)
- **Goal**: Instantly stop the Kakao Clusterer from destroying and rebuilding itself continuously.
- **Test Strategy**: React Profiler to verify `MarkerClusterer` props don't change.

### Tasks (TDD Workflow)
- [x] **RED Task**: Track `MarkerClusterer` initialization count. Notice it fires repeatedly.
- [x] **GREEN Task**: Extract `calculator={[10, 30, 50]}` out of the component scope into a global constant `CLUSTER_CALCULATOR`.
- [x] **GREEN Task**: Extract the massive inline `styles={[{...}, ...]}` array into a global constant `CLUSTER_STYLES`.
- [x] **REFACTOR Task**: Pass these stable references to `<MarkerClusterer>`, terminating the memory leak.

### 🛡️ Quality Gate (Phase 1)
- [x] Profiling shows `MarkerClusterer` never re-renders unless data fundamentally changes.
- [x] Verification Command: `pnpm check`.

---

## 📅 Phase 2: Native Canvas `MapMarker` Migration (Deep UX)
- **Goal**: Delete heavy HTML DOM nodes in favor of 60FPS Native Maps API Canvas rendering.

### Tasks
- [x] **GREEN Task**: Inside `MemoizedMapMarker.tsx`, replace `<CustomOverlayMap>` with `<MapMarker>`.
- [x] **GREEN Task**: Design a dynamic `image={{ src, size: {width, height} }}` object.
- [x] **GREEN Task**: To preserve custom color aesthetics, generate dynamic SVG Data URIs matching the current `getMarkerColor(category)` return value: `data:image/svg+xml;charset=utf-8,...`.
- [x] **REFACTOR Task**: Implement Tailwind-like selection scaling by bumping the `size` object dimensions by 1.25x when `isSelected` is true.

### 🛡️ Quality Gate (Phase 2)
- [x] **Chrome Performance Profiler**: Measure Clustering time for 500 markers. The time should drop noticeably.
- [x] **Verification Command**:
  ```bash
  pnpm eslint src/components/MemoizedMapMarker.tsx
  ```

---

## 📝 Notes & Learnings
- **Last Updated: 2026-03-24**
- **Learnings**: 
  - Kakao `MarkerClusterer` is violently strict about prop mutability. Passing inline arrays like `calculator={[10, 30]}` destroys the engine on every render.
  - HTML DOM nodes inside `<CustomOverlayMap>` completely bypass Kakao's Canvas optimizations. Porting SVG elements into `Data URI` strings and passing them through `<MapMarker image={...}>` massively reduced browser layout/paint times during deep zoom clustering.
