'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { handleOAuthCallback } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processCallback = async () => {
      try {
        await handleOAuthCallback()
        
        // 성공 시 메인 페이지로 이동
        router.push('/')
        
      } catch (error: unknown) {
        console.error('OAuth 콜백 처리 실패:', error)
        setError(error instanceof Error ? error.message : 'OAuth 처리 중 오류가 발생했습니다.')
        setTimeout(() => router.push('/'), 3000)
      }
    }

    processCallback()
  }, [handleOAuthCallback, router])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">로그인 오류</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">3초 후 메인 페이지로 이동합니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" message="로그인 처리 중..." />
        <p className="text-gray-500 mt-4">잠시만 기다려주세요...</p>
      </div>
    </div>
  )
}