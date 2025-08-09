// 지도 마커 유틸리티 - MapPin 아이콘 기반

// 마커 카테고리별 색상
export const getMarkerColor = (category: string) => {
  const colors = {
    NOISE: '#FF6B6B',
    TRASH: '#4ECDC4', 
    FACILITY: '#45B7D1',
    TRAFFIC: '#96CEB4',
    OTHER: '#FECA57'
  }
  return colors[category as keyof typeof colors] || colors.OTHER
}

// 색상을 밝게 만드는 함수 (선택된 마커용)
export const lightenColor = (color: string, amount: number) => {
  // hex color를 RGB로 변환
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }
  
  const rgb = hexToRgb(color)
  if (!rgb) return color
  
  // 각 컴포넌트를 밝게 만들기
  const lighten = (component: number) => {
    return Math.min(255, Math.floor(component + (255 - component) * amount))
  }
  
  const newR = lighten(rgb.r)
  const newG = lighten(rgb.g)
  const newB = lighten(rgb.b)
  
  // 다시 hex로 변환
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`
}