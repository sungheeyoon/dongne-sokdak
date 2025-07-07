// 디버깅용 ImageUpload 컴포넌트 (임시)
'use client'

import { useState, useRef } from 'react'
import { uploadImage } from '@/lib/storage'

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void
  currentImage?: string
}

export default function ImageUpload({ onImageSelect, currentImage }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setDebugInfo(`파일 선택됨: ${file.name} (${file.size} bytes)`)

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하만 가능합니다.')
      return
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploading(true)
    setDebugInfo(prev => prev + '\n업로드 시작...')

    try {
      // 먼저 미리보기 생성
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPreview(result)
        setDebugInfo(prev => prev + '\n미리보기 생성 완료')
      }
      reader.readAsDataURL(file)

      // 실제 Supabase Storage에 업로드
      setDebugInfo(prev => prev + '\nSupabase 업로드 시작...')
      const uploadedUrl = await uploadImage(file)
      
      // 업로드된 URL을 부모 컴포넌트에 전달
      onImageSelect(uploadedUrl)
      
      setDebugInfo(prev => prev + `\n업로드 성공: ${uploadedUrl}`)
      console.log('이미지 업로드 성공:', uploadedUrl)
      
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      setDebugInfo(prev => prev + `\n업로드 실패: ${error}`)
      alert('이미지 업로드 중 오류가 발생했습니다.')
      // 실패 시 미리보기도 제거
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setPreview(null)
    onImageSelect('')
    setDebugInfo('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-900">
          이미지 첨부 (선택사항)
        </label>
        {preview && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            이미지 제거
          </button>
        )}
      </div>

      {/* 디버그 정보 */}
      {debugInfo && (
        <div className="bg-gray-100 p-3 rounded text-xs font-mono whitespace-pre-line text-gray-700">
          {debugInfo}
        </div>
      )}

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="업로드된 이미지"
            className="w-full max-h-64 object-cover rounded-lg border-2 border-gray-200"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 px-3 py-1 rounded-lg text-sm font-medium transition-all"
            >
              이미지 변경
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
        >
          <div className="space-y-2">
            <div className="text-4xl text-gray-400">📷</div>
            <div>
              <p className="text-gray-600 font-medium">클릭하여 이미지 업로드</p>
              <p className="text-sm text-gray-500">PNG, JPG, GIF (최대 5MB)</p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {uploading && (
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm font-medium">업로드 중...</span>
        </div>
      )}
    </div>
  )
}
