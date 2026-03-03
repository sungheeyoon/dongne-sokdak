import { ReportRepository } from '../domain/repositories'
import { Report, ReportsFilter, ReportCategory, isValidReportCoordinate, PaginatedReports } from '../domain/entities'
import { getReports, getReport, getMyNeighborhoodReports, getReportsInBounds, createReport, updateReport, deleteReport } from '@/lib/api/reports'

export class ApiReportRepository implements ReportRepository {
    async getReports(filter?: ReportsFilter): Promise<PaginatedReports> {
        const response = await getReports(filter as any)
        return {
            ...response,
            items: response.items.filter(isValidReportCoordinate)
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
        const response = await getReportsInBounds({
            north: params.north,
            south: params.south,
            east: params.east,
            west: params.west,
            category: params.category,
            search: params.search,
            page: params.page,
            limit: params.limit
        })
        return {
            ...response,
            items: response.items.filter(isValidReportCoordinate)
        }
    }

    async getReportById(id: string): Promise<Report | null> {
        try {
            const report = await getReport(id)
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
        const response = await getMyNeighborhoodReports({ radius_km: radiusKm, category: category as unknown as any, page, limit })
        return {
            ...response,
            items: response.items.filter(isValidReportCoordinate)
        }
    }

    async createReport(data: any): Promise<Report> {
        return createReport(data)
    }

    async updateReport(id: string, data: any): Promise<Report> {
        return updateReport(id, data)
    }

    async deleteReport(id: string): Promise<void> {
        return deleteReport(id)
    }
}

export const apiReportRepository = new ApiReportRepository()
