'use client'

import { useState, useEffect } from 'react'
import { ReportCategory, ReportStatus, Report } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateReport, UpdateReportData } from '@/lib/api/reports'
import ImageUpload from './ImageUpload'

const categoryOptions = [
  { value: ReportCategory.NOISE, label: '소음', emoji: '🔊' },
  { value: ReportCategory.TRASH, label: '쓰레기', emoji: '🗑️' },
  { value: ReportCategory.FACILITY, label: '시설물', emoji: '🏗️' },
  { value: ReportCategory.TRAFFIC, label: '교통', emoji: '🚗' },
  { value: ReportCategory.OTHER, label: '기타', emoji: '📝' }
]

const statusOptions = [
  { value: ReportStatus.OPEN, label: '접수됨', color: 'text-red-800 bg-red-100 border-red-200' },
  { value: ReportStatus.IN_PROGRESS, label: '처리중', color: 'text-yellow-800 bg-yellow-100 border-yellow-200' },
  { value: ReportStatus.RESOLVED, label: '해결됨', color: 'text-green-800 bg-green-100 border-green-200' }
]

interface EditReportModalProps {
  report: Report | null
  isOpen: boolean
  onClose: () => void
}

export default function EditReportModal({ report, isOpen, onClose }: EditReportModalProps) {
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ReportCategory.OTHER,
    status: ReportStatus.OPEN,
    imageUrl: ''
  })

  // 제보 데이터가 변경될 때 폼 데이터 초기화
  useEffect(() => {
    if (report) {
      setFormData({
        title: report.title,
        description: report.description,
        category: report.category,
        status: report.status,
        imageUrl: report.imageUrl || ''
      })
    }
  }, [report])

  const updateReportMutation = useMutation({
    mutationFn: (data: UpdateReportData) => updateReport(report!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report', report!.id] })
      onClose()
      alert('제보가 성공적으로 수정되었습니다!')
    },
    onError: (error: any) => {
      alert(`제보 수정 중 오류가 발생했습니다: ${error.message}`)
    }
  })

  const handleImageSelect = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, imageUrl }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim()) {
      alert('제목과 내용을 모두 입력해주세요.')
      return
    }

    const updateData: UpdateReportData = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      status: formData.status,
      imageUrl: formData.imageUrl || undefined
    }

    updateReportMutation.mutate(updateData)
  }

  const handleClose = () => {
    onClose()
  }

  if (!isOpen || !report) return null

  return (
    <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">제보 수정</h2>
            <button
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-800 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 placeholder-gray-600"
                placeholder="예: 횡단보도 신호등 고장"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                카테고리
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ReportCategory })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.emoji} {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                상태
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ReportStatus })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                내용 *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none text-gray-900 placeholder-gray-600"
                rows={5}
                placeholder="상세한 상황을 설명해주세요"
                required
              />
            </div>

            <ImageUpload 
              onImageSelect={handleImageSelect}
              currentImage={formData.imageUrl}
            />

            <div className="flex space-x-4 pt-6">
              <button
                type="submit"
                disabled={updateReportMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateReportMutation.isPending ? '수정 중...' : '수정 완료'}
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
