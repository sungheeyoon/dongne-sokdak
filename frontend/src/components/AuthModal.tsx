'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUIStore } from '@/stores/useUIStore'

export default function AuthModal() {
  const { isAuthModalOpen, authMode, closeAuthModal } = useUIStore()
  const { signInWithEmail, signUpWithEmail, signInWithKakao, signInWithGoogle } = useAuth()
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
      setError('')
      await signInWithKakao()
      // signInWithKakao는 리다이렉트를 하므로 여기까지 오지 않음
    } catch (error: any) {
      console.error('카카오 로그인 오류:', error)
      setError(error.message || '카카오 로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      setError('')
      await signInWithGoogle()
      // signInWithGoogle은 리다이렉트를 하므로 여기까지 오지 않음
    } catch (error: any) {
      console.error('구글 로그인 오류:', error)
      setError(error.message || '구글 로그인 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  const handleBackdropClick = () => {
    closeAuthModal()
    resetForm()
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8 w-full max-w-md transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder:text-gray-400 placeholder:font-normal"
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder:text-gray-400 placeholder:font-normal"
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
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder:text-gray-400 placeholder:font-normal"
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

        {/* 구글 로그인 버튼 */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white hover:bg-gray-50 text-gray-900 py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 border border-gray-300"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.8055 8.0415H19V8H10V12H15.6515C14.827 14.3285 12.6115 16 10 16C6.6865 16 4 13.3135 4 10C4 6.6865 6.6865 4 10 4C11.5295 4 12.921 4.577 13.9805 5.5195L16.809 2.691C15.023 1.0265 12.634 0 10 0C4.4775 0 0 4.4775 0 10C0 15.5225 4.4775 20 10 20C15.5225 20 20 15.5225 20 10C20 9.3295 19.931 8.675 19.8055 8.0415Z" fill="#FFC107"/>
            <path d="M1.1535 5.3455L4.438 7.797C5.3275 5.59 7.4805 4 10 4C11.5295 4 12.921 4.577 13.9805 5.5195L16.809 2.691C15.023 1.0265 12.634 0 10 0C6.159 0 2.828 2.1685 1.1535 5.3455Z" fill="#FF3D00"/>
            <path d="M10 20C12.583 20 14.93 19.0115 16.7045 17.404L13.6085 14.785C12.5718 15.5742 11.3038 16.001 10 16C7.399 16 5.1910 14.3415 4.3585 12.027L1.097 14.5395C2.7525 17.778 6.1135 20 10 20Z" fill="#4CAF50"/>
            <path d="M19.8055 8.0415H19V8H10V12H15.6515C15.2571 13.1082 14.5467 14.0766 13.608 14.785L13.6085 14.785L16.7045 17.404C16.4855 17.6025 20 15 20 10C20 9.3295 19.931 8.675 19.8055 8.0415Z" fill="#1976D2"/>
          </svg>
          <span>{loading ? '로그인 중...' : 'Google 로그인'}</span>
        </button>

        {/* 카카오 로그인 버튼 (임시 숨김 - 비즈앱 승인 후 활성화) */}
        {false && (
          <button
            onClick={handleKakaoLogin}
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2 mt-3"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M10 2C14.4183 2 18 4.69067 18 8C18 11.3093 14.4183 14 10 14C9.1819 14 8.39259 13.9059 7.64815 13.7296L4 16V12.8148C2.32963 11.6111 1.33333 9.93333 1.33333 8C1.33333 4.69067 4.91496 2 10 2Z" fill="#3C1E1E"/>
            </svg>
            <span>{loading ? '로그인 중...' : '카카오로 로그인'}</span>
          </button>
        )}
      </div>
    </div>
  )
}
