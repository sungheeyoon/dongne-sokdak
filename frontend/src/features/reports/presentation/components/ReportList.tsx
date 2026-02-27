import React from 'react'
import { Report } from '../../domain/entities'
import ReportCard from './ReportCard'
import { CardSkeleton } from '@/shared/ui/LoadingSpinner'

interface ReportListProps {
    reports: Report[]
    isLoading: boolean
    emptyMessage?: React.ReactNode
}

export default function ReportList({ reports, isLoading, emptyMessage }: ReportListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        )
    }

    if (reports.length === 0 && emptyMessage) {
        return <>{emptyMessage}</>
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
            ))}
        </div>
    )
}
