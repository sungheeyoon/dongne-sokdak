'use client'

import { useState, useEffect } from 'react'
import { useReportManagement, ReportManagement, ReportFilters } from '@/hooks/useReportManagement'
import ReportDetailModal from './ReportDetailModal'
import { 
  FileText, Search, Filter, Eye, Trash2, CheckCircle, 
  Clock, AlertTriangle, Camera, ThumbsUp, MessageCircle,
  RefreshCw, X, Users, Mail 
} from 'lucide-react'

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
        <h1 className="text-4xl font-bold text-gray-900 flex items-center">
          <FileText className="w-8 h-8 mr-4 text-red-600" />
          제보 관리
        </h1>
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
          <div className="text-sm text-gray-500">총 제보 수</div>
          <div className="text-2xl font-bold text-red-600">{reports.length}</div>
        </div>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2 text-gray-600" />
          필터 및 검색
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 상태 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1 text-orange-500" />
              상태
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="OPEN">접수됨</option>
              <option value="IN_PROGRESS">처리중</option>
              <option value="RESOLVED">해결됨</option>
            </select>
          </div>

          {/* 카테고리 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <FileText className="w-4 h-4 mr-1 text-blue-500" />
              카테고리
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => handleFilterChange({ category: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <Search className="w-4 h-4 mr-1 text-emerald-500" />
              검색
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="제목, 내용, 사용자명으로 검색..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange({ search: e.target.value || undefined })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 일괄 작업 버튼 */}
      {selectedReports.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-lg font-medium">
              <CheckCircle className="w-4 h-4 mr-2" />
              {selectedReports.length}개 선택됨
            </div>
            <button
              onClick={() => handleBulkStatusChange('IN_PROGRESS')}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all duration-200 font-medium"
            >
              <Clock className="w-4 h-4 mr-2" />
              처리중으로 변경
            </button>
            <button
              onClick={() => handleBulkStatusChange('RESOLVED')}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 font-medium"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              해결됨으로 변경
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-medium"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              삭제
            </button>
            <button
              onClick={() => setSelectedReports([])}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 font-medium"
            >
              <X className="w-4 h-4 mr-2" />
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
                            <Camera className="w-3 h-3 mr-1" />
                            이미지
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3">
                        <Users className="w-4 h-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {report.user_nickname}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {report.user_email}
                        </div>
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
                      <span className="flex items-center">
                        <ThumbsUp className="w-4 h-4 mr-1 text-blue-500" />
                        {report.votes_count}
                      </span>
                      <span className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1 text-green-500" />
                        {report.comments_count}
                      </span>
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
                        className="flex items-center px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm font-medium"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        상세
                      </button>
                      <button
                        onClick={() => deleteReport(report.id, '관리자에 의한 삭제')}
                        className="flex items-center px-3 py-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
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