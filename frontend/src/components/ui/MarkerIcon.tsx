'use client'

import { useEffect, useState } from 'react'
import { createSingleReportMarkerImage } from '@/lib/utils/mapMarkerUtils'

interface MarkerIconProps {
  category?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function MarkerIcon({ 
  category = 'OTHER', 
  size = 'small', 
  className = 'w-4 h-5' 
}: MarkerIconProps) {
  const [markerImageSrc, setMarkerImageSrc] = useState<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const markerImage = createSingleReportMarkerImage(category, size)
      setMarkerImageSrc(markerImage.src)
    }
  }, [category, size])

  if (!markerImageSrc) {
    // 로딩 중일 때는 기본 이모티콘 표시
    return <span>📍</span>
  }

  return (
    <img 
      src={markerImageSrc} 
      alt="위치 마커"
      className={`object-contain ${className}`}
    />
  )
}