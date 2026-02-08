'use client'

import { useEffect, useState, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface PageProps {
  params: Promise<{ provider: string }>
}

export default function SocialCallbackPage({ params }: PageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithSocial } = useAuth()
  const [error, setError] = useState<string | null>(null)
  
  // Unwrap params using React.use()
  const { provider } = use(params)
  
  useEffect(() => {
    const code = searchParams.get('code')
    
    if (!code) {
      setError('인가 코드가 없습니다.')
      return
    }

    // Check if we already processed this code to prevent loop
    // Note: We use a static variable on the window or similar if we wanted to be absolutely sure across remounts,
    // but a simple ref check within the component lifecycle + router push usually suffices unless the component unmounts/remounts rapidly.
    // However, since we are in strict mode, effects run twice.
    // We can use a simple flag outside the effect if we want, or rely on the fact that the second call will happen.
    
    // Better approach: Check if we are already processing
    const isProcessing = sessionStorage.getItem(`auth_processing_${code}`)
    if (isProcessing) {
        return 
    }
    sessionStorage.setItem(`auth_processing_${code}`, 'true')

    if (provider !== 'kakao' && provider !== 'google') {
      setError('지원하지 않는 로그인 방식입니다.')
      sessionStorage.removeItem(`auth_processing_${code}`)
      return
    }

    const processLogin = async () => {
      try {
        await loginWithSocial(provider as 'kakao' | 'google', code)
        // Cleanup on success
        sessionStorage.removeItem(`auth_processing_${code}`)
        router.push('/')
      } catch (err: any) {
        console.error('Login failed:', err)
        setError(err.message || '로그인 처리 중 오류가 발생했습니다.')
        sessionStorage.removeItem(`auth_processing_${code}`)
        
        // 3초 후 로그인 페이지로 이동
        setTimeout(() => {
            router.push('/') // Or open login modal?
        }, 3000)
      }
    }

    processLogin()
    
    // Cleanup function in case of unmount before completion? 
    // No, we want the flag to persist until explicitly cleared or session ends.
  }, [provider, searchParams, loginWithSocial, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">로그인 오류</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-400">잠시 후 메인 화면으로 이동합니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="lg" message={`${provider === 'kakao' ? '카카오' : 'Google'} 로그인 중입니다...`} />
      </div>
    </div>
  )
}
