import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { VoteUseCases } from '../../domain/usecases'
import { apiVoteRepository } from '../../data/apiVoteRepository'

const voteUseCases = new VoteUseCases(apiVoteRepository)

export function useVotesViewModel({ reportId, userId, initialCount = 0 }: { reportId: string, userId?: string, initialCount?: number }) {
    const queryClient = useQueryClient()

    const { data: voteInfo } = useQuery({
        queryKey: ['voteInfo', reportId, userId],
        queryFn: async () => {
            // If user is not logged in, we can still fetch vote count but not check user vote
            if (!userId) {
                const count = await apiVoteRepository.getVoteCount(reportId)
                return { count, isVoted: false }
            }
            return voteUseCases.getVoteInfo(reportId)
        },
        initialData: { count: initialCount, isVoted: false }
    })

    const toggleVoteMutation = useMutation({
        mutationFn: async () => {
            const isVoted = voteInfo?.isVoted || false
            await voteUseCases.toggleVote(reportId, isVoted)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['voteInfo', reportId, userId] })
            queryClient.invalidateQueries({ queryKey: ['reports'] })
            queryClient.invalidateQueries({ queryKey: ['report', reportId] })
        }
    })

    return {
        voteCount: voteInfo?.count || 0,
        userVoted: voteInfo?.isVoted || false,
        toggleVote: toggleVoteMutation.mutate,
        isToggling: toggleVoteMutation.isPending,
        toggleError: toggleVoteMutation.error
    }
}
