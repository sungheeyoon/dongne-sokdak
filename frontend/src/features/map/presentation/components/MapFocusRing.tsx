import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { Coordinates } from '@/features/map/domain/entities'

// 브랜드 색 (UI_V2_CONTRACT.md §1.1) — 지도 오버레이라 토큰 클래스 대신 값을 쓴다.
const BRAND = '#1E52E0'

export type MapFocusRingVariant = 'marker' | 'group'

/**
 * 지도에서 지금 선택된 지점을 가리키는 정적 포커스 표시.
 *
 * 큰 맥동 링은 지도 정보보다 먼저 보이고, 핀 끝 좌표를 중심으로 잡으면 실제 핀
 * 머리와 어긋난다. 작은 정적 halo로 바꾸고 개별 핀일 때만 위로 보정한다.
 * 그룹은 원형 배지라 좌표 중심을 그대로 쓴다. 둘 다 같은 테두리·면 표현을 공유한다.
 */
export function MapFocusRing({
    center,
    variant = 'marker',
}: {
    center: Coordinates
    variant?: MapFocusRingVariant
}) {
    const isMarker = variant === 'marker'
    const size = isMarker ? 44 : 52

    return (
        <CustomOverlayMap position={center} yAnchor={0.5} xAnchor={0.5} zIndex={0}>
            <div
                data-testid="map-focus-ring"
                data-variant={variant}
                aria-hidden="true"
                style={{
                    width: size,
                    height: size,
                    pointerEvents: 'none',
                    transform: isMarker ? 'translateY(-18px)' : 'none',
                    borderRadius: '50%',
                    border: `2px solid ${BRAND}`,
                    background: 'rgba(30, 82, 224, 0.12)',
                    boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.92), 0 4px 14px rgba(30, 82, 224, 0.22)',
                }}
            />
        </CustomOverlayMap>
    )
}
