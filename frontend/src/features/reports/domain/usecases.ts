import { Report, ReportsFilter, Comment } from './entities'
import { ReportRepository, CommentRepository, VoteRepository, ImageRepository } from './repositories'

export class ReportUseCases {
    constructor(private repository: ReportRepository) { }

    async getReports(filter?: ReportsFilter): Promise<Report[]> {
        return this.repository.getReports(filter)
    }

    async getReportsInBounds(params: {
        north: number
        south: number
        east: number
        west: number
        category?: any
        search?: string
        limit?: number
    }): Promise<Report[]> {
        return this.repository.getReportsInBounds(params)
    }

    async getReportById(id: string): Promise<Report | null> {
        return this.repository.getReportById(id)
    }

    async getMyNeighborhoodReports(radiusKm?: number, category?: string, limit?: number): Promise<Report[]> {
        return this.repository.getMyNeighborhoodReports(radiusKm, category, limit)
    }
}

export class ReportMutateUseCases {
    constructor(private repository: ReportRepository) { }

    async createReport(data: any): Promise<Report> {
        return this.repository.createReport(data)
    }

    async updateReport(id: string, data: any): Promise<Report> {
        return this.repository.updateReport(id, data)
    }

    async deleteReport(id: string): Promise<void> {
        return this.repository.deleteReport(id)
    }
}

export class ImageUseCases {
    constructor(private repository: ImageRepository) { }

    async uploadImage(file: File): Promise<string> {
        return this.repository.uploadImage(file)
    }
}

export class CommentUseCases {
    constructor(private repository: CommentRepository) { }

    async createComment(data: { reportId: string; content: string; parentCommentId?: string }): Promise<Comment> {
        return this.repository.createComment(data)
    }

    async updateComment(id: string, data: { content: string }): Promise<Comment> {
        return this.repository.updateComment(id, data)
    }

    async getCommentsByReportId(reportId: string): Promise<Comment[]> {
        return this.repository.getCommentsByReportId(reportId)
    }

    async deleteComment(id: string): Promise<void> {
        return this.repository.deleteComment(id)
    }
}

export class VoteUseCases {
    constructor(private repository: VoteRepository) { }

    async toggleVote(reportId: string, isVoted: boolean): Promise<void> {
        if (isVoted) {
            await this.repository.removeVote(reportId)
        } else {
            await this.repository.addVote(reportId)
        }
    }

    async getVoteInfo(reportId: string): Promise<{ count: number; isVoted: boolean }> {
        const [count, isVoted] = await Promise.all([
            this.repository.getVoteCount(reportId),
            this.repository.checkUserVote(reportId)
        ])
        return { count, isVoted }
    }
}
