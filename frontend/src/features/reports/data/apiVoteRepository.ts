import { VoteRepository } from '../domain/repositories'
import { createApiUrl, authenticatedRequest, apiRequest } from '@/lib/api/config'

export class ApiVoteRepository implements VoteRepository {
    async addVote(reportId: string): Promise<void> {
        await authenticatedRequest(
            createApiUrl('/votes/'),
            {
                method: 'POST',
                body: JSON.stringify({ report_id: reportId })
            }
        )
    }

    async removeVote(reportId: string): Promise<void> {
        await authenticatedRequest(
            createApiUrl(`/votes/report/${reportId}`),
            { method: 'DELETE' }
        )
    }

    async checkUserVote(reportId: string): Promise<boolean> {
        try {
            const response = await authenticatedRequest(
                createApiUrl(`/votes/check/${reportId}`)
            ) as any
            return response.voted || false
        } catch (error) {
            return false
        }
    }

    async getVoteCount(reportId: string): Promise<number> {
        try {
            const response = await apiRequest(
                createApiUrl(`/votes/count/${reportId}`)
            ) as any
            return response.count || 0
        } catch (error) {
            return 0
        }
    }
}

export const apiVoteRepository = new ApiVoteRepository()
