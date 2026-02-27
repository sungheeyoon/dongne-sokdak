import { VoteRepository } from '../domain/repositories'
import {
    addVote,
    removeVote,
    checkUserVote,
    getVoteCount
} from '@/lib/api/votes'

export class ApiVoteRepository implements VoteRepository {
    async addVote(reportId: string): Promise<void> {
        return addVote(reportId)
    }

    async removeVote(reportId: string): Promise<void> {
        return removeVote(reportId)
    }

    async checkUserVote(reportId: string): Promise<boolean> {
        return checkUserVote(reportId)
    }

    async getVoteCount(reportId: string): Promise<number> {
        return getVoteCount(reportId)
    }
}

export const apiVoteRepository = new ApiVoteRepository()
