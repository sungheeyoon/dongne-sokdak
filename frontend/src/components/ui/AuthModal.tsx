'use client'

import React, { useState } from 'react'
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react'
import { BaseModal } from './BaseModal'
import { Form, FormActions } from './Form'
import { Input } from './Input'
import { Button } from './Button'
import { Alert } from './Alert'

export interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'signin' | 'signup'
  onModeChange: (mode: 'signin' | 'signup') => void
  onEmailAuth: (email: string, password: string, nickname?: string) => Promise<void>
  onGoogleAuth: () => Promise<void>
  onKakaoAuth?: () => Promise<void>
  loading?: boolean
  error?: string
  showKakao?: boolean
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  mode,
  onModeChange,
  onEmailAuth,
  onGoogleAuth,
  onKakaoAuth,
  loading = false,
  error,
  showKakao = false
}) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setNickname('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (mode === 'signin') {
        await onEmailAuth(email, password)
      } else {
        await onEmailAuth(email, password, nickname.trim())
      }
      onClose()
      resetForm()
    } catch (err) {
      // 에러는 부모 컴포넌트에서 처리
    }
  }

  const handleSocialAuth = async (provider: 'google' | 'kakao') => {
    try {
      if (provider === 'google') {
        await onGoogleAuth()
      } else if (provider === 'kakao' && onKakaoAuth) {
        await onKakaoAuth()
      }
    } catch (err) {
      // 에러는 부모 컴포넌트에서 처리
    }
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'signin' ? '로그인' : '회원가입'}
      size="sm"
      className="w-full max-w-md"
    >
      <Form onSubmit={handleSubmit} spacing="md">
        {/* 모드 전환 탭 */}
        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => onModeChange('signin')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
              mode === 'signin'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => onModeChange('signup')}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
              mode === 'signup'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 이메일 입력 */}
        <Input
          type="email"
          label="이메일"
          placeholder="example@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          startIcon={<Mail className="h-4 w-4" />}
          required
        />

        {/* 닉네임 입력 (회원가입 시에만) */}
        {mode === 'signup' && (
          <Input
            type="text"
            label="닉네임"
            placeholder="사용할 닉네임"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            startIcon={<User className="h-4 w-4" />}
            hint="2-20자 사이로 입력해주세요"
            minLength={2}
            maxLength={20}
            required
          />
        )}

        {/* 비밀번호 입력 */}
        <Input
          type={showPassword ? 'text' : 'password'}
          label="비밀번호"
          placeholder="비밀번호 입력"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          startIcon={<Lock className="h-4 w-4" />}
          endIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          hint={mode === 'signup' ? '6자 이상 입력해주세요' : undefined}
          minLength={6}
          required
        />

        {/* 에러 표시 */}
        {error && (
          <Alert
            type="error"
            title="오류 발생"
            message={error}
          />
        )}

        {/* 폼 액션 버튼 */}
        <FormActions align="between" spacing="md">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
          >
            {mode === 'signin' ? '로그인' : '회원가입'}
          </Button>
        </FormActions>

        {/* 소셜 로그인 구분선 */}
        <div className="flex items-center my-6">
          <hr className="flex-1 border-gray-300" />
          <span className="px-4 text-sm text-gray-500">또는</span>
          <hr className="flex-1 border-gray-300" />
        </div>

        {/* 구글 로그인 버튼 */}
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => handleSocialAuth('google')}
          disabled={loading}
          className="flex items-center justify-center space-x-2"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M19.8055 8.0415H19V8H10V12H15.6515C14.827 14.3285 12.6115 16 10 16C6.6865 16 4 13.3135 4 10C4 6.6865 6.6865 4 10 4C11.5295 4 12.921 4.577 13.9805 5.5195L16.809 2.691C15.023 1.0265 12.634 0 10 0C4.4775 0 0 4.4775 0 10C0 15.5225 4.4775 20 10 20C15.5225 20 20 15.5225 20 10C20 9.3295 19.931 8.675 19.8055 8.0415Z" fill="#FFC107"/>
            <path d="M1.1535 5.3455L4.438 7.797C5.3275 5.59 7.4805 4 10 4C11.5295 4 12.921 4.577 13.9805 5.5195L16.809 2.691C15.023 1.0265 12.634 0 10 0C6.159 0 2.828 2.1685 1.1535 5.3455Z" fill="#FF3D00"/>
            <path d="M10 20C12.583 20 14.93 19.0115 16.7045 17.404L13.6085 14.785C12.5718 15.5742 11.3038 16.001 10 16C7.399 16 5.1910 14.3415 4.3585 12.027L1.097 14.5395C2.7525 17.778 6.1135 20 10 20Z" fill="#4CAF50"/>
            <path d="M19.8055 8.0415H19V8H10V12H15.6515C15.2571 13.1082 14.5467 14.0766 13.608 14.785L13.6085 14.785L16.7045 17.404C16.4855 17.6025 20 15 20 10C20 9.3295 19.931 8.675 19.8055 8.0415Z" fill="#1976D2"/>
          </svg>
          <span>Google 로그인</span>
        </Button>

        {/* 카카오 로그인 버튼 (조건부) */}
        {showKakao && onKakaoAuth && (
          <Button
            type="button"
            variant="outline"
            fullWidth
            onClick={() => handleSocialAuth('kakao')}
            disabled={loading}
            className="flex items-center justify-center space-x-2 bg-yellow-400 hover:bg-yellow-500 border-yellow-400 text-gray-900"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M10 2C14.4183 2 18 4.69067 18 8C18 11.3093 14.4183 14 10 14C9.1819 14 8.39259 13.9059 7.64815 13.7296L4 16V12.8148C2.32963 11.6111 1.33333 9.93333 1.33333 8C1.33333 4.69067 4.91496 2 10 2Z" fill="#3C1E1E"/>
            </svg>
            <span>카카오로 로그인</span>
          </Button>
        )}
      </Form>
    </BaseModal>
  )
}

export default AuthModal