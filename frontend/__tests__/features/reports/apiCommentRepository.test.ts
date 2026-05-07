import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiCommentRepository } from '@/features/reports/data/apiCommentRepository'
import * as config from '@/lib/api/config'

vi.mock('@/lib/api/config', () => ({
    createApiUrl: vi.fn((path) => `https://api.example.com${path}`),
    apiRequest: vi.fn(),
    authenticatedRequest: vi.fn()
}))

describe('ApiCommentRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mockComment = {
        id: '1',
        report_id: 'r1',
        user_id: 'u1',
        content: 'Test Comment',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        user_nickname: 'Nick',
        replies: []
    }

    it('should create comment', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue(mockComment)

        const result = await apiCommentRepository.createComment({ reportId: 'r1', content: 'Test Comment' })

        expect(config.authenticatedRequest).toHaveBeenCalled()
        expect(result.id).toBe('1')
        expect(result.userNickname).toBe('Nick')
    })

    it('should update comment', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue(mockComment)

        const result = await apiCommentRepository.updateComment('1', { content: 'Updated' })

        expect(config.authenticatedRequest).toHaveBeenCalled()
        expect(result.id).toBe('1')
    })

    it('should get comments by report ID', async () => {
        vi.mocked(config.apiRequest).mockResolvedValue([mockComment])

        const result = await apiCommentRepository.getCommentsByReportId('r1')

        expect(config.apiRequest).toHaveBeenCalled()
        expect(result).toHaveLength(1)
        expect(result[0].id).toBe('1')
    })

    it('should delete comment', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue(null)

        await apiCommentRepository.deleteComment('1')

        expect(config.authenticatedRequest).toHaveBeenCalled()
    })
})
