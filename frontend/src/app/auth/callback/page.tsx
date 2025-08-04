'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Supabase가 자동으로 URL 해시를 처리
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }
        
        if (session?.user) {
          // 프로필 확인/생성
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (!profile) {
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
          }
          
          // 로그인 성공 메시지
          alert('로그인이 완료되었습니다!')
        }
        
        // 메인 페이지로 이동
        router.push('/')
        
      } catch (error: unknown) {
        console.error('OAuth 콜백 처리 실패:', error)
        setError(error instanceof Error ? error.message : 'OAuth 처리 중 오류가 발생했습니다.')
        setTimeout(() => router.push('/'), 3000)
      }
    }

    processCallback()
  }, [router])

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