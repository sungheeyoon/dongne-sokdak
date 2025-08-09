'use client'

import { MapPin } from 'lucide-react'
import { getMarkerColor } from '@/lib/utils/mapMarkerUtils'

interface MarkerIconProps {
  category?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export default function MarkerIcon({ 
  category = 'OTHER', 
  size = 'small', 
  className 
}: MarkerIconProps) {
  // 크기에 따른 클래스 설정
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'w-3 h-4'
      case 'medium':
        return 'w-4 h-5'
      case 'large':
        return 'w-6 h-7'
      default:
        return 'w-4 h-5'
    }
  }

  const finalClassName = className || getSizeClass()
  const markerColor = getMarkerColor(category)

  return (
    <MapPin 
      className={`${finalClassName} drop-shadow-sm`}
      style={{ 
        color: markerColor,
        fill: markerColor,
        stroke: 'white',
        strokeWidth: '1',
      }}
    />
  )
}