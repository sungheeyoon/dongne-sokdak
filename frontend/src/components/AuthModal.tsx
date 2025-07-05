'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/useUIStore'

export default function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal } = useUIStore()
  const { signInWithEmail, signUpWithEmail, signInWithKakao } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isAuthModalOpen) return null

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setNickname('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (authMode === 'signin') {
        await signInWithEmail(email, password)
      } else {
        if (!nickname.trim()) {
          setError('닉네임을 입력해주세요.')
          setLoading(false)
          return
        }
        // 회원가입 시 닉네임도 함께 전달
        await signUpWithEmail(email, password, nickname.trim())
      }
      closeAuthModal()
      resetForm()
    } catch (err: any) {
      setError(err.message || '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleKakaoLogin = async () => {
    try {
      setLoading(true)
      await signInWithKakao()
    } catch (error: any) {
      setError(error.message || '카카오 로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8 w-full max-w-md transform transition-all">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {authMode === 'signin' ? '로그인' : '회원가입'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-600"
              placeholder="example@email.com"
              required
            />
          </div>

          {authMode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-600"
                placeholder="사용할 닉네임"
                required
                minLength={2}
                maxLength={20}
              />
              <p className="text-xs text-gray-600 mt-1">2-20자 사이로 입력해주세요</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-600"
              placeholder="비밀번호 입력"
              required
              minLength={6}
            />
            {authMode === 'signup' && (
              <p className="text-xs text-gray-600 mt-1">6자 이상 입력해주세요</p>
            )}
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
              <p className="font-semibold text-red-800">오류 발생</p>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '처리중...' : (authMode === 'signin' ? '로그인' : '회원가입')}
            </button>
            <button
              type="button"
              onClick={() => {
                closeAuthModal()
                resetForm()
              }}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              취소
            </button>
          </div>
        </form>

        {/* 소셜 로그인 구분선 */}
        <div className="my-6 flex items-center">
          <hr className="flex-1 border-gray-300" />
          <span className="px-4 text-sm text-gray-500">또는</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        {/* 카카오 로그인 버튼 */}
        <button
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 2C14.4183 2 18 4.69067 18 8C18 11.3093 14.4183 14 10 14C9.1819 14 8.39259 13.9059 7.64815 13.7296L4 16V12.8148C2.32963 11.6111 1.33333 9.93333 1.33333 8C1.33333 4.69067 4.91496 2 10 2Z" fill="#3C1E1E"/>
          </svg>
          <span>{loading ? '로그인 중...' : '카카오로 로그인'}</span>
        </button>
      </div>
    </div>
  )
}
