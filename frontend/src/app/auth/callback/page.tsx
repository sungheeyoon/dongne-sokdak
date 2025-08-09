'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { getSafeHomeUrl } from '@/lib/utils/redirectUtils'
import { debugEnvironment } from '@/lib/utils/environmentTest'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // 중복 실행 방지
    if (isProcessing) return

    const processCallback = async () => {
      setIsProcessing(true)
      
      try {
        // 환경 디버깅
        console.log('🔍 OAuth 콜백 페이지에서 환경 디버깅:')
        debugEnvironment()
        
        // 타임아웃 설정 (10초)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('콜백 처리 시간 초과')), 10000)
        })
        
        const callbackPromise = (async () => {
          // Supabase가 자동으로 URL 해시를 처리
          const { data: { session }, error } = await supabase.auth.getSession()
          
          if (error) {
            throw error
          }
          
          if (session?.user) {
            console.log('✅ 세션 확인됨:', session.user.email)
            
            // 프로필 확인/생성
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (!profile) {
              console.log('📝 새 사용자 프로필 생성 중...')
              // 새 사용자인 경우 프로필 생성
              const provider = session.user.app_metadata?.provider || 'unknown'
              const nickname = session.user.user_metadata?.full_name || 
                              session.user.user_metadata?.name ||
                              session.user.user_metadata?.nickname ||
                              `${provider}사용자${session.user.id.slice(-4)}`
              
              await supabase
                .from('profiles')
                .insert([{
                  id: session.user.id,
                  nickname,
                  email: session.user.email || null,
                  avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
                  social_provider: provider,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }])
              
              console.log('✅ 프로필 생성 완료')
            } else {
              console.log('✅ 기존 사용자 프로필 확인됨')
            }
            
            // 로그인 성공 로그 (alert 제거)
            console.log('✅ 로그인 성공:', session.user.email || session.user.id)
          } else {
            console.log('⚠️ 세션이 없습니다. 홈으로 리다이렉트합니다.')
          }
          
          return session
        })()
        
        // 콜백 처리 또는 타임아웃
        await Promise.race([callbackPromise, timeoutPromise])
        
        // 안전한 홈 리다이렉트
        setTimeout(() => {
          const homeUrl = getSafeHomeUrl()
          console.log('🏠 홈으로 리다이렉트:', homeUrl)
          router.push(homeUrl)
        }, 1000) // 1초 후 리다이렉트
        
      } catch (error: unknown) {
        console.error('OAuth 콜백 처리 실패:', error)
        setError(error instanceof Error ? error.message : 'OAuth 처리 중 오류가 발생했습니다.')
        
        // 오류 발생 시 3초 후 홈으로 이동
        setTimeout(() => {
          console.log('❌ 오류로 인한 홈 리다이렉트')
          router.push('/')
        }, 3000)
      } finally {
        setIsProcessing(false)
      }
    }

    // 즉시 실행하지 않고 약간의 딜레이 후 실행 (React Strict Mode 대응)
    const timer = setTimeout(processCallback, 100)
    
    return () => {
      clearTimeout(timer)
    }
  }, [router, isProcessing])

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