'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import { User } from '@supabase/supabase-js'
import { getKakaoAuthUrl, loginWithKakao, SocialAuthResponse } from '@/lib/api/auth'

export function useAuth() {
  const { user, setUser, setLoading } = useUserStore()
  const [initialized, setInitialized] = useState(false)

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
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setLoading])

  const signInWithEmail = async (email: string, password: string) => {
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
  }

  const signUpWithEmail = async (email: string, password: string, nickname?: string) => {
    setLoading(true)
    
    try {
      // 회원가입
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })
      
      if (error) {
        throw error
      }

      // 회원가입 성공 시 프로필 생성
      if (data.user && nickname) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([{
            id: data.user.id,
            nickname: nickname.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }])

        if (profileError) {
          console.error('Profile creation error:', profileError)
          // 프로필 생성에 실패해도 회원가입은 성공으로 처리
        }
      }

      setLoading(false)
      return data
      
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const signOut = async () => {
    setLoading(true)
    
    try {
      // 소셜 로그인 사용자인지 확인 (localStorage에서 토큰 확인)
      const socialToken = localStorage.getItem('social_token')
      
      if (socialToken) {
        // 소셜 로그인 사용자 로그아웃
        localStorage.removeItem('social_token')
        localStorage.removeItem('social_user_id')
        setUser(null)
      } else {
        // Supabase Auth 사용자 로그아웃
        const { error } = await supabase.auth.signOut()
        if (error) {
          throw error
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const signInWithKakao = async (): Promise<void> => {
    try {
      const authUrl = await getKakaoAuthUrl()
      // 카카오 로그인 페이지로 리다이렉트
      window.location.href = authUrl
    } catch (error) {
      console.error('카카오 로그인 URL 요청 실패:', error)
      throw error
    }
  }

  const handleKakaoCallback = async (authCode: string): Promise<SocialAuthResponse> => {
    setLoading(true)
    
    try {
      const response = await loginWithKakao(authCode) as any
      
      // 소셜 로그인 토큰 저장
      localStorage.setItem('social_token', response.access_token)
      localStorage.setItem('social_user_id', response.user_id)
      
      // 가짜 User 객체 생성 (기존 로직과 호환성 위해)
      const socialUser: User = {
        id: response.user_id,
        email: '',
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: {},
        user_metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      setUser(socialUser)
      setLoading(false)
      
      return response
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  // 초기화 시 소셜 로그인 토큰 확인
  useEffect(() => {
    const checkSocialToken = () => {
      const socialToken = localStorage.getItem('social_token')
      const socialUserId = localStorage.getItem('social_user_id')
      
      if (socialToken && socialUserId) {
        // 소셜 로그인 사용자 복원
        const socialUser: User = {
          id: socialUserId,
          email: '',
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setUser(socialUser)
      }
    }
    
    if (initialized) {
      checkSocialToken()
    }
  }, [initialized, setUser])

  const getToken = async (): Promise<string | null> => {
    try {
      // 소셜 로그인 토큰 확인
      const socialToken = localStorage.getItem('social_token')
      if (socialToken) {
        return socialToken
      }
      
      // Supabase 세션 토큰 확인
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
  }

  return {
    user,
    initialized,
    signInWithEmail,
    signUpWithEmail,
    signInWithKakao,
    handleKakaoCallback,
    signOut,
    getToken
  }
}
