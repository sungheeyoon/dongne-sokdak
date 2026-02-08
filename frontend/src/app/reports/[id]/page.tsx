'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReport, deleteReport } from '@/lib/api/reports'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import { AuthDialog } from '@/components/auth/AuthDialog'
import ReportModal from '@/components/ReportModal'
import EditReportModal from '@/components/EditReportModal'
import Comments from '@/components/Comments'
import VoteButton from '@/components/VoteButton'
import { ReportCategory, ReportStatus } from '@/types'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { parseReportLocation } from '@/lib/utils/locationDisplayUtils'
import { Pencil, Trash2, ArrowLeft, MapPin } from 'lucide-react'
import { 
  UiButton as Button,
  UiCard as Card,
  UiBadge as Badge,
  UiDialog as Dialog, 
  UiDialogContent as DialogContent, 
  UiDialogHeader as DialogHeader, 
  UiDialogTitle as DialogTitle,
  UiDialogFooter as DialogFooter,
  UiDialogDescription as DialogDescription
} from "@/components/ui"

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
})

const categoryLabels = {
  [ReportCategory.NOISE]: '소음',
  [ReportCategory.TRASH]: '쓰레기',
  [ReportCategory.FACILITY]: '시설물',
  [ReportCategory.TRAFFIC]: '교통',
  [ReportCategory.OTHER]: '기타'
}

const statusLabels = {
  [ReportStatus.OPEN]: '접수됨',
  [ReportStatus.IN_PROGRESS]: '처리중',
  [ReportStatus.RESOLVED]: '해결됨'
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const reportId = params.id as string
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: !!reportId
  })

  const deleteReportMutation = useMutation({
    mutationFn: () => deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setShowDeleteDialog(false)
      // Toast replacement would be good here, but relying on alert for now or just redirect
      // alert('제보가 삭제되었습니다.') 
      router.push('/')
    },
    onError: (error: any) => {
      // alert(`삭제 중 오류가 발생했습니다: ${error.message}`)
      console.error(error)
    }
  })

  const handleDeleteConfirm = () => {
    deleteReportMutation.mutate()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
            <div className="h-64 bg-gray-200 rounded-xl"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <p className="text-red-600 font-semibold mb-4">제보를 불러올 수 없습니다.</p>
            <Button onClick={() => router.push('/')}>
              홈으로 돌아가기
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  const isOwner = user && user.id === report.userId
  const locationInfo = parseReportLocation(report.address)

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <Header />
      <AuthDialog />
      <ReportModal />
      <EditReportModal 
        report={report || null}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation */}
        <button 
          onClick={() => router.push('/')}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> 목록으로
        </button>

        {/* 제보 정보 카드 */}
        <Card className="overflow-hidden shadow-sm border-0 ring-1 ring-black/5">
          {/* 헤더 섹션 */}
          <div className="p-6 md:p-8 border-b border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={
                    report.status === ReportStatus.OPEN ? 'destructive' : 
                    report.status === ReportStatus.IN_PROGRESS ? 'secondary' : 'default'
                  }>
                    {statusLabels[report.status]}
                  </Badge>
                  <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-100">
                    {categoryLabels[report.category]}
                  </Badge>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{report.title}</h1>
                <div className="text-sm text-gray-500 font-medium">
                  {formatDate(report.createdAt)}
                </div>
              </div>
              
              {isOwner && (
                <div className="flex gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex-1 md:flex-none"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" /> 수정
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="flex-1 md:flex-none"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> 삭제
                  </Button>
                </div>
              )}
            </div>

            {/* 이미지 섹션 */}
            {report.imageUrl && (
              <div className="mt-6 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                <img 
                  src={report.imageUrl} 
                  alt="제보 이미지" 
                  className="w-full max-h-[500px] object-contain bg-gray-50"
                />
              </div>
            )}
          </div>

          {/* 상세 내용 섹션 */}
          <div className="p-6 md:p-8 border-b border-gray-100 bg-white">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-1.5 h-6 bg-blue-500 rounded-full mr-3"></span>
              상세 내용
            </h2>
            <div className="prose prose-sm md:prose-base max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{report.description}</p>
            </div>
          </div>

          {/* 위치 섹션 */}
          <div className="p-6 md:p-8 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-1.5 h-6 bg-red-500 rounded-full mr-3"></span>
              위치 정보
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* 주소 정보 */}
              <div className="md:col-span-1 bg-white p-5 rounded-xl border border-gray-200 shadow-sm h-fit">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-500 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {locationInfo.showSeparate ? locationInfo.placeName : '주소'}
                    </h3>
                    <p className="text-sm text-gray-600 break-keep">
                      {locationInfo.address || '주소 정보가 없습니다.'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* 지도 */}
              <div className="md:col-span-2 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                <MapComponent 
                  reports={[report]} 
                  center={report.location}
                  zoom={3}
                  height="300px" 
                />
              </div>
            </div>
          </div>

          {/* 액션 섹션 */}
          <div className="p-6 md:p-8 bg-white border-t border-gray-100">
            <div className="flex items-center justify-between">
              <VoteButton reportId={report.id} initialCount={report.voteCount} />
            </div>
          </div>
        </Card>

        {/* 댓글 섹션 */}
        <Comments reportId={report.id} reportAuthorId={report.userId} />
      </main>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>제보 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 제보를 삭제하시겠습니까?<br/>
              삭제된 데이터는 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>취소</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>삭제하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
