'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getReport, deleteReport } from '@/lib/api/reports'
import { useAuth } from '@/hooks/useAuth'
import Header from '@/components/Header'
import AuthModal from '@/components/AuthModal'
import ReportModal from '@/components/ReportModal'
import EditReportModal from '@/components/EditReportModal'
import Comments from '@/components/Comments'
import VoteButton from '@/components/VoteButton'
import { ReportCategory, ReportStatus } from '@/types'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { parseReportLocation } from '@/lib/utils/locationDisplayUtils'
import { Pencil } from 'lucide-react'

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

const statusColors = {
  [ReportStatus.OPEN]: 'bg-red-100 text-red-800 border border-red-200',
  [ReportStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  [ReportStatus.RESOLVED]: 'bg-green-100 text-green-800 border border-green-200'
}

export default function ReportDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const reportId = params.id as string
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => getReport(reportId),
    enabled: !!reportId
  })

  const deleteReportMutation = useMutation({
    mutationFn: () => deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      alert('제보가 삭제되었습니다.')
      router.push('/')
    },
    onError: (error: any) => {
      alert(`삭제 중 오류가 발생했습니다: ${error.message}`)
    }
  })

  const handleDelete = () => {
    if (window.confirm('정말로 이 제보를 삭제하시겠습니까?')) {
      deleteReportMutation.mutate()
    }
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AuthModal />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AuthModal />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-red-600 font-semibold mb-4">제보를 불러올 수 없습니다.</p>
            <button 
              onClick={() => router.push('/')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              홈으로 돌아가기
            </button>
          </div>
        </main>
      </div>
    )
  }

  const isOwner = user && user.id === report.userId
  
  // 위치 정보 파싱
  const locationInfo = parseReportLocation(report.address)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <AuthModal />
      <ReportModal />
      <EditReportModal 
        report={report || null}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* 제보 정보 카드 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
          {/* 헤더 섹션 - 카테고리, 상태, 제목, 시간 */}
          <div className="p-6 border-b border-gray-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[report.status]}`}>
                    {statusLabels[report.status]}
                  </span>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold border border-blue-300">
                    {categoryLabels[report.category]}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{report.title}</h1>
                <div className="text-sm text-gray-600 font-medium">
                  {formatDate(report.createdAt)}
                </div>
              </div>
              
              {isOwner && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> 수정
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteReportMutation.isPending}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors"
                  >
                    {deleteReportMutation.isPending ? '삭제 중...' : '🗑️ 삭제'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 이미지 섹션 */}
          {report.imageUrl && (
            <div className="border-b border-gray-300">
              <img 
                src={report.imageUrl} 
                alt="제보 이미지" 
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}

          {/* 상세 내용 섹션 */}
          <div className="p-6 border-b border-gray-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
              상세 내용
            </h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{report.description}</p>
            </div>
          </div>

          {/* 위치 섹션 */}
          <div className="p-6 border-b border-gray-300">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="w-2 h-2 bg-red-600 rounded-full mr-3"></span>
              위치 정보
            </h2>
            
            {/* 주소 정보 */}
            {report.address && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                {locationInfo.showSeparate ? (
                  <div>
                    <div className="font-semibold text-gray-900 text-lg mb-1">
                      {locationInfo.placeName}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {locationInfo.address}
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-800 font-medium">
                    {locationInfo.address}
                  </div>
                )}
              </div>
            )}
            
            {/* 지도 */}
            <div className="rounded-lg overflow-hidden border border-gray-300">
              <MapComponent 
                reports={[report]} 
                center={report.location}
                zoom={2}
                height="300px" 
              />
            </div>
          </div>

          {/* 액션 섹션 */}
          <div className="p-6">
            <div className="flex items-center justify-between">
              <VoteButton reportId={report.id} initialCount={report.voteCount} />
              <button
                onClick={() => router.push('/')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
              >
                목록으로 돌아가기
              </button>
            </div>
          </div>
        </div>

        {/* 댓글 섹션 */}
        <Comments reportId={report.id} reportAuthorId={report.userId} />
      </main>
    </div>
  )
}