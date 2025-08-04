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

