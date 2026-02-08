'use client'

import { useState, useEffect } from 'react'
import { ReportCategory, ReportStatus, Report } from '@/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateReport, UpdateReportData } from '@/lib/api/reports'
import ImageUpload from './ImageUpload'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { 
  UiDialog as Dialog, 
  UiDialogContent as DialogContent, 
  UiDialogHeader as DialogHeader, 
  UiDialogTitle as DialogTitle,
  UiDialogFooter as DialogFooter,
  UiButton as Button,
  UiInput as Input,
  UiLabel as Label
} from "@/components/ui"

const categoryOptions = [
  { value: ReportCategory.NOISE, label: '소음' },
  { value: ReportCategory.TRASH, label: '쓰레기' },
  { value: ReportCategory.FACILITY, label: '시설물' },
  { value: ReportCategory.TRAFFIC, label: '교통' },
  { value: ReportCategory.OTHER, label: '기타' }
]

const statusOptions = [
  { value: ReportStatus.OPEN, label: '접수됨' },
  { value: ReportStatus.IN_PROGRESS, label: '처리중' },
  { value: ReportStatus.RESOLVED, label: '해결됨' }
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
      toast.success('제보가 수정되었습니다')
    },
    onError: (error: any) => {
      toast.error(`오류 발생: ${error.message}`)
    }
  })

  const handleImageSelect = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, imageUrl }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('제목과 내용을 입력해주세요')
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

  if (!report) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>제보 수정</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="제목을 입력하세요"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ReportCategory })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ReportStatus })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">내용</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              placeholder="상세 내용을 입력하세요"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>사진 수정</Label>
            <ImageUpload 
              onImageSelect={handleImageSelect}
              currentImage={formData.imageUrl}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={updateReportMutation.isPending}>
              {updateReportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              수정 완료
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}