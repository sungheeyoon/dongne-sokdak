import { ReportRepository } from '../domain/repositories'
import { Report, ReportsFilter, ReportCategory, isValidReportCoordinate, PaginatedReports } from '../domain/entities'
import { createApiUrl, authenticatedRequest, apiRequest } from '@/lib/api/config'

export class ApiReportRepository implements ReportRepository {
    private transformReportData(report: any): Report {
        return {
            id: report.id,
            userId: report.user_id,
            title: report.title,
            description: report.description,
            imageUrl: report.image_url,
            location: report.location || { lat: 0, lng: 0 },
            address: report.address,
            category: report.category,
            status: report.status,
            createdAt: report.created_at,
            updatedAt: report.updated_at,
            voteCount: report.vote_count || 0,
            commentCount: report.comment_count || 0,
            userVoted: report.user_voted || false
        }
    }

    async getReports(filter: ReportsFilter = {}): Promise<PaginatedReports> {
        const params = new URLSearchParams()

        if (filter.page) params.append('page', filter.page.toString())
        if (filter.limit) params.append('limit', filter.limit.toString())
        if (filter.category) params.append('category', filter.category)
        if (filter.status) params.append('status', filter.status)
        if (filter.userId) params.append('user_id', filter.userId)
        if (filter.search) params.append('search', filter.search)

        const url = createApiUrl('/reports/') + (params.toString() ? `?${params.toString()}` : '')
        const response = await apiRequest(url) as any

        return {
            items: (response.items || []).map(this.transformReportData).filter(isValidReportCoordinate),
            totalCount: response.totalCount || 0,
            totalPages: response.totalPages || 1,
            page: response.page || 1,
            limit: response.limit || 100
        }
    }

    async getReportsInBounds(params: {
        north: number
        south: number
        east: number
        west: number
        category?: ReportCategory
        search?: string
        page?: number
        limit?: number
    }): Promise<PaginatedReports> {
        const searchParams = new URLSearchParams()

        searchParams.append('north', params.north.toString())
        searchParams.append('south', params.south.toString())
        searchParams.append('east', params.east.toString())
        searchParams.append('west', params.west.toString())
        if (params.category) searchParams.append('category', params.category)
        if (params.search) searchParams.append('search', params.search)
        if (params.page) searchParams.append('page', params.page.toString())
        if (params.limit) searchParams.append('limit', params.limit.toString())

        const url = createApiUrl(`/reports/bounds?${searchParams.toString()}`)
        const response = await apiRequest(url) as any

        return {
            items: (response.items || []).map(this.transformReportData).filter(isValidReportCoordinate),
            totalCount: response.totalCount || 0,
            totalPages: response.totalPages || 1,
            page: response.page || 1,
            limit: response.limit || 100
        }
    }

    async getReportById(id: string): Promise<Report | null> {
        try {
            const response = await apiRequest(createApiUrl(`/reports/${id}/`))
            const report = this.transformReportData(response)
            
            if (report && !isValidReportCoordinate(report)) {
                console.warn(`Filtered out invalid report by ID: ${id}`);
                return null;
            }
            return report || null
        } catch (e) {
            console.error(e)
            return null
        }
    }

    async getMyNeighborhoodReports(radiusKm?: number, category?: string, page?: number, limit?: number): Promise<PaginatedReports> {
        const searchParams = new URLSearchParams()

        if (radiusKm) searchParams.append('radius_km', radiusKm.toString())
        if (category) searchParams.append('category', category)
        if (page) searchParams.append('page', page.toString())
        if (limit) searchParams.append('limit', limit.toString())

        const url = createApiUrl(`/reports/my-neighborhood?${searchParams.toString()}`)
        const response = await authenticatedRequest(url) as any

        return {
            items: (response.items || []).map(this.transformReportData).filter(isValidReportCoordinate),
            totalCount: response.totalCount || 0,
            totalPages: response.totalPages || 1,
            page: response.page || 1,
            limit: response.limit || 50
        }
    }

    async createReport(data: any): Promise<Report> {
        const requestData = {
            title: data.title,
            description: data.description,
            image_url: data.imageUrl,
            location: data.location,
            address: data.address,
            category: data.category
        }

        const response = await authenticatedRequest(
            createApiUrl('/reports/'),
            {
                method: 'POST',
                body: JSON.stringify(requestData)
            }
        )

        return this.transformReportData(response)
    }

    async updateReport(id: string, data: any): Promise<Report> {
        const requestData = {
            title: data.title,
            description: data.description,
            image_url: data.imageUrl,
            category: data.category,
            status: data.status
        }

        const response = await authenticatedRequest(
            createApiUrl(`/reports/${id}`),
            {
                method: 'PUT',
                body: JSON.stringify(requestData)
            }
        )

        return this.transformReportData(response)
    }

    async deleteReport(id: string): Promise<void> {
        await authenticatedRequest(
            createApiUrl(`/reports/${id}/`),
            { method: 'DELETE' }
        )
    }
}

export const apiReportRepository = new ApiReportRepository()
