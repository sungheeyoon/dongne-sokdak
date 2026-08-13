import { memo, useMemo, useCallback } from 'react'
import { MapMarker } from 'react-kakao-maps-sdk'
import { getMarkerColor } from '@/lib/utils/mapMarkerUtils'

interface MemoizedMapMarkerProps {
  id: string
  lat: number
  lng: number
  category: string
  isSelected: boolean
  onClick: (id: string) => void
}

const MemoizedMapMarker = memo(({
  id,
  lat,
  lng,
  category,
  isSelected,
  onClick
}: MemoizedMapMarkerProps) => {

  const handleClick = useCallback(() => {
    onClick(id)
  }, [id, onClick])

  const position = useMemo(() => ({ lat, lng }), [lat, lng])

  // 매 렌더링 시마다 SVG 문자열을 생성하는 과정 자체를 메모이제이션하여 최적화
  const markerImage = useMemo(() => {
    // 선택된 핀은 카테고리 색을 버리고 브랜드 색으로 통일한다 — 카테고리 색을 유지하면
    // "무엇을 골랐는지"가 "무슨 카테고리인지"와 뒤섞여 선택 신호가 묻힌다.
    // 흰 테두리도 두껍게 해서 배경 위에서 떨어져 보이게 한다 (작은 정적 halo와 함께 쓴다).
    const fillColor = isSelected ? '#1E52E0' : getMarkerColor(category)
    const strokeColor = 'white'
    const strokeWidth = isSelected ? '2.5' : '1.5'

    // 선택 원과 핀을 같은 SVG 좌표계 안에 넣는다. 카카오 CustomOverlay와 네이티브
    // MapMarker를 따로 겹치면 각자의 anchor 계산 때문에 핀 머리에서 몇 px씩 어긋난다.
    const pin = `<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" />`
    const svg = isSelected
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 48 52"><defs><filter id="focus-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#1E52E0" flood-opacity="0.22" /></filter></defs><circle data-focus-halo="true" cx="24" cy="31" r="20" fill="#1E52E0" fill-opacity="0.12" stroke="white" stroke-width="6" filter="url(#focus-shadow)" /><circle cx="24" cy="31" r="20" fill="none" stroke="#1E52E0" stroke-width="2" /><svg x="6" y="16" width="36" height="36" viewBox="0 0 24 24" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${pin}</svg></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${pin}</svg>`

    // Data URI로 변환하여 브라우저에서 가상 이미지처럼 쓸 수 있게 만듦
    const encodedSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

    // 선택 이미지의 실제 핀은 36px이고, 48×52 프레임이 포커스 원까지 함께 담는다.
    const size = isSelected ? { width: 48, height: 52 } : { width: 28, height: 28 }

    return {
      src: encodedSvg,
      size,
      options: {
        // SVG의 핀 끝부분이 하단 중앙에 위치하므로 오프셋 조정 (Tip 좌표)
        offset: { x: size.width / 2, y: size.height }
      }
    }
  }, [category, isSelected])

  // CustomOverlayMap (HTML DOM)은 버리고 MapMarker (Canvas Native Image) 로 변경!
  // -> 카카오맵의 네이티브 클러스터링 엔진 성능을 100% 활용할 수 있게 됨
  return (
    <MapMarker
      position={position}
      image={markerImage}
      onClick={handleClick}
      zIndex={isSelected ? 50 : 1}
    />
  )
})

MemoizedMapMarker.displayName = 'MemoizedMapMarker'

export default MemoizedMapMarker
