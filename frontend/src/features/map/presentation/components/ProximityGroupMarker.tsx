import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { Coordinates } from '@/features/map/domain/entities'
import {
  CLUSTER_BADGE_SIZE_PX,
  CLUSTER_BADGE_COLOR,
  CLUSTER_BADGE_SHADOW,
  CLUSTER_BADGE_BORDER,
} from './clusterBadgeStyle'

// 카카오 클러스터(MapMarkerLayer의 CLUSTER_STYLES 10개 미만 구간)와 동일한 배지 모양·색을
// 쓰되, 개수 구간별 확대는 하지 않는다 — 근접 그룹은 보통 2~5건 수준이라 크기를 고정해도
// 무리 없고, 카카오 클러스터와 시각적으로 구분할 필요가 없다는 결정에 따른 것이다 (ADR-0008).
const BADGE_STYLE: React.CSSProperties = {
  width: CLUSTER_BADGE_SIZE_PX,
  height: CLUSTER_BADGE_SIZE_PX,
  background: CLUSTER_BADGE_COLOR,
  borderRadius: CLUSTER_BADGE_SIZE_PX / 2,
  color: '#fff',
  textAlign: 'center',
  fontWeight: 'bold',
  lineHeight: `${CLUSTER_BADGE_SIZE_PX}px`,
  boxShadow: CLUSTER_BADGE_SHADOW,
  border: CLUSTER_BADGE_BORDER,
  cursor: 'pointer',
}

// 선택된 근접 그룹 — 개별 마커와 같은 브랜드 색으로 채우고 흰 테두리를 두껍게 해
// 배지들 사이에서 즉시 구분되게 한다. 크기는 그대로 둬서 지도가 출렁이지 않게 한다.
const SELECTED_BADGE_STYLE: React.CSSProperties = {
  ...BADGE_STYLE,
  background: '#1E52E0',
  border: '3px solid white',
  boxShadow: '0 4px 12px rgba(26, 24, 21, 0.28)',
}

interface ProximityGroupMarkerProps {
  center: Coordinates
  count: number
  onClick: () => void
  /** 이 그룹이 지금 선택된 지점인지 — 선택 표시는 MapFocusRing과 함께 쓴다 */
  isSelected?: boolean
}

export function ProximityGroupMarker({ center, count, onClick, isSelected = false }: ProximityGroupMarkerProps) {
  return (
    <CustomOverlayMap position={center} yAnchor={0.5} xAnchor={0.5} zIndex={isSelected ? 50 : 1}>
      <div
        data-testid="proximity-group-marker"
        data-selected={isSelected || undefined}
        style={isSelected ? SELECTED_BADGE_STYLE : BADGE_STYLE}
        onClick={onClick}
      >
        {count}
      </div>
    </CustomOverlayMap>
  )
}
