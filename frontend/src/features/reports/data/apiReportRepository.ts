import { ReportRepository } from '../domain/repositories'
import { Report, ReportsFilter, ReportCategory } from '../domain/entities'
import { getReports, getReport, getMyNeighborhoodReports, getReportsInBounds, CreateReportData, createReport, updateReport, deleteReport, UpdateReportData } from '@/lib/api/reports'

export class ApiReportRepository implements ReportRepository {
    async getReports(filter?: ReportsFilter): Promise<Report[]> {
        return getReports(filter as any)
    }

    async getReportsInBounds(params: {
        north: number
        south: number
        east: number
        west: number
        category?: ReportCategory
        search?: string
        limit?: number
    }): Promise<Report[]> {
        return getReportsInBounds({
            north: params.north,
            south: params.south,
            east: params.east,
            west: params.west,
            category: params.category,
            search: params.search,
            limit: params.limit
        })
    }

    async getReportById(id: string): Promise<Report | null> {
        try {
            const report = await getReport(id)
            return report || null
        } catch (e) {
            console.error(e)
            return null
        }
    }

    async getMyNeighborhoodReports(radiusKm?: number, category?: string, limit?: number): Promise<Report[]> {
        return getMyNeighborhoodReports({ radius_km: radiusKm, category: category as unknown as any, limit })
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
