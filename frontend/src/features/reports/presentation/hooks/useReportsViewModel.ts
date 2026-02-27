import { useQuery } from '@tanstack/react-query'
import { ReportUseCases } from '../../domain/usecases'
import { apiReportRepository } from '../../data/apiReportRepository'
import { ReportCategory } from '../../domain/entities'

// Usecase 인스턴스화
const reportUseCases = new ReportUseCases(apiReportRepository)

export interface UseReportsParams {
    mode: 'all' | 'bounds'
    category: string
    searchQuery: string
    bounds: { north: number; south: number; east: number; west: number } | null
    trigger: number
}

// 제보 목록 조회 (ViewModel)
export function useReportsViewModel({
    mode,
    category,
    searchQuery,
    bounds,
    trigger
}: UseReportsParams) {
    const { data: reports = [], isLoading, error, refetch } = useQuery({
        queryKey: [
            'reports',
            mode,
            category,
            searchQuery,
            mode === 'bounds' ? bounds : null,
            mode === 'bounds' ? trigger : 0
        ],
        queryFn: async () => {
            const parsedCategory = category === 'all' ? undefined : (category as ReportCategory);

            if (mode === 'bounds' && bounds) {
                return reportUseCases.getReportsInBounds({
                    north: bounds.north,
                    south: bounds.south,
                    east: bounds.east,
                    west: bounds.west,
                    category: parsedCategory,
                    search: searchQuery || undefined,
                    limit: 200
                })
            }

            return reportUseCases.getReports({
                category: parsedCategory,
                search: searchQuery || undefined,
                limit: 100
            })
        },
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
        enabled: mode === 'bounds'
            ? !!bounds && trigger > 0
            : !!searchQuery,
        staleTime: 5 * 60 * 1000,
    })

    return {
        reports,
        isLoading,
        error,
        refetch
    }
}

// 특정 제보 상세 조회 (ViewModel)
export function useReportViewModel(id: string) {
    const { data: report, isLoading, error } = useQuery({
        queryKey: ['report', id],
        queryFn: () => reportUseCases.getReportById(id),
        enabled: !!id
    })

    return {
        report,
        isLoading,
        error
    }
}
