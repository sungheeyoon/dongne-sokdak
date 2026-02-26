import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getReports,
  getReportsInBounds,
  getReport,
  createReport,
  deleteReport,
  CreateReportData,
  ReportsFilter
} from '../lib/api/reports'
import { Report, ReportCategory } from '@/types'
import { addVote, removeVote, checkUserVote, getVoteCount } from '../lib/api/votes'

interface UseReportsParams {
  mode: 'all' | 'bounds'
  category: string
  searchQuery: string
  bounds: { north: number; south: number; east: number; west: number } | null
  trigger: number
}

// 제보 목록 조회 (전략 패턴 적용)
export function useReports({
  mode,
  category,
  searchQuery,
  bounds,
  trigger
}: UseReportsParams) {
  return useQuery<Report[], Error>({
    queryKey: [
      'reports',
      mode,
      category,
      searchQuery,
      mode === 'bounds' ? bounds : null,
      mode === 'bounds' ? trigger : 0
    ],
    queryFn: async (): Promise<Report[]> => {
      const parsedCategory = category === 'all' ? undefined : category as ReportCategory;

      if (mode === 'bounds' && bounds) {
        return getReportsInBounds({
          north: bounds.north,
          south: bounds.south,
          east: bounds.east,
          west: bounds.west,
          category: parsedCategory,
          search: searchQuery || undefined,
          limit: 200
        })
      }

      return getReports({
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
    gcTime: 10 * 60 * 1000
  })
}

// 특정 제보 조회
export const useReport = (id: string) => {
  return useQuery({
    queryKey: ['report', id],
    queryFn: () => getReport(id),
    enabled: !!id
  })
}

// 제보 생성
export const useCreateReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateReportData) => createReport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    }
  })
}

// 제보 삭제
export const useDeleteReport = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    }
  })
}

// 공감 토글
export const useToggleVote = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ reportId, isVoted }: { reportId: string; isVoted: boolean }) => {
      if (isVoted) {
        await removeVote(reportId)
      } else {
        await addVote(reportId)
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      queryClient.invalidateQueries({ queryKey: ['report', variables.reportId] })
      queryClient.invalidateQueries({ queryKey: ['vote', variables.reportId] })
    }
  })
}
