'use client'

import React from 'react'
import { MapPin, Calendar, User, MessageCircle, ThumbsUp, Tag } from 'lucide-react'
import { BaseModal } from './BaseModal'
import { Button } from './button'
import { Badge } from './badge'
import { Report } from '@/types'
import { formatToAdministrativeAddress } from '@/lib/utils/addressUtils'

export interface ReportDetailModalProps {
  isOpen: boolean
  onClose: () => void
  reports: Report[]
  locationName?: string
  onReportClick?: (reportId: string) => void
}

interface SingleReportProps {
  report: Report
  onReportClick?: (reportId: string) => void
}

const getCategoryLabel = (category: string) => {
  const categoryLabels = {
    NOISE: '소음',
    TRASH: '쓰레기',
    FACILITY: '시설물',
    TRAFFIC: '교통',
    OTHER: '기타'
  }
  return categoryLabels[category as keyof typeof categoryLabels] || category
}

const getCategoryColor = (category: string) => {
  const colors = {
    NOISE: 'bg-red-100 text-red-800',
    TRASH: 'bg-teal-100 text-teal-800',
    FACILITY: 'bg-blue-100 text-blue-800',
    TRAFFIC: 'bg-green-100 text-green-800',
    OTHER: 'bg-yellow-100 text-yellow-800'
  }
  return colors[category as keyof typeof colors] || colors.OTHER
}

const SingleReport: React.FC<SingleReportProps> = ({ report, onReportClick }) => {
  const handleClick = () => {
    if (onReportClick) {
      onReportClick(report.id)
    }
  }

  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
      onClick={handleClick}
    >
      <div className="flex items-start space-x-4">
        {/* 제보 이미지 (있는 경우) */}
        {report.imageUrl && (
          <div className="flex-shrink-0 w-16 h-16">
            <img
              src={report.imageUrl}
              alt="제보 이미지"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        )}
        
        {/* 제보 내용 */}
        <div className="flex-1 min-w-0">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Badge
                variant="secondary"
                className={getCategoryColor(report.category)}
              >
                <Tag className="w-3 h-3 mr-1" />
                {getCategoryLabel(report.category)}
              </Badge>
              
              <span className="text-xs text-gray-500">
                {new Date(report.createdAt).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
          
          {/* 제목 */}
          <h4 className="font-semibold text-gray-900 mb-2 line-clamp-1">
            {report.title}
          </h4>
          
          {/* 설명 */}
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {report.description}
          </p>
          
          {/* 위치 및 통계 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center text-xs text-gray-500">
              <MapPin className="w-3 h-3 mr-1" />
              <span className="truncate">{formatToAdministrativeAddress(report.address || '')}</span>
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span className="flex items-center">
                <ThumbsUp className="w-3 h-3 mr-1" />
                {report.voteCount || 0}
              </span>
              <span className="flex items-center">
                <MessageCircle className="w-3 h-3 mr-1" />
                {report.commentCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  reports,
  locationName = '선택한 위치',
  onReportClick
}) => {
  const reportCount = reports.length

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${locationName} 제보${reportCount > 1 ? ` (${reportCount}개)` : ''}`}
      size="lg"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* 위치 정보 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span>{locationName}에서 발견된 {reportCount}개의 제보</span>
          </div>
        </div>

        {/* 제보 목록 */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {reports.map((report, index) => (
            <SingleReport
              key={report.id}
              report={report}
              onReportClick={onReportClick}
            />
          ))}
        </div>

        {/* 안내 메시지 */}
        <div className="text-center text-sm text-gray-500 pt-4 border-t border-gray-200">
          제보를 클릭하면 상세 페이지로 이동합니다
        </div>
      </div>
    </BaseModal>
  )
}

export default ReportDetailModal