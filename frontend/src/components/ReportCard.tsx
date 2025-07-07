'use client'

import { Report, ReportCategory, ReportStatus } from '@/types'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import MarkerIcon from '@/components/ui/MarkerIcon'

interface ReportCardProps {
  report: Report
}

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

export default function ReportCard({ report }: ReportCardProps) {
  const router = useRouter()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleClick = () => {
    router.push(`/reports/${report.id}`)
  }

  return (
    <div 
      onClick={handleClick}
      className="bg-white rounded-xl shadow-sm border-2 border-gray-100 p-4 md:p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-200 cursor-pointer transform hover:-translate-y-1 active:scale-95 flex flex-col min-h-[280px]"
    >
      {/* 상단: 제목과 상태 */}
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <h3 className="font-bold text-base md:text-lg text-gray-900 line-clamp-2 leading-tight flex-1 pr-2">
          {report.title}
        </h3>
        <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${statusColors[report.status]} flex-shrink-0`}>
          {statusLabels[report.status]}
        </span>
      </div>
      
      {/* 중간: 내용 */}
      <p className="text-gray-700 text-sm mb-3 md:mb-4 line-clamp-3 leading-relaxed flex-1">
        {report.description}
      </p>
      
      {/* 이미지 (있을 경우) */}
      {report.imageUrl && (
        <div className="mb-3 md:mb-4 relative overflow-hidden rounded-lg border border-gray-200">
          <Image
            src={report.imageUrl} 
            alt="제보 이미지" 
            width={400}
            height={160}
            className="w-full h-32 md:h-40 object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
            onError={(e) => {
              // 이미지 로드 실패 시 일반 img 태그로 폴백
              const target = e.target as HTMLImageElement;
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<img src="${report.imageUrl}" alt="제보 이미지" class="w-full h-32 md:h-40 object-cover" />`;
              }
            }}
          />
        </div>
      )}
      
      {/* 하단: 카테고리, 공감, 댓글, 날짜 - 항상 맨 아래 고정 */}
      <div className="mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center text-sm gap-2 md:gap-0">
          <div className="flex items-center space-x-2 md:space-x-4">
            <span className="bg-blue-50 text-blue-700 px-2 md:px-3 py-1 rounded-full font-medium border border-blue-200 text-xs md:text-sm">
              {categoryLabels[report.category]}
            </span>
            <div className="flex items-center space-x-2 md:space-x-3 text-gray-600">
              <span className="flex items-center space-x-1 touch-manipulation">
                <span>👍</span>
                <span className="font-medium">{report.voteCount || 0}</span>
              </span>
              <span className="flex items-center space-x-1 touch-manipulation">
                <span>💬</span>
                <span className="font-medium">{report.commentCount || 0}</span>
              </span>
            </div>
          </div>
          <span className="text-gray-500 font-medium text-xs md:text-sm">{formatDate(report.createdAt)}</span>
        </div>

        {/* 주소 및 위치 (있을 경우) */}
        {(report.address || report.location) && (
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-100">
            <div className="flex items-center">
              <MarkerIcon category={report.category} className="w-4 h-5 mr-2" />
              <span className="text-gray-600 text-xs md:text-sm truncate">
                {report.address || `위도 ${report.location.lat.toFixed(4)}, 경도 ${report.location.lng.toFixed(4)}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
