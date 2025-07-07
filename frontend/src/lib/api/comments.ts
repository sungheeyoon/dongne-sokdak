import { createApiUrl, authenticatedRequest, apiRequest } from './config'
import { Comment } from '../../types'

export interface CreateCommentData {
  reportId: string
  content: string
  parentCommentId?: string  // 대댓글용
}

export interface UpdateCommentData {
  content: string
}

// 댓글 생성 (인증 필요)
export const createComment = async (data: CreateCommentData): Promise<Comment> => {
  console.log('💬 Creating comment with data:', data)
  
  const requestData = {
    report_id: data.reportId,
    content: data.content,
    parent_comment_id: data.parentCommentId || null
  }
  
  console.log('📤 Sending comment request data:', requestData)

  try {
    const response = await authenticatedRequest(
      createApiUrl('/comments/'),
      {
        method: 'POST',
        body: JSON.stringify(requestData)
      }
    )
    
    console.log('✅ Comment created successfully:', response)
    return transformCommentData(response)
  } catch (error: any) {
    console.error('❌ Comment creation failed:', error)
    console.error('❌ Error details:', error.message)
    throw error
  }
}

// 댓글 수정 (인증 필요)
export const updateComment = async (id: string, data: UpdateCommentData): Promise<Comment> => {
  console.log('✏️ Updating comment:', id, data)
  
  const requestData = {
    content: data.content
  }

  try {
    const response = await authenticatedRequest(
      createApiUrl(`/comments/${id}`),
      {
        method: 'PUT',
        body: JSON.stringify(requestData)
      }
    )
    
    console.log('✅ Comment updated successfully:', response)
    return transformCommentData(response)
  } catch (error: any) {
    console.error('❌ Comment update failed:', error)
    throw error
  }
}

// 특정 제보의 댓글 목록 조회 (인증 불필요)
export const getCommentsByReportId = async (reportId: string): Promise<Comment[]> => {
  console.log('📋 Getting comments for report:', reportId)
  
  try {
    const response = await apiRequest(
      createApiUrl(`/comments/report/${reportId}`)
    )
    
    console.log('💬 Comments response:', response)
    return response.map(transformCommentData)
  } catch (error: any) {
    console.error('❌ Failed to get comments:', error)
    // 댓글 로딩 실패시 빈 배열 반환
    return []
  }
}

// 댓글 삭제 (인증 필요)
export const deleteComment = async (id: string): Promise<void> => {
  console.log('🗑️ Deleting comment:', id)
  
  await authenticatedRequest(
    createApiUrl(`/comments/${id}`),
    { method: 'DELETE' }
  )
  
  console.log('✅ Comment deleted successfully')
}

// 데이터 변환 헬퍼 함수
function transformCommentData(comment: any): Comment {
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
    replies: comment.replies ? comment.replies.map(transformCommentData) : []
  }
}
