'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCommentsByReportId, createComment, deleteComment, updateComment } from '@/lib/api/comments'
import { useAuth } from '@/hooks/useAuth'
import { Comment } from '@/types'

interface CommentsProps {
  reportId: string
  reportAuthorId: string
}

interface CommentItemProps {
  comment: Comment
  reportId: string
  reportAuthorId: string
  isReply?: boolean
}

function CommentItem({ comment, reportId, reportAuthorId, isReply = false }: CommentItemProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [isReplying, setIsReplying] = useState(false)
  const [replyContent, setReplyContent] = useState('')

  const updateCommentMutation = useMutation({
    mutationFn: (content: string) => updateComment(comment.id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', reportId] })
      setIsEditing(false)
    },
    onError: (error: any) => {
      alert(`댓글 수정 중 오류가 발생했습니다: ${error.message}`)
    }
  })

  const deleteCommentMutation = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', reportId] })
    },
    onError: (error: any) => {
      alert(`댓글 삭제 중 오류가 발생했습니다: ${error.message}`)
    }
  })

  const createReplyMutation = useMutation({
    mutationFn: (content: string) => createComment({
      reportId,
      content,
      parentCommentId: comment.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', reportId] })
      setIsReplying(false)
      setReplyContent('')
    },
    onError: (error: any) => {
      alert(`답글 작성 중 오류가 발생했습니다: ${error.message}`)
    }
  })

  const handleEdit = () => {
    setIsEditing(true)
    setEditContent(comment.content)
  }

  const handleEditSubmit = () => {
    if (!editContent.trim()) return
    updateCommentMutation.mutate(editContent.trim())
  }

  const handleEditCancel = () => {
    setIsEditing(false)
    setEditContent(comment.content)
  }

  const handleDelete = () => {
    if (window.confirm('댓글을 삭제하시겠습니까?')) {
      deleteCommentMutation.mutate()
    }
  }

  const handleReplySubmit = () => {
    if (!replyContent.trim()) return
    createReplyMutation.mutate(replyContent.trim())
  }

  const formatDate = (dateString: string) => {
    const now = new Date()
    const commentDate = new Date(dateString)
    const diffInSeconds = Math.floor((now.getTime() - commentDate.getTime()) / 1000)
    
    if (diffInSeconds < 60) return '방금 전'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}일 전`
    
    return commentDate.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getUserDisplayName = () => {
    const nickname = comment.userNickname || '알 수 없음'
    const isAuthor = comment.userId === reportAuthorId
    return isAuthor ? `${nickname} (작성자)` : nickname
  }

  // 수정 여부 확인 - 날짜 객체로 비교
  const isEdited = () => {
    if (!comment.createdAt || !comment.updatedAt) return false
    
    const createdDate = new Date(comment.createdAt)
    const updatedDate = new Date(comment.updatedAt)
    
    // 디버깅용 로그
    console.log(`댓글 ${comment.id} 날짜 확인:`, {
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      createdDate: createdDate.toISOString(),
      updatedDate: updatedDate.toISOString(),
      timeDiff: Math.abs(updatedDate.getTime() - createdDate.getTime())
    })
    
    // 1초 이상 차이가 나면 수정된 것으로 간주
    const edited = Math.abs(updatedDate.getTime() - createdDate.getTime()) > 1000
    console.log(`댓글 ${comment.id} 수정됨 여부:`, edited)
    
    return edited
  }

  return (
    <div className={`${isReply ? 'ml-12 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="flex space-x-3">
        {/* 아바타 */}
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-gray-600">
            {comment.userNickname?.[0]?.toUpperCase() || 'U'}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          {/* 사용자 정보 및 날짜 */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-semibold text-gray-900 text-sm">
              {getUserDisplayName()}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(comment.createdAt)}
              {isEdited() && <span className="ml-1">(수정됨)</span>}
            </span>
          </div>

          {/* 댓글 내용 */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 focus:border-blue-500 focus:outline-none resize-none text-gray-900 rounded-lg"
                rows={3}
                placeholder="댓글 수정..."
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleEditSubmit}
                  disabled={updateCommentMutation.isPending || !editContent.trim()}
                  className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-colors"
                >
                  {updateCommentMutation.isPending ? '수정 중...' : '저장'}
                </button>
                <button
                  onClick={handleEditCancel}
                  className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md border border-gray-300 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-800 text-sm whitespace-pre-wrap mb-2">
                {comment.content}
              </p>

              {/* 액션 버튼들 */}
              <div className="flex items-center space-x-4 text-xs text-gray-600">
                {/* 답글 버튼 (대댓글이 아닌 경우만) */}
                {!isReply && user && (
                  <button
                    onClick={() => setIsReplying(!isReplying)}
                    className="hover:text-gray-800 font-medium"
                  >
                    답글
                  </button>
                )}

                {/* 수정/삭제 버튼 (본인 댓글인 경우만) */}
                {user && user.id === comment.userId && (
                  <>
                    <button
                      onClick={handleEdit}
                      className="hover:text-gray-800 font-medium"
                    >
                      수정
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteCommentMutation.isPending}
                      className="hover:text-red-600 font-medium disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>

              {/* 답글 작성 폼 */}
              {isReplying && user && (
                <div className="mt-3 space-y-2">
                  <div className="flex space-x-3">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-gray-600">
                        {user.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 focus:border-blue-500 focus:outline-none resize-none text-gray-900 rounded-lg"
                        rows={2}
                        placeholder={`@${comment.userNickname || '사용자'}님에게 답글...`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 ml-9">
                    <button
                      onClick={() => {
                        setIsReplying(false)
                        setReplyContent('')
                      }}
                      className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md border border-gray-300 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleReplySubmit}
                      disabled={createReplyMutation.isPending || !replyContent.trim()}
                      className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 transition-colors"
                    >
                      {createReplyMutation.isPending ? '답글 작성 중...' : '답글'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 대댓글들 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  reportId={reportId}
                  reportAuthorId={reportAuthorId}
                  isReply={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Comments({ reportId, reportAuthorId }: CommentsProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState('')

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', reportId],
    queryFn: () => getCommentsByReportId(reportId),
    enabled: !!reportId
  })

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => createComment({ reportId, content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', reportId] })
      queryClient.invalidateQueries({ queryKey: ['report', reportId] })
      setNewComment('')
    },
    onError: (error: any) => {
      alert(`댓글 작성 중 오류가 발생했습니다: ${error.message}`)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    createCommentMutation.mutate(newComment.trim())
  }

  // 전체 댓글 수 계산 (대댓글 포함)
  const totalCommentCount = comments.reduce((count, comment) => {
    return count + 1 + (comment.replies?.length || 0)
  }, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        댓글 {totalCommentCount}개
      </h3>

      {/* 댓글 작성 폼 */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-gray-600">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 focus:border-blue-500 focus:outline-none resize-none text-gray-900 placeholder-gray-500 rounded-lg transition-all"
                  rows={newComment ? 3 : 1}
                  placeholder="댓글 추가..."
                  required
                />
                {newComment && (
                  <div className="flex justify-end space-x-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setNewComment('')}
                      className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md border border-gray-300 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={createCommentMutation.isPending || !newComment.trim()}
                      className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {createCommentMutation.isPending ? '작성 중...' : '댓글'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-700 text-center">댓글을 작성하려면 로그인해주세요.</p>
        </div>
      )}

      {/* 댓글 목록 */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              reportId={reportId}
              reportAuthorId={reportAuthorId}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">가장 먼저 댓글을 남겨보세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}
