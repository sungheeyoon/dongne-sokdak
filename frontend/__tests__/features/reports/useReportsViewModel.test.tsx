import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { 
    useMapReportsViewModel, 
    useListReportsViewModel, 
    useReportViewModel, 
    useMyReportsViewModel 
} from '@/features/reports/presentation/hooks/useReportsViewModel'
import { apiReportRepository } from '@/features/reports/data/apiReportRepository'
import React from 'react'

vi.mock('@/features/reports/data/apiReportRepository', () => ({
    apiReportRepository: {
        getReports: vi.fn(),
        getReportsInBounds: vi.fn(),
        getReportById: vi.fn(),
    }
}))

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false },
    },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useReportsViewModel', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        queryClient.clear()
    })

    describe('useMapReportsViewModel', () => {
        it('should fetch all reports', async () => {
            const mockReports = { items: [{ id: '1' }] }
            vi.mocked(apiReportRepository.getReports).mockResolvedValue(mockReports as any)

            const { result } = renderHook(() => useMapReportsViewModel({
                mode: 'all', category: 'all', searchQuery: 'test', bounds: null, trigger: 0, zoom: 5
            }), { wrapper })

            await waitFor(() => expect(result.current.reports).toHaveLength(1))
            expect(apiReportRepository.getReports).toHaveBeenCalledWith({
                category: undefined, search: 'test', page: 1, limit: 200
            })
        })

        it('should fetch reports in bounds', async () => {
            const mockReports = { items: [{ id: '1' }] }
            vi.mocked(apiReportRepository.getReportsInBounds).mockResolvedValue(mockReports as any)

            const bounds = { north: 1, south: 0, east: 1, west: 0 }
            const { result } = renderHook(() => useMapReportsViewModel({
                mode: 'bounds', category: 'TRAFFIC', searchQuery: '', bounds, trigger: 1, zoom: 8
            }), { wrapper })

            await waitFor(() => expect(result.current.reports).toHaveLength(1))
            expect(apiReportRepository.getReportsInBounds).toHaveBeenCalledWith({
                north: 1, south: 0, east: 1, west: 0, category: 'TRAFFIC', search: undefined, page: 1, limit: 500
            })
        })
    })

    describe('useListReportsViewModel', () => {
        it('should fetch list reports', async () => {
            const mockReports = { items: [{ id: '1' }], totalCount: 1 }
            vi.mocked(apiReportRepository.getReports).mockResolvedValue(mockReports as any)

            const { result } = renderHook(() => useListReportsViewModel({
                mode: 'all', category: 'all', searchQuery: '', page: 1
            }), { wrapper })

            await waitFor(() => expect(result.current.reports).toHaveLength(1))
            expect(apiReportRepository.getReports).toHaveBeenCalled()
        })
    })

    describe('useReportViewModel', () => {
        it('should fetch report by id', async () => {
            const mockReport = { id: '1', title: 'Test' }
            vi.mocked(apiReportRepository.getReportById).mockResolvedValue(mockReport as any)

            const { result } = renderHook(() => useReportViewModel('1'), { wrapper })

            await waitFor(() => expect(result.current.report).toEqual(mockReport))
            expect(apiReportRepository.getReportById).toHaveBeenCalledWith('1')
        })
    })

    describe('useMyReportsViewModel', () => {
        it('should fetch my reports', async () => {
            const mockReports = { items: [{ id: '1' }], totalCount: 1 }
            vi.mocked(apiReportRepository.getReports).mockResolvedValue(mockReports as any)

            const { result } = renderHook(() => useMyReportsViewModel({
                userId: 'user1', status: 'all', page: 1
            }), { wrapper })

            await waitFor(() => expect(result.current.reports).toHaveLength(1))
            expect(apiReportRepository.getReports).toHaveBeenCalledWith({
                userId: 'user1', status: undefined, page: 1, limit: 9
            })
        })

        it('should fetch my reports with specific status', async () => {
            const mockReports = { items: [{ id: '1' }], totalCount: 1 }
            vi.mocked(apiReportRepository.getReports).mockResolvedValue(mockReports as any)

            const { result } = renderHook(() => useMyReportsViewModel({
                userId: 'user1', status: 'PENDING', page: 1
            }), { wrapper })

            await waitFor(() => expect(result.current.reports).toHaveLength(1))
            expect(apiReportRepository.getReports).toHaveBeenCalledWith(expect.objectContaining({
                status: 'PENDING'
            }))
        })
    })
})
