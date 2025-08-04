'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

function KakaoCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { handleOAuthCallback } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [processed, setProcessed] = useState(false)

  useEffect(() => {
    if (processed) return

    const processOAuthCallback = async () => {
      try {
        setProcessed(true)
        
        // OAuth 에러 확인
        const error = searchParams.get('error')
        if (error) {
          setError('로그인이 취소되었습니다.')
          setTimeout(() => router.push('/'), 3000)
          return
        }

        // OAuth 콜백 처리
        await handleOAuthCallback()
        
        // 로그인 성공 메시지
        alert('카카오 로그인이 완료되었습니다!')

        // 메인 페이지로 리다이렉트
        router.push('/')
        
      } catch (error: unknown) {
        console.error('OAuth 콜백 처리 실패:', error)
        setError(error instanceof Error ? error.message : '로그인 처리 중 오류가 발생했습니다.')
        setTimeout(() => router.push('/'), 3000)
      }
    }

    processOAuthCallback()
  }, [searchParams, handleOAuthCallback, router, processed])

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
        <LoadingSpinner size="lg" message="카카오 로그인 처리 중..." />
        <p className="text-gray-500 mt-4">잠시만 기다려주세요...</p>
      </div>
    </div>
  )
}

export default function KakaoCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" message="페이지 로딩 중..." />
          <p className="text-gray-500 mt-4">잠시만 기다려주세요...</p>
        </div>
      </div>
    }>
      <KakaoCallbackContent />
    </Suspense>
  )
}