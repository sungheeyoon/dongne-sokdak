# 동네속닥 (dongne-sokdak)

지도 기반 동네 제보 커뮤니티. 주민이 동네에서 겪는 문제·소식을 위치와 함께 제보하고, 이웃이 투표·댓글로 반응한다.

## Language

**제보 (Report)**:
위치(좌표·주소)를 가진 동네 이슈 게시물. 카테고리와 상태(OPEN / IN_PROGRESS / RESOLVED)를 가진다.
_Avoid_: 게시글, 신고, post

**지도 조회 (Map Query)**:
지도 화면을 그리기 위한 제보 읽기의 총칭. 주변 조회와 영역 조회 두 가지로 구성된다. 일반 목록 페이지네이션과 제보 상세 조회는 지도 조회가 아니다.
_Avoid_: map read, 공간 조회

**주변 조회 (Nearby Query)**:
한 중심 좌표에서 반경 안의 제보를 거리 순으로 가져오는 지도 조회. 각 제보에 중심점으로부터의 거리가 붙는다.
_Avoid_: nearby reports, within radius

**영역 조회 (Bounds Query)**:
지도 화면에 보이는 사각형 영역 안의 제보를 가져오는 지도 조회. 지도 이동·확대/축소 때마다 실행되어 마커를 그린다.
_Avoid_: in bounds, viewport query
