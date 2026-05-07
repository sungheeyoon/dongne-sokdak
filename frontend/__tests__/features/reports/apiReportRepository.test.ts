import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiReportRepository } from '@/features/reports/data/apiReportRepository'
import * as config from '@/lib/api/config'

vi.mock('@/lib/api/config', () => ({
    createApiUrl: vi.fn((path) => `https://api.example.com${path}`),
    apiRequest: vi.fn(),
    authenticatedRequest: vi.fn()
}))

describe('ApiReportRepository', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    const mockReport = {
        id: '1',
        user_id: 'user1',
        title: 'Test Report',
        description: 'Test Description',
        location: { lat: 37.5, lng: 127.0 },
        category: 'TRAFFIC',
        status: 'PENDING',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        vote_count: 5,
        comment_count: 2,
        user_voted: true
    }

    it('should fetch getReports (list) and transform snake_case to camelCase', async () => {
        vi.mocked(config.apiRequest).mockResolvedValue({
            items: [mockReport],
            totalCount: 1,
            totalPages: 1,
            page: 1,
            limit: 10
        })

        const result = await apiReportRepository.getReports({ page: 1, limit: 10 })

        expect(config.apiRequest).toHaveBeenCalledWith(expect.stringContaining('/reports/?page=1&limit=10'))
        expect(result.items).toHaveLength(1)
        expect(result.items[0].userId).toBe('user1')
        expect(result.items[0].createdAt).toBe('2023-01-01T00:00:00Z')
        expect(result.items[0].voteCount).toBe(5)
        expect(result.items[0].commentCount).toBe(2)
        expect(result.items[0].userVoted).toBe(true)
    })

    it('should fetch report by ID and transform data', async () => {
        vi.mocked(config.apiRequest).mockResolvedValue(mockReport)

        const report = await apiReportRepository.getReportById('1')

        expect(config.apiRequest).toHaveBeenCalledWith('https://api.example.com/reports/1/')
        expect(report).not.toBeNull()
        expect(report?.id).toBe('1')
        expect(report?.userId).toBe('user1')
        expect(report?.title).toBe('Test Report')
    })

    it('should return null for getReportById on error', async () => {
        vi.mocked(config.apiRequest).mockRejectedValue(new Error('Network error'))
        const report = await apiReportRepository.getReportById('1')
        expect(report).toBeNull()
    })

    it('should fetch reports in bounds', async () => {
        vi.mocked(config.apiRequest).mockResolvedValue({
            items: [mockReport],
            totalCount: 1,
            totalPages: 1,
            page: 1,
            limit: 10
        })

        const result = await apiReportRepository.getReportsInBounds({
            north: 37.6,
            south: 37.4,
            east: 127.1,
            west: 126.9
        })

        expect(config.apiRequest).toHaveBeenCalledWith(expect.stringContaining('/reports/bounds'))
        expect(result.items).toHaveLength(1)
        expect(result.items[0].id).toBe('1')
    })

    it('should get nearby reports', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue({
            items: [mockReport],
            totalCount: 1,
            totalPages: 1,
            page: 1,
            limit: 50
        })

        const result = await apiReportRepository.getMyNeighborhoodReports(5, 'TRAFFIC')

        expect(config.authenticatedRequest).toHaveBeenCalledWith(expect.stringContaining('/reports/my-neighborhood?radius_km=5&category=TRAFFIC'))
        expect(result.items).toHaveLength(1)
    })

    it('should create a report', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue(mockReport)

        const reportData = {
            title: 'New Report',
            description: 'New Description',
            location: { lat: 37.5, lng: 127.0 },
            category: 'TRAFFIC'
        }

        const report = await apiReportRepository.createReport(reportData)

        expect(config.authenticatedRequest).toHaveBeenCalledWith(
            'https://api.example.com/reports/',
            expect.objectContaining({
                method: 'POST'
            })
        )
        expect(report.id).toBe('1')
    })

    it('should update a report', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue(mockReport)

        const reportData = {
            title: 'Updated Report',
            status: 'RESOLVED'
        }

        const report = await apiReportRepository.updateReport('1', reportData)

        expect(config.authenticatedRequest).toHaveBeenCalledWith(
            'https://api.example.com/reports/1',
            expect.objectContaining({
                method: 'PUT'
            })
        )
        expect(report.id).toBe('1')
    })

    it('should delete a report', async () => {
        vi.mocked(config.authenticatedRequest).mockResolvedValue(null)

        await apiReportRepository.deleteReport('1')

        expect(config.authenticatedRequest).toHaveBeenCalledWith(
            'https://api.example.com/reports/1/',
            { method: 'DELETE' }
        )
    })
})