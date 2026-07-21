'use client'

import { AlertCircle, AlertTriangle, Lock, ServerCrash, WifiOff } from 'lucide-react'
import { AppError, formatApiError, logError } from '@/lib/error/errorUtils'

interface ErrorDisplayProps {
  error: Error | AppError | string
  title?: string
  onRetry?: () => void
  showDetails?: boolean
  compact?: boolean
}

export default function ErrorDisplay({ 
  error, 
  title = '오류가 발생했습니다',
  onRetry,
  showDetails = false,
  compact = false
}: ErrorDisplayProps) {
  // 에러를 AppError 형태로 변환
  const appError: AppError = typeof error === 'string' 
    ? { type: 'unknown', message: error }
    : error instanceof Error 
    ? formatApiError(error)
    : error

  // 에러 로깅
  logError(appError, 'ErrorDisplay')

  // 에러 타입별 아이콘
  const getErrorIcon = (type: AppError['type']) => {
    switch (type) {
      case 'network':
        return WifiOff
      case 'auth':
        return Lock
      case 'validation':
        return AlertTriangle
      case 'server':
        return ServerCrash
      default:
        return AlertCircle
    }
  }

  const ErrorIcon = getErrorIcon(appError.type)

  // 컴팩트 버전
  if (compact) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <ErrorIcon className="h-4 w-4 text-red-600" />
          <span className="text-red-800 text-sm font-medium">{appError.message}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-red-600 hover:text-red-800 text-sm font-medium underline ml-2"
            >
              다시 시도
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
      <div className="text-center max-w-md">
        <ErrorIcon className="h-10 w-10 text-red-600 mx-auto mb-4" />

        <h3 className="text-lg font-semibold text-red-900 mb-2">
          {title}
        </h3>
        
        <p className="text-red-800 mb-4">
          {appError.message}
        </p>

        {showDetails && appError.details && (
          <details className="text-left mb-4">
            <summary className="text-sm text-red-700 cursor-pointer">
              자세한 정보 보기
            </summary>
            <pre className="text-xs text-red-600 mt-2 p-2 bg-red-100 rounded overflow-auto">
              {JSON.stringify(appError.details, null, 2)}
            </pre>
          </details>
        )}

        <div className="space-y-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors touch-manipulation"
            >
              다시 시도
            </button>
          )}
          
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors touch-manipulation"
          >
            페이지 새로고침
          </button>
        </div>
      </div>
    </div>
  )
}

// 네트워크 오류 전용 컴포넌트
export function NetworkErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      error={{
        type: 'network',
        message: '인터넷 연결을 확인하고 다시 시도해주세요.'
      }}
      title="연결 오류"
      onRetry={onRetry}
    />
  )
}

// 인증 오류 전용 컴포넌트
export function AuthErrorDisplay({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      error={{
        type: 'auth',
        message: '로그인이 만료되었습니다. 다시 로그인해주세요.'
      }}
      title="인증 오류"
      onRetry={onRetry}
    />
  )
}