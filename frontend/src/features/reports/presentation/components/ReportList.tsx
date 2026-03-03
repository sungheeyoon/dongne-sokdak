import React from 'react'
import { Report } from '../../domain/entities'
import ReportCard from './ReportCard'
import { CardSkeleton } from '@/shared/ui/LoadingSpinner'

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(9)].map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        )
    }

    if (reports.length === 0 && emptyMessage) {
        return <>{emptyMessage}</>
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {reports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && onPageChange && (
                <div className="flex justify-center items-center gap-4 mt-8 pb-4">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        이전
                    </button>

                    <span className="text-sm font-medium text-gray-600">
                        {currentPage} / {totalPages}
                    </span>

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        다음
                    </button>
                </div>
            )}
        </div>
    )
}
