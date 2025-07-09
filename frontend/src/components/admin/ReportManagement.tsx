'use client'

import { useState, useEffect } from 'react'
import { useReportManagement, ReportManagement, ReportFilters } from '@/hooks/useReportManagement'
import ReportDetailModal from './ReportDetailModal'

import { getStatusColor, getCategoryLabel, getStatusLabel } from '@/lib/constants/status';

export default function ReportManagementComponent() {
  const {
    reports,
    loading,
    error,
    fetchReports,
    updateReportStatus,
    deleteReport,
    bulkReportAction
  } = useReportManagement()

  const [filters, setFilters] = useState<ReportFilters>({
    skip: 0,
    limit: 20
  })
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchReports(filters)
  }, [])

  const handleFilterChange = (newFilters: Partial<ReportFilters>) => {
    const updatedFilters = { ...filters, ...newFilters, skip: 0 }
    setFilters(updatedFilters)
    fetchReports(updatedFilters)
  }

  const handleSelectReport = (reportId: string, selected: boolean) => {
    if (selected) {
      setSelectedReports([...selectedReports, reportId])
    } else {
      setSelectedReports(selectedReports.filter(id => id !== reportId))
    }
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedReports(reports.map(r => r.id))
    } else {
      setSelectedReports([])
    }
  }

  const handleStatusChange = async (reportId: string, newStatus: string, comment?: string) => {
    try {
      await updateReportStatus(reportId, newStatus, comment)
    } catch (error) {
      console.error('Status change failed:', error)
    }
  }

  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      await bulkReportAction(selectedReports, 'change_status', { newStatus })
      setSelectedReports([])
      setShowBulkActions(false)
    } catch (error) {
      console.error('Bulk status change failed:', error)
    }
  }

  const handleBulkDelete = async () => {
    if (confirm(`선택된 ${selectedReports.length}개의 제보를 삭제하시겠습니까?`)) {
      try {
        await bulkReportAction(selectedReports, 'delete')
        setSelectedReports([])
        setShowBulkActions(false)
      } catch (error) {
        console.error('Bulk delete failed:', error)
      }
    }
  }

  const handleLoadMore = () => {
    const newFilters = { ...filters, skip: (filters.skip || 0) + (filters.limit || 20) }
    setFilters(newFilters)
    fetchReports(newFilters)
  }

  if (loading && reports.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">제보 관리</h1>
        <div className="text-sm text-gray-500">
          총 {reports.length}개의 제보
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 상태 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="OPEN">접수됨</option>
              <option value="IN_PROGRESS">처리중</option>
              <option value="RESOLVED">해결됨</option>
            </select>
          </div>

          {/* 카테고리 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleFilterChange({ category: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 카테고리</option>
              <option value="NOISE">소음</option>
              <option value="TRASH">쓰레기</option>
              <option value="FACILITY">시설</option>
              <option value="TRAFFIC">교통</option>
              <option value="OTHER">기타</option>
            </select>
          </div>

          {/* 검색 */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색
            </label>
            <input
              type="text"
              placeholder="제목, 내용, 사용자명으로 검색..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange({ search: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium placeholder:text-gray-400 placeholder:font-normal"
            />
          </div>
        </div>
      </div>

      {/* 일괄 작업 버튼 */}
      {selectedReports.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-blue-800">
              {selectedReports.length}개 선택됨
            </span>
            <button
              onClick={() => handleBulkStatusChange('IN_PROGRESS')}
              className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
            >
              처리중으로 변경
            </button>
            <button
              onClick={() => handleBulkStatusChange('RESOLVED')}
              className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
            >
              해결됨으로 변경
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
            >
              삭제
            </button>
            <button
              onClick={() => setSelectedReports([])}
              className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
            >
              선택 취소
            </button>
          </div>
        </div>
      )}

      {/* 제보 목록 */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedReports.length === reports.length && reports.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  제보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  사용자
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  통계
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedReports.includes(report.id)}
                      onChange={(e) => handleSelectReport(report.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 truncate max-w-xs">
                        {report.title}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {report.description}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {getCategoryLabel(report.category)}
                        </span>
                        {report.image_url && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            📷 이미지
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {report.user_nickname}
                      </div>
                      <div className="text-sm text-gray-500">
                        {report.user_email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={report.status}
                      onChange={(e) => handleStatusChange(report.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${getStatusColor(report.status)}`}
                    >
                      <option value="OPEN">접수됨</option>
                      <option value="IN_PROGRESS">처리중</option>
                      <option value="RESOLVED">해결됨</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex gap-4">
                      <span>👍 {report.votes_count}</span>
                      <span>💬 {report.comments_count}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div>
                      {new Date(report.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-xs">
                      {new Date(report.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedReportId(report.id)
                          setShowDetailModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        상세
                      </button>
                      <button
                        onClick={() => deleteReport(report.id, '관리자에 의한 삭제')}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 더 보기 버튼 */}
        {reports.length >= (filters.limit || 20) && (
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full py-2 px-4 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? '로딩 중...' : '더 보기'}
            </button>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && reports.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">제보가 없습니다</div>
          <div className="text-gray-400 text-sm mt-2">필터를 조정해보세요</div>
        </div>
      )}

      {/* 제보 상세 모달 */}
      {showDetailModal && selectedReportId && (
        <ReportDetailModal
          reportId={selectedReportId}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedReportId(null)
            // 모달 닫힌 후 목록 새로고침
            fetchReports(filters)
          }}
        />
      )}
    </div>
  )
}