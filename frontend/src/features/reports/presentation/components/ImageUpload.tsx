'use client'

import { useState, useRef } from 'react'
import { useImageUploadViewModel } from '../hooks/useImageUploadViewModel'

interface ImageUploadProps {
  onImageSelect: (imageUrl: string) => void
  currentImage?: string
}

export default function ImageUpload({ onImageSelect, currentImage }: ImageUploadProps) {
  const { uploadImage, isUploading } = useImageUploadViewModel()
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 이미지 압축 함수
  const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const img = new Image()

      img.onload = () => {
        // 비율 유지하면서 크기 조정
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
        const newWidth = img.width * ratio
        const newHeight = img.height * ratio

        canvas.width = newWidth
        canvas.height = newHeight

        // 이미지 그리기
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        // Blob으로 변환 후 File 객체 생성
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob!], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(compressedFile)
        }, 'image/jpeg', quality)
      }

      img.src = URL.createObjectURL(file)
    })
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (10MB 제한 - 압축 전)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하만 가능합니다.')
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }

    try {
      let processedFile = file

      // 이미지 크기가 2MB 이상이면 압축
      if (file.size > 2 * 1024 * 1024) {
        if (process.env.NODE_ENV === 'development') console.log('이미지 압축 시작:', file.size)
        processedFile = await compressImage(file)
        if (process.env.NODE_ENV === 'development') console.log('이미지 압축 완료:', processedFile.size)
      }

      // 미리보기 생성
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setPreview(result)
      }
      reader.readAsDataURL(processedFile)


      // Supabase Storage에 업로드 (ViewModel 사용)
      const uploadedUrl = await uploadImage(processedFile)

      if (uploadedUrl) {
        // 업로드된 URL을 부모 컴포넌트에 전달
        onImageSelect(uploadedUrl)
        if (process.env.NODE_ENV === 'development') console.log('이미지 업로드 성공:', uploadedUrl)
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      alert('이미지 업로드 중 오류가 발생했습니다.')
      // 실패 시 미리보기도 제거
      setPreview(null)
    }
  }

  const handleRemoveImage = () => {
    setPreview(null)
    onImageSelect('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-900">
          📷 이미지 첨부 (선택사항)
        </label>
        {preview && (
          <button
            type="button"
            onClick={handleRemoveImage}
            className="text-red-600 hover:text-red-800 text-sm font-semibold px-3 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            이미지 제거
          </button>
        )}
      </div>

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="업로드된 이미지"
            className="w-full max-h-64 object-cover rounded-lg border-2 border-gray-300"
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
          className="border-2 border-dashed border-gray-400 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <div className="space-y-2">
            <div className="text-5xl text-gray-400 mb-3">📷</div>
            <div>
              <p className="text-gray-700 font-semibold mb-1">클릭하여 이미지 업로드</p>
              <p className="text-sm text-gray-600 font-medium">PNG, JPG, GIF (최대 10MB)</p>
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
        disabled={isUploading}
      />

      {isUploading && (
        <div className="flex items-center justify-center space-x-2 text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm font-medium">업로드 중...</span>
        </div>
      )}
    </div>
  )
}
