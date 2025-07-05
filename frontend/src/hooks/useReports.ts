import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  getReports, 
  getReport, 
  createReport, 
  deleteReport,
  CreateReportData,
  ReportsFilter
} from '../lib/api/reports'
import { addVote, removeVote, checkUserVote, getVoteCount } from '../lib/api/votes'

// 제보 목록 조회
export const useReports = (filter?: ReportsFilter) => {
  return useQuery({
    queryKey: ['reports', filter],
    queryFn: () => getReports(filter)
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
