import React from 'react'
import { Report } from '../../domain/entities'
import ReportCard from './ReportCard'
import { ReportCardSkeleton } from '@/shared/ui/ReportCard'
import { UiButton } from '@/shared/ui'

interface ReportListProps {
    reports: Report[]
    isLoading: boolean
    emptyMessage?: React.ReactNode
    currentPage?: number
    totalPages?: number
    onPageChange?: (page: number) => void
}

export default function ReportList({
    reports,
    isLoading,
    emptyMessage,
    currentPage = 1,
    totalPages = 1,
    onPageChange
}: ReportListProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5" aria-busy="true">
                {[...Array(9)].map((_, i) => (
                    <ReportCardSkeleton key={i} />
                ))}
            </div>
        )
    }

    if (reports.length === 0 && emptyMessage) {
        return <>{emptyMessage}</>
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5">
                {reports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && onPageChange && (
                <div className="flex justify-center items-center gap-4 mt-8 pb-4">
                    <UiButton
                        variant="outline"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        이전
                    </UiButton>

                    <span className="type-label text-muted-foreground">
                        {currentPage} / {totalPages}
                    </span>

                    <UiButton
                        variant="outline"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        다음
                    </UiButton>
                </div>
            )}
        </div>
    )
}
