import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CommentUseCases } from '../../domain/usecases'
import { apiCommentRepository } from '../../data/apiCommentRepository'

const commentUseCases = new CommentUseCases(apiCommentRepository)

export function useCommentsViewModel(reportId: string) {
    const queryClient = useQueryClient()

    const { data: comments = [], isLoading, error } = useQuery({
        queryKey: ['comments', reportId],
        queryFn: () => commentUseCases.getCommentsByReportId(reportId),
        enabled: !!reportId
    })

    const createCommentMutation = useMutation({
        mutationFn: (data: { content: string; parentCommentId?: string }) =>
            commentUseCases.createComment({ reportId, ...data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', reportId] })
            queryClient.invalidateQueries({ queryKey: ['report', reportId] })
        }
    })

    const updateCommentMutation = useMutation({
        mutationFn: ({ id, content }: { id: string; content: string }) =>
            commentUseCases.updateComment(id, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', reportId] })
        }
    })

    const deleteCommentMutation = useMutation({
        mutationFn: (id: string) => commentUseCases.deleteComment(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comments', reportId] })
            queryClient.invalidateQueries({ queryKey: ['report', reportId] })
        }
    })

    return {
        comments,
        isLoading,
        error,
        createComment: createCommentMutation.mutate,
        isCreating: createCommentMutation.isPending,
        createError: createCommentMutation.error,
        updateComment: updateCommentMutation.mutate,
        isUpdating: updateCommentMutation.isPending,
        updateError: updateCommentMutation.error,
        deleteComment: deleteCommentMutation.mutate,
        isDeleting: deleteCommentMutation.isPending,
        deleteError: deleteCommentMutation.error
    }
}
