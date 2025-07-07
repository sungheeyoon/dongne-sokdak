'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { getReports } from '@/lib/api/reports'
import { Report, ReportStatus } from '@/types'
import Header from '@/components/Header'
import AuthModal from '@/components/AuthModal'
import ReportModal from '@/components/ReportModal'
import EditReportModal from '@/components/EditReportModal'
import ReportCard from '@/components/ReportCard'

const statusOptions = [
  { value: 'all', label: '전체' },
  { value: ReportStatus.OPEN, label: '접수됨' },
  { value: ReportStatus.IN_PROGRESS, label: '처리중' },
  { value: ReportStatus.RESOLVED, label: '해결됨' }
]

export default function MyReportsPage() {
  const { user } = useAuth()
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [editingReport, setEditingReport] = useState<Report | null>(null)

  const { 
    data: reports = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['my-reports', user?.id, selectedStatus],
    queryFn: () => getReports({
      userId: user?.id,
      status: selectedStatus === 'all' ? undefined : selectedStatus as ReportStatus,
      limit: 100
    }),
    enabled: !!user?.id,
    refetchInterval: 30000,
  })

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AuthModal />
        <ReportModal />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">내 제보 목록</h1>
            <p className="text-gray-600 mb-6">로그인 후 내가 작성한 제보를 확인할 수 있습니다.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              홈으로 돌아가기
            </button>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AuthModal />
        <ReportModal />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">내 제보 목록</h1>
            <p className="text-red-500 mb-4">데이터를 불러오는 중 오류가 발생했습니다.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
            >
              다시 시도
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <AuthModal />
      <ReportModal />
      <EditReportModal 
        report={editingReport}
        isOpen={!!editingReport}
        onClose={() => setEditingReport(null)}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">내 제보 목록</h1>
          <p className="text-gray-600">내가 작성한 제보를 관리하고 상태를 확인할 수 있습니다.</p>
        </div>

        {/* 상태 필터 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-gray-700">상태별 필터:</span>
            <div className="flex space-x-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                    selectedStatus === option.value
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            총 {reports.length}개 제보
          </div>
        </div>

        {/* 제보 목록 */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
            ))}
          </div>
        ) : reports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
              <div key={report.id} className="relative">
                <ReportCard report={report} />
                
                {/* 수정 버튼 */}
                <div className="absolute top-4 right-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingReport(report)
                    }}
                    className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1 rounded-md text-sm font-medium shadow-sm transition-colors"
                  >
                    ✏️ 수정
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {selectedStatus === 'all' ? '작성한 제보가 없습니다' : `${statusOptions.find(opt => opt.value === selectedStatus)?.label} 제보가 없습니다`}
            </h3>
            <p className="text-gray-600 mb-6">
              새로운 제보를 작성해서 우리 동네 문제를 알려주세요!
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              제보 작성하러 가기
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
