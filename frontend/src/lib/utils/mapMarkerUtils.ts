// 카카오맵 마커 생성 유틸리티

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

// 색상을 밝게 만드는 함수
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

// 단일 제보용 마커 이미지 생성 (제보 카드용) - MapPin 스타일
export const createSingleReportMarkerImage = (category: string, size: 'small' | 'medium' | 'large' = 'medium') => {
  const color = getMarkerColor(category)
  
  // 크기별 설정 - MapPin 비율로 조정
  const sizes = {
    small: { width: 16, height: 24 },
    medium: { width: 20, height: 30 },
    large: { width: 24, height: 36 }
  }
  
  const { width, height } = sizes[size]
  const scale = width / 24  // 기준 크기 대비 스케일
  
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  
  const centerX = width / 2
  const centerY = 12 * scale  // 원의 중심
  
  // MapPin 모양 (물방울 형태)
  ctx.fillStyle = color
  ctx.beginPath()
  // 상단 원형 부분
  ctx.arc(centerX, centerY, 12 * scale, 0, 2 * Math.PI)
  ctx.fill()
  
  // 하단 뾰족한 부분 (물방울 꼬리)
  ctx.beginPath()
  ctx.moveTo(centerX, centerY + 12 * scale)
  ctx.lineTo(centerX, height - 3 * scale)
  ctx.lineTo(centerX - 2 * scale, centerY + 16 * scale)
  ctx.closePath()
  ctx.fill()
  
  ctx.beginPath()
  ctx.moveTo(centerX, centerY + 12 * scale)
  ctx.lineTo(centerX, height - 3 * scale)
  ctx.lineTo(centerX + 2 * scale, centerY + 16 * scale)
  ctx.closePath()
  ctx.fill()
  
  // 내부 점
  ctx.fillStyle = 'white'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 5 * scale, 0, 2 * Math.PI)
  ctx.fill()
  
  // 더 작은 내부 점
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(centerX, centerY, 3 * scale, 0, 2 * Math.PI)
  ctx.fill()
  
  return {
    src: canvas.toDataURL(),
    size: { width, height },
    options: { offset: { x: centerX, y: height - 3 * scale } }
  }
}

// 그룹 마커 이미지 생성 (메인 지도용) - MapPin 스타일
export const createGroupMarkerImage = (category: string, count: number, isSelected: boolean = false) => {
  const color = getMarkerColor(category)
  
  // 선택된 마커는 살짝만 강조
  const scale = isSelected ? 1.1 : 1
  const canvas = document.createElement('canvas')
  
  if (count > 1) {
    // 여러 제보가 있는 경우 - 원형 마커에 숫자 표시
    canvas.width = Math.ceil(40 * scale)
    canvas.height = Math.ceil(40 * scale)
    const ctx = canvas.getContext('2d')!
    
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 18 * scale
    
    // 선택된 마커에 그림자
    if (isSelected) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 2
    }
    
    // 외곽 테두리
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = (isSelected ? 4 : 3) * scale
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.stroke()
    
    // 그림자 초기화
    ctx.shadowColor = 'transparent'
    
    // 배경 원
    ctx.fillStyle = isSelected ? lightenColor(color, 0.2) : color
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI)
    ctx.fill()
    
    // 숫자 텍스트
    ctx.fillStyle = 'white'
    ctx.font = `bold ${14 * scale}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(count.toString(), centerX, centerY)
  } else {
    // 단일 제보인 경우 - MapPin 스타일
    canvas.width = Math.ceil(24 * scale)
    canvas.height = Math.ceil(36 * scale)
    const ctx = canvas.getContext('2d')!
    
    const centerX = canvas.width / 2
    const centerY = 12 * scale  // 원의 중심
    
    // 선택된 마커에 그림자
    if (isSelected) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 2
    }
    
    // MapPin 모양 (물방울 형태)
    ctx.fillStyle = isSelected ? lightenColor(color, 0.2) : color
    ctx.beginPath()
    // 상단 원형 부분
    ctx.arc(centerX, centerY, 12 * scale, 0, 2 * Math.PI)
    ctx.fill()
    
    // 하단 뾰족한 부분 (물방울 꼬리)
    ctx.beginPath()
    ctx.moveTo(centerX, centerY + 12 * scale)
    ctx.lineTo(centerX, canvas.height - 3 * scale)
    ctx.lineTo(centerX - 2 * scale, centerY + 16 * scale)
    ctx.closePath()
    ctx.fill()
    
    ctx.beginPath()
    ctx.moveTo(centerX, centerY + 12 * scale)
    ctx.lineTo(centerX, canvas.height - 3 * scale)
    ctx.lineTo(centerX + 2 * scale, centerY + 16 * scale)
    ctx.closePath()
    ctx.fill()
    
    // 그림자 초기화
    ctx.shadowColor = 'transparent'
    
    // 내부 점
    ctx.fillStyle = 'white'
    ctx.beginPath()
    ctx.arc(centerX, centerY, 5 * scale, 0, 2 * Math.PI)
    ctx.fill()
    
    // 더 작은 내부 점
    ctx.fillStyle = isSelected ? lightenColor(color, 0.2) : color
    ctx.beginPath()
    ctx.arc(centerX, centerY, 3 * scale, 0, 2 * Math.PI)
    ctx.fill()
  }
  
  return {
    src: canvas.toDataURL(),
    size: { width: canvas.width, height: canvas.height },
    options: { offset: { x: canvas.width / 2, y: canvas.height - (count > 1 ? 0 : 5 * scale) } }
  }
}