'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import { User } from '@supabase/supabase-js'
import { getOAuthRedirectUrl } from '@/lib/utils/redirectUtils'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { user, setUser, setLoading } = useUserStore()
  const [initialized, setInitialized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // 초기 세션 확인
    const getInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
      } else {
        setUser(session?.user ?? null)
      }
      setLoading(false)
      setInitialized(true)
    }

    getInitialSession()

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)

        // 개발 모드에서만 로그인 상태 변경 로그 기록
        if (process.env.NODE_ENV === 'development' && event === 'SIGNED_IN' && session?.user) {
          const provider = session.user.app_metadata?.provider
          if (provider === 'google' || provider === 'kakao') {
            const providerName = provider === 'google' ? '구글' : '카카오'
            console.log(`✅ ${providerName} 로그인 완료`)
          }
        }

        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setLoading])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    setLoading(false)

    if (error) {
      throw error
    }

    return data
  }, [setLoading])

  const signUpWithEmail = useCallback(async (email: string, password: string, nickname?: string) => {
    setLoading(true)

    try {
      // Supabase SDK를 직접 호출하는 대신, 우리 백엔드 서버(FastAPI)로 요청을 보냅니다.
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, nickname })
      })

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.detail || '회원가입 실패');
        } else {
          const text = await response.text();
          console.error("Non-JSON error response:", text);
          throw new Error(`서버 오류 발생 (${response.status}): ${response.statusText}`);
        }
      }

      const data = await response.json()

      // 회원가입 성공 시, 바로 로그인을 시도할 수 있도록 처리
      // (백엔드에서 세션을 생성해주지 않으므로, 클라이언트에서 다시 로그인 필요)
      // 또는 가입 성공 메시지를 보여주고 로그인 페이지로 이동하도록 유도

      setLoading(false)
      return data

    } catch (error) {
      setLoading(false)
      throw error
    }
  }, [setLoading])

  const signOut = useCallback(async () => {
    setLoading(true)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      router.push('/') // 로그아웃 후 홈으로 이동
    } finally {
      setLoading(false)
    }
  }, [setLoading, router])

  const signInWithKakao = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      console.error('Kakao login error:', error)
    }
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Google login error:', error)
    }
  }, [])

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error)
        return null
      }

      return session?.access_token ?? null
    } catch (error) {
      console.error('Error getting token:', error)
      return null
    }
  }, [])

  return {
    user,
    initialized,
    signInWithEmail,
    signUpWithEmail,
    signInWithKakao,
    signInWithGoogle,
    signOut,
    getToken
  }
}
