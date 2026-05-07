import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiVoteRepository } from '@/features/reports/data/apiVoteRepository'
import * as config from '@/lib/api/config'

vi.mock('@/lib/api/config', () => ({
    createApiUrl: vi.fn((path) => `https://api.example.com${path}`),
    apiRequest: vi.fn(),
    authenticatedRequest: vi.fn()
}))

describe('ApiVoteRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should add vote', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue(null)
        await apiVoteRepository.addVote('1')
        expect(config.authenticatedRequest).toHaveBeenCalled()
    })

    it('should remove vote', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue(null)
        await apiVoteRepository.removeVote('1')
        expect(config.authenticatedRequest).toHaveBeenCalled()
    })

    it('should check user vote', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue({ voted: true })
        const result = await apiVoteRepository.checkUserVote('1')
        expect(config.authenticatedRequest).toHaveBeenCalled()
        expect(result).toBe(true)
    })

    it('should check user vote (error case)', async () => {
        vi.mocked(config.authenticatedRequest).mockRejectedValue(new Error('err'))
        const result = await apiVoteRepository.checkUserVote('1')
        expect(result).toBe(false)
    })

    it('should get vote count', async () => {
        vi.mocked(config.apiRequest).mockResolvedValue({ count: 5 })
        const result = await apiVoteRepository.getVoteCount('1')
        expect(config.apiRequest).toHaveBeenCalled()
        expect(result).toBe(5)
    })

    it('should get vote count (error case)', async () => {
        vi.mocked(config.apiRequest).mockRejectedValue(new Error('err'))
        const result = await apiVoteRepository.getVoteCount('1')
        expect(result).toBe(0)
    })
})
