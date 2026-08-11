'use client'

import { Report } from '../../domain/entities'
import { ReportCard as UIReportCard, ReportCardCategory, ReportCardStatus } from '@/shared/ui/ReportCard'

interface ReportCardProps {
    report: Report
}

export default function ReportCard({ report }: ReportCardProps) {
    return (
        <UIReportCard
            id={report.id}
            href={`/reports/${report.id}`}
            title={report.title}
            description={report.description}
            category={report.category as ReportCardCategory}
            status={report.status as ReportCardStatus}
            imageUrl={report.imageUrl}
            address={report.address}
            location={report.location ? { lat: report.location.lat, lng: report.location.lng } : undefined}
            voteCount={report.voteCount || 0}
            commentCount={report.commentCount || 0}
            createdAt={report.createdAt}
        />
    )
}
