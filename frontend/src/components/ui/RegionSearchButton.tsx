'use client'

import React from 'react'
import { clsx } from 'clsx'
import { RotateCcw, MapPin, Loader2 } from 'lucide-react'

export interface RegionSearchButtonProps {
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'outline'
  children?: React.ReactNode
  loadingText?: string
}

const sizeStyles = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-3 text-base min-h-[48px]',
  lg: 'px-6 py-4 text-lg min-h-[56px]'
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg',
  secondary: 'bg-gray-600 hover:bg-gray-700 text-white shadow-md hover:shadow-lg',
  outline: 'bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-200 hover:border-blue-300'
}

export const RegionSearchButton: React.FC<RegionSearchButtonProps> = ({
  onClick,
  loading = false,
  disabled = false,
  className,
  size = 'md',
  variant = 'primary',
  children = '현재 지역 검색',
  loadingText = '검색 중...'
}) => {
  const isDisabled = disabled || loading

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center space-x-2 font-medium rounded-lg transition-all duration-200 whitespace-nowrap touch-manipulation',
        'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1',
        'active:scale-95',
        sizeStyles[size],
        variantStyles[variant],
        isDisabled && 'opacity-50 cursor-not-allowed hover:shadow-none active:scale-100',
        !isDisabled && 'hover:shadow-lg',
        className
      )}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">{loadingText}</span>
          <span className="sm:hidden">검색중</span>
        </>
      ) : (
        <>
          <RotateCcw className="w-4 h-4" />
          <span className="hidden sm:inline">{children}</span>
          <span className="sm:hidden">지역검색</span>
        </>
      )}
    </button>
  )
}

// 지역 검색 전용 프리셋
export const CurrentRegionButton: React.FC<Omit<RegionSearchButtonProps, 'children'>> = (props) => (
  <RegionSearchButton {...props}>
    현재 지역 검색
  </RegionSearchButton>
)

// 재검색 버튼 프리셋
export const RefreshSearchButton: React.FC<Omit<RegionSearchButtonProps, 'children' | 'variant'>> = (props) => (
  <RegionSearchButton {...props} variant="outline">
    이 지역 재검색
  </RegionSearchButton>
)

// 지도 영역 검색 버튼 프리셋
export const MapBoundsSearchButton: React.FC<Omit<RegionSearchButtonProps, 'children'>> = (props) => (
  <RegionSearchButton {...props}>
    지도 영역 검색
  </RegionSearchButton>
)

export default RegionSearchButton