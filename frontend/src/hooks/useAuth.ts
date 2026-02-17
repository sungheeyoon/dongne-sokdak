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
      // Supabase 직접 호출 (Frontend Direct Auth)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: nickname, // 메타데이터에 닉네임 저장 -> Trigger가 Profile 생성
            nickname: nickname   // 중복 저장 (확실한 처리를 위해)
          }
        }
      })

      if (error) {
        throw error
      }

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
        queryParams: {
          // 비즈 앱이 아니어서 이메일 권한을 얻을 수 없는 경우를 위해 
          // 이메일 스코프를 제외하고 닉네임과 프로필 사진만 요청합니다.
          // options.scopes 대신 queryParams.scope를 사용하여 강제 오버라이드 시도
          scope: 'profile_nickname profile_image',
        },
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

  const loginWithSocial = useCallback(async (provider: 'kakao' | 'google', code: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error

      // 세션 업데이트
      if (data.session) {
        setUser(data.session.user)
      }
    } catch (error) {
      console.error('Social login error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setLoading, setUser])

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
    loginWithSocial,
    signOut,
    getToken
  }
}
