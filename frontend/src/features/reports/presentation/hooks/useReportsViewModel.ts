import { useQuery } from '@tanstack/react-query'
import { ReportUseCases } from '../../domain/usecases'
import { apiReportRepository } from '../../data/apiReportRepository'
import { ReportCategory } from '../../domain/entities'

// Usecase 인스턴스화
const reportUseCases = new ReportUseCases(apiReportRepository)

export interface UseMapReportsParams {
    mode: 'all' | 'bounds'
    category: string
    searchQuery: string
    bounds: { north: number; south: number; east: number; west: number } | null
    trigger: number
    zoom: number
}

// 지도용 마커 제보 목록 조회 (ViewModel) - limit 동적 계산, page 1 고정
export function useMapReportsViewModel({
    mode,
    category,
    searchQuery,
    bounds,
    trigger,
    zoom
}: UseMapReportsParams) {

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [
            'map-reports',
            mode,
            category,
            searchQuery,
            mode === 'bounds' ? bounds : null,
            mode === 'bounds' ? trigger : 0
        ],
        queryFn: async () => {
            const parsedCategory = category === 'all' ? undefined : (category as ReportCategory);

            let dynamicLimit = 100;
            if (zoom >= 8) dynamicLimit = 500;
            else if (zoom >= 6) dynamicLimit = 300;
            else if (zoom >= 4) dynamicLimit = 200;
            else dynamicLimit = 100;


            if (mode === 'bounds' && bounds) {
                return reportUseCases.getReportsInBounds({
                    north: bounds.north,
                    south: bounds.south,
                    east: bounds.east,
                    west: bounds.west,
                    category: parsedCategory,
                    search: searchQuery || undefined,
                    page: 1,
                    limit: dynamicLimit
                })
            }

            return reportUseCases.getReports({
                category: parsedCategory,
                search: searchQuery || undefined,
                page: 1,
                limit: dynamicLimit
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
        reports: data?.items || [],
        isLoading,
        error,
        refetch,
        currentLimit: zoom >= 8 ? 500 : (zoom >= 6 ? 300 : (zoom >= 4 ? 200 : 100))
    }
}

export interface UseListReportsParams {
    mode: 'all' | 'bounds' | 'neighborhood'
    category: string
    searchQuery: string
    bounds?: { north: number; south: number; east: number; west: number } | null
    trigger?: number
    page: number
}

// 리스트용 제보 목록 조회 (ViewModel) - limit 9 고정, 페이징 지원
export function useListReportsViewModel({
    mode,
    category,
    searchQuery,
    bounds,
    trigger = 0,
    page
}: UseListReportsParams) {
    const limit = 9; // 고정

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: [
            'list-reports',
            mode,
            category,
            searchQuery,
            mode === 'bounds' ? bounds : null,
            page,
            mode === 'bounds' ? trigger : 0 // 지도 이동 trigger 반영 (필요시)
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
                    page,
                    limit
                })
            } else if (mode === 'neighborhood') {
                return reportUseCases.getMyNeighborhoodReports(
                    3.0,
                    parsedCategory as any,
                    page,
                    limit
                )
            }

            return reportUseCases.getReports({
                category: parsedCategory,
                search: searchQuery || undefined,
                page,
                limit
            })
        },
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
        enabled: mode === 'bounds'
            ? !!bounds && trigger > 0
            : true,
        staleTime: 5 * 60 * 1000,
    })

    return {
        reports: data?.items || [],
        totalCount: data?.totalCount || 0,
        totalPages: data?.totalPages || 1,
        currentPage: data?.page || 1,
        limit: data?.limit || limit,
        isLoading,
        error,
        refetch,
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
