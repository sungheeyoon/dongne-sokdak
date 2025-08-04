'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/stores/useUserStore'
import { User } from '@supabase/supabase-js'

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
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
    } finally {
      setLoading(false)
    }
  }

  const signInWithKakao = async (): Promise<void> => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        setLoading(false)
        throw error
      }
    } catch (error) {
      setLoading(false)
      console.error('카카오 로그인 실패:', error)
      throw error
    }
  }

  const handleOAuthCallback = async (): Promise<void> => {
    try {
      setLoading(true)
      
      // URL에서 세션 정보 확인
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
          const nickname = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name ||
                          session.user.user_metadata?.nickname ||
                          `카카오사용자${session.user.id.slice(-4)}`
          
          await supabase
            .from('profiles')
            .insert([{
              id: session.user.id,
              nickname,
              email: session.user.email || null, // 이메일이 없을 수 있음
              avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
              social_provider: 'kakao',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
        }
      }
      
      setLoading(false)
    } catch (error) {
      setLoading(false)
      throw error
    }
  }

  const getToken = async (): Promise<string | null> => {
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
  }

  return {
    user,
    initialized,
    signInWithEmail,
    signUpWithEmail,
    signInWithKakao,
    handleOAuthCallback,
    signOut,
    getToken
  }
}
