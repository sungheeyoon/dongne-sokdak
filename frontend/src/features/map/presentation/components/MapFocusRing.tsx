import { CustomOverlayMap } from 'react-kakao-maps-sdk'
import { Coordinates } from '@/features/map/domain/entities'

// 브랜드 색 (UI_V2_CONTRACT.md §1.1) — 마커 위 표현이라 토큰 클래스 대신 값을 쓴다.
const BRAND = '#1E52E0'
const RING_SIZE_PX = 64

/**
 * 지도에서 지금 선택된 지점을 가리키는 포커스 링.
 *
 * 마커 자체의 색·크기 변화만으로는 약하다 — 마커가 빽빽한 화면에서 "조금 큰
 * 핀"은 눈에 띄지 않는다. 그래서 선택 표시를 마커 속성이 아니라 **별도의 링
 * 오버레이**로 분리했다. 개별 제보든 근접 그룹이든 같은 표시를 쓰므로,
 * 무엇을 골랐든 지도에서 찾는 방법이 하나로 같다.
 *
 * 링은 마커 아래(zIndex 0)에 깔리고 클릭을 가로채지 않는다.
 * prefers-reduced-motion에서는 맥동을 멈추고 정적인 링만 남긴다 (§3.4).
 */
export function MapFocusRing({ center }: { center: Coordinates }) {
    return (
        <CustomOverlayMap position={center} yAnchor={0.5} xAnchor={0.5} zIndex={0}>
            <div
                data-testid="map-focus-ring"
                aria-hidden="true"
                style={{
                    width: RING_SIZE_PX,
                    height: RING_SIZE_PX,
                    pointerEvents: 'none',
                    position: 'relative',
                }}
            >
                <style>{`
                    @keyframes dongne-focus-pulse {
                        0%   { transform: scale(0.72); opacity: 0.55; }
                        70%  { transform: scale(1);    opacity: 0;    }
                        100% { transform: scale(1);    opacity: 0;    }
                    }
                    @media (prefers-reduced-motion: reduce) {
                        .dongne-focus-pulse { animation: none !important; opacity: 0.25 !important; }
                    }
                `}</style>

                {/* 맥동하는 바깥 링 — 시선을 끌어오는 역할 */}
                <span
                    className="dongne-focus-pulse"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        border: `2px solid ${BRAND}`,
                        animation: 'dongne-focus-pulse 1.8s cubic-bezier(.2, 0, 0, 1) infinite',
                    }}
                />

                {/* 항상 보이는 안쪽 원반 — 맥동이 사라진 순간에도 선택 지점이 남아 있어야 한다 */}
                <span
                    style={{
                        position: 'absolute',
                        inset: '25%',
                        borderRadius: '50%',
                        border: `2px solid ${BRAND}`,
                        background: 'rgba(30, 82, 224, 0.12)',
                    }}
                />
            </div>
        </CustomOverlayMap>
    )
}
