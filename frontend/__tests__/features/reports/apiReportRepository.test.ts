import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiReportRepository } from '@/features/reports/data/apiReportRepository'
import * as config from '@/lib/api/config'

// Mock the api config functions
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
        updated_at: '2023-01-01T00:00:00Z'
    }

    it('should fetch report by ID and transform data', async () => {
        vi.mocked(config.apiRequest).mockResolvedValue(mockReport)

        const report = await apiReportRepository.getReportById('1')

        expect(config.apiRequest).toHaveBeenCalledWith('https://api.example.com/reports/1/')
        expect(report).not.toBeNull()
        expect(report?.id).toBe('1')
        expect(report?.userId).toBe('user1')
        expect(report?.title).toBe('Test Report')
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
})
