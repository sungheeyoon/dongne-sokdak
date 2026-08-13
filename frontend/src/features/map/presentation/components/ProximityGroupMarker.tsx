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

// 선택된 근접 그룹 — 브랜드 색으로 바꾸되 크기와 그림자는 절제한다. 실제 선택 표시는
// 뒤의 정적 halo가 담당하므로 배지 자체까지 과하게 키우지 않는다.
const SELECTED_BADGE_STYLE: React.CSSProperties = {
  ...BADGE_STYLE,
  background: '#1E52E0',
  border: '2px solid white',
  boxShadow: '0 3px 10px rgba(30, 82, 224, 0.24)',
  position: 'absolute',
  left: 6,
  top: 6,
  zIndex: 1,
}

const FOCUS_FRAME_STYLE: React.CSSProperties = {
  position: 'relative',
  width: 52,
  height: 52,
}

const FOCUS_HALO_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  borderRadius: '50%',
  border: '2px solid #1E52E0',
  background: 'rgba(30, 82, 224, 0.12)',
  boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.92), 0 4px 14px rgba(30, 82, 224, 0.22)',
}

interface ProximityGroupMarkerProps {
  center: Coordinates
  count: number
  onClick: () => void
  /** 이 그룹이 지금 선택된 지점인지 — 선택 원과 배지는 같은 중심 프레임에서 그린다 */
  isSelected?: boolean
}

export function ProximityGroupMarker({ center, count, onClick, isSelected = false }: ProximityGroupMarkerProps) {
  const badge = (
    <div
      data-testid="proximity-group-marker"
      data-selected={isSelected || undefined}
      style={isSelected ? SELECTED_BADGE_STYLE : BADGE_STYLE}
      onClick={onClick}
    >
      {count}
    </div>
  )

  return (
    <CustomOverlayMap position={center} yAnchor={0.5} xAnchor={0.5} zIndex={isSelected ? 50 : 1}>
      {isSelected ? (
        <div data-testid="proximity-group-focus-frame" style={FOCUS_FRAME_STYLE}>
          <span data-testid="map-focus-halo" aria-hidden="true" style={FOCUS_HALO_STYLE} />
          {badge}
        </div>
      ) : badge}
    </CustomOverlayMap>
  )
}
