'use client'

import { useState, useEffect } from 'react'
import { useProfileViewModel } from '@/features/profile/presentation/hooks/useProfileViewModel'
import Avatar from './Avatar'
import { X, Save, Loader2 } from 'lucide-react'


interface ProfileEditModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { profile, isLoading, updateProfile, isUpdatingProfile, updateAvatar, isUpdatingAvatar } = useProfileViewModel()

  const [nickname, setNickname] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname || '')
    }
  }, [profile])

  // 컴포넌트 언마운트 시 미리보기 URL 정리
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  // 파일 선택 시 미리보기만 생성
  const handleAvatarSelect = (file: File) => {
    console.log('📁 파일 선택됨:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    // 파일 검증
    if (file.size > 5 * 1024 * 1024) { // 5MB 제한
      alert('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('지원하지 않는 파일 형식입니다. (JPEG, PNG, WebP, GIF만 가능)')
      return
    }

    // 기존 미리보기 URL 정리
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    // 새 미리보기 URL 생성
    const newPreviewUrl = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(newPreviewUrl)
  }

  const handleSave = async () => {
    if (!nickname.trim()) {
      alert('닉네임을 입력해주세요.')
      return
    }

    try {
      setIsUploading(true)

      // 1. 선택된 아바타 파일이 있으면 먼저 업로드
      if (selectedFile) {
        console.log('🔄 아바타 업로드 중...')
        await updateAvatar(selectedFile)
        console.log('✅ 아바타 업데이트 완료!')
      }

      // 2. 닉네임 업데이트 (변경되었을 경우만)
      if (nickname.trim() !== profile?.nickname) {
        console.log('🔄 닉네임 업데이트 중...')
        await updateProfile({ nickname: nickname.trim() })
        console.log('✅ 닉네임 업데이트 완료!')
      }

      // 3. 성공 시 모달 닫기 및 상태 초기화
      setSelectedFile(null)
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      onClose()

    } catch (error) {
      console.error('❌ 프로필 저장 오류:', error)
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      alert(`프로필 저장 실패: ${errorMessage}`)
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  const handleClose = () => {
    // 상태 초기화
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setNickname(profile?.nickname || '')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">프로필 편집</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin" size={32} />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 아바타 */}
            <div className="flex flex-col items-center">
              <Avatar
                src={previewUrl || profile?.avatarUrl}
                size="xl"
                editable
                onImageSelect={handleAvatarSelect}
              />
              {selectedFile && (
                <div className="mt-2 text-sm text-blue-600">
                  새 이미지 선택됨: {selectedFile.name}
                </div>
              )}
              {isUploading && (
                <div className="mt-2 text-sm text-gray-500">
                  저장 중...
                </div>
              )}
            </div>

            {/* 닉네임 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="닉네임을 입력하세요"
                maxLength={20}
              />
            </div>

            {/* 저장 버튼 */}
            <button
              onClick={handleSave}
              disabled={isUpdatingProfile || isUpdatingAvatar || isUploading}
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {(isUpdatingProfile || isUpdatingAvatar || isUploading) ? (
                <Loader2 className="animate-spin mr-2" size={16} />
              ) : (
                <Save className="mr-2" size={16} />
              )}
              {(isUpdatingProfile || isUpdatingAvatar || isUploading) ? '저장 중...' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
