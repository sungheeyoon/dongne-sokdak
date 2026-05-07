import { CommentRepository } from '../domain/repositories'
import { Comment } from '../domain/entities'
import { createApiUrl, authenticatedRequest, apiRequest } from '@/lib/api/config'

export class ApiCommentRepository implements CommentRepository {
    private transformCommentData(comment: any): Comment {
        return {
            id: comment.id,
            reportId: comment.report_id,
            userId: comment.user_id,
            parentCommentId: comment.parent_comment_id,
            userNickname: comment.user_nickname || comment.profiles?.nickname || '익명',
            userAvatarUrl: comment.user_avatar_url || comment.profiles?.avatar_url,
            content: comment.content,
            createdAt: comment.created_at,
            updatedAt: comment.updated_at,
            replies: comment.replies ? comment.replies.map((r: any) => this.transformCommentData(r)) : []
        }
    }

    async createComment(data: { reportId: string; content: string; parentCommentId?: string }): Promise<Comment> {
        const requestData = {
            report_id: data.reportId,
            content: data.content,
            parent_comment_id: data.parentCommentId || null
        }

        const response = await authenticatedRequest(
            createApiUrl('/comments/'),
            {
                method: 'POST',
                body: JSON.stringify(requestData)
            }
        )
        
        return this.transformCommentData(response)
    }

    async updateComment(id: string, data: { content: string }): Promise<Comment> {
        const requestData = {
            content: data.content
        }

        const response = await authenticatedRequest(
            createApiUrl(`/comments/${id}`),
            {
                method: 'PUT',
                body: JSON.stringify(requestData)
            }
        )
        
        return this.transformCommentData(response)
    }

    async getCommentsByReportId(reportId: string): Promise<Comment[]> {
        try {
            const response = await apiRequest(
                createApiUrl(`/comments/report/${reportId}`)
            )
            
            return (response as any[]).map(c => this.transformCommentData(c))
        } catch (error) {
            console.error('Failed to get comments:', error)
            return []
        }
    }

    async deleteComment(id: string): Promise<void> {
        await authenticatedRequest(
            createApiUrl(`/comments/${id}`),
            { method: 'DELETE' }
        )
    }
}

export const apiCommentRepository = new ApiCommentRepository()
