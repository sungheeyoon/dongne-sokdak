import { supabase } from '../supabase'
import { Profile } from '../../types'
import { createApiUrl } from './config'

export interface SignUpData {
  email: string
  password: string
  nickname: string
}

export interface SignInData {
  email: string
  password: string
}

// 회원가입
export const signUp = async (data: SignUpData) => {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password
  })

  if (authError) throw new Error(authError.message)

  // 프로필 생성
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        nickname: data.nickname
      }])

    if (profileError) throw new Error(profileError.message)
  }

  return authData
}

// 로그인
export const signIn = async (data: SignInData) => {
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password
  })

  if (error) throw new Error(error.message)
  return authData
}

// 로그아웃
export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}

// 현재 사용자 정보 조회
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// 사용자 프로필 조회
export const getUserProfile = async (userId?: string): Promise<Profile | null> => {
  const { data: { user } } = await supabase.auth.getUser()
  const targetUserId = userId || user?.id
  
  if (!targetUserId) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single()

  if (error) return null
  return profile
}

// 카카오 소셜 로그인 관련 타입
export interface KakaoAuthRequest {
  code: string
}

export interface SocialAuthResponse {
  access_token: string
  token_type: string
  user_id: string
  is_new_user: boolean
}

// 카카오 로그인 인증 URL 가져오기
export const getKakaoAuthUrl = async (): Promise<string> => {
  const response = await fetch(createApiUrl('/auth/kakao/auth-url'))
  
  if (!response.ok) {
    throw new Error('카카오 로그인 URL을 가져올 수 없습니다')
  }
  
  const data = await response.json()
  return data.auth_url
}

// 카카오 OAuth 코드로 로그인
export const loginWithKakao = async (authCode: string): Promise<SocialAuthResponse> => {
  const response = await fetch(createApiUrl('/auth/kakao/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code: authCode }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || '카카오 로그인에 실패했습니다')
  }

  return response.json()
}

// 소셜 로그인 사용자를 위한 프로필 조회 (JWT 토큰 사용)
export const getSocialUserProfile = async (token: string, userId: string): Promise<Profile | null> => {
  try {
    const response = await fetch(createApiUrl('/profiles/me'), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    })
    
    if (!response.ok) return null
    
    return response.json()
  } catch {
    return null
  }
}
