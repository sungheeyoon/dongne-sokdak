'use client'

import React, { Component, ReactNode } from 'react'
import { logError } from '@/lib/error/errorUtils'
import ErrorDisplay from '@/shared/ui/ErrorDisplay'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 로깅
    logError({
      type: 'unknown',
      message: error.message,
      details: { error, errorInfo }
    }, 'ErrorBoundary')

    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      // 사용자 정의 폴백 UI가 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 기본 에러 UI — 앱 전역에서 쓰는 공통 에러 컴포넌트를 그대로 재사용한다.
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <ErrorDisplay
              error="예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요."
              title="앗! 문제가 발생했습니다"
              onRetry={() => this.setState({ hasError: false })}
            />

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  개발자 정보 (개발 모드에서만 표시)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs text-gray-700 overflow-auto">
                  <pre>{this.state.error.toString()}</pre>
                  {this.state.errorInfo && (
                    <pre className="mt-2">{this.state.errorInfo.componentStack}</pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary