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

interface ProximityGroupMarkerProps {
  center: Coordinates
  count: number
  onClick: () => void
}

export function ProximityGroupMarker({ center, count, onClick }: ProximityGroupMarkerProps) {
  return (
    <CustomOverlayMap position={center} yAnchor={0.5} xAnchor={0.5}>
      <div data-testid="proximity-group-marker" style={BADGE_STYLE} onClick={onClick}>
        {count}
      </div>
    </CustomOverlayMap>
  )
}
