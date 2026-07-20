# 지도 초점과 선택 지점은 분리된 개념이다 — Kakao SDK 접근은 어댑터 하나로 좁힌다

브라우징 지도의 '지도 초점(Map Focus)'과 제보 등록 화면의 '선택 지점(Picked Point)'은 이름만 겹칠 뿐 서로 다른 도메인 개념이다 — 하나의 상태로 합치지 않는다. 두 화면이 공통으로 쓰는 Kakao SDK 명령형 호출(`new LatLng`, `panTo`/`setLevel`/`getBounds`/`getCenter`/`getLevel`, `event.addListener`, SDK 준비 폴링)만 `features/map/data/KakaoMapAdapter` 하나로 모으고, `<Map>`/`<MapMarker>`/`<MarkerClusterer>` 같은 `react-kakao-maps-sdk`의 선언적 컴포넌트는 그대로 presentation에 남긴다.

## Considered Options

- **지도 초점과 선택 지점을 하나의 `center` 상태로 통합**: 두 좌표 모두 "지도가 보여주는 위치"라는 점에서 표면적으로 같아 보이지만, 지도 초점은 명시적 사용자 의도(검색·내 동네 복귀)로만 바뀌는 값이고 선택 지점은 지도 초점 값으로 한 번 초기화된 뒤 완전히 독립적으로 움직이는 값이다. 합치면 한쪽 화면이 반대쪽의 상태 변화에 원치 않게 반응하는 결합이 생겨 기각.
- **`KakaoMapAdapter`가 `react-kakao-maps-sdk`의 선언적 렌더링까지 감싸기**: CLAUDE.md의 "presentation은 window.kakao 금지" 규칙은 전역 `window.kakao` 직접 호출을 가리키는 것이지, 이미 선언적으로 감싸인 React 래퍼 라이브러리를 가리키지 않는다. 렌더링까지 어댑터로 감싸면 범위가 불필요하게 커져 기각.

## Consequences

`currentMapCenter`(지도 초점과 별개로 지도 이동마다 갱신되던, 실제로는 아무도 읽지 않던 상태)와 `getActiveLocation`의 `cachedLastCenter` 분기는 삭제한다 — "마지막 위치로 복귀" 기능은 미완성 상태로 방치돼 있었고, 이번 결정 범위 밖이다.
