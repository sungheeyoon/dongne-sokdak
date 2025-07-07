'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'gray' | 'white'
  message?: string
  fullScreen?: boolean
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'blue', 
  message,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white'
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`}></div>
      {message && (
        <p className={`text-sm font-medium ${color === 'white' ? 'text-white' : 'text-gray-600'}`}>
          {message}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

// 골격 로딩 컴포넌트
export function SkeletonLoader({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
  )
}

// 카드 형태 골격 로딩
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-4 md:p-6">
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <SkeletonLoader className="h-5 w-3/4" />
        <SkeletonLoader className="h-5 w-16" />
      </div>
      <SkeletonLoader className="h-4 w-full mb-2" />
      <SkeletonLoader className="h-4 w-2/3 mb-3 md:mb-4" />
      <SkeletonLoader className="h-32 w-full mb-3 md:mb-4" />
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <SkeletonLoader className="h-6 w-16" />
          <SkeletonLoader className="h-4 w-12" />
          <SkeletonLoader className="h-4 w-12" />
        </div>
        <SkeletonLoader className="h-4 w-20" />
      </div>
    </div>
  )
}