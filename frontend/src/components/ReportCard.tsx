'use client'

import { Report } from '@/types'
import { useRouter } from 'next/navigation'
import { ReportCard as UIReportCard } from '@/components/ui/ReportCard'
import { useBreakpoint } from '@/hooks/useBreakpoint'

interface ReportCardProps {
  report: Report
}

export default function ReportCard({ report }: ReportCardProps) {
  const router = useRouter()
  const breakpoint = useBreakpoint()

  const handleClick = () => {
    router.push(`/reports/${report.id}`)
  }

  // Report 타입을 UI ReportCard Props에 맞게 변환
  const reportData = {
    id: report.id,
    title: report.title,
    description: report.description,
    category: report.category as 'NOISE' | 'TRASH' | 'FACILITY' | 'TRAFFIC' | 'OTHER',
    status: report.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED',
    imageUrl: report.imageUrl,
    address: report.address,
    location: report.location ? {
      lat: report.location.lat,
      lng: report.location.lng
    } : undefined,
    voteCount: report.voteCount || 0,
    commentCount: report.commentCount || 0,
    createdAt: report.createdAt,
    size: breakpoint as 'compact' | 'medium',
    onClick: handleClick
  }

  return (
    <UIReportCard
      {...reportData}
    />
  )
}
