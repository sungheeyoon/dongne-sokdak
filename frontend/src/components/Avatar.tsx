'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { User, Camera } from 'lucide-react'

interface AvatarProps {
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  editable?: boolean
  onImageSelect?: (file: File) => void
  className?: string
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-base',
  xl: 'h-24 w-24 text-lg'
}

export default function Avatar({ 
  src, 
  alt = '프로필', 
  size = 'md', 
  editable = false, 
  onImageSelect,
  className = ''
}: AvatarProps) {
  const [isHovered, setIsHovered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && onImageSelect) {
      onImageSelect(file)
    }
  }

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div 
      className={`relative inline-block ${sizeClasses[size]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 아바타 이미지 또는 기본 아이콘 */}
      <div 
        className={`
          ${sizeClasses[size]} 
          rounded-full 
          overflow-hidden 
          bg-gray-200 
          border-2 
          border-gray-300 
          flex 
          items-center 
          justify-center
          ${editable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        `}
        onClick={handleClick}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50px, 100px"
            onError={(e) => {
              // 이미지 로드 실패 시 기본 아이콘으로 교체
              const target = e.target as HTMLImageElement;
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = '<svg class="text-gray-500 w-full h-full" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
              }
            }}
          />
        ) : (
          <User className="text-gray-500" />
        )}
      </div>

      {/* 편집 가능한 경우 카메라 오버레이 */}
      {editable && isHovered && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center cursor-pointer"
          onClick={handleClick}
        >
          <Camera className="text-white w-4 h-4" />
        </div>
      )}

      {/* 파일 입력 */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      )}
    </div>
  )
}
