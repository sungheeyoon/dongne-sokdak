import { CommentRepository } from '../domain/repositories'
import { Comment } from '../domain/entities'
import {
    createComment,
    updateComment,
    getCommentsByReportId,
    deleteComment
} from '@/lib/api/comments'

export class ApiCommentRepository implements CommentRepository {
    async createComment(data: { reportId: string; content: string; parentCommentId?: string }): Promise<Comment> {
        return createComment(data)
    }

    async updateComment(id: string, data: { content: string }): Promise<Comment> {
        return updateComment(id, data)
    }

    async getCommentsByReportId(reportId: string): Promise<Comment[]> {
        return getCommentsByReportId(reportId)
    }

    async deleteComment(id: string): Promise<void> {
        return deleteComment(id)
    }
}

export const apiCommentRepository = new ApiCommentRepository()
