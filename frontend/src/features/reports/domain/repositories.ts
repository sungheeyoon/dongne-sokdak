import { Report, ReportsFilter, Comment, ReportCategory, PaginatedReports } from './entities'

export interface ReportRepository {
    getReports(filter?: ReportsFilter): Promise<PaginatedReports>
    getReportsInBounds(params: {
        north: number
        south: number
        east: number
        west: number
        category?: ReportCategory
        search?: string
        page?: number
        limit?: number
    }): Promise<PaginatedReports>
    getReportById(id: string): Promise<Report | null>
    getMyNeighborhoodReports(radiusKm?: number, category?: string, page?: number, limit?: number): Promise<PaginatedReports>
    createReport(data: any): Promise<Report>
    updateReport(id: string, data: any): Promise<Report>
    deleteReport(id: string): Promise<void>
}

export interface ImageRepository {
    uploadImage(file: File): Promise<string>
}

export interface CommentRepository {
    createComment(data: { reportId: string; content: string; parentCommentId?: string }): Promise<Comment>
    updateComment(id: string, data: { content: string }): Promise<Comment>
    getCommentsByReportId(reportId: string): Promise<Comment[]>
    deleteComment(id: string): Promise<void>
}

export interface VoteRepository {
    addVote(reportId: string): Promise<void>
    removeVote(reportId: string): Promise<void>
    checkUserVote(reportId: string): Promise<boolean>
    getVoteCount(reportId: string): Promise<number>
}
