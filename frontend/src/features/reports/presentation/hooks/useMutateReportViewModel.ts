import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ReportMutateUseCases } from '../../domain/usecases'
import { apiReportRepository } from '../../data/apiReportRepository'

const reportMutateUseCases = new ReportMutateUseCases(apiReportRepository)

export function useMutateReportViewModel() {
    const queryClient = useQueryClient()

    const createReportMutation = useMutation({
        mutationFn: (data: any) => reportMutateUseCases.createReport(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] })
            queryClient.invalidateQueries({ queryKey: ['my-reports'] })
            queryClient.invalidateQueries({ queryKey: ['mapBoundsReports'] })
        }
    })

    const updateReportMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) =>
            reportMutateUseCases.updateReport(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['reports'] })
            queryClient.invalidateQueries({ queryKey: ['report', id] })
        }
    })

    const deleteReportMutation = useMutation({
        mutationFn: (id: string) => reportMutateUseCases.deleteReport(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] })
            queryClient.invalidateQueries({ queryKey: ['my-reports'] })
        }
    })

    return {
        createReport: createReportMutation.mutateAsync,
        isCreating: createReportMutation.isPending,
        createError: createReportMutation.error,
        updateReport: updateReportMutation.mutateAsync,
        isUpdating: updateReportMutation.isPending,
        updateError: updateReportMutation.error,
        deleteReport: deleteReportMutation.mutateAsync,
        isDeleting: deleteReportMutation.isPending,
        deleteError: deleteReportMutation.error,
    }
}
