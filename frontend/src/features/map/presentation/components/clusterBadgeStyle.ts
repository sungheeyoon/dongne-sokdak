// 근접 그룹 마커(ProximityGroupMarker)가 카카오 네이티브 클러스터 배지(MapMarkerLayer의
// CLUSTER_STYLES 10개 미만 구간)와 항상 같은 값을 쓰도록 공유하는 원시값 (ADR-0008) —
// 두 곳에 값을 각각 하드코딩하면 한쪽만 바뀌어 시각적으로 어긋날 수 있다.
export const CLUSTER_BADGE_SIZE_PX = 40
export const CLUSTER_BADGE_COLOR = 'rgba(59, 130, 246, 0.8)'
export const CLUSTER_BADGE_SHADOW = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
export const CLUSTER_BADGE_BORDER = '2px solid white'
